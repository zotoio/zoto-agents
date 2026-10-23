#!/usr/bin/env node
/**
 * Turn one botz MCP Swarm run report into a dataset for a per-run canvas or HTML page.
 *
 * Usage:
 *   node run-dataset.mjs [--suites <dir>] [--recording [<alias>=]<file>]... [--max-sample-bytes <n>]
 *                        [--title <text>] [--html <file>] <report.json>
 *
 * Prints JSON { title, server, servers, run, flow, tools, timeline, timelineSource, nodes, toolEvals, scenarios, process, notes }.
 * timeline[] = { t (s from start), tps, tpsErrors, vus, vusSource, byTool }: TPS measured from report.log step
 * lines; VUs measured from mcp.load.vus lines, else planned from loadProfile; otherwise "not captured".
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


/** Planned active virtual users at `ms` from start, as the runner schedules them (vuStartOffsetMs, drain). */
export function plannedVus(ms, lp) {
  const n = lp?.maxConcurrency ?? 0;
  if (!n) return null;
  const up = lp.rampUpMs ?? 0, hold = lp.durationMs ?? 0, down = lp.rampDownMs ?? 0;
  if (ms < 0) return 0;
  if (ms <= up) return n <= 1 || up <= 0 ? n : Math.min(n, Math.floor((ms * (n - 1)) / up) + 1);
  if (ms <= up + hold) return n;
  if (down > 0 && ms <= up + hold + down) return Math.max(0, Math.round(n * (1 - (ms - up - hold) / down)));
  return 0;
}

/** Milliseconds since the run started for a `HH:MM:SS.mmm` log time (UTC, as the CLI writes it). */
function logMs(time, startMs) {
  const m = /^(\d{2}):(\d{2}):(\d{2})\.(\d{3})/.exec(time);
  if (!m) return null;
  const day = new Date(startMs); day.setUTCHours(0, 0, 0, 0);
  let at = day.getTime() + ((+m[1] * 60 + +m[2]) * 60 + +m[3]) * 1000 + +m[4];
  if (at < startMs - 60000) at += 86400000; // crossed midnight
  return at - startMs;
}

/**
 * Per-second throughput and virtual users.
 * TPS: measured from `mcp.step ... phase=done` lines in report.log (a tail of at most 2000 lines, so long
 * runs cover only their end). VUs: measured from `mcp.load.vus active=` lines, else planned from loadProfile.
 */
export function buildTimeline(report, keyForNode) {
  const startMs = Date.parse(report.startedAt);
  const seconds = Math.max(1, Math.ceil((report.durationMs ?? 0) / 1000));
  const calls = [], vusEvents = [];
  for (const line of report.log ?? []) {
    if (/\s{2}mcp\.step\s{2}/.test(line) && /phase=done/.test(line)) {
      const ms = logMs(line, startMs);
      if (ms == null) continue;
      calls.push({ ms, ok: /result=ok\b/.test(line), node: /(?:^|\s)node=(\S+)/.exec(line)?.[1] ?? null });
    } else if (/\s{2}mcp\.load\.vus\s{2}/.test(line)) {
      const ms = logMs(line, startMs), active = /active=(\d+)/.exec(line);
      if (ms != null && active) vusEvents.push({ ms, active: +active[1] });
    }
  }
  const lp = report.loadProfile;
  const tpsSource = calls.length ? "measured" : null;
  const vusSource = vusEvents.length ? "measured" : (lp?.maxConcurrency ? "planned" : null);
  const notes = [];
  if (!tpsSource && !vusSource) return { timeline: [], source: { tps: "not captured", vus: "not captured" }, coverage: null, notes: ["Throughput and virtual users over time were not captured: the report has no step lines in log[] and no load profile."] };
  const firstCall = calls.length ? Math.min(...calls.map(c => c.ms)) : null;
  const coveredFrom = tpsSource ? Math.max(0, Math.floor(firstCall / 1000)) : null;
  const truncated = tpsSource && (report.log?.length ?? 0) >= 2000 && coveredFrom > 1;
  if (truncated) notes.push(`log[] is the CLI's 2000-line tail, so measured TPS covers only ${coveredFrom}s onward; earlier seconds are blank, not zero.`);
  if (!tpsSource) notes.push("TPS not captured: report.log has no step lines.");
  if (vusSource === "planned") notes.push("Virtual users are planned from the load profile (ramp-up, hold, ramp-down), not measured.");
  const last = Math.max(seconds, ...calls.map(c => Math.ceil(c.ms / 1000)));
  const timeline = [];
  vusEvents.sort((a, b) => a.ms - b.ms);
  let vi = 0, vusNow = 0;
  for (let t = 0; t < last; t++) {
    const inBucket = calls.filter(c => c.ms >= t * 1000 && c.ms < (t + 1) * 1000);
    let vus = null;
    if (vusSource === "measured") {
      let peak = vusNow;
      while (vi < vusEvents.length && vusEvents[vi].ms < (t + 1) * 1000) { vusNow = vusEvents[vi++].active; peak = Math.max(peak, vusNow); }
      vus = peak;
    } else if (vusSource === "planned") vus = plannedVus(t * 1000 + 500, lp);
    const row = { t, tps: null, tpsErrors: null, vus, vusSource: vusSource ?? "not captured" };
    if (tpsSource && !(truncated && t < coveredFrom)) {
      row.tps = inBucket.length;
      row.tpsErrors = inBucket.filter(c => !c.ok).length;
      const byTool = {};
      for (const c of inBucket) { const k = keyForNode(c.node); if (k) byTool[k] = (byTool[k] ?? 0) + 1; }
      row.byTool = byTool;
    }
    timeline.push(row);
  }
  return { timeline, source: { tps: tpsSource ? (truncated ? "measured (log tail, partial)" : "measured (log)") : "not captured", vus: vusSource === "measured" ? "measured (log)" : vusSource === "planned" ? "planned (from load profile)" : "not captured" }, coverage: coveredFrom, notes };
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

  const keyForNode = id => { const n = nodes.get(id); const tool = n?.tool ?? (report.redactedArgs ?? []).find(a => a.nodeId === id)?.tool; return tool ? toolKey(multi ? nodeServer(id) : null, tool) : null; };
  const tl = buildTimeline(report, keyForNode);
  notes.push(...tl.notes);

  return {
    timeline: tl.timeline,
    timelineSource: tl.source,
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


const TL = { w: 720, h: 240, l: 44, r: 44, t: 10, b: 28 };
function timelineChart(d) {
  const tl = d.timeline, src = d.timelineSource;
  if (!tl.length) return `<h2>Throughput and virtual users</h2><p class="muted">Not captured: TPS ${esc(src.tps)}, virtual users ${esc(src.vus)}.</p>`;
  const maxT = Math.max(1, tl.length - 1), maxTps = Math.max(1, ...tl.map(r => r.tps ?? 0)), maxVu = Math.max(1, ...tl.map(r => r.vus ?? 0));
  const x = t => TL.l + (t / maxT) * (TL.w - TL.l - TL.r), yL = v => TL.h - TL.b - (v / maxTps) * (TL.h - TL.t - TL.b), yR = v => TL.h - TL.b - (v / maxVu) * (TL.h - TL.t - TL.b);
  const line = (rows, f, y) => rows.filter(r => f(r) != null).map(r => `${x(r.t).toFixed(1)},${y(f(r)).toFixed(1)}`).join(" ");
  const ticks = [0, 0.5, 1].map(f => `<line class="grid" x1="${TL.l}" x2="${TL.w - TL.r}" y1="${yL(maxTps * f)}" y2="${yL(maxTps * f)}"/><text x="${TL.l - 4}" y="${yL(maxTps * f) + 4}" text-anchor="end">${Math.round(maxTps * f)}</text><text x="${TL.w - TL.r + 4}" y="${yR(maxVu * f) + 4}">${Math.round(maxVu * f)}</text>`).join("");
  const xt = [0, 0.25, 0.5, 0.75, 1].map(f => `<text x="${x(maxT * f)}" y="${TL.h - 8}" text-anchor="middle">${Math.round(maxT * f)}s</text>`).join("");
  const planned = tl[0].vusSource === "planned";
  return `<h2>Throughput and virtual users</h2>
<p class="muted">TPS: ${esc(src.tps)} · virtual users: ${esc(src.vus)}</p>
<svg viewBox="0 0 ${TL.w} ${TL.h}" role="img" aria-label="Calls per second and virtual users over time" data-maxt="${maxT}" data-maxtps="${maxTps}">${ticks}${xt}
<text x="${TL.l}" y="${TL.t + 2}" text-anchor="start" dy="-0">calls/s</text><text x="${TL.w - TL.r}" y="${TL.t + 2}" text-anchor="end">VUs</text>
<polyline fill="none" stroke="#2563eb" stroke-width="2" points="${line(tl, r => r.tps, yL)}"><title>Total calls/s</title></polyline>
<polyline fill="none" stroke="#dc2626" stroke-width="1.5" points="${line(tl, r => r.tpsErrors, yL)}"><title>Errors/s</title></polyline>
<polyline fill="none" stroke="#16a34a" stroke-width="2" stroke-dasharray="${planned ? "6 4" : "0"}" points="${line(tl, r => r.vus, yR)}"><title>Virtual users (${esc(src.vus)})</title></polyline>
<polyline id="tl-tool" fill="none" stroke="#ea580c" stroke-width="1.5" points=""><title>Selected tool calls/s</title></polyline>
</svg>
<div class="legend"><span><i style="background:#2563eb"></i>calls/s</span><span><i style="background:#dc2626"></i>errors/s</span><span><i style="background:#16a34a"></i>virtual users${planned ? " (planned, dashed)" : ""}</span><span><i style="background:#ea580c"></i><span id="tl-tool-label">selected tool</span> calls/s</span></div>`;
}

export function renderHtml(d) {
  const data = JSON.stringify({ tools: d.tools, timeline: d.timeline.map(r => ({ t: r.t, byTool: r.byTool ?? null })) }).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
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
select{font:inherit;padding:4px 8px;min-width:260px}.grid{stroke:var(--grid)}
.legend{display:flex;flex-wrap:wrap;gap:12px;color:var(--muted)}.legend i{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:4px}
</style></head><body><h1>${esc(d.title)}</h1>
<p class="muted">Run <code>${esc(r.id)}</code> · suite ${esc(r.suite)} · ${esc(r.startedAt)} · report <code>${esc(r.file)}</code></p>
<div class="stats">${stat("Verdict", `${r.verdict}${r.silentGreen ? " (silent green)" : ""}`, ok ? "ok" : "bad")}${stat("Calls", r.callCount ?? "–")}${stat("Error rate", pct(r.errorRate))}${stat("Concurrency", r.concurrencyUsed ?? "–")}${stat("Mode", r.mode)}${stat("Duration", ms(r.durationMs))}${d.flow ? stat("Flow p95", ms(d.flow.p95)) : ""}</div>
${r.failReasons.length ? `<h2>Fail reasons</h2><ul>${r.failReasons.map(f => `<li class="bad">${esc(f)}</li>`).join("")}</ul>` : ""}
${serverTable}
${barChart(d.tools)}
${timelineChart(d)}
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
(function(){var D=JSON.parse(document.getElementById("tools-data").textContent),tools=D.tools,tl=D.timeline,sel=document.getElementById("tool");
var svg=document.querySelector("svg[data-maxt]");
function drawTool(key){var pl=document.getElementById("tl-tool");if(!pl||!svg)return;var mt=+svg.dataset.maxt,mx=+svg.dataset.maxtps,W=720,H=240,L=44,R=44,T=10,B=28;
var pts=tl.filter(function(r){return r.byTool}).map(function(r){var v=r.byTool[key]||0;return (L+r.t/mt*(W-L-R)).toFixed(1)+","+(H-B-v/mx*(H-T-B)).toFixed(1)});pl.setAttribute("points",pts.join(" "));document.getElementById("tl-tool-label").textContent=key;}
function t(id,v){document.getElementById(id).textContent=v}
function ms(v){return v==null?"–":Number(v).toFixed(1)+" ms"}function pc(v){return v==null?"–":(v*100).toFixed(1)+"%"}
function show(i){var x=tools[i];if(!x)return;t("d-count",x.count);t("d-err",pc(x.errorRate));t("d-p50",ms(x.latencyMs.p50));t("d-p95",ms(x.latencyMs.p95));t("d-p99",ms(x.latencyMs.p99));
t("d-mean",x.latencyMs.mean==null?"–":ms(x.latencyMs.mean)+(x.latencyMs.std==null?"":" ± "+ms(x.latencyMs.std)));
t("d-classes",x.errors.length?x.errors.map(function(e){return e.class+": "+e.count}).join(", "):"none");t("d-last",x.lastError||"–");
t("d-reqsrc","Source: "+x.sample.source.request);t("d-req",x.sample.request==null?"(no sample captured)":x.sample.request);
t("d-ressrc","Source: "+x.sample.source.response+(x.sample.truncated?" · truncated":""));t("d-res",x.sample.response==null?"(no sample captured)":x.sample.response);}
sel.addEventListener("change",function(){show(sel.value);drawTool(tools[sel.value].key)});show(0);if(tools[0])drawTool(tools[0].key);})();
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
