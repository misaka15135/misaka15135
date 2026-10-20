import test from "node:test";
import assert from "node:assert/strict";
import { fetchCompleteSearch, publicCommitCalendar, validateCalendar, patchPublicCommitStat } from "./activity.mjs";

const username = "misaka15135";
const calendar = {
  weeks: [{ contributionDays: Array.from({ length: 7 }, (_, weekday) => ({
    weekday, date: `2026-10-${18 + weekday}`, contributionCount: 0, contributionLevel: "NONE",
  })) }],
};
function commit(n, date = "2026-10-20T12:00:00Z", extra = {}) {
  return { sha: n.toString(16).padStart(40, "0"), author: { login: username }, repository: { private: false }, commit: { author: { date } }, ...extra };
}

test("fallback counts only distinct public commits by the user and groups dates in UTC", () => {
  const result = publicCommitCalendar(calendar, [
    commit(1), commit(1), commit(2), commit(3, "2026-10-20T01:30:00+08:00"),
    commit(4, undefined, { repository: { private: true } }),
    commit(5, undefined, { repository: {} }),
    commit(6, undefined, { author: { login: "someone-else" } }),
    commit(7, "2026-10-01T00:00:00Z"),
  ], username);
  assert.equal(result.totalContributions, 3);
  const days = result.weeks[0].contributionDays;
  assert.equal(days.find((day) => day.date === "2026-10-19").contributionCount, 1);
  assert.equal(days.find((day) => day.date === "2026-10-20").contributionCount, 2);
  assert.equal(days.filter((day) => day.contributionLevel !== "NONE").length, 2);
  assert.equal(calendar.weeks[0].contributionDays[2].contributionCount, 0);
});

test("empty and malformed activity cannot silently replace working images", () => {
  assert.throws(() => publicCommitCalendar(calendar, [], username), /preserved/);
  assert.throws(() => publicCommitCalendar(calendar, [commit(1, "invalid")], username), /date/);
  assert.throws(() => validateCalendar({ weeks: [] }), /Invalid/);
  assert.throws(() => validateCalendar({ weeks: [{ contributionDays: [{ date: "2026-10-20", weekday: 2, contributionCount: -1, contributionLevel: "NONE" }] }] }), /Invalid/);
});

test("commit search follows every page", async () => {
  const pages = [];
  const result = await fetchCompleteSearch(async (page) => {
    pages.push(page);
    return { total_count: 101, incomplete_results: false, items: Array.from({ length: page === 1 ? 100 : 1 }, (_, n) => commit((page - 1) * 100 + n)) };
  });
  assert.deepEqual(pages, [1, 2]);
  assert.equal(result.length, 101);
});

test("incomplete, truncated, and changing searches fail closed", async () => {
  for (const response of [
    { total_count: 1, incomplete_results: true, items: [] },
    { total_count: 1001, incomplete_results: false, items: [] },
    { total_count: 2, incomplete_results: false, items: [] },
  ]) await assert.rejects(fetchCompleteSearch(async () => response));
  await assert.rejects(fetchCompleteSearch(async (page) => ({ total_count: page === 1 ? 101 : 102, incomplete_results: false, items: Array.from({ length: 100 }, (_, n) => commit(n)) })), /changed/);
});

test("fallback statistics label the real count in both visible text and accessibility text", () => {
  const svg = '<svg><desc>Total Commits  (last year) : 0, Total PRs: 4</desc><text>Total Commits (last year):</text><text data-testid="commits">0</text><text data-testid="prs">4</text></svg>';
  const result = patchPublicCommitStat(svg, 323);
  assert.match(result, /<desc>Public Commits \(last year\): 323, Total PRs: 4/);
  assert.match(result, /data-testid="commits">323<\/text>/);
  assert.match(result, /data-testid="prs">4<\/text>/);
  assert.throws(() => patchPublicCommitStat("<svg/>", 323), /format changed/);
});
