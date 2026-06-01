/**
 * Path classifiers shared by the static reporter (evals/reporters/zoto-eval-reporter.ts)
 * and the LLM reporter (evals/llm/_shared/zoto-llm-reporter.ts).
 *
 * Spec: specs/20260527-evals-json-first-migration/spec-evals-json-first-migration-20260527.md
 * Subtask: subtask-06-evals-json-first-migration-vitest-config-orchestrator-20260527.md
 *
 * After subtask 02 + 06, Vitest discovers eval cases from three categories
 * of module ids:
 *
 *   1. Real .test.ts files at <host-repo-root>/evals/*.test.ts — the
 *      static smoke tests.
 *   2. Real .test.ts files at <host-repo-root>/evals/scenarios/*.test.ts
 *      — multi-primitive scenario suites (treated as LLM cases — the
 *      authors call defineLlmEval / reportCase directly).
 *   3. Virtual modules with the id prefix \0zoto-eval-json: — synthesised
 *      by evals/llm/_shared/vitest-json-loader.ts (the Vite plugin) from
 *      non-skill ** /evals/*.json files (commands / agents / hooks).
 *      The case payloads run through the LLM harness via defineLlmEval
 *      and are recorded by the LLM reporter (reportCase).
 *   4. Legacy real .test.ts files at <kind>/evals/<name>.test.ts —
 *      pre-migration LLM evals that subtask 07 deletes. Treated as LLM
 *      cases for the brief window they continue to exist.
 *
 * The static reporter (zoto-eval-reporter.ts) is wired into Vitest's
 * reporter chain and therefore sees EVERY it() invocation. To avoid
 * double-counting (LLM cases would otherwise land in BOTH static.yml
 * AND llm.yml) the static reporter MUST partition incoming cases by
 * module id and drop anything that is not category (1).
 *
 * The LLM reporter (zoto-llm-reporter.ts) is invoked explicitly by the
 * harness via reportCase(); the classifiers below are also exported
 * from there so external tooling has a single, canonical helper for
 * "which bucket does this test belong to".
 *
 * Path discrimination rules (mirror the loader's isNonSkillEvalJsonPath):
 *
 *   • Skill eval files (** /skills/<name>/evals/evals.json) are NEVER
 *     classified as LLM JSON sources — they are handled by the skill
 *     harness, never by defineLlmEval. Defence in depth: the loader
 *     already refuses to synthesise a module for them.
 *
 *   • Path separators are normalised to forward slashes so the helpers
 *     work identically on POSIX and Windows. The helpers operate on
 *     strings only — no filesystem reads.
 */
import {
  isNonSkillEvalJsonPath,
  unwrapVirtualEvalJsonId,
  VIRTUAL_PREFIX,
  VIRTUAL_SUFFIX,
} from "./vitest-json-loader.js";

/* Re-export so consumers have a single import surface for path
 * classification + virtual-id constants. */
export {
  VIRTUAL_PREFIX,
  VIRTUAL_SUFFIX,
  isNonSkillEvalJsonPath,
};

/**
 * Decode the absolute filesystem path embedded in a virtual eval-json
 * module id. Returns `null` when `id` is not a virtual eval-json id.
 *
 * Virtual ids have the shape `\0zoto-eval-json:<absPath>.js` — the
 * trailing `.js` suffix is appended by the loader to keep Vite's
 * built-in `vite:json` plugin from intercepting the synthesised JS
 * module (its filter matches anything ending in `.json`). The decoder
 * strips both the prefix and the suffix.
 *
 * @example
 *   decodeVirtualEvalJsonId("\\0zoto-eval-json:/repo/plugins/foo/commands/evals/bar.json.js")
 *   //=> "/repo/plugins/foo/commands/evals/bar.json"
 *   decodeVirtualEvalJsonId("/repo/evals/smoke.test.ts")
 *   //=> null
 */
export function decodeVirtualEvalJsonId(id: string): string | null {
  return unwrapVirtualEvalJsonId(id);
}

/**
 * Returns `true` when `id` is the virtual module id for a non-skill
 * eval JSON file synthesised by the loader. The function intentionally
 * re-validates via `isNonSkillEvalJsonPath` so a malformed id (e.g.
 * an accidentally-synthesised skill file) is still rejected.
 */
export function isLlmJsonSourcePath(id: string): boolean {
  const absPath = decodeVirtualEvalJsonId(id);
  if (absPath === null) return false;
  return isNonSkillEvalJsonPath(absPath);
}

/**
 * Returns `true` when `id` points to a legacy co-located LLM `.test.ts`
 * file under `<kind>/evals/<name>.test.ts` (commands / agents / hooks).
 * These files are migrated to JSON in subtask 07 and the helper
 * disappears once the legacy code path is removed.
 *
 * Examples that match:
 *   • `/repo/plugins/zoto-eval-system/commands/evals/foo.test.ts`
 *   • `/repo/.cursor/agents/evals/bar.test.ts`
 *   • `/repo/plugins/foo/hooks/evals/hooks.test.ts`
 *
 * Examples that do NOT match (handled elsewhere):
 *   • `/repo/evals/smoke.test.ts`            — static reporter
 *   • `/repo/evals/scenarios/foo.test.ts`    — LLM scenarios (see below)
 *   • `/repo/plugins/foo/skills/bar/evals/evals.json` — skill harness
 */
export function isLlmCoLocatedPath(id: string): boolean {
  if (typeof id !== "string") return false;
  const normalised = id.replace(/\\/g, "/");
  if (!normalised.endsWith(".test.ts")) return false;
  const segments = normalised.split("/").filter((s) => s.length > 0);
  if (segments.length < 3) return false;
  const parentDir = segments[segments.length - 2];
  if (parentDir !== "evals") return false;
  /* Reject the top-level `evals/<name>.test.ts` smoke layout (only one
   * segment ancestor above `evals`). Smoke tests at the repo's `evals/`
   * directory are static, not LLM. */
  const ancestors = segments.slice(0, segments.length - 2);
  if (ancestors[ancestors.length - 1] === undefined) return false;
  /* `<kind>` must be one of the recognised primitive folders so we do
   * not accidentally classify unrelated co-located evals/*.test.ts files as
   * LLM evals. */
  const kind = ancestors[ancestors.length - 1];
  return kind === "commands" || kind === "agents" || kind === "hooks";
}

/**
 * Returns `true` when `id` points to a multi-primitive scenario suite
 * authored as a regular `.test.ts` file under `evals/scenarios/`. These
 * files invoke the LLM harness directly (no synthesis); the static
 * reporter MUST exclude them.
 *
 * Underscore-prefixed scaffolding examples
 * (e.g. `_example-multi-primitive.test.ts`) are recognised by both the
 * vitest config exclude AND this classifier so they remain consistent
 * if either filter is bypassed.
 */
export function isLlmScenarioPath(id: string): boolean {
  if (typeof id !== "string") return false;
  const normalised = id.replace(/\\/g, "/");
  if (!normalised.endsWith(".test.ts")) return false;
  const segments = normalised.split("/").filter((s) => s.length > 0);
  if (segments.length < 3) return false;
  const parentDir = segments[segments.length - 2];
  const grandparentDir = segments[segments.length - 3];
  return parentDir === "scenarios" && grandparentDir === "evals";
}

/**
 * Catch-all "is this an LLM-side id?" helper. Returns `true` when the
 * id belongs to any of the three LLM categories:
 *
 *   • Virtual JSON-derived module (category 3).
 *   • Multi-primitive scenario file (category 2).
 *   • Legacy co-located `.test.ts` LLM eval (category 4 — disappears
 *     after subtask 07).
 */
export function isLlmEvalPath(id: string): boolean {
  return (
    isLlmJsonSourcePath(id) ||
    isLlmScenarioPath(id) ||
    isLlmCoLocatedPath(id)
  );
}

/**
 * Returns `true` when `id` should be claimed by the STATIC reporter —
 * a real `.test.ts` file directly under the host repo's `evals/`
 * directory (e.g. `evals/smoke.test.ts`).
 *
 * Explicitly EXCLUDES:
 *   • Virtual `\0zoto-eval-json:*` ids (LLM JSON evals).
 *   • `evals/scenarios/*.test.ts` (LLM scenario suites).
 *   • `<kind>/evals/*.test.ts` legacy co-located LLM evals.
 *   • Anything that does not end in `.test.ts`.
 *
 * The classifier accepts both absolute and repo-relative paths; the
 * absolute form is what Vitest 4.x's `TestModule.moduleId` returns for
 * real files, while the repo-relative form is what tooling may pass in.
 */
export function isStaticEvalPath(id: string): boolean {
  if (typeof id !== "string") return false;
  if (id.startsWith(VIRTUAL_PREFIX)) return false;
  const normalised = id.replace(/\\/g, "/");
  if (!normalised.endsWith(".test.ts")) return false;
  if (isLlmScenarioPath(normalised)) return false;
  if (isLlmCoLocatedPath(normalised)) return false;

  const segments = normalised.split("/").filter((s) => s.length > 0);
  if (segments.length < 2) return false;
  const parentDir = segments[segments.length - 2];
  /* The static smoke tests live DIRECTLY inside an `evals/` directory
   * (not a nested kind folder). E.g. `<repo>/evals/smoke.test.ts`. */
  return parentDir === "evals";
}
