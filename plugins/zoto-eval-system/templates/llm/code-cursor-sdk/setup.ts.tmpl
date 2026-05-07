// _meta.generated: true
/**
 * Test-framework-agnostic setup for the `code`-strategy LLM evals.
 *
 * Stamped into `evals/llm/_shared/setup.ts`. Both vitest and jest
 * invoke this file via their respective `setupFiles` configs so
 * there is exactly one copy of the gating logic.
 *
 * Responsibilities:
 *   1. Load `.env` at the host repo root so `CURSOR_API_KEY` is
 *      populated before the stamped test files read `process.env`.
 *   2. Print a single terse stderr line noting whether the LLM path
 *      will run or skip. This matches `evals/_llm/runner.ts`'s
 *      `--full` gate UX.
 *   3. Pre-stamp the repo-wide baseline so the first sandbox copy
 *      doesn't race across workers.
 */
import "dotenv/config";

import { existsSync } from "node:fs";
import { join } from "node:path";

import { resolveBaselineDir } from "../../_llm/sandbox.js";

const REPO_ROOT = process.cwd();
const CONFIG_PATH = join(REPO_ROOT, ".zoto", "eval-system", "config.yml");

if (!process.env.CURSOR_API_KEY) {
  process.stderr.write(
    "[zoto-eval-llm] CURSOR_API_KEY not set — all LLM code-strategy cases will skip.\n",
  );
} else {
  process.stderr.write(
    `[zoto-eval-llm] CURSOR_API_KEY present — running LLM code-strategy cases (config=${
      existsSync(CONFIG_PATH) ? CONFIG_PATH : "<missing>"
    }).\n`,
  );
}

const baseline = resolveBaselineDir(REPO_ROOT);
if (!existsSync(baseline)) {
  process.stderr.write(
    `[zoto-eval-llm] WARN baseline fixtures missing at ${baseline} — run \`pnpm run eval:baseline-stamp\`.\n`,
  );
}
