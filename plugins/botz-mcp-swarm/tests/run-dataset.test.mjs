import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { buildRunDataset, buildTimeline, clip, NO_SAMPLE, plannedVus, recordingSamples, renderHtml } from "../skills/mcp-swarm-report/scripts/run-dataset.mjs";

const here = join(dirname(fileURLToPath(import.meta.url)), "fixtures", "report");
const reportFile = join(here, "runs", "botz-run-20261023T020000Z.json");
const load = f => JSON.parse(readFileSync(f, "utf8"));
const report = load(reportFile);
const suite = load(join(here, "suites", "docs-server", "suite.json"));
const recording = { file: "recording-docs-server-20261023T010000Z.json", recording: load(join(here, "recording-docs-server-20261023T010000Z.json")) };

test("takes the request from redactedArgs and the response from a recording", () => {
  const d = buildRunDataset({ file: reportFile, report, suite, recordings: [recording] });
  const search = d.tools.find(t => t.key === "search_docs");
  assert.match(search.sample.source.request, /^report\.redactedArgs/);
  assert.match(search.sample.source.response, /^recording /);
  assert.match(search.sample.request, /\[redacted\]/);
  assert.equal(search.sample.truncated, true);
  assert.ok(Buffer.byteLength(search.sample.response) < 4200);
  assert.equal(d.title, "MCP Swarm run run-20261023-0200: docs-server 1.4.0 (http://127.0.0.1:3000/mcp)");
});

test("falls back to tool-eval calls, then marks no sample captured", () => {
  const d = buildRunDataset({ file: reportFile, report, suite });
  const tags = d.tools.find(t => t.key === "list_tags");
  assert.match(tags.sample.source.response, /^toolEvals e1/);
  const page = d.tools.find(t => t.key === "get_page");
  assert.equal(page.sample.response, null);
  assert.equal(page.sample.source.response, NO_SAMPLE);
  assert.equal(page.lastError, "Page not found: getting-started-v2");
  assert.deepEqual(page.errors.map(e => e.class), ["application", "timeout"]);
  assert.ok(d.notes.some(n => /do not record tool results/.test(n)));
});

test("uses the suite template when nothing else records a request", () => {
  const bare = { ...report, redactedArgs: undefined, toolEvals: [] };
  const d = buildRunDataset({ file: reportFile, report: bare, suite });
  assert.match(d.tools[0].sample.source.request, /template/);
  assert.ok(d.notes.some(n => /no redactedArgs/.test(n)));
});

test("keys multi-server tools by alias and keeps samples on their own server", () => {
  const multi = {
    ...report,
    toolSeries: [{ ...report.toolSeries[0], server: "docs" }, { ...report.toolSeries[0], server: "wiki" }],
    servers: [{ alias: "docs", name: "docs-server", endpoint: "http://a/mcp", calls: 1, errorRate: 0, latencyMs: { p50: 1, p95: 2, p99: 3 } },
              { alias: "wiki", name: "wiki", endpoint: "http://b/mcp", calls: 1, errorRate: 0, latencyMs: { p50: 1, p95: 2, p99: 3 } }],
    flow: { passes: 10, passesSkipped: 2, latencyMs: { p50: 5, p95: 9, p99: 10 } },
    redactedArgs: [{ nodeId: "w1", tool: "search_docs", args: { q: "wiki" } }],
    toolEvals: [],
  };
  const s = { defaultServer: "docs", nodes: [{ id: "s1", method: "tools/call", tool: "search_docs", args: { q: "tpl" } }, { id: "w1", server: "wiki", method: "tools/call", tool: "search_docs" }] };
  const d = buildRunDataset({ file: reportFile, report: multi, suite: s, recordings: [{ alias: "wiki", ...recording }] });
  assert.deepEqual(d.tools.map(t => t.key), ["docs/search_docs", "wiki/search_docs"]);
  assert.match(d.tools[0].sample.source.request, /template/);
  assert.equal(d.tools[0].sample.source.response, NO_SAMPLE);
  assert.match(d.tools[1].sample.request, /wiki/);
  assert.match(d.tools[1].sample.source.response, /^recording/);
  assert.equal(d.flow.passesSkipped, 2);
  assert.match(d.title, /docs: docs-server .*wiki: wiki/);
});

test("pairs recording frames by id and records errors", () => {
  const m = recordingSamples({ frames: [
    { direction: "request", method: "tools/call", payload: { id: 1, params: { name: "x", arguments: { a: 1 } } } },
    { direction: "response", method: "tools/call", payload: { id: 1, error: { code: -32000, message: "boom" } } },
  ] });
  assert.deepEqual(m.get("x"), { request: { a: 1 }, response: { error: { code: -32000, message: "boom" } } });
  assert.deepEqual(clip("x".repeat(10), 4), { text: "xxxx\n… truncated (10 bytes)", truncated: true });
});

test("renders a select with escaped, inert embedded data", () => {
  const evil = { ...report, toolSeries: [{ ...report.toolSeries[0], toolName: "</script><img src=x>" }], redactedArgs: [{ nodeId: "s1", tool: "</script><img src=x>", args: { q: "</script>" } }] };
  const html = renderHtml(buildRunDataset({ file: reportFile, report: evil, suite }));
  assert.match(html, /<select id="tool">/);
  assert.equal((html.match(/<\/script>/g) ?? []).length, 2);
  assert.doesNotMatch(html, /<img/);
  assert.doesNotMatch(html, /<[^>]+\s(src|href)=/);
  assert.match(html, /prefers-color-scheme:dark/);
});

test("measures TPS, errors, per-tool TPS, and VUs from the run log", () => {
  const d = buildRunDataset({ file: reportFile, report, suite });
  assert.deepEqual(d.timelineSource, { tps: "measured (log)", vus: "measured (log)" });
  assert.equal(d.timeline.length, 60);
  assert.equal(d.timeline.reduce((s, r) => s + r.tps, 0), 967);
  assert.equal(d.timeline.reduce((s, r) => s + r.tpsErrors, 0), 19);
  assert.equal(d.timeline[0].vus, 1);
  assert.equal(d.timeline[30].vus, 4);
  assert.equal(d.timeline.reduce((s, r) => s + (r.byTool.get_page ?? 0), 0), 475);
});

test("plans VUs from the load profile when the log has none, and says so", () => {
  const lp = { maxConcurrency: 4, rampUpMs: 9000, durationMs: 10000, rampDownMs: 4000 };
  assert.deepEqual([0, 2999, 3000, 9000, 15000, 21000, 24000].map(ms => plannedVus(ms, lp)), [1, 1, 2, 4, 4, 2, 0]);
  const steps = report.log.filter(l => l.includes("mcp.step"));
  const d = buildRunDataset({ file: reportFile, report: { ...report, log: steps }, suite });
  assert.equal(d.timelineSource.vus, "planned (from load profile)");
  assert.ok(d.timeline.every(r => r.vusSource === "planned"));
  assert.ok(d.notes.some(n => /planned from the load profile/.test(n)));
  assert.match(renderHtml(d), /planned, dashed/);
});

test("blanks seconds before a truncated log tail and reports not captured", () => {
  const start = Date.parse("2026-10-23T02:00:00.000Z");
  const lines = Array.from({ length: 2000 }, (_, i) => `${new Date(start + 30000 + i * 10).toISOString().slice(11, 23)}  mcp.step  node=s1 phase=done result=ok latencyMs=5`);
  const tl = buildTimeline({ startedAt: "2026-10-23T02:00:00.000Z", durationMs: 60000, log: lines, loadProfile: { maxConcurrency: 2 } }, () => "search_docs");
  assert.equal(tl.source.tps, "measured (log tail, partial)");
  assert.equal(tl.timeline[10].tps, null);
  assert.equal(tl.timeline[30].tps, 100);
  const none = buildRunDataset({ file: reportFile, report: { ...report, log: undefined, loadProfile: undefined }, suite });
  assert.deepEqual(none.timeline, []);
  assert.deepEqual(none.timelineSource, { tps: "not captured", vus: "not captured" });
  assert.match(renderHtml(none), /Not captured/);
});
