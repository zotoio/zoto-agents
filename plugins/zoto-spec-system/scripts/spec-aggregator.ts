#!/usr/bin/env tsx
/**
 * Spec-root status aggregator CLI. Reads `status/*.status.yml`, writes `status.yml` + `status.md` at spec dir.
 */

import { resolve } from "node:path";

import { aggregateOnce } from "../src/aggregator.js";
import { ConfigValidationError, loadConfig, type SpecSystemConfig } from "../src/config-loader.js";

function readFlag(argv: string[], name: string): string | undefined {
  const i = argv.indexOf(name);
  if (i >= 0 && argv[i + 1] && !argv[i + 1]!.startsWith("--")) {
    return argv[i + 1];
  }
  return undefined;
}

function hasFlag(argv: string[], name: string): boolean {
  return argv.includes(name);
}

function parseArgs(argv: string[]): {
  repoRoot: string;
  specDir: string;
  mode: "once" | "watch" | "validate-only";
} {
  let repoRoot = process.cwd();
  let specDir: string | undefined;
  const modeWatch = hasFlag(argv, "--watch");
  const modeOnce = hasFlag(argv, "--once");
  const modeVal = hasFlag(argv, "--validate-only");
  const modes = [modeWatch, modeOnce, modeVal].filter(Boolean).length;
  if (modes !== 1) {
    throw new Error("Specify exactly one of --watch | --once | --validate-only");
  }
  const rr = readFlag(argv, "--repo-root");
  if (rr) repoRoot = resolve(rr);
  const sd = readFlag(argv, "--spec-dir");
  if (!sd) throw new Error("Missing required --spec-dir <dir>");
  specDir = resolve(repoRoot, sd);
  let mode: "once" | "watch" | "validate-only";
  if (modeWatch) mode = "watch";
  else if (modeVal) mode = "validate-only";
  else mode = "once";
  return { repoRoot, specDir, mode };
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolveFn, reject) => {
    const t = setTimeout(resolveFn, ms);
    if (signal) {
      const onAbort = (): void => {
        clearTimeout(t);
        reject(new Error("aborted"));
      };
      if (signal.aborted) {
        onAbort();
        return;
      }
      signal.addEventListener("abort", onAbort, { once: true });
    }
  });
}

async function runWatch(repoRoot: string, specDir: string, signal: AbortSignal): Promise<void> {
  let prevMtime: number | undefined = undefined;
  let lastGood: SpecSystemConfig = loadConfig(repoRoot).config;

  while (!signal.aborted) {
    try {
      let configReloadAudit: { at: string; mtime: string } | undefined;
      const lr = loadConfig(repoRoot, prevMtime);
      const auditEligible = lr.reloaded && prevMtime !== undefined;
      if (auditEligible) {
        configReloadAudit = {
          at: new Date().toISOString(),
          mtime: new Date(lr.mtimeMs).toISOString(),
        };
      }
      prevMtime = lr.mtimeMs;
      lastGood = lr.config;

      const r = aggregateOnce({
        specDir,
        config: lastGood,
        repoRoot,
        dryRun: false,
        configReloadAudit,
      });
      console.error(
        `[spec-aggregator] ${r.rebuilt ? "rebuilt" : "unchanged"} sources=${r.sourceCount} digest=${r.digest.slice(0, 12)}`,
      );

      try {
        await sleep(lastGood.aggregator.pollIntervalMs, signal);
      } catch {
        break;
      }
    } catch (e) {
      if (e instanceof ConfigValidationError) {
        const nowIso = new Date().toISOString();
        const msg = e.errors.map((x) => x.message ?? "").filter(Boolean).join("; ") || e.message;
        aggregateOnce({
          specDir,
          config: lastGood,
          repoRoot,
          dryRun: false,
          extraAuditEvents: [
            {
              at: nowIso,
              kind: "config_reload_failed",
              message: `ConfigValidationError: ${msg}`,
            },
          ],
        });
        try {
          await sleep(lastGood.aggregator.pollIntervalMs, signal);
        } catch {
          break;
        }
        continue;
      }
      throw e;
    }
  }
}

async function main(): Promise<number> {
  let argv = process.argv.slice(2);
  if (argv[0]?.replace(/\\/g, "/").endsWith("spec-aggregator.ts")) {
    argv = argv.slice(1);
  }
  if (hasFlag(argv, "--help") || hasFlag(argv, "-h")) {
    console.error(`Usage:
  spec-aggregator --spec-dir <dir> --once [--repo-root <dir>]
  spec-aggregator --spec-dir <dir> --watch [--repo-root <dir>]
  spec-aggregator --spec-dir <dir> --validate-only [--repo-root <dir>]
`);
    return 0;
  }

  const { repoRoot, specDir, mode } = parseArgs(argv);

  if (mode === "once") {
    const { config } = loadConfig(repoRoot);
    const r = aggregateOnce({ specDir, config, repoRoot });
    console.log(JSON.stringify(r, null, 2));
    return 0;
  }

  if (mode === "validate-only") {
    const { config } = loadConfig(repoRoot);
    const r = aggregateOnce({ specDir, config, repoRoot, dryRun: true });
    console.log(JSON.stringify(r, null, 2));
    return r.invalidSourcePaths.length > 0 ? 2 : 0;
  }

  const controller = new AbortController();
  const { signal } = controller;
  const onStop = (): void => controller.abort();
  process.on("SIGINT", onStop);
  process.on("SIGTERM", onStop);

  await runWatch(repoRoot, specDir, signal).catch(() => {
    /* SIGINT */
  });
  process.off("SIGINT", onStop);
  process.off("SIGTERM", onStop);
  return 0;
}

main().then(
  (c) => {
    process.exitCode = c;
  },
  (e) => {
    console.error(e instanceof Error ? e.message : String(e));
    process.exitCode = 1;
  },
);
