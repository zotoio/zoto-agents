#!/usr/bin/env node
/**
 * Flatten botz MCP Swarm run reports into a comparison dataset.
 *
 * Usage:
 *   node runs-dataset.mjs [--last <n>] [--suites <dir>] [--title <text>] [--html <file>] <report.json | runs-dir>...
 *
 * Prints JSON { title, servers, runs, rows, serverRows, comparability, regressions }. The
 * server name, version, and endpoint come from each report's `server` field.
 * Reports from CLI versions that did not record it are matched to their saved
 * suite (<suites>/<manifestName>/suite.json; default: the suites/ directory
 * beside each report's runs directory) instead. With --html, also writes a
 * self-contained chart page (no network requests).
 * Regression rules match `botz mcp-swarm compare`: p95 up more than 20%, or
 * any error-rate increase, between consecutive runs that both ran the tool.
 * A tool whose catalog schema hash changed between the two runs is not scored.
 * Multi-server runs key tools as `<server alias>/<tool>`, so two servers' tools
 * with one name stay apart, and add one `serverRows` entry per run and server.
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, win32 } from "node:path";

const MIN_SAMPLES = 30;

/** A tool's key: `<alias>/<tool>` on multi-server reports, else the tool name. */
export const toolKey = (server, name) => (server ? `${server}/${name}` : name);

// An absolute or ~/ path, alone or as a --flag= value, becomes its basename.
const portable = part => {
  const eq = part.startsWith("-") ? part.indexOf("=") : -1;
  if (eq > 0) return part.slice(0, eq + 1) + portable(part.slice(eq + 1));
  return win32.isAbsolute(part) || part.startsWith("~/") ? win32.basename(part) : part;
};
const quote = part => (part === "" || /\s|"/.test(part) ? JSON.stringify(part) : part);

// Written the way the CLI writes a report's `server.endpoint`: a URL without userinfo, query, or
// fragment, or the stdio command and arguments with absolute paths reduced to their basename.
export function endpointOf(target) {
  if (!target) return null;
  if (target.url) {
    try {
      const url = new URL(target.url);
      return `${url.protocol}//${url.host}${url.pathname}`;
    } catch {
      return target.url.replace(/^([a-z][a-z0-9+.-]*:\/\/)[^/@?#]*@/i, "$1").replace(/[?#].*$/, "");
    }
  }
  if (target.command) return [target.command, ...(target.args ?? [])].map(part => quote(portable(part))).join(" ");
  return null;
}

// Reports record `server` (live initialize name and version, and the endpoint actually used).
// Older reports fall back to the saved suite, which records its target at capture time.
export function serverFor(report, file, suitesDir) {
  if (report.server && typeof report.server === "object") {
    const { name = null, version = null, endpoint = null } = report.server;
    return { name, version, endpoint, suite: report.manifestName, source: "report" };
  }
  const dir = suitesDir ?? join(dirname(dirname(file)), "suites");
  try {
    const suite = JSON.parse(readFileSync(join(dir, report.manifestName, "suite.json"), "utf8"));
    return { name: suite.surface?.serverName ?? null, version: suite.surface?.serverVersion ?? null, endpoint: endpointOf(suite.target), suite: suite.name ?? report.manifestName, source: "suite" };
  } catch {
    return { name: null, version: null, endpoint: null, suite: report.manifestName, source: null };
  }
}

export const serverLabel = server => (server.name || server.endpoint)
  ? `${server.name ?? "unknown server"}${server.version ? ` ${server.version}` : ""} (${server.endpoint ?? "endpoint unknown"})`
  : `suite ${server.suite} (server unknown)`;

export function loadReports(inputs, suitesDir) {
  const files = [];
  for (const input of inputs) {
    if (statSync(input).isDirectory()) {
      for (const name of readdirSync(input)) if (/^botz-run-.*\.json$/.test(name)) files.push(join(input, name));
    } else files.push(input);
  }
  const reports = [];
  for (const file of files) {
    const report = JSON.parse(readFileSync(file, "utf8"));
    if (typeof report.id !== "string" || !Array.isArray(report.toolSeries)) throw new Error(`Not a run report: ${file}`);
    reports.push({ file, report, server: serverFor(report, file, suitesDir) });
  }
  return reports.sort((a, b) => String(a.report.startedAt).localeCompare(String(b.report.startedAt)));
}

const shape = report => ({
  suite: report.manifestName,
  transport: report.transport,
  mode: report.mode,
  concurrency: report.loadProfile?.maxConcurrency ?? null,
  iterations: report.loadProfile?.iterations ?? null,
  holdMs: report.loadProfile?.durationMs ?? null,
  params: JSON.stringify(report.params ?? {}),
});

export function buildDataset(loaded, title) {
  const runs = loaded.map(({ file, report, server = { suite: report.manifestName } }) => {
    const evals = report.toolEvals ?? [];
    return {
      run_id: report.id,
      file: basename(file),
      server: server.name ?? null,
      serverVersion: server.version ?? null,
      endpoint: server.endpoint ?? null,
      serverSource: server.source ?? null,
      startedAt: report.startedAt,
      verdict: report.verdict,
      silentGreen: Boolean(report.silentGreen),
      failReasons: report.failReasons ?? [],
      ...shape(report),
      durationMs: report.durationMs,
      callCount: report.quotas?.callCount ?? null,
      toolEvalCount: evals.length,
      toolEvalPassRate: evals.length ? evals.filter(e => e.pass).length / evals.length : null,
      serverCount: report.servers?.length ?? 1,
      // Whole-pass latency; on multi-server runs, the time an agent-like flow takes end to end.
      flowP95: report.flow?.passes ? report.flow.latencyMs.p95 : null,
      passesSkipped: report.flow?.passesSkipped ?? null,
    };
  });
  const rows = loaded.flatMap(({ report }) => report.toolSeries.map(tool => ({
    run_id: report.id,
    startedAt: report.startedAt,
    tool: toolKey(tool.server, tool.toolName),
    server: tool.server ?? null,
    count: tool.count,
    errorRate: tool.errorRate,
    p50: tool.latencyMs.p50,
    p95: tool.latencyMs.p95,
    p99: tool.latencyMs.p99,
    mean: tool.latencyMs.mean ?? null,
    std: tool.latencyMs.std ?? null,
  })));

  const serverRows = loaded.flatMap(({ report }) => ((report.servers?.length ?? 0) > 1 ? report.servers : []).map(item => ({
    run_id: report.id,
    startedAt: report.startedAt,
    server: item.alias,
    name: item.name ?? null,
    endpoint: item.endpoint ?? null,
    calls: item.calls,
    errorRate: item.errorRate,
    p50: item.latencyMs.p50,
    p95: item.latencyMs.p95,
    p99: item.latencyMs.p99,
  })));

  const servers = [...new Set(runs.map(r => serverLabel({ name: r.server, version: r.serverVersion, endpoint: r.endpoint, suite: r.suite })))];
  const comparability = [];
  const serverSets = new Set(loaded.map(({ report }) => (report.servers ?? []).map(item => `${item.alias}=${item.endpoint}`).sort().join(",")));
  if (serverSets.size > 1) comparability.push("Runs call different sets of servers or endpoints; compare per-server rows before the flow as a whole.");
  for (const run of runs) {
    if (!run.server && !run.endpoint) comparability.push(`${run.run_id}: no saved suite "${run.suite}" found, so the server name and URL or command are unknown; pass --suites <dir> or --title`);
  }
  const fromSuite = runs.filter(r => r.serverSource === "suite").map(r => r.run_id);
  if (fromSuite.length) comparability.push(`${fromSuite.join(", ")}: report does not record its server, so the server and endpoint come from the saved suite; a run with --url or --target-file tested a different endpoint than shown`);
  if (new Set(runs.map(r => `${r.server}|${r.endpoint}`)).size > 1) comparability.push("Runs come from different servers or endpoints; differences may reflect the server, not a regression.");
  if (loaded.length < 2) comparability.push("Fewer than two runs: nothing to compare.");
  const first = loaded[0] && shape(loaded[0].report);
  for (const { report } of loaded.slice(1)) {
    const current = shape(report);
    for (const key of Object.keys(first)) {
      if (current[key] !== first[key]) comparability.push(`${report.id}: ${key} differs from the first run (${first[key]} → ${current[key]})`);
    }
  }
  for (const { report } of loaded) {
    if (report.silentGreen) comparability.push(`${report.id}: silent green (no meaningful execution); exclude it from conclusions`);
    if (report.verdict !== "pass") comparability.push(`${report.id}: verdict ${report.verdict}${report.failReasons?.length ? ` (${report.failReasons.join("; ")})` : ""}`);
    for (const tool of report.toolSeries) {
      if (tool.count < MIN_SAMPLES) comparability.push(`${report.id}: ${toolKey(tool.server, tool.toolName)} has ${tool.count} samples; p95/p99 are unreliable below ${MIN_SAMPLES}`);
    }
    if (report.flow?.passesSkipped) comparability.push(`${report.id}: ${report.flow.passesSkipped} passes stopped at a missing required variable; later servers saw less traffic`);
  }
  const toolSets = new Set(loaded.map(({ report }) => report.toolSeries.map(t => toolKey(t.server, t.toolName)).sort().join(",")));
  if (toolSets.size > 1) comparability.push("The set of executed tools differs between runs; compare coverage before latency.");
  const noCatalog = loaded.filter(({ report }) => !report.catalog?.length).map(({ report }) => report.id);
  if (noCatalog.length) comparability.push(`${noCatalog.join(", ")}: report carries no tool catalog, so schema changes involving this run are not detected; check suite refresh --dry-run if the server changed.`);

  const regressions = [];
  for (let i = 1; i < loaded.length; i++) {
    const base = new Map(loaded[i - 1].report.toolSeries.map(t => [toolKey(t.server, t.toolName), t]));
    const head = loaded[i].report;
    const changed = schemaChanges(loaded[i - 1].report, head);
    if (changed.size) comparability.push(`${head.id}: schema changed since ${loaded[i - 1].report.id} for ${[...changed].join(", ")}; latency and error rate for those tools are not scored`);
    for (const tool of head.toolSeries) {
      const key = toolKey(tool.server, tool.toolName);
      const prev = base.get(key);
      if (!prev || changed.has(key)) continue;
      const pct = prev.latencyMs.p95 > 0 ? ((tool.latencyMs.p95 - prev.latencyMs.p95) / prev.latencyMs.p95) * 100 : 0;
      if (pct > 20) regressions.push({ base: loaded[i - 1].report.id, head: head.id, tool: key, metric: "p95", from: prev.latencyMs.p95, to: tool.latencyMs.p95, changePct: pct });
      if (tool.errorRate > prev.errorRate) regressions.push({ base: loaded[i - 1].report.id, head: head.id, tool: key, metric: "errorRate", from: prev.errorRate, to: tool.errorRate });
    }
    // Same rule as `botz mcp-swarm compare`: a multi-server flow whose whole-pass p95 rises more than 20%.
    const before = loaded[i - 1].report.flow, after = head.flow;
    const multi = (head.servers?.length ?? 0) > 1 || (loaded[i - 1].report.servers?.length ?? 0) > 1;
    if (multi && before?.passes && after?.passes && before.latencyMs.p95 > 0) {
      const pct = ((after.latencyMs.p95 - before.latencyMs.p95) / before.latencyMs.p95) * 100;
      if (pct > 20) regressions.push({ base: loaded[i - 1].report.id, head: head.id, tool: "flow", metric: "p95", from: before.latencyMs.p95, to: after.latencyMs.p95, changePct: pct });
    }
  }
  return { title: title ?? `MCP Swarm runs: ${servers.join(", ")}`, servers, runs, rows, serverRows, comparability, regressions };
}

// Tools present in both catalogs with different schema hashes, as `botz mcp-swarm compare` classifies them.
function schemaChanges(base, head) {
  if (!base.catalog?.length || !head.catalog?.length) return new Set();
  const before = new Map(base.catalog.map(t => [toolKey(t.server, t.name), t.schemaHash]));
  return new Set(head.catalog.filter(t => before.has(toolKey(t.server, t.name)) && before.get(toolKey(t.server, t.name)) !== t.schemaHash).map(t => toolKey(t.server, t.name)));
}

const esc = value => String(value).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const PALETTE = ["#2563eb", "#dc2626", "#16a34a", "#9333ea", "#ea580c", "#0891b2", "#db2777", "#65a30d"];

function lineChart(title, runs, series, format) {
  const width = 720, height = 260, pad = { l: 64, r: 16, t: 28, b: 40 };
  const values = series.flatMap(s => s.points.filter(v => v != null));
  const max = Math.max(...values, 0) || 1;
  const x = i => pad.l + (runs.length === 1 ? 0 : (i * (width - pad.l - pad.r)) / (runs.length - 1));
  const y = v => height - pad.b - (v / max) * (height - pad.t - pad.b);
  const ticks = [0, 0.5, 1].map(f => f * max);
  const grid = ticks.map(t => `<line x1="${pad.l}" x2="${width - pad.r}" y1="${y(t)}" y2="${y(t)}" class="grid"/><text x="${pad.l - 6}" y="${y(t) + 4}" text-anchor="end">${esc(format(t))}</text>`).join("");
  const labels = runs.map((run, i) => `<text x="${x(i)}" y="${height - pad.b + 16}" text-anchor="middle">${i + 1}</text><title>${esc(run.run_id)}</title>`).join("");
  const lines = series.map((s, n) => {
    const color = PALETTE[n % PALETTE.length];
    const pts = s.points.map((v, i) => (v == null ? null : [x(i), y(v), v, i])).filter(Boolean);
    const path = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join("");
    const dots = pts.map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="3.5" fill="${color}"><title>${esc(s.name)} · run ${p[3] + 1}: ${esc(format(p[2]))}</title></circle>`).join("");
    return `<path d="${path}" fill="none" stroke="${color}" stroke-width="2"/>${dots}`;
  }).join("");
  const legend = series.map((s, n) => `<span><i style="background:${PALETTE[n % PALETTE.length]}"></i>${esc(s.name)}</span>`).join("");
  return `<section><h2>${esc(title)}</h2><svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(title)}">${grid}${labels}${lines}</svg><div class="legend">${legend}</div></section>`;
}

export function renderHtml(dataset) {
  const { title, runs, rows, comparability, regressions } = dataset;
  const tools = [...new Set(rows.map(r => r.tool))];
  const pick = metric => tools.map(tool => ({ name: tool, points: runs.map(run => rows.find(r => r.run_id === run.run_id && r.tool === tool)?.[metric] ?? null) }));
  const ms = v => `${v.toFixed(1)} ms`;
  const pct = v => `${(v * 100).toFixed(1)}%`;
  const charts = [lineChart("p95 latency by tool", runs, pick("p95"), ms), lineChart("Error rate by tool", runs, pick("errorRate"), pct)];
  if (runs.some(r => r.toolEvalPassRate != null)) charts.push(lineChart("Tool-eval pass rate", runs, [{ name: "pass rate", points: runs.map(r => r.toolEvalPassRate) }], pct));
  const runTable = runs.map((r, i) => `<tr><td>${i + 1}</td><td>${esc(r.server ?? "unknown")}${r.serverVersion ? ` ${esc(r.serverVersion)}` : ""}</td><td><code>${esc(r.endpoint ?? "unknown")}</code></td><td>${esc(r.startedAt)}</td><td class="${r.verdict === "pass" && !r.silentGreen ? "ok" : "bad"}">${esc(r.verdict)}${r.silentGreen ? " (silent green)" : ""}</td><td>${esc(r.mode)}</td><td>${esc(r.concurrency ?? "")}</td><td>${esc(r.callCount ?? "")}</td><td>${r.toolEvalPassRate == null ? "" : pct(r.toolEvalPassRate)}</td><td><code>${esc(r.file)}</code></td></tr>`).join("");
  const list = (items, empty) => (items.length ? `<ul>${items.map(i => `<li>${esc(i)}</li>`).join("")}</ul>` : `<p class="muted">${empty}</p>`);
  const regressionText = regressions.map(r => r.metric === "p95" ? `${r.tool}: p95 ${ms(r.from)} → ${ms(r.to)} (+${r.changePct.toFixed(1)}%) in ${r.head}` : `${r.tool}: error rate ${pct(r.from)} → ${pct(r.to)} in ${r.head}`);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><style>
:root{--bg:#fff;--fg:#111827;--muted:#6b7280;--grid:#e5e7eb;--ok:#15803d;--bad:#b91c1c}
@media (prefers-color-scheme:dark){:root{--bg:#0f172a;--fg:#e5e7eb;--muted:#94a3b8;--grid:#334155;--ok:#4ade80;--bad:#f87171}}
body{background:var(--bg);color:var(--fg);font:14px/1.5 system-ui,sans-serif;margin:0 auto;max-width:960px;padding:16px}
svg{width:100%;height:auto}svg text{fill:var(--muted);font-size:11px}.grid{stroke:var(--grid)}
.legend{display:flex;flex-wrap:wrap;gap:12px;color:var(--muted)}.legend i{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:4px}
table{border-collapse:collapse;width:100%;display:block;overflow-x:auto}td,th{border-bottom:1px solid var(--grid);padding:4px 8px;text-align:left;white-space:nowrap}
.ok{color:var(--ok)}.bad{color:var(--bad)}.muted{color:var(--muted)}h2{font-size:16px;margin-top:28px}
</style></head><body><h1>${esc(title)}</h1>
<h2>Runs</h2><table><thead><tr><th>#</th><th>Server</th><th>URL or command</th><th>Started</th><th>Verdict</th><th>Mode</th><th>Concurrency</th><th>Calls</th><th>Tool evals</th><th>Report</th></tr></thead><tbody>${runTable}</tbody></table>
<h2>Regressions</h2>${list(regressionText, "None between consecutive runs.")}
<h2>Comparability</h2>${list(comparability, "Runs share suite, transport, mode, load profile, and parameters.")}
${charts.join("")}
</body></html>`;
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const args = process.argv.slice(2);
  let last, html, suites, title;
  const inputs = [];
  while (args.length) {
    const arg = args.shift();
    if (arg === "--last") last = Number(args.shift());
    else if (arg === "--html") html = args.shift();
    else if (arg === "--suites") suites = args.shift();
    else if (arg === "--title") title = args.shift();
    else inputs.push(arg);
  }
  if (!inputs.length || (last !== undefined && !(last > 0))) {
    console.error("Usage: node runs-dataset.mjs [--last <n>] [--suites <dir>] [--title <text>] [--html <file>] <report.json | runs-dir>...");
    process.exit(2);
  }
  let loaded = loadReports(inputs, suites);
  if (last) loaded = loaded.slice(-last);
  const dataset = buildDataset(loaded, title);
  if (html) writeFileSync(html, renderHtml(dataset));
  console.log(JSON.stringify(dataset, null, 2));
}
