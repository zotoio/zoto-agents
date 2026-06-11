/**
 * Renderer benchmarks (vitest bench).
 *
 * Run via `pnpm --filter @zoto-agents/zoto-cursor-top run bench`.
 * Results are recorded in `bench/BASELINE.md`.
 *
 * Measures, per scale tier (S ~10 / M ~100 / L ~1000 agents):
 *
 *   * `renderText(snapshot)` — the `--once` plain-text frame;
 *   * the interactive row-build path: `flattenVisible` over the
 *     fully-expanded tree plus `formatAgentRowLine` for every visible
 *     row (the same per-row work `Tree`/`Row` perform on each Ink
 *     render tick, minus React/Ink overhead).
 *
 * Snapshots are produced once per tier in setup by a real
 * `collector.collect()` run against the scale fixture with CLI-default
 * flags, then rendered repeatedly with a fixed clock.
 */

import { bench, describe } from "vitest";
import { createCollector } from "../src/discovery/collector.js";
import { flattenVisible } from "../src/ui/Tree.js";
import { formatAgentRowLine, formatStart, formatStartForNode } from "../src/ui/format.js";
import { renderText } from "../src/ui/render-text.js";
import { resolveTreeWindow } from "../src/ui/viewport.js";
import type { AgentSnapshot } from "../src/types.js";
import {
  createScaleFixture,
  registerExitCleanup,
  TIERS,
  type Tier,
} from "./fixtures.js";

interface RenderHarness {
  snapshot: AgentSnapshot;
  expandedAll: Set<string>;
  now: number;
  visibleRows: number;
}

const harnesses = new Map<Tier, RenderHarness>();

for (const tier of TIERS) {
  const fixture = await createScaleFixture(tier);
  registerExitCleanup(fixture);
  const collector = createCollector(fixture.collectorOptions());
  const snapshot = await collector.collect();
  const expandedAll = new Set(Object.keys(snapshot.nodes));
  const visibleRows = flattenVisible(snapshot, expandedAll).length;
  harnesses.set(tier, {
    snapshot,
    expandedAll,
    now: fixture.now,
    visibleRows,
  });
  console.log(
    `[render ${tier}] snapshot nodes=${Object.keys(snapshot.nodes).length} ` +
      `roots=${snapshot.roots.length} visibleRows=${visibleRows}`,
  );
}

const OPTS = { time: 750, warmupTime: 100, throws: true } as const;
/** Fixed interactive viewport body rows for windowed benches (htop-style ~40-line body). */
const WINDOW_BODY_ROWS = 40;

let sink = 0;

function benchWindowedFrame(h: RenderHarness): void {
  const flat = flattenVisible(h.snapshot, h.expandedAll);
  const win = resolveTreeWindow({
    flat,
    snapshot: h.snapshot,
    density: "compact",
    selectedIdx: flat.length - 1,
    scrollRowOffset: 0,
    terminalRows: WINDOW_BODY_ROWS + 4,
    chrome: {},
  });
  const quantisedNow = Math.floor(h.now / 1000) * 1000;
  for (let i = win.startIdx; i < win.endIdx; i++) {
    const { id, depth } = flat[i]!;
    const node = h.snapshot.nodes[id];
    if (!node) continue;
    const hasChildren = (node.children?.length ?? 0) > 0;
    const startColumn = formatStartForNode(node, quantisedNow);
    sink += formatAgentRowLine(node, depth, 0, {
      expanded: h.expandedAll.has(id),
      hasChildren,
      startColumn,
    }).length;
  }
  sink += win.hiddenRowsAbove + win.hiddenRowsBelow;
}

for (const tier of TIERS) {
  const h = harnesses.get(tier)!;

  describe(`render tier ${tier} (${h.visibleRows} visible rows)`, () => {
    bench(
      `renderText(snapshot) ${tier}`,
      () => {
        sink += renderText(h.snapshot, h.now).length;
      },
      OPTS,
    );

    bench(
      `row-build: flattenVisible + formatAgentRowLine ${tier}`,
      () => {
        const rows = flattenVisible(h.snapshot, h.expandedAll);
        for (const { id, depth } of rows) {
          const node = h.snapshot.nodes[id];
          if (!node) continue;
          const hasChildren = (node.children?.length ?? 0) > 0;
          sink += formatAgentRowLine(node, depth, h.now, {
            expanded: h.expandedAll.has(id),
            hasChildren,
          }).length;
        }
      },
      OPTS,
    );

    if (tier === "M" || tier === "L") {
      bench(
        `windowed row-build (viewport ${WINDOW_BODY_ROWS} lines) ${tier}`,
        () => {
          benchWindowedFrame(h);
        },
        OPTS,
      );
    }
  });
}

export { sink };
