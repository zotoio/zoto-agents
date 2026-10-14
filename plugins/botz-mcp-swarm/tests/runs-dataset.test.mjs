import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { buildDataset, loadReports, renderHtml } from "../skills/mcp-swarm-compare/scripts/runs-dataset.mjs";

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
