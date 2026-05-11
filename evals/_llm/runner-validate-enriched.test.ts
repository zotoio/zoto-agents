#!/usr/bin/env tsx
/**
 * Subtask 10 — runner enriched-shape gate tests.
 *
 * Loads three fixture enriched `evals.json` files and asserts the runner's
 * `validateEnriched(case)` accepts every case. Then loads three fixture
 * under-specified files (missing prompt, missing assertion, missing
 * `_meta.primitive_analysis`) and asserts each is rejected with a clear
 * reason string.
 *
 * The test harness is intentionally dependency-free so it can run with
 * just `tsx evals/_llm/runner-validate-enriched.test.ts`. It does not
 * spin up an Agent or touch the SDK — the gate runs BEFORE any SDK call,
 * so this test stays cheap and deterministic.
 *
 * Naming: this file deliberately uses the `*-validate-enriched.test.ts`
 * suffix so it does not collide with subtask 09's `_user-case-guards.test.ts`
 * or any sibling file in `evals/_llm/`.
 */
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  casesOf,
  loadEvalFile,
  validateEnriched,
  type EvalCase,
} from "../../plugins/zoto-eval-system/engine/case.js";

interface StepResult {
  name: string;
  ok: boolean;
  detail?: string;
}

const results: StepResult[] = [];

function step(name: string, fn: () => void): void {
  try {
    fn();
    results.push({ name, ok: true });
  } catch (e) {
    const err = e as Error;
    results.push({ name, ok: false, detail: err.stack ?? err.message });
  }
}

const VALID_HASH = "a".repeat(64);

/** Build a fully-enriched, runner-acceptable case. */
function enrichedCase(id: string, overrides: Partial<EvalCase> = {}): EvalCase {
  return {
    id,
    prompt:
      overrides.prompt ??
      `${id} — exercise the declarative runner with a realistic user turn.`,
    assertions: overrides.assertions ?? [
      "Response references the requested skill.",
      "Response confirms the manifest was updated.",
    ],
    _meta: overrides._meta ?? {
      generated: true,
      source_hash: VALID_HASH,
      last_updated: "2026-05-04T00:00:00Z",
      generated_by: "zoto-create-evals",
      primitive_analysis: {
        source_hash: VALID_HASH,
        analysed_at: "2026-05-04T00:00:00Z",
        analyser_version: "1.0.0",
        summary: `Stub analyser summary for ${id}.`,
      },
    },
    ...overrides,
  } as EvalCase;
}

function writeEvalsJson(
  dir: string,
  filename: string,
  cases: EvalCase[],
): string {
  const path = join(dir, filename);
  writeFileSync(
    path,
    JSON.stringify({ skill_name: "stub", evals: cases }, null, 2),
    "utf-8",
  );
  return path;
}

const root = mkdtempSync(join(tmpdir(), "runner-validate-enriched-"));

try {
  /* ------------------------------------------------------------------- */
  /* Acceptance fixtures                                                 */
  /* ------------------------------------------------------------------- */
  const acceptedPath = writeEvalsJson(root, "accepted.evals.json", [
    enrichedCase("accepted-1"),
    enrichedCase("accepted-2", {
      prompt:
        "/z-eval-create — bootstrap a fresh repo from scratch including baseline fixtures.",
    }),
    enrichedCase("accepted-3", {
      assertions: ["Single but real behavioural assertion."],
    }),
  ]);

  step("loads three enriched cases without parse errors", () => {
    const cases = casesOf(loadEvalFile(acceptedPath));
    if (cases.length !== 3) {
      throw new Error(`expected 3 cases, got ${cases.length}`);
    }
  });

  step("runner accepts every enriched case", () => {
    const cases = casesOf(loadEvalFile(acceptedPath));
    for (const c of cases) {
      const v = validateEnriched(c);
      if (!v.ok) {
        throw new Error(`case ${c.id} unexpectedly rejected: ${v.reason}`);
      }
    }
  });

  /* ------------------------------------------------------------------- */
  /* Rejection fixtures                                                  */
  /* ------------------------------------------------------------------- */
  const missingPromptPath = writeEvalsJson(root, "missing-prompt.evals.json", [
    enrichedCase("missing-prompt-empty", { prompt: "   " }),
    enrichedCase("missing-prompt-placeholder", { prompt: "TODO" }),
    enrichedCase("missing-prompt-short", { prompt: "hi" }),
  ]);
  const missingAssertionsPath = writeEvalsJson(
    root,
    "missing-assertions.evals.json",
    [
      enrichedCase("missing-assertions-empty", { assertions: [] }),
      enrichedCase("missing-assertions-blank", { assertions: ["   "] }),
      enrichedCase("missing-assertions-non-array", {
        assertions: undefined as unknown as string[],
      }),
    ],
  );
  const missingMetaPath = writeEvalsJson(root, "missing-meta.evals.json", [
    enrichedCase("missing-meta-block", {
      _meta: {
        generated: true,
        source_hash: VALID_HASH,
        last_updated: "2026-05-04T00:00:00Z",
        generated_by: "zoto-create-evals",
      },
    }),
    enrichedCase("missing-meta-fields", {
      _meta: {
        generated: true,
        source_hash: VALID_HASH,
        last_updated: "2026-05-04T00:00:00Z",
        generated_by: "zoto-create-evals",
        primitive_analysis: {
          source_hash: VALID_HASH,
          analysed_at: "2026-05-04T00:00:00Z",
          /* missing analyser_version */
          summary: "stub",
        } as unknown as NonNullable<NonNullable<EvalCase["_meta"]>["primitive_analysis"]>,
      },
    }),
    enrichedCase("missing-meta-bad-hash", {
      _meta: {
        generated: true,
        source_hash: VALID_HASH,
        last_updated: "2026-05-04T00:00:00Z",
        generated_by: "zoto-create-evals",
        primitive_analysis: {
          source_hash: "not-a-real-hash",
          analysed_at: "2026-05-04T00:00:00Z",
          analyser_version: "1.0.0",
          summary: "stub",
        },
      },
    }),
  ]);

  step("rejects every prompt-shaped failure with a clear reason", () => {
    const cases = casesOf(loadEvalFile(missingPromptPath));
    for (const c of cases) {
      const v = validateEnriched(c);
      if (v.ok) {
        throw new Error(`case ${c.id} unexpectedly accepted`);
      }
      const reason = v.reason ?? "";
      const ok =
        /prompt is empty|prompt is too short|placeholder marker|placeholder token/i.test(
          reason,
        );
      if (!ok) {
        throw new Error(
          `case ${c.id}: expected prompt-shaped reason, got: ${reason}`,
        );
      }
    }
  });

  step("rejects every assertion-shaped failure with a clear reason", () => {
    const cases = casesOf(loadEvalFile(missingAssertionsPath));
    for (const c of cases) {
      const v = validateEnriched(c);
      if (v.ok) {
        throw new Error(`case ${c.id} unexpectedly accepted`);
      }
      const reason = v.reason ?? "";
      const ok =
        /no assertions|every assertion must be a non-empty string/i.test(reason);
      if (!ok) {
        throw new Error(
          `case ${c.id}: expected assertion-shaped reason, got: ${reason}`,
        );
      }
    }
  });

  step(
    "rejects every primitive_analysis-shaped failure with a clear reason",
    () => {
      const cases = casesOf(loadEvalFile(missingMetaPath));
      for (const c of cases) {
        const v = validateEnriched(c);
        if (v.ok) {
          throw new Error(`case ${c.id} unexpectedly accepted`);
        }
        const reason = v.reason ?? "";
        const ok =
          /_meta\.primitive_analysis missing|missing required fields|not a 64-char hex/i.test(
            reason,
          );
        if (!ok) {
          throw new Error(
            `case ${c.id}: expected primitive_analysis reason, got: ${reason}`,
          );
        }
      }
    },
  );

  /* ------------------------------------------------------------------- */
  /* User-authored exemption                                             */
  /* ------------------------------------------------------------------- */
  step(
    "user-authored case (no _meta) is exempt from primitive_analysis check",
    () => {
      const c: EvalCase = {
        id: "user-1",
        prompt:
          "User-authored prompt that's still real and contains no placeholder.",
        assertions: ["Behavioural assertion #1."],
      };
      const v = validateEnriched(c);
      if (!v.ok) {
        throw new Error(
          `user-authored case unexpectedly rejected: ${v.reason}`,
        );
      }
    },
  );

  step(
    "user-authored case still must have a non-empty assertion list",
    () => {
      const c: EvalCase = {
        id: "user-2",
        prompt: "User-authored prompt with no assertions.",
        assertions: [],
      };
      const v = validateEnriched(c);
      if (v.ok) {
        throw new Error(
          "user-authored case with no assertions was unexpectedly accepted",
        );
      }
    },
  );

  /* ------------------------------------------------------------------- */
  /* Grader list validation (declarative runner wiring)                   */
  /* ------------------------------------------------------------------- */
  step("rejects generated case with unknown grader type", () => {
    const c = enrichedCase("bad-grader-type", {
      graders: [{ type: "nope", foo: 1 } as unknown as EvalCase["graders"]],
    });
    const v = validateEnriched(c);
    if (v.ok) {
      throw new Error("case with unknown grader type was unexpectedly accepted");
    }
    if (!/unknown type "nope"/i.test(v.reason ?? "")) {
      throw new Error(`expected unknown-type reason, got: ${v.reason}`);
    }
  });

  step("rejects generated case with too-short contains needle", () => {
    const c = enrichedCase("short-needle", {
      graders: [{ type: "contains", needle: "ok" }],
    });
    const v = validateEnriched(c);
    if (v.ok) {
      throw new Error("short contains needle was unexpectedly accepted");
    }
    if (!/shorter than 18 characters/i.test(v.reason ?? "")) {
      throw new Error(`expected short-needle reason, got: ${v.reason}`);
    }
  });

  step("user-authored case may use a short contains needle", () => {
    const c: EvalCase = {
      id: "user-short-needle",
      prompt: "User-authored prompt that's still real and contains no placeholder.",
      assertions: ["Behavioural assertion."],
      graders: [{ type: "contains", needle: "ok" }],
    };
    const v = validateEnriched(c);
    if (!v.ok) {
      throw new Error(`user short needle unexpectedly rejected: ${v.reason}`);
    }
  });

  step("accepts generated case with well-formed graders", () => {
    const c = enrichedCase("graders-ok", {
      graders: [
        { type: "contains", needle: "adequate phrase for grading" },
        { type: "regex", pattern: "\\d+", flags: "i", expect: "match" },
        { type: "tool-called", tool: "Read", minCount: 1 },
        { type: "llm-judge", rubric: "Response is helpful.", passThreshold: 0.5 },
      ],
    });
    const v = validateEnriched(c);
    if (!v.ok) {
      throw new Error(`well-formed graders unexpectedly rejected: ${v.reason}`);
    }
  });
} finally {
  rmSync(root, { recursive: true, force: true });
}

let failed = 0;
for (const r of results) {
  const flag = r.ok ? "PASS" : "FAIL";
  process.stdout.write(`[${flag}] ${r.name}\n`);
  if (!r.ok) {
    failed += 1;
    process.stdout.write(`  detail:\n${r.detail}\n`);
  }
}
process.stdout.write(
  `\n${results.length - failed}/${results.length} steps passed\n`,
);
process.exit(failed === 0 ? 0 : 1);
