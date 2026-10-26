import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { buildRunDataset, buildTimeline, clip, NO_SAMPLE, percentiles, plannedVus, recordingSamples, renderHtml } from "../skills/mcp-swarm-report/scripts/run-dataset.mjs";

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
  assert.deepEqual(d.timelineSource, { tps: "measured (log)", latency: "measured (log)", vus: "measured (log)" });
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
  assert.deepEqual(none.timelineSource, { tps: "not captured", latency: "not captured", vus: "not captured" });
  assert.match(renderHtml(none), /Not captured/);
});

test("computes per-second overall and per-tool p50/p95 from the log", () => {
  assert.equal(percentiles([]), null);
  assert.deepEqual(percentiles([5, 1, 3, 2, 4]), { p50: 3, p95: 5 });
  const d = buildRunDataset({ file: reportFile, report, suite });
  assert.equal(d.timelineSource.latency, "measured (log)");
  const spike = d.timeline[40], calm = d.timeline[20];
  assert.ok(spike.byToolLatency.get_page.p95 > calm.byToolLatency.get_page.p95);
  assert.ok(spike.latency.p95 >= spike.latency.p50);
  for (const [k, l] of Object.entries(calm.byToolLatency)) assert.ok(calm.byTool[k] > 0 && l.p95 >= l.p50);
  const noLat = buildRunDataset({ file: reportFile, report: { ...report, log: report.log.map(l => l.replace(/ latencyMs=\d+/, "")) }, suite });
  assert.equal(noLat.timelineSource.latency, "not captured");
  assert.ok(noLat.timeline.every(r => r.latency === null));
});

test("leaves latency blank before a truncated log tail", () => {
  const start = Date.parse("2026-10-23T02:00:00.000Z");
  const lines = Array.from({ length: 2000 }, (_, i) => `${new Date(start + 30000 + i * 10).toISOString().slice(11, 23)}  mcp.step  node=s1 phase=done result=ok latencyMs=${i % 10}`);
  const tl = buildTimeline({ startedAt: "2026-10-23T02:00:00.000Z", durationMs: 60000, log: lines }, () => "search_docs");
  assert.equal(tl.source.latency, "measured (log tail, partial)");
  assert.equal(tl.timeline[10].latency, null);
  assert.deepEqual(tl.timeline[30].byToolLatency.search_docs, { p50: 4, p95: 9 });
});

test("draws two panels and a selector script that parses and defaults to a failing tool", () => {
  const html = renderHtml(buildRunDataset({ file: reportFile, report, suite }));
  for (const id of ["tl-tool", "tl-tool-lat"]) assert.match(html, new RegExp(`id="${id}"`));
  assert.match(html, />Response time \(ms\)</);
  assert.match(html, />Calls\/s</);
  const js = html.slice(html.lastIndexOf("<script>") + 8, html.lastIndexOf("</script>"));
  assert.doesNotThrow(() => new vm.Script(js));
  assert.match(js, /findIndex\(function\(x\)\{return x\.errorRate>0\}\)/);
});

const v2File = join(here, "runs", "botz-run-20261023T030000Z.json");
const v2 = load(v2File);

test("CLI >= 0.9.0: takes samples from sampleResults ahead of recordings and tool evals", () => {
  const d = buildRunDataset({ file: v2File, report: v2, suite, recordings: [recording] });
  for (const t of d.tools) assert.deepEqual(t.sample.source, { request: "sampleResults", response: "sampleResults" });
  const page = d.tools.find(t => t.key === "get_page");
  assert.equal(page.sample.kind, "success");
  assert.match(page.sample.response, /Getting started/);
  assert.equal(page.sample.errorSample.errorClass, "application");
  assert.match(page.sample.errorSample.request, /getting-started-v2/);
  const search = d.tools.find(t => t.key === "search_docs");
  assert.equal(search.sample.truncated, true);
  assert.equal(search.sample.responseBytes, 6342);
  assert.match(search.sample.request, /\[redacted\]/);
  assert.ok(!d.notes.some(n => /predates CLI 0\.9\.0/.test(n)));
  assert.ok(d.notes.some(n => /truncated by the CLI/.test(n)));
});

test("CLI >= 0.9.0: falls back to recordings, then tool evals, when a tool has no sampleResults entry", () => {
  const partial = { ...v2, sampleResults: v2.sampleResults.filter(s => s.tool === "get_page") };
  const d = buildRunDataset({ file: v2File, report: partial, suite, recordings: [recording] });
  assert.match(d.tools.find(t => t.key === "search_docs").sample.source.response, /^recording /);
  assert.match(d.tools.find(t => t.key === "list_tags").sample.source.response, /^toolEvals e1/);
  assert.equal(d.tools.find(t => t.key === "get_page").sample.source.response, "sampleResults");
});

test("CLI >= 0.9.0: builds the timeline from timeSeries, whole run, no partial flag", () => {
  const d = buildRunDataset({ file: v2File, report: v2, suite });
  assert.deepEqual(d.timelineSource, { tps: "measured (timeSeries)", latency: "measured (timeSeries)", vus: "measured (timeSeries)" });
  assert.equal(d.timeline.length, 60);
  assert.ok(d.timeline.every(r => r.vusSource === "timeSeries" && r.tps != null));
  assert.equal(d.timeline.reduce((s, r) => s + r.tps, 0), 958);
  assert.equal(d.timeline.reduce((s, r) => s + r.tpsErrors, 0), 19);
  assert.equal(d.timeline[30].vus, 4);
  assert.equal(d.timeline[59].latency, null);
  assert.ok(d.timeline[40].byToolLatency.get_page.p95 > d.timeline[20].byToolLatency.get_page.p95);
  assert.ok(!d.notes.some(n => /2000-line tail|planned from the load profile/.test(n)));
  const html = renderHtml(d);
  assert.match(html, /measured \(timeSeries\)/);
  assert.match(html, /id="d-errwrap"/);
  const js = html.slice(html.lastIndexOf("<script>") + 8, html.lastIndexOf("</script>"));
  assert.doesNotThrow(() => new vm.Script(js));
});

test("fills seconds missing from a sparse timeSeries as idle and keeps the last VUs", () => {
  const tl = buildTimeline({ timeSeries: [
    { t: 0, calls: 2, errors: 0, byTool: { a: { calls: 2, errors: 0 } }, vus: 2, latency: { p50: 5, p95: 9 }, byToolLatency: { a: { p50: 5, p95: 9 } } },
    { t: 3, calls: 1, errors: 1, byTool: { a: { calls: 1, errors: 1 } }, vus: 3, latency: { p50: 7, p95: 7 }, byToolLatency: { a: { p50: 7, p95: 7 } } },
  ] }, () => null, n => `x/${n}`);
  assert.equal(tl.timeline.length, 4);
  assert.deepEqual(tl.timeline.map(r => [r.tps, r.vus]), [[2, 2], [0, 2], [0, 2], [1, 3]]);
  assert.equal(tl.timeline[1].latency, null);
  assert.deepEqual(tl.timeline[3].byTool, { "x/a": 1 });
});

test("multi-server sampleResults follow the entry's node to its alias", () => {
  const multi = {
    ...v2,
    toolSeries: [{ ...v2.toolSeries[0], server: "docs" }, { ...v2.toolSeries[0], server: "wiki" }],
    servers: [{ alias: "docs", calls: 1, errorRate: 0 }, { alias: "wiki", calls: 1, errorRate: 0 }],
    sampleResults: [{ tool: "search_docs", success: { atMs: 1, latencyMs: 2, nodeId: "w1", args: { q: "wiki" }, response: { ok: 1 } } }],
    redactedArgs: undefined, toolEvals: [],
  };
  const s = { defaultServer: "docs", nodes: [{ id: "s1", method: "tools/call", tool: "search_docs" }, { id: "w1", server: "wiki", method: "tools/call", tool: "search_docs" }] };
  const d = buildRunDataset({ file: v2File, report: multi, suite: s });
  assert.equal(d.tools[0].sample.source.response, NO_SAMPLE);
  assert.equal(d.tools[1].sample.source.response, "sampleResults");
  assert.ok(d.notes.some(n => /tools by name only/.test(n)));
});

test("CLI >= 0.9.0: prefers loadTimeline for VUs/TPS and surfaces overall and per-tool peak/avg summary", () => {
  const withLt = {
    ...v2,
    limits: { maxCallCount: 50000, maxPayloadBytes: 524288 },
    rampDown: { strategy: "graceful", drainDeadlineMs: 65000, incompletePasses: 2, cancelledByRampDown: 3, skippedPasses: 1 },
    loadTimeline: {
      bucketMs: 1000,
      durationMs: 2000,
      points: [
        { tMs: 0, vus: 2, tps: 14, errors: 1, tools: { get_page: { calls: 8, errors: 1, peakInFlight: 2 }, search_docs: { calls: 6, errors: 0, peakInFlight: 1 } } },
        { tMs: 1000, vus: 4, tps: 20, errors: 0, tools: { get_page: { calls: 10, errors: 0, peakInFlight: 3 }, search_docs: { calls: 10, errors: 0, peakInFlight: 2 } } },
      ],
      summary: {
        overall: { peakVus: 4, avgVus: 3, peakTps: 20, avgTps: 17, calls: 34, errors: 1 },
        tools: {
          get_page: { peakVus: 3, avgVus: 2.5, peakTps: 10, avgTps: 9, calls: 18, errors: 1 },
          search_docs: { peakVus: 2, avgVus: 1.5, peakTps: 10, avgTps: 8, calls: 16, errors: 0 },
        },
      },
    },
  };
  const d = buildRunDataset({ file: v2File, report: withLt, suite });
  assert.deepEqual(d.timelineSource, { tps: "measured (loadTimeline)", latency: "measured (timeSeries)", vus: "measured (loadTimeline)" });
  assert.equal(d.timeline.length, 2);
  assert.equal(d.timeline[1].vus, 4);
  assert.equal(d.timeline[1].tps, 20);
  assert.equal(d.timeline[1].byToolInFlight.get_page, 3);
  assert.ok(d.timeline[0].latency.p95 >= d.timeline[0].latency.p50);
  assert.deepEqual(d.loadTimeline.summary.overall, {
    peakVus: 4, avgVus: 3, peakActiveVus: 4, avgActiveVus: 3, peakTps: 20, avgTps: 17, calls: 34, errors: 1,
  });
  assert.deepEqual(d.run.limits, { maxCallCount: 50000, maxPayloadBytes: 524288 });
  assert.deepEqual(d.run.rampDown, { strategy: "graceful", drainDeadlineMs: 65000, incompletePasses: 2, cancelledByRampDown: 3, skippedPasses: 1 });
  const page = d.tools.find(t => t.key === "get_page");
  assert.deepEqual(page.load, {
    peakVus: 3, avgVus: 2.5, peakActiveVus: 3, avgActiveVus: 2.5, peakTps: 10, avgTps: 9, calls: 18, errors: 1,
  });
  assert.ok(d.notes.some(n => /Ramp-down \(graceful\): 2 incomplete passes, 3 calls cancelled/.test(n)));
  const html = renderHtml(d);
  assert.match(html, /Peak \/ avg VUs/);
  assert.match(html, /4 \/ 3/);
  assert.match(html, /Peak \/ avg TPS/);
  assert.match(html, /20 \/ 17/);
});

test("notes extractor sample redaction when suite uses extractors", () => {
  const extSuite = {
    defaultServer: "docs",
    nodes: [
      { id: "s1", type: "sampler", method: "tools/call", tool: "search_docs", args: { q: "open" } },
      { id: "e1", type: "extractor", path: "structuredContent.id", variable: "docId", required: true },
      { id: "s2", type: "sampler", method: "tools/call", tool: "get_page", args: { slug: "${docId}" } },
    ],
  };
  const extReport = {
    ...v2,
    sampleResults: [
      { tool: "get_page", success: { atMs: 10, latencyMs: 5, nodeId: "s2", args: { slug: "${docId}" }, responseBytes: 120 } },
    ],
  };
  const d = buildRunDataset({ file: v2File, report: extReport, suite: extSuite });
  assert.ok(d.notes.some(n => /sampleResults redacts extracted variable values to \$\{name\} in args and omits response bodies/.test(n)));
});
