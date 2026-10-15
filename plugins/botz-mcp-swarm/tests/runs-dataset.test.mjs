import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { buildDataset, endpointOf, loadReports, renderHtml } from "../skills/mcp-swarm-compare/scripts/runs-dataset.mjs";

const tool = (toolName, p95, errorRate = 0, count = 100) => ({ toolName, count, errorRate, latencyMs: { p50: p95 / 2, p95, p99: p95 * 1.2 } });
const report = (id, startedAt, toolSeries, extra = {}) => ({
  id, startedAt, manifestName: "demo", transport: "stdio", mode: "load", verdict: "pass", silentGreen: false,
  failReasons: [], durationMs: 1000, quotas: { callCount: 200 }, loadProfile: { maxConcurrency: 2, iterations: 5, durationMs: 0 },
  toolSeries, ...extra,
});
function withRuns(reports, fn) {
  const dir = mkdtempSync(join(tmpdir(), "swarm-runs-"));
  try {
    reports.forEach((r, i) => writeFileSync(join(dir, `botz-run-${i}.json`), JSON.stringify(r)));
    writeFileSync(join(dir, "notes.json"), "{}");
    return fn(dir);
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

test("orders runs by start time and flags regressions with the CLI's rules", () => withRuns([
  report("b", "2026-01-02", [tool("echo", 13), tool("search", 10, 0.1)]),
  report("a", "2026-01-01", [tool("echo", 10), tool("search", 10, 0)]),
  report("c", "2026-01-03", [tool("echo", 12), tool("search", 10, 0.1)]),
], dir => {
  const data = buildDataset(loadReports([dir]));
  assert.deepEqual(data.runs.map(r => r.run_id), ["a", "b", "c"]);
  assert.equal(data.rows.length, 6);
  assert.deepEqual(data.regressions.map(r => `${r.head}:${r.tool}:${r.metric}`), ["b:echo:p95", "b:search:errorRate"]);
}));

test("reports why runs are not comparable", () => withRuns([
  report("a", "2026-01-01", [tool("echo", 10, 0, 5)]),
  report("b", "2026-01-02", [tool("echo", 10), tool("new", 1)], { loadProfile: { maxConcurrency: 8 }, silentGreen: true, verdict: "fail", failReasons: ["slo"] }),
], dir => {
  const notes = buildDataset(loadReports([dir])).comparability.join("\n");
  for (const text of ["concurrency differs", "silent green", "verdict fail (slo)", "5 samples", "set of executed tools differs", "no tool catalog"]) {
    assert.match(notes, new RegExp(text.replace(/[()]/g, "\\$&")));
  }
}));

test("rejects files that are not run reports", () => {
  const dir = mkdtempSync(join(tmpdir(), "swarm-runs-"));
  try {
    writeFileSync(join(dir, "x.json"), "{}");
    assert.throws(() => loadReports([join(dir, "x.json")]), /Not a run report/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("renders a self-contained page with escaped content", () => {
  const html = renderHtml(buildDataset([
    { file: "one.json", report: report("a", "2026-01-01", [tool("<script>", 10)], { toolEvals: [{ pass: true }, { pass: false }] }) },
    { file: "two.json", report: report("b", "2026-01-02", [tool("<script>", 20)]) },
  ]));
  assert.doesNotMatch(html, /<script>/);
  assert.doesNotMatch(html, /src=|href=/);
  assert.match(html, /Tool-eval pass rate/);
  assert.match(html, /prefers-color-scheme:dark/);
});

function withLayout(suites, reports, fn) {
  const root = mkdtempSync(join(tmpdir(), "swarm-layout-"));
  try {
    mkdirSync(join(root, "runs"));
    for (const [name, suite] of Object.entries(suites)) {
      mkdirSync(join(root, "suites", name), { recursive: true });
      writeFileSync(join(root, "suites", name, "suite.json"), JSON.stringify(suite));
    }
    reports.forEach((r, i) => writeFileSync(join(root, "runs", `botz-run-${i}.json`), JSON.stringify(r)));
    return fn(root);
  } finally { rmSync(root, { recursive: true, force: true }); }
}
const suite = (serverName, target) => ({ name: serverName, surface: { serverName, serverVersion: "2.1" }, target });

test("labels runs with the server name and URL or command from their suite", () => withLayout(
  { demo: suite("docs-server", { transport: "streamable-http", url: "https://docs.example/mcp" }) },
  [report("a", "2026-01-01", [tool("echo", 10)]), report("b", "2026-01-02", [tool("echo", 10)])],
  root => {
    const data = buildDataset(loadReports([join(root, "runs")]));
    assert.equal(data.title, "MCP Swarm runs: docs-server 2.1 (https://docs.example/mcp)");
    assert.deepEqual(data.runs.map(r => [r.server, r.endpoint]), [["docs-server", "https://docs.example/mcp"], ["docs-server", "https://docs.example/mcp"]]);
    assert.match(renderHtml(data), /<h1>MCP Swarm runs: docs-server 2\.1 \(https:\/\/docs\.example\/mcp\)<\/h1>/);
  },
));

test("warns when the server is unknown or differs between runs", () => withLayout(
  { demo: suite("a-server", { transport: "stdio", command: "node", args: ["a.mjs"] }), other: suite("b-server", { transport: "stdio", command: "node", args: ["b.mjs"] }) },
  [report("a", "2026-01-01", [tool("echo", 10)]), report("b", "2026-01-02", [tool("echo", 10)], { manifestName: "other" }), report("c", "2026-01-03", [tool("echo", 10)], { manifestName: "missing" })],
  root => {
    const data = buildDataset(loadReports([join(root, "runs")]));
    assert.deepEqual(data.servers, ["a-server 2.1 (node a.mjs)", "b-server 2.1 (node b.mjs)", "suite missing (server unknown)"]);
    const notes = data.comparability.join("\n");
    assert.match(notes, /c: no saved suite "missing" found/);
    assert.match(notes, /different servers or endpoints/);
    assert.equal(buildDataset(loadReports([join(root, "runs")]), "Custom").title, "Custom");
  },
));

test("prefers the server recorded in the report over the saved suite", () => withLayout(
  { demo: suite("docs-server", { transport: "streamable-http", url: "https://docs.example/mcp" }) },
  [
    report("a", "2026-01-01", [tool("echo", 10)]),
    report("b", "2026-01-02", [tool("echo", 10)], { server: { name: "docs-server", version: "2.2", transport: "streamable-http", endpoint: "https://staging.example/mcp" } }),
  ],
  root => {
    const data = buildDataset(loadReports([join(root, "runs")]));
    assert.deepEqual(data.runs.map(r => [r.server, r.serverVersion, r.endpoint, r.serverSource]), [
      ["docs-server", "2.1", "https://docs.example/mcp", "suite"],
      ["docs-server", "2.2", "https://staging.example/mcp", "report"],
    ]);
    const notes = data.comparability.join("\n");
    assert.match(notes, /^a: report does not record its server/m);
    assert.doesNotMatch(notes, /^b: report does not record its server/m);
    assert.match(notes, /different servers or endpoints/);
  },
));

test("writes suite endpoints the way reports do", () => {
  assert.equal(endpointOf({ url: "https://" + "u:p@" + "docs.example/mcp?region=eu#x" }), "https://docs.example/mcp");
  const abs = ["", "opt", "srv", "index.js"].join("/");
  assert.equal(endpointOf({ command: "node", args: [abs, "~/cfg/app.json", "--config=" + abs, "two words"] }), 'node index.js app.json --config=index.js "two words"');
});

test("does not score tools whose schema changed between runs", () => withRuns([
  report("a", "2026-01-01", [tool("echo", 10), tool("search", 10)], { catalog: [{ name: "echo", schemaHash: "e1" }, { name: "search", schemaHash: "s1" }] }),
  report("b", "2026-01-02", [tool("echo", 20), tool("search", 30, 0.2)], { catalog: [{ name: "echo", schemaHash: "e1" }, { name: "search", schemaHash: "s2" }] }),
], dir => {
  const data = buildDataset(loadReports([dir]));
  assert.deepEqual(data.regressions.map(r => `${r.tool}:${r.metric}`), ["echo:p95"]);
  const notes = data.comparability.join("\n");
  assert.match(notes, /b: schema changed since a for search/);
  assert.doesNotMatch(notes, /no tool catalog/);
}));

test("keeps same-named tools on different servers apart and scores the flow", () => withRuns([
  report("a", "2026-01-01", [{ ...tool("search", 10), server: "github" }, { ...tool("search", 50), server: "jira" }], {
    servers: [
      { alias: "github", endpoint: "https://gh.example/mcp", calls: 100, errorRate: 0, latencyMs: { p50: 5, p95: 10, p99: 12 } },
      { alias: "jira", endpoint: "https://jira.example/mcp", calls: 100, errorRate: 0, latencyMs: { p50: 25, p95: 50, p99: 60 } },
    ],
    flow: { passes: 100, passesFailed: 0, passesSkipped: 0, latencyMs: { p50: 40, p95: 80, p99: 90 } },
    catalog: [{ server: "github", name: "search", schemaHash: "g1" }, { server: "jira", name: "search", schemaHash: "j1" }],
  }),
  report("b", "2026-01-02", [{ ...tool("search", 10), server: "github" }, { ...tool("search", 70), server: "jira" }], {
    servers: [
      { alias: "github", endpoint: "https://gh.example/mcp", calls: 100, errorRate: 0, latencyMs: { p50: 5, p95: 10, p99: 12 } },
      { alias: "jira", endpoint: "https://jira.example/mcp", calls: 100, errorRate: 0, latencyMs: { p50: 35, p95: 70, p99: 80 } },
    ],
    flow: { passes: 100, passesFailed: 0, passesSkipped: 3, latencyMs: { p50: 50, p95: 110, p99: 120 } },
    catalog: [{ server: "github", name: "search", schemaHash: "g2" }, { server: "jira", name: "search", schemaHash: "j1" }],
  }),
], dir => {
  const data = buildDataset(loadReports([dir]));
  assert.deepEqual([...new Set(data.rows.map(r => r.tool))].sort(), ["github/search", "jira/search"]);
  assert.deepEqual(data.serverRows.map(r => `${r.run_id}:${r.server}`), ["a:github", "a:jira", "b:github", "b:jira"]);
  assert.deepEqual(data.runs.map(r => r.flowP95), [80, 110]);
  // github/search changed schema and is not scored; jira/search and the flow regressed.
  assert.deepEqual(data.regressions.map(r => `${r.tool}:${r.metric}`), ["jira/search:p95", "flow:p95"]);
  assert.match(data.comparability.join("\n"), /schema changed since a for github\/search/);
  assert.match(data.comparability.join("\n"), /3 passes stopped at a missing required variable/);
}));
