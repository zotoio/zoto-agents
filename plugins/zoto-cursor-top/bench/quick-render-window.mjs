/**
 * One-shot windowed vs full row-build timings. Tier S uses the scale
 * fixture collector; M/L use in-memory synthetic snapshots matching baseline
 * visible-row counts (avoids multi-minute cold collect on shared CI).
 */
import { createCollector } from "../src/discovery/collector.js";
import { flattenVisible } from "../src/ui/Tree.js";
import { formatAgentRowLine } from "../src/ui/format.js";
import { DEFAULT_DENSITY } from "../src/ui/theme.js";
import { resolveTreeWindow } from "../src/ui/viewport.js";
import {
  createScaleFixture,
  registerExitCleanup,
} from "./fixtures.js";

const WINDOW_BODY_ROWS = 40;
const ITER = 200;

/** Baseline visible-row counts (fully expanded, default flags). */
const SYNTHETIC_VISIBLE = { M: 86, L: 822 };

function syntheticSnapshot(visibleRows) {
  const nodes = {};
  const roots = [];
  const now = 1_700_000_000_000;
  for (let i = 0; i < visibleRows; i++) {
    const id = `n-${i}`;
    roots.push(id);
    nodes[id] = {
      id,
      parentId: null,
      kind: "agent",
      pid: 1000 + i,
      label: `Agent ${i}`,
      title: `Title ${i}`,
      model: "claude-sonnet-4.5",
      repo: "/workspace",
      startedAt: now - i * 1000,
      status: "running",
      recentLogs: ["log a", "log b", "log c"],
      logSource: null,
      tokenUsage: null,
      children: [],
    };
  }
  return { capturedAt: now, nodes, roots, diagnostics: [] };
}

function timeFullBuild(snapshot, expandedAll, now) {
  const rows = flattenVisible(snapshot, expandedAll);
  const run = () => {
    let sink = 0;
    for (const { id, depth } of rows) {
      const node = snapshot.nodes[id];
      if (!node) continue;
      sink += formatAgentRowLine(node, depth, now, {
        expanded: expandedAll.has(id),
        hasChildren: (node.children?.length ?? 0) > 0,
      }).length;
    }
    return sink;
  };
  run();
  run();
  const t0 = performance.now();
  let sink = 0;
  for (let i = 0; i < ITER; i++) sink += run();
  return { ms: (performance.now() - t0) / ITER, sink };
}

function timeWindowedBuild(snapshot, expandedAll, now) {
  const flat = flattenVisible(snapshot, expandedAll);
  const win = resolveTreeWindow({
    flat,
    snapshot,
    density: DEFAULT_DENSITY,
    selectedIdx: 0,
    scrollRowOffset: 0,
    terminalRows: WINDOW_BODY_ROWS + 8,
    chrome: {},
  });
  const run = () => {
    let sink = 0;
    for (let i = win.startIdx; i < win.endIdx; i++) {
      const row = flat[i];
      if (!row) continue;
      const { id, depth } = row;
      const node = snapshot.nodes[id];
      if (!node) continue;
      sink += formatAgentRowLine(node, depth, now, {
        expanded: expandedAll.has(id),
        hasChildren: (node.children?.length ?? 0) > 0,
      }).length;
    }
    return sink + win.hiddenRowsAbove + win.hiddenRowsBelow;
  };
  run();
  run();
  const t0 = performance.now();
  let sink = 0;
  for (let i = 0; i < ITER; i++) sink += run();
  return { ms: (performance.now() - t0) / ITER, sink, windowRows: win.endIdx - win.startIdx };
}

async function benchSynthetic(tier) {
  const visibleRows = SYNTHETIC_VISIBLE[tier];
  const snapshot = syntheticSnapshot(visibleRows);
  const expandedAll = new Set(Object.keys(snapshot.nodes));
  const now = snapshot.capturedAt;
  const { ms: fullMs } = timeFullBuild(snapshot, expandedAll, now);
  const { ms: winMs, windowRows } = timeWindowedBuild(snapshot, expandedAll, now);
  console.log(
    `[${tier}] visibleRows=${visibleRows} windowRows=${windowRows} fullRowBuild=${fullMs.toFixed(3)}ms ` +
      `windowedRowBuild=${winMs.toFixed(3)}ms ratio=${(winMs / fullMs).toFixed(3)}`,
  );
}

async function benchTierS() {
  const fixture = await createScaleFixture("S");
  registerExitCleanup(fixture);
  const collector = createCollector(fixture.collectorOptions());
  const snapshot = await collector.collect();
  const expandedAll = new Set(Object.keys(snapshot.nodes));
  const now = fixture.now;
  const visibleRows = flattenVisible(snapshot, expandedAll).length;
  const { ms: fullMs } = timeFullBuild(snapshot, expandedAll, now);
  const { ms: winMs, windowRows } = timeWindowedBuild(snapshot, expandedAll, now);
  console.log(
    `[S] visibleRows=${visibleRows} windowRows=${windowRows} fullRowBuild=${fullMs.toFixed(3)}ms ` +
      `windowedRowBuild=${winMs.toFixed(3)}ms ratio=${(winMs / fullMs).toFixed(3)}`,
  );
  await fixture.dispose();
}

async function main() {
  const only = process.argv[2];
  const tiers = only ? [only] : ["S", "M", "L"];
  for (const tier of tiers) {
    if (tier === "S") await benchTierS();
    else if (tier === "M" || tier === "L") await benchSynthetic(tier);
    else console.error(`unknown tier ${tier}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
