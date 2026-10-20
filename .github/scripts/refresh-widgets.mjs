import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, writeFile, copyFile, rm } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { fetchCompleteSearch, publicCommitCalendar, validateCalendar, patchPublicCommitStat } from "./activity.mjs";

const username = "misaka15135";
const log = console.log.bind(console);

function github(...args) {
  return execFileSync("gh", args, {
    encoding: "utf8", timeout: 45000, stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

async function renderSnakes(calendar) {
  // Adapt the validated snapshot to snk's supported GitHub API shape. This
  // loopback-only server receives a dummy credential, never the GitHub token.
  const server = createServer((request, response) => {
    if (request.method !== "POST" || request.url !== "/api/graphql") {
      response.writeHead(404).end();
      return;
    }
    request.resume();
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify({ data: { user: { contributionsCollection: { contributionCalendar: calendar } } } }));
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  try {
    const { generateSnakeAnimation } = await import("generate-snake-animation");
    const palettes = [
      { snake: "#8b5cf6", dots: ["#ebedf0", "#ddd6fe", "#a5b4fc", "#818cf8", "#6366f1"] },
      { snake: "#c4b5fd", dots: ["#161b22", "#26365c", "#465da5", "#818cf8", "#c4b5fd"] },
    ];
    return await generateSnakeAnimation({
      platform: "github", username, githubToken: "validated-local-snapshot",
      baseUrl: `http://127.0.0.1:${server.address().port}`,
    }, palettes.map(({ snake, dots }) => ({
      format: "svg",
      drawOptions: { sizeCell: 16, sizeDot: 12, sizeDotBorderRadius: 2, colorDotBorder: "#1b1f230a", colorSnake: snake, colorDots: dots, colorEmpty: dots[0] },
      animationOptions: { frameByStep: 1, stepDurationMs: 100 },
    })));
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

async function refresh() {
  const token = process.env.GITHUB_TOKEN || github("auth", "token");
  const query = `query { user(login: "${username}") { contributionsCollection { contributionCalendar { totalContributions weeks { contributionDays { date weekday contributionCount contributionLevel } } } } } }`;
  const result = JSON.parse(github("api", "graphql", "-f", `query=${query}`));
  if (result.errors?.length) throw new Error("GitHub could not return the contribution calendar.");
  let calendar = result.data?.user?.contributionsCollection?.contributionCalendar;
  const days = validateCalendar(calendar);
  let source = "github-contributions";
  if (!days.some((day) => day.contributionCount > 0)) {
    log("GitHub's contribution calendar is empty; checking public commits.");
    const first = days[0].date;
    const last = days.at(-1).date;
    const searchQuery = `author:${username} is:public author-date:${first}..${last}`;
    const commits = await fetchCompleteSearch(async (page) => {
      for (let attempt = 0; ; attempt++) {
        const response = JSON.parse(github(
          "api", "--method", "GET", "search/commits", "-f", `q=${searchQuery}`,
          "-f", "per_page=100", "-f", `page=${page}`, "-f", "sort=author-date", "-f", "order=asc",
        ));
        if (response.incomplete_results !== true || attempt >= 2) return response;
        log(`Retrying incomplete public commit search page ${page}.`);
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    });
    calendar = publicCommitCalendar(calendar, commits, username);
    source = "public-commits";
    log(`Using ${calendar.totalContributions} distinct public commits (UTC), explicitly labeled as fallback activity.`);
  }
  const privateRepositories = JSON.parse(github("repo", "list", username, "--visibility", "private", "--limit", "1000", "--json", "name"));

  // Library diagnostics may include request headers. Only emit our own messages.
  console.log = console.warn = console.error = () => {};
  process.env.PAT_1 = token;
  const core = await import("@stats-organization/github-readme-stats-core");
  const options = {
    username, theme: "tokyonight", bg_color: "111d36", title_color: "a5b4fc",
    text_color: "cbd5e1", hide_border: "true", border_radius: "12", locale: "en",
    exclude_repo: privateRepositories.map((repository) => repository.name).join(","),
  };
  log("Generating GitHub statistics and language distribution.");
  const [stats, languages] = await Promise.all([
    core.api({ ...options, show_icons: "true", rank_icon: "github", icon_color: "7dd3fc", custom_title: "GitHub Stats" }, token),
    core.topLangs({ ...options, layout: "compact", langs_count: "6", card_width: "495" }, token),
  ]);
  for (const [name, card] of [["Statistics", stats], ["Languages", languages]]) {
    if (card.status !== "success" || !card.content?.includes("<svg")) {
      throw new Error(`${name} generation failed; existing assets were preserved.`);
    }
  }
  if (source === "public-commits") stats.content = patchPublicCommitStat(stats.content, calendar.totalContributions);
  log("Generating contribution snakes from the validated activity snapshot.");
  const snakes = await renderSnakes(calendar);
  if (snakes.some((svg) => typeof svg !== "string" || !svg.includes("@keyframes"))) {
    throw new Error("Snake generation failed; existing assets were preserved.");
  }
  const total = calendar.weeks.flatMap((week) => week.contributionDays).reduce((sum, day) => sum + day.contributionCount, 0);
  const sourceName = source === "public-commits" ? "Public commit activity (UTC; calendar fallback)" : "GitHub contribution activity";
  const label = `${sourceName} · ${total} ${source === "public-commits" ? "commits" : "contributions"} · ${days[0].date} to ${days.at(-1).date}`;
  const metadata = { source, total, from: days[0].date, to: days.at(-1).date, updatedAt: new Date().toISOString() };
  const files = {
    "stats.svg": stats.content,
    "top-langs.svg": languages.content,
    "contribution-snake.svg": snakes[0],
    "contribution-snake-dark.svg": snakes[1],
    "activity-source.svg": `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="32" viewBox="0 0 1000 32" role="img"><title>${label}</title><text x="500" y="20" text-anchor="middle" fill="#818cf8" font-family="Arial,sans-serif" font-size="12">${label}</text></svg>\n`,
    "activity.json": JSON.stringify(metadata, null, 2) + "\n",
  };
  // Publish only after all requests, cards, and animations succeed. Network and
  // incomplete-data errors cannot replace working assets with a partial refresh.
  const stage = await mkdtemp(path.join(tmpdir(), "profile-widgets-"));
  try {
    for (const [name, content] of Object.entries(files)) await writeFile(path.join(stage, name), content);
    await mkdir("assets/generated", { recursive: true });
    for (const name of Object.keys(files)) await copyFile(path.join(stage, name), path.join("assets/generated", name));
  } finally {
    await rm(stage, { recursive: true, force: true });
  }
  log(`Published ${total} activity events from ${sourceName}.`);
}

refresh().catch((error) => {
  // Only messages from our own validations are safe to print.
  const safe = error instanceof Error && !error.message.includes("Command failed") && !error.isAxiosError;
  log(safe ? error.message : "Widget refresh failed. Check GitHub CLI authentication and network access.");
  process.exitCode = 1;
});
