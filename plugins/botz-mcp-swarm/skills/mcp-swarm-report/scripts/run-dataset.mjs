#!/usr/bin/env node
/**
 * Turn one botz MCP Swarm run report into a dataset for a per-run canvas or HTML page.
 *
 * Usage:
 *   node run-dataset.mjs [--suites <dir>] [--recording [<alias>=]<file>]... [--max-sample-bytes <n>]
 *                        [--title <text>] [--html <file>] <report.json>
 *
 * Prints JSON { title, server, servers, run, flow, tools, nodes, toolEvals, scenarios, process, notes }.
 * Each tool carries `sample`: { request, response, source: { request, response }, truncated }.
 *   request:  report.redactedArgs (args actually sent, secrets redacted), else a recording,
 *             else a tool-eval call, else the suite step's args template.
 *   response: a record-replay recording, else a tool-eval call's result. Run reports do not
 *             record tool results, so without either the response is null and its source is
 *             "no sample captured".
 * With --html, also writes a self-contained page with a tool <select>; it makes no network requests.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, basename } from "node:path";
import { serverFor, serverLabel, toolKey } from "../../mcp-swarm-compare/scripts/runs-dataset.mjs";

export const NO_SAMPLE = "no sample captured";
const DEFAULT_MAX = 4096;

/** Pretty JSON, cut to `max` bytes. */
export function clip(value, max = DEFAULT_MAX) {
  if (value === undefined) return { text: null, truncated: false };
  const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  const buf = Buffer.from(text, "utf8");
  if (buf.length <= max) return { text, truncated: false };
  return { text: `${buf.subarray(0, max).toString("utf8").replace(/\uFFFD+$/, "")}\n… truncated (${buf.length} bytes)`, truncated: true };
}

/** Walk suite nodes (including group/loop children) into a map by id. */
function suiteNodes(suite) {
  const map = new Map();
  const walk = list => { for (const n of list ?? []) { map.set(n.id, n); walk(n.children); } };
  walk(suite?.nodes);
  return map;
}

function loadSuite(report, file, suitesDir) {
  const dir = suitesDir ?? join(dirname(dirname(file)), "suites");
  try { return JSON.parse(readFileSync(join(dir, report.manifestName, "suite.json"), "utf8")); } catch { return null; }
}

/**
 * tools/call request and response pairs from a record-replay recording, by tool name.
 * Requests and responses are matched by JSON-RPC id (and session), first pair per tool wins.
 */
export function recordingSamples(recording) {
  const pending = new Map();
  const out = new Map();
  for (const frame of recording?.frames ?? []) {
    const p = frame.payload ?? {};
    const key = `${frame.sessionId ?? ""}#${p.id}`;
    if (frame.direction === "request" && frame.method === "tools/call" && p.params?.name) pending.set(key, p.params);
    else if (frame.direction === "response" && pending.has(key)) {
      const params = pending.get(key);
      pending.delete(key);
      if (!out.has(params.name)) out.set(params.name, { request: params.arguments ?? {}, response: p.error ? { error: p.error } : p.result });
    }
  }
  return out;
}

export function buildRunDataset({ file, report, suite = null, suitesDir, recordings = [], title, maxSampleBytes = DEFAULT_MAX }) {
  const server = serverFor(report, file, suitesDir);
  const nodes = suiteNodes(suite);
  const defaultAlias = suite?.defaultServer ?? null;
  const multi = (report.servers?.length ?? 0) > 1;
  const nodeServer = id => { const n = nodes.get(id); return n ? (n.server ?? (multi ? defaultAlias : null)) : null; };
  const notes = [];

  const recs = recordings.map(r => ({ alias: r.alias ?? null, file: basename(r.file), samples: recordingSamples(r.recording) }));
  const fromRecording = (alias, tool) => {
    for (const r of recs) {
      if (r.alias && alias && r.alias !== alias) continue;
      if (!r.alias && multi && recs.length > 1) continue;
      const s = r.samples.get(tool);
      if (s) return { ...s, source: `recording ${r.file}` };
    }
    return null;
  };
  const fromEvals = (alias, tool) => {
    for (const e of report.toolEvals ?? []) {
      if (multi && alias && nodeServer(e.nodeId) && nodeServer(e.nodeId) !== alias) continue;
      const call = (e.toolCalls ?? []).find(c => c.name === tool);
      if (call) return { request: call.arguments, response: call.result, source: `toolEvals ${e.id}` };
    }
    return null;
  };

  const tools = report.toolSeries.map(t => {
    const alias = t.server ?? null;
    const key = toolKey(alias, t.toolName);
    const sent = (report.redactedArgs ?? []).find(a => (a.tool ?? nodes.get(a.nodeId)?.tool) === t.toolName && (!multi || nodeServer(a.nodeId) === alias));
    const rec = fromRecording(alias, t.toolName);
    const ev = fromEvals(alias, t.toolName);
    const step = [...nodes.values()].find(n => n.tool === t.toolName && n.method === "tools/call" && (!multi || (n.server ?? defaultAlias) === alias));
    let request, requestSource;
    if (sent) [request, requestSource] = [sent.args, `report.redactedArgs (step ${sent.nodeId})`];
    else if (rec) [request, requestSource] = [rec.request, rec.source];
    else if (ev && ev.request !== undefined) [request, requestSource] = [ev.request, ev.source];
    else if (step?.args) [request, requestSource] = [step.args, `suite step ${step.id} args (template, before substitution)`];
    else requestSource = NO_SAMPLE;
    let response, responseSource;
    if (rec) [response, responseSource] = [rec.response, rec.source];
    else if (ev && ev.response !== undefined) [response, responseSource] = [ev.response, `${ev.source} (model-driven call during tool evals, not load traffic)`];
    else responseSource = NO_SAMPLE;
    const req = clip(request, maxSampleBytes), res = clip(response, maxSampleBytes);
    const errors = Object.entries(t.errorClass ?? {}).filter(([k, v]) => k !== "none" && v > 0).map(([cls, count]) => ({ class: cls, count }));
    const outcomes = (report.nodeOutcomes ?? []).filter(o => (nodes.get(o.nodeId)?.tool ?? (report.redactedArgs ?? []).find(a => a.nodeId === o.nodeId)?.tool) === t.toolName && (!multi || nodeServer(o.nodeId) === alias));
    const lastError = outcomes.find(o => o.errorMessage)?.errorMessage ?? null;
    return {
      key, tool: t.toolName, server: alias,
      count: t.count, errorRate: t.errorRate, errors, lastError,
      latencyMs: { p50: t.latencyMs.p50, p90: t.latencyMs.p90 ?? null, p95: t.latencyMs.p95, p99: t.latencyMs.p99, mean: t.latencyMs.mean ?? null, std: t.latencyMs.std ?? null },
      bytesIn: t.bytesIn ?? null, bytesOut: t.bytesOut ?? null,
      writeLike: Boolean((report.catalog ?? []).find(c => c.name === t.toolName && (c.server ?? null) === alias)?.writeLike),
      sample: { request: req.text, response: res.text, source: { request: requestSource, response: responseSource }, truncated: req.truncated || res.truncated },
    };
  });

  const servers = multi ? report.servers.map(s => ({ alias: s.alias, name: s.name ?? null, endpoint: s.endpoint ?? null, calls: s.calls, errorRate: s.errorRate, p95: s.latencyMs?.p95 ?? null })) : [];
  const label = serverLabel(server);
  if (!server.name && !server.endpoint) notes.push("The report and suite do not name the server; pass --title naming the server and its URL or command.");
  if (server.source === "suite") notes.push("Server taken from the saved suite (report predates the `server` field); a run with --url or --target-file tested a different endpoint.");
  if (report.silentGreen) notes.push("Silent green: the run did no meaningful work; do not read the numbers as a pass.");
  if (report.verdict !== "pass") notes.push(`Verdict ${report.verdict}${report.failReasons?.length ? `: ${report.failReasons.join("; ")}` : ""}`);
  for (const t of tools) if (t.count < 30) notes.push(`${t.key}: ${t.count} samples; p95/p99 are unreliable below 30.`);
  if (!report.redactedArgs) notes.push("Report has no redactedArgs (older CLI); sample requests come from recordings, tool evals, or suite templates.");
  if (tools.some(t => t.sample.source.response === NO_SAMPLE)) notes.push("Run reports do not record tool results; tools without a recording or tool-eval call have no sample response.");
  if (report.flow?.passesSkipped) notes.push(`${report.flow.passesSkipped} passes stopped at a missing required variable.`);

  return {
    title: title ?? `MCP Swarm run ${report.id}: ${multi ? servers.map(s => `${s.alias}: ${s.name ?? "unknown"} (${s.endpoint ?? "endpoint unknown"})`).join(", ") : label}`,
    server: { ...server, label },
    servers,
    run: {
      id: report.id, file: basename(file), suite: report.manifestName, startedAt: report.startedAt, durationMs: report.durationMs,
      verdict: report.verdict, silentGreen: Boolean(report.silentGreen), failReasons: report.failReasons ?? [],
      mode: report.mode, transport: report.transport, loadProfile: report.loadProfile ?? null,
      callCount: report.quotas?.callCount ?? null, concurrencyUsed: report.quotas?.concurrencyUsed ?? null,
      errorRate: report.quotas?.callCount ? tools.reduce((s, t) => s + t.errorRate * t.count, 0) / tools.reduce((s, t) => s + t.count, 0) : null,
      retries: report.retries?.total ?? 0,
    },
    flow: report.flow ? { passes: report.flow.passes ?? null, passesSkipped: report.flow.passesSkipped ?? null, p50: report.flow.latencyMs?.p50 ?? null, p95: report.flow.latencyMs?.p95 ?? null } : null,
    tools,
    nodes: (report.nodeOutcomes ?? []).map(o => ({ ...o, server: nodeServer(o.nodeId) })),
    toolEvals: (report.toolEvals ?? []).map(e => ({ id: e.id, tool: e.tool, polarity: e.polarity, pass: e.pass, judge: e.judge, reason: e.reason ?? null })),
    scenarios: report.scenarioOutcomes ?? [],
    process: (report.processSeries ?? []).map(p => ({ ts: p.ts, role: p.role, rssMb: Math.round(p.rssBytes / 1048576 * 10) / 10, cpu: p.cpuRatio })),
    notes,
  };
}

const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const ms = v => (v == null ? "–" : `${Number(v).toFixed(1)} ms`);
const pct = v => (v == null ? "–" : `${(v * 100).toFixed(1)}%`);

function barChart(tools) {
  if (!tools.length) return "";
  const max = Math.max(...tools.map(t => t.latencyMs.p99 || t.latencyMs.p95 || 1));
  const rowH = 22, w = 720, left = 200, h = tools.length * rowH + 10;
  const bars = tools.map((t, i) => {
    const y = i * rowH + 4, sx = v => left + (v / max) * (w - left - 70);
    return `<text x="${left - 6}" y="${y + 13}" text-anchor="end">${esc(t.key)}</text>
<rect x="${left}" y="${y}" width="${sx(t.latencyMs.p99) - left}" height="16" fill="#93c5fd"><title>p99 ${ms(t.latencyMs.p99)}</title></rect>
<rect x="${left}" y="${y}" width="${sx(t.latencyMs.p95) - left}" height="16" fill="#2563eb"><title>p95 ${ms(t.latencyMs.p95)}</title></rect>
<rect x="${left}" y="${y + 5}" width="${sx(t.latencyMs.p50) - left}" height="6" fill="#1e3a8a"><title>p50 ${ms(t.latencyMs.p50)}</title></rect>
<text x="${sx(t.latencyMs.p99) + 4}" y="${y + 13}">${ms(t.latencyMs.p95)}</text>`;
  }).join("");
  return `<h2>Latency per tool (p50 · p95 · p99)</h2><svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Latency per tool">${bars}</svg>`;
}

export function renderHtml(d) {
  const data = JSON.stringify(d.tools).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
  const r = d.run;
  const stat = (k, v, cls = "") => `<div class="stat"><div class="muted">${esc(k)}</div><div class="v ${cls}">${esc(v)}</div></div>`;
  const ok = r.verdict === "pass" && !r.silentGreen;
  const options = d.tools.map((t, i) => `<option value="${i}">${esc(t.key)}${t.errorRate > 0 ? ` (${pct(t.errorRate)} errors)` : ""}</option>`).join("");
  const serverTable = d.servers.length ? `<h2>Servers</h2><table><thead><tr><th>Alias</th><th>Server</th><th>URL or command</th><th>Calls</th><th>Errors</th><th>p95</th></tr></thead><tbody>${d.servers.map(s => `<tr><td>${esc(s.alias)}</td><td>${esc(s.name ?? "unknown")}</td><td><code>${esc(s.endpoint ?? "unknown")}</code></td><td>${esc(s.calls)}</td><td>${pct(s.errorRate)}</td><td>${ms(s.p95)}</td></tr>`).join("")}</tbody></table>` : "";
  const evals = d.toolEvals.length ? `<h2>Tool evals</h2><table><thead><tr><th>Case</th><th>Tool</th><th>Polarity</th><th>Result</th><th>Reason</th></tr></thead><tbody>${d.toolEvals.map(e => `<tr><td>${esc(e.id)}</td><td>${esc(e.tool)}</td><td>${esc(e.polarity)}</td><td class="${e.pass ? "ok" : "bad"}">${e.pass ? "pass" : "fail"}</td><td>${esc(e.reason ?? "")}</td></tr>`).join("")}</tbody></table>` : "";
  const notes = d.notes.length ? `<ul>${d.notes.map(n => `<li>${esc(n)}</li>`).join("")}</ul>` : `<p class="muted">None.</p>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(d.title)}</title><style>
:root{--bg:#fff;--fg:#111827;--muted:#6b7280;--grid:#e5e7eb;--ok:#15803d;--bad:#b91c1c;--code:#f3f4f6}
@media (prefers-color-scheme:dark){:root{--bg:#0f172a;--fg:#e5e7eb;--muted:#94a3b8;--grid:#334155;--ok:#4ade80;--bad:#f87171;--code:#1e293b}}
body{background:var(--bg);color:var(--fg);font:14px/1.5 system-ui,sans-serif;margin:0 auto;max-width:980px;padding:16px}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px}.stat{border:1px solid var(--grid);border-radius:8px;padding:8px}.v{font-size:18px;font-weight:600}
svg{width:100%;height:auto}svg text{fill:var(--muted);font-size:11px}
table{border-collapse:collapse;width:100%;display:block;overflow-x:auto}td,th{border-bottom:1px solid var(--grid);padding:4px 8px;text-align:left;white-space:nowrap}
.ok{color:var(--ok)}.bad{color:var(--bad)}.muted{color:var(--muted)}h2{font-size:16px;margin-top:28px}
pre{background:var(--code);padding:10px;border-radius:6px;overflow:auto;max-height:360px;white-space:pre-wrap;word-break:break-all}
.pair{display:grid;grid-template-columns:1fr 1fr;gap:12px}@media (max-width:700px){.pair{grid-template-columns:1fr}}
select{font:inherit;padding:4px 8px;min-width:260px}
</style></head><body><h1>${esc(d.title)}</h1>
<p class="muted">Run <code>${esc(r.id)}</code> · suite ${esc(r.suite)} · ${esc(r.startedAt)} · report <code>${esc(r.file)}</code></p>
<div class="stats">${stat("Verdict", `${r.verdict}${r.silentGreen ? " (silent green)" : ""}`, ok ? "ok" : "bad")}${stat("Calls", r.callCount ?? "–")}${stat("Error rate", pct(r.errorRate))}${stat("Concurrency", r.concurrencyUsed ?? "–")}${stat("Mode", r.mode)}${stat("Duration", ms(r.durationMs))}${d.flow ? stat("Flow p95", ms(d.flow.p95)) : ""}</div>
${r.failReasons.length ? `<h2>Fail reasons</h2><ul>${r.failReasons.map(f => `<li class="bad">${esc(f)}</li>`).join("")}</ul>` : ""}
${serverTable}
${barChart(d.tools)}
<h2>Tool</h2>
<label for="tool">Tool </label><select id="tool">${options}</select>
<div id="detail">
<table><tbody>
<tr><th>Calls</th><td id="d-count"></td><th>Error rate</th><td id="d-err"></td></tr>
<tr><th>p50</th><td id="d-p50"></td><th>p95</th><td id="d-p95"></td></tr>
<tr><th>p99</th><td id="d-p99"></td><th>Mean ± std</th><td id="d-mean"></td></tr>
<tr><th>Errors by class</th><td id="d-classes" colspan="3"></td></tr>
<tr><th>Last error</th><td id="d-last" colspan="3"></td></tr>
</tbody></table>
<div class="pair"><div><h3>Sample request</h3><p class="muted" id="d-reqsrc"></p><pre id="d-req"></pre></div>
<div><h3>Sample response</h3><p class="muted" id="d-ressrc"></p><pre id="d-res"></pre></div></div>
</div>
${evals}
<h2>Notes</h2>${notes}
<script type="application/json" id="tools-data">${data}</script>
<script>
(function(){var tools=JSON.parse(document.getElementById("tools-data").textContent),sel=document.getElementById("tool");
function t(id,v){document.getElementById(id).textContent=v}
function ms(v){return v==null?"–":Number(v).toFixed(1)+" ms"}function pc(v){return v==null?"–":(v*100).toFixed(1)+"%"}
function show(i){var x=tools[i];if(!x)return;t("d-count",x.count);t("d-err",pc(x.errorRate));t("d-p50",ms(x.latencyMs.p50));t("d-p95",ms(x.latencyMs.p95));t("d-p99",ms(x.latencyMs.p99));
t("d-mean",x.latencyMs.mean==null?"–":ms(x.latencyMs.mean)+(x.latencyMs.std==null?"":" ± "+ms(x.latencyMs.std)));
t("d-classes",x.errors.length?x.errors.map(function(e){return e.class+": "+e.count}).join(", "):"none");t("d-last",x.lastError||"–");
t("d-reqsrc","Source: "+x.sample.source.request);t("d-req",x.sample.request==null?"(no sample captured)":x.sample.request);
t("d-ressrc","Source: "+x.sample.source.response+(x.sample.truncated?" · truncated":""));t("d-res",x.sample.response==null?"(no sample captured)":x.sample.response);}
sel.addEventListener("change",function(){show(sel.value)});show(0);})();
</script>
</body></html>`;
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const args = process.argv.slice(2);
  let html, suites, title, max = DEFAULT_MAX;
  const recordingArgs = [], inputs = [];
  while (args.length) {
    const a = args.shift();
    if (a === "--html") html = args.shift();
    else if (a === "--suites") suites = args.shift();
    else if (a === "--title") title = args.shift();
    else if (a === "--recording") recordingArgs.push(args.shift());
    else if (a === "--max-sample-bytes") max = Number(args.shift());
    else inputs.push(a);
  }
  if (inputs.length !== 1 || !(max > 0)) {
    console.error("Usage: node run-dataset.mjs [--suites <dir>] [--recording [<alias>=]<file>]... [--max-sample-bytes <n>] [--title <text>] [--html <file>] <report.json>");
    process.exit(2);
  }
  const file = inputs[0];
  const report = JSON.parse(readFileSync(file, "utf8"));
  if (typeof report.id !== "string" || !Array.isArray(report.toolSeries)) { console.error(`Not a run report: ${file}`); process.exit(2); }
  const recordings = recordingArgs.map(spec => {
    const m = /^([a-z0-9-]{1,32})=(.+)$/.exec(spec);
    const f = m ? m[2] : spec;
    return { alias: m ? m[1] : null, file: f, recording: JSON.parse(readFileSync(f, "utf8")) };
  });
  const dataset = buildRunDataset({ file, report, suite: loadSuite(report, file, suites), suitesDir: suites, recordings, title, maxSampleBytes: max });
  if (html) writeFileSync(html, renderHtml(dataset));
  console.log(JSON.stringify(dataset, null, 2));
}
