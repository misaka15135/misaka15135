const levels = ["NONE", "FIRST_QUARTILE", "SECOND_QUARTILE", "THIRD_QUARTILE", "FOURTH_QUARTILE"];

export function validateCalendar(calendar) {
  const days = calendar?.weeks?.flatMap((week) => week.contributionDays);
  if (!days?.length || days.some((day) =>
    !/^\d{4}-\d{2}-\d{2}$/.test(day.date) ||
    !Number.isInteger(day.contributionCount) || day.contributionCount < 0 ||
    !levels.includes(day.contributionLevel) ||
    !Number.isInteger(day.weekday) || day.weekday < 0 || day.weekday > 6
  )) throw new Error("Invalid contribution calendar; existing assets were preserved.");
  return days;
}

export async function fetchCompleteSearch(fetchPage) {
  const items = [];
  let expected;
  for (let page = 1; ; page++) {
    const result = await fetchPage(page);
    if (result.incomplete_results !== false || !Number.isInteger(result.total_count) ||
        result.total_count < 0 || result.total_count > 1000 || !Array.isArray(result.items)) {
      throw new Error("Commit search is incomplete or exceeds 1,000 results; existing assets were preserved.");
    }
    expected ??= result.total_count;
    if (result.total_count !== expected) throw new Error("Commit search changed during pagination; retry the refresh.");
    items.push(...result.items);
    if (items.length === expected) return items;
    if (!result.items.length || items.length > expected || page >= 10) {
      throw new Error("Commit search pagination is incomplete; existing assets were preserved.");
    }
  }
}

export function publicCommitCalendar(calendar, items, username) {
  const days = validateCalendar(calendar);
  const dates = new Set(days.map((day) => day.date));
  const seen = new Set();
  const counts = new Map();
  for (const item of items) {
    // Do not publish private activity, even if an authenticated search returns it.
    if (item.repository?.private !== false || item.author?.login?.toLowerCase() !== username.toLowerCase()) continue;
    if (!/^[a-f0-9]{40}$/i.test(item.sha)) throw new Error("Invalid commit hash in search results.");
    const timestamp = Date.parse(item.commit?.author?.date);
    if (!Number.isFinite(timestamp)) throw new Error("Invalid commit date in search results.");
    const date = new Date(timestamp).toISOString().slice(0, 10);
    if (!dates.has(date) || seen.has(item.sha)) continue;
    seen.add(item.sha);
    counts.set(date, (counts.get(date) || 0) + 1);
  }
  const maximum = Math.max(0, ...counts.values());
  if (!maximum) throw new Error("Neither the contribution calendar nor public commit search contains activity; existing assets were preserved.");
  return {
    totalContributions: seen.size,
    weeks: calendar.weeks.map((week) => ({
      contributionDays: week.contributionDays.map((day) => {
        const count = counts.get(day.date) || 0;
        return { ...day, contributionCount: count, contributionLevel: levels[count ? Math.ceil(count / maximum * 4) : 0] };
      }),
    })),
  };
}

export function patchPublicCommitStat(svg, count) {
  const field = /(<text\b[^>]*\bdata-testid="commits"[^>]*>)[\s\S]*?(<\/text>)/g;
  if ([...svg.matchAll(field)].length !== 1 || !svg.includes("Total Commits (last year):")) {
    throw new Error("Statistics SVG format changed; existing assets were preserved.");
  }
  return svg.replace(field, (_, start, end) => `${start}${count}${end}`)
    .replace("Total Commits (last year):", "Public Commits (last year):")
    .replace(/Total Commits\s+\(last year\)\s*:\s*\d+(?:[.,]\d+)*/, `Public Commits (last year): ${count}`);
}
