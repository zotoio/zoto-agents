/**
 * One-shot warm-tick metrics (cold + warm collect per tier). Faster than
 * `vitest bench` — no iteration loops. Used for BASELINE.md post-03 updates.
 */
import { createCollector } from "../src/discovery/collector.js";
import {
  createScaleFixture,
  registerExitCleanup,
  TIERS,
} from "./fixtures.js";

async function main() {
  const only = process.argv[2];
  const tiers = only && TIERS.includes(only) ? [only] : TIERS;
  for (const tier of tiers) {
    console.error(`[setup] tier ${tier}…`);
    const fixture = await createScaleFixture(tier);
    console.error(`[setup] tier ${tier} fixture ready (${fixture.counts.agents} agents)`);
    registerExitCleanup(fixture);
    const collector = createCollector(fixture.collectorOptions());

    fixture.fs.reset();
    fixture.calls.ps = 0;
    fixture.calls.composer = 0;
    console.error(`[setup] tier ${tier} cold collect…`);
    const coldStart = performance.now();
    await collector.collect();
    const coldMs = performance.now() - coldStart;
    console.error(`[setup] tier ${tier} cold done ${coldMs.toFixed(0)}ms`);
    const coldOps = { ...fixture.fs.counts, total: fixture.fs.total() };

    fixture.fs.reset();
    fixture.calls.ps = 0;
    fixture.calls.composer = 0;
    const warmStart = performance.now();
    await collector.collect();
    const warmMs = performance.now() - warmStart;
    const warmOps = { ...fixture.fs.counts, total: fixture.fs.total() };

    console.log(
      `[${tier}] coldMs=${coldMs.toFixed(2)} warmMs=${warmMs.toFixed(2)} ` +
        `coldReadFile=${coldOps.readFile} warmReadFile=${warmOps.readFile} ` +
        `coldReadWindow=${coldOps.readWindow} warmReadWindow=${warmOps.readWindow} ` +
        `warmStat=${warmOps.stat} warmTotal=${warmOps.total}`,
    );
    await fixture.dispose();
  }
}

main().catch((err) => {
  console.error("fatal:", err);
  process.exit(1);
});

process.on("unhandledRejection", (err) => {
  console.error("unhandledRejection:", err);
  process.exit(1);
});
