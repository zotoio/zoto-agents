/**
 * Collector caching correctness tests (subtask 03).
 *
 * Uses the counting `FsLike` from `bench/fixtures.ts` to assert warm-tick
 * read counts and snapshot stability across ticks.
 */

import { rm, utimes } from "node:fs/promises";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createCollector, DEFAULT_SLOW_LANE_EVERY } from "../src/discovery/collector.js";
import type { AgentSnapshot } from "../src/types.js";
import { createScaleFixture, type ScaleFixture } from "../bench/fixtures.js";

function stripCapturedAt(snap: AgentSnapshot): Omit<AgentSnapshot, "capturedAt"> & {
  capturedAt?: number;
} {
  const { capturedAt: _c, ...rest } = snap;
  return rest;
}

describe("collector caching", () => {
  let fixture: ScaleFixture;

  beforeAll(async () => {
    fixture = await createScaleFixture("S");
  });

  afterAll(async () => {
    await fixture.dispose();
  });

  function opts() {
    return fixture.collectorOptions({ now: () => fixture.now });
  }

  it("warm tick #2 performs zero readFiles with unchanged files", async () => {
    const collector = createCollector(opts());
    await collector.collect();
    fixture.fs.reset();
    await collector.collect();
    expect(fixture.fs.counts.readFile).toBe(0);
  });

  it("warm tick #2 snapshot matches tick #1 modulo capturedAt", async () => {
    const collector = createCollector(opts());
    const snap1 = await collector.collect();
    const snap2 = await collector.collect();
    expect(stripCapturedAt(snap2)).toEqual(stripCapturedAt(snap1));
  });

  it("warm tick #2 performs zero readWindow tail reads with unchanged logs", async () => {
    const collector = createCollector(opts());
    await collector.collect();
    fixture.fs.reset();
    await collector.collect();
    expect(fixture.fs.counts.readWindow).toBe(0);
  });

  it("touching one transcript mtime invalidates only that log tail", async () => {
    const collector = createCollector(opts());
    await collector.collect();
    const touched = fixture.transcriptFiles[0]!;
    const t = new Date(fixture.now + 1000);
    await utimes(touched, t, t);
    fixture.memFs.addFile(touched, null, {
      size: (await fixture.memFs.stat(touched)).size,
      mtimeMs: t.getTime(),
    });
    fixture.fs.reset();
    await collector.collect();
    expect(fixture.fs.counts.readWindow).toBe(1);
  });

  it("slow lane re-walks session JSON every Nth tick", async () => {
    const collector = createCollector(opts());
    await collector.collect();
    fixture.fs.reset();
    await collector.collect();
    expect(fixture.fs.counts.readFile).toBe(0);
    fixture.fs.reset();
    for (let i = 0; i < DEFAULT_SLOW_LANE_EVERY - 1; i += 1) {
      await collector.collect();
    }
    expect(fixture.fs.counts.readdir).toBeGreaterThan(0);
  });

  it("composer sqlite lookup runs once per tick for live token usage", async () => {
    const local = await createScaleFixture("S");
    try {
      const collector = createCollector(
        local.collectorOptions({ now: () => local.now }),
      );
      local.calls.composer = 0;
      await collector.collect();
      expect(local.calls.composer).toBe(1);
      local.calls.composer = 0;
      await collector.collect();
      expect(local.calls.composer).toBe(1);
      for (let i = 0; i < DEFAULT_SLOW_LANE_EVERY - 1; i += 1) {
        await collector.collect();
      }
      local.calls.composer = 0;
      await collector.collect();
      expect(local.calls.composer).toBeLessThanOrEqual(1);
    } finally {
      await local.dispose();
    }
  });

  it("deleted session JSON drops merged metadata on slow lane", async () => {
    const local = await createScaleFixture("S");
    try {
      const collector = createCollector(
        local.collectorOptions({ now: () => local.now }),
      );
      const snap1 = await collector.collect();
      expect(snap1.nodes["pid:5000"]?.logSource).toBeTruthy();

      const cliJson = `${local.homeDir}/.cursor/cli/chats/cli-session-0.json`;
      await rm(cliJson, { force: true });
      local.memFs.remove(cliJson);

      for (let i = 0; i < DEFAULT_SLOW_LANE_EVERY; i += 1) {
        await collector.collect();
      }
      const snap2 = await collector.collect();
      expect(snap2.nodes["pid:5000"]?.logSource ?? null).toBeNull();
    } finally {
      await local.dispose();
    }
  });
});
