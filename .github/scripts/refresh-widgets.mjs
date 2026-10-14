import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const username = "misaka15135";
const log = console.log.bind(console);

function github(...args) {
  return execFileSync("gh", args, {
    encoding: "utf8",
    timeout: 45000,
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

async function refresh() {
  const token = process.env.GITHUB_TOKEN || github("auth", "token");
  const privateRepositories = JSON.parse(
    github("repo", "list", username, "--visibility", "private", "--limit", "100", "--json", "name"),
  );

  // Keep library diagnostics and credentials out of console output.
  console.log = console.warn = console.error = () => {};
  process.env.PAT_1 = token;
  const core = await import("@stats-organization/github-readme-stats-core");
  const options = {
    username,
    theme: "tokyonight",
    bg_color: "111d36",
    title_color: "a5b4fc",
    text_color: "cbd5e1",
    hide_border: "true",
    border_radius: "12",
    locale: "en",
    exclude_repo: privateRepositories.map((repository) => repository.name).join(","),
  };

  log("Generating GitHub statistics and language distribution.");
  const [stats, languages] = await Promise.all([
    core.api({ ...options, show_icons: "true", rank_icon: "github", icon_color: "7dd3fc", custom_title: "GitHub Stats" }, token),
    core.topLangs({ ...options, layout: "compact", langs_count: "6" }, token),
  ]);

  for (const [name, result] of [["stats", stats], ["top-langs", languages]]) {
    if (result.status !== "success" || !result.content?.includes("<svg")) {
      log(`${name} could not be generated (${result.error?.type || result.status}).`);
      throw new Error("GitHub statistics were unavailable; existing assets were preserved.");
    }
  }

  await mkdir("assets/generated", { recursive: true });
  await writeFile("assets/generated/stats.svg", stats.content);
  await writeFile("assets/generated/top-langs.svg", languages.content);

  log("Generating animated contribution snakes.");
  execFileSync(process.execPath, [
    path.resolve("node_modules/generate-snake-animation/cli.js"),
    `--github_user=${username}`,
    "--output=assets/generated/contribution-snake.svg?color_snake=#8b5cf6&color_dots=#ebedf0,#ddd6fe,#a5b4fc,#818cf8,#6366f1",
    "--output=assets/generated/contribution-snake-dark.svg?palette=github-dark&color_snake=#c4b5fd&color_dots=#161b22,#26365c,#465da5,#818cf8,#c4b5fd",
  ], {
    env: { ...process.env, GITHUB_TOKEN: token },
    encoding: "utf8",
    timeout: 180000,
    stdio: ["ignore", "pipe", "pipe"],
  });
  log("Generated four profile widgets successfully.");
}

refresh().catch(() => {
  log("Widget refresh failed. Check GitHub CLI authentication and network access, then retry.");
  process.exitCode = 1;
});
