const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeContributions, fetchContributions } = require("../js/github-contributions.js");

const day = (date, count = 0, level = 0) => ({ date, count, level });

test("orders contribution dates across leap day and year boundaries", () => {
  const result = normalizeContributions({ contributions: [
    day("2024-03-01", 3, 2), day("2024-02-28"), day("2024-02-29", 1, 1)
  ] });
  assert.deepEqual(result.map(item => item.date), ["2024-02-28", "2024-02-29", "2024-03-01"]);
  assert.equal(result.reduce((sum, item) => sum + item.count, 0), 4);
  assert.doesNotThrow(() => normalizeContributions({ contributions: [day("2025-12-31"), day("2026-01-01")] }));
});

test("rejects unavailable, malformed, duplicated, or incomplete data", () => {
  const invalid = [
    null, {}, { contributions: [] }, { contributions: [day("2025-02-29")] },
    { contributions: [day("2026-01-01", -1)] }, { contributions: [day("2026-01-01", 1, 5)] },
    { contributions: [day("2026-01-01", "3")] },
    { contributions: [day("2026-01-01"), day("2026-01-01")] },
    { contributions: [day("2026-01-01"), day("2026-01-03")] },
    { contributions: [day("<script>")] }
  ];
  invalid.forEach(data => assert.throws(() => normalizeContributions(data)));
});

test("fetches the last year without credentials and accepts all-zero activity", async () => {
  const days = await fetchContributions("sahushivam", async (url, options) => {
    assert.equal(url, "https://github-contributions-api.jogruber.de/v4/sahushivam?y=last");
    assert.equal(options.credentials, "omit");
    return { ok: true, json: async () => ({ contributions: [day("2026-01-01")] }) };
  });
  assert.equal(days[0].count, 0);
});

test("handles HTTP failures, invalid JSON, and invalid usernames", async () => {
  await assert.rejects(fetchContributions("sahushivam", async () => ({ ok: false })), /request failed/);
  await assert.rejects(fetchContributions("sahushivam", async () => ({ ok: true, json: async () => { throw new Error("Invalid JSON"); } })), /Invalid JSON/);
  await assert.rejects(fetchContributions("../someone", async () => { throw new Error("must not fetch"); }), /Invalid GitHub username/);
});

test("aborts a stalled request instead of leaving the chart loading", async () => {
  const stalledFetch = (_, options) => new Promise((resolve, reject) => {
    options.signal.addEventListener("abort", () => reject(new Error("Aborted")), { once: true });
  });
  await assert.rejects(fetchContributions("sahushivam", stalledFetch, 10), /Aborted/);
});
