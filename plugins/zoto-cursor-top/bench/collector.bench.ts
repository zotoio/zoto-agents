/**
 * Collector-pipeline benchmarks (vitest bench).
 *
 * Run via `pnpm --filter @zoto-agents/zoto-cursor-top run bench`.
 * Results are recorded in `bench/BASELINE.md` — later subtasks (03
 * collector caching, 07 render windowing, 08 integration) must publish
 * measured deltas against those numbers.
 *
 * Measures, per scale tier (S ~10 / M ~100 / L ~1000 agents):
 *
 *   * warm-process `collector.collect()` end-to-end latency, with the
 *     CLI-default prune flags and with all prunes disabled (the prune
 *     passes are module-private in `src/discovery/collector.ts`, so the
 *     difference between the two variants bounds the hierarchy+prune
 *     cost inside the e2e tick — `buildHierarchy` itself is also
 *     benched directly below);
 *   * stage-level timings for the exported pipeline pieces:
 *     `readSessionRecords`, `readTranscriptRecords`, the
 *     `tailFile`/`tailJsonlMessages` fan-out, and `buildHierarchy`.
 *
 * fs-op counts per tick (D04) are measured during setup with the
 * CountingFs wrapper and printed as a `[fs-ops]` table alongside the
 * bench results. Tail `open()`/`read()` I/O bypasses `FsLike` and is
 * NOT included — see the limitation note in `bench/BASELINE.md`.
 */

import { bench, describe } from "vitest";
import { createCollector, type Collector } from "../src/discovery/collector.js";
import { buildHierarchy, type HierarchyInput } from "../src/discovery/hierarchy.js";
import { tailFile, tailJsonlMessages } from "../src/discovery/logs.js";
import { resolveCursorPaths } from "../src/discovery/paths.js";
import {
  readSessionRecords,
  readTranscriptRecords,
} from "../src/discovery/sessions.js";
import type { AgentSnapshot } from "../src/types.js";
import {
  createScaleFixture,
  registerExitCleanup,
  TIERS,
  type ScaleFixture,
  type Tier,
} from "./fixtures.js";

const DAY_MS = 24 * 60 * 60 * 1000;

interface TierHarness {
  fixture: ScaleFixture;
  /** Reused across iterations — "warm process" semantics. */
  collectorDefault: Collector;
  collectorNoPrunes: Collector;
  cliSessionRoots: string[];
  hierarchyInput: HierarchyInput;
  defaultSnapshot: AgentSnapshot;
}

const harnesses = new Map<Tier, TierHarness>();

for (const tier of TIERS) {
  const fixture = await createScaleFixture(tier);
  registerExitCleanup(fixture);

  const collectorDefault = createCollector(fixture.collectorOptions());
  const collectorNoPrunes = createCollector(
    fixture.collectorOptions({
      cursorOnly: false,
      withLogs: false,
      activeOnly: false,
    }),
  );

  // One instrumented cold tick (default flags) for the fs-op counts table.
  fixture.fs.reset();
  fixture.calls.ps = 0;
  fixture.calls.composer = 0;
  const defaultSnapshot = await collectorDefault.collect();
  const coldOps = { ...fixture.fs.counts };
  const coldOpsTotal = fixture.fs.total();
  const coldTickCalls = { ...fixture.calls };

  // Warm tick #2 — the headline caching metric for subtask 03.
  fixture.fs.reset();
  fixture.calls.ps = 0;
  fixture.calls.composer = 0;
  const warmStart = performance.now();
  await collectorDefault.collect();
  const warmMs = performance.now() - warmStart;
  const warmOps = { ...fixture.fs.counts };
  const warmOpsTotal = fixture.fs.total();
  const warmTickCalls = { ...fixture.calls };

  // Unpruned tick: node list reused as the buildHierarchy stage input.
  const noPruneSnapshot = await collectorNoPrunes.collect();
  const hierarchyInput: HierarchyInput = {
    nodes: Object.values(noPruneSnapshot.nodes).map((n) => ({
      ...n,
      children: [],
    })),
    pidParents: fixture.pidParents,
  };

  harnesses.set(tier, {
    fixture,
    collectorDefault,
    collectorNoPrunes,
    cliSessionRoots: resolveCursorPaths(fixture.homeDir, "linux").cliSessionRoots,
    hierarchyInput,
    defaultSnapshot,
  });

  const c = fixture.counts;
  console.log(
    `[fixture ${tier}] agents=${c.agents} (chats=${c.chats} subs=${c.subagents} cli=${c.cliSessions}) ` +
      `processes=${c.processes} transcriptFiles=${c.transcriptFiles} multiMB=${c.multiMbFiles} ` +
      `bytesOnDisk=${(c.bytesOnDisk / 1024 / 1024).toFixed(1)}MB`,
  );
  console.log(
    `[fs-ops ${tier}] cold collect(): readdir=${coldOps.readdir} readFile=${coldOps.readFile} ` +
      `readWindow=${coldOps.readWindow} stat=${coldOps.stat} exists=${coldOps.exists} total=${coldOpsTotal} ` +
      `psCalls=${coldTickCalls.ps} composerCalls=${coldTickCalls.composer}`,
  );
  console.log(
    `[fs-ops ${tier}] warm tick #2: readFile=${warmOps.readFile} readWindow=${warmOps.readWindow} ` +
      `stat=${warmOps.stat} total=${warmOpsTotal} latencyMs=${warmMs.toFixed(2)} ` +
      `psCalls=${warmTickCalls.ps} composerCalls=${warmTickCalls.composer} ` +
      `| snapshot: nodes=${Object.keys(defaultSnapshot.nodes).length} roots=${defaultSnapshot.roots.length} ` +
      `| unpruned nodes=${Object.keys(noPruneSnapshot.nodes).length}`,
  );
}

const E2E_OPTS = { time: 1500, warmupTime: 200, throws: true } as const;
const STAGE_OPTS = { time: 750, warmupTime: 100, throws: true } as const;

let sink = 0;

for (const tier of TIERS) {
  const h = harnesses.get(tier)!;

  describe(`collector tier ${tier} (${h.fixture.counts.agents} agents)`, () => {
    bench(
      `collect() e2e [default flags] ${tier}`,
      async () => {
        const snap = await h.collectorDefault.collect();
        sink += snap.roots.length;
      },
      E2E_OPTS,
    );

    bench(
      `collect() e2e [prunes off] ${tier}`,
      async () => {
        const snap = await h.collectorNoPrunes.collect();
        sink += snap.roots.length;
      },
      E2E_OPTS,
    );

    bench(
      `stage: readSessionRecords (cli roots) ${tier}`,
      async () => {
        const records = await readSessionRecords(
          h.fixture.fs,
          h.cliSessionRoots,
          "cli",
          [],
        );
        sink += records.length;
      },
      STAGE_OPTS,
    );

    bench(
      `stage: readTranscriptRecords ${tier}`,
      async () => {
        const records = await readTranscriptRecords(
          h.fixture.fs,
          h.fixture.transcriptRoots,
          [],
          { maxAgeMs: DAY_MS },
        );
        sink += records.length;
      },
      STAGE_OPTS,
    );

    bench(
      `stage: tail fan-out (tailJsonlMessages+tailFile) ${tier}`,
      async () => {
        const tails = await Promise.all([
          ...h.fixture.transcriptFiles.map((p) => tailJsonlMessages(p, 3)),
          ...h.fixture.plainLogFiles.map((p) => tailFile(p, 3)),
        ]);
        sink += tails.length;
      },
      STAGE_OPTS,
    );

    bench(
      `stage: buildHierarchy ${tier}`,
      () => {
        const result = buildHierarchy(h.hierarchyInput);
        sink += result.roots.length;
      },
      STAGE_OPTS,
    );
  });
}

export { sink };
