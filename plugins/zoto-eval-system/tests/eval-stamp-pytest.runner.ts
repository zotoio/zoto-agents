#!/usr/bin/env tsx
/**
 * Subtask-06 smoke harness for the pytest per-primitive stamper.
 *
 * Standalone tsx-runnable script — no global test harness — so it can be
 * executed via:
 *
 *   pnpm exec tsx scripts/__tests__/eval-stamp-pytest.smoke.ts
 *
 * Verifies:
 *   1. `stampPytestPerPrimitive` produces three syntactically valid
 *      pytest files (skill / command / agent) from fixed analyser
 *      payloads.
 *   2. `pytest --collect-only` succeeds against those files.
 *   3. A real `pytest` run emits `evals/_runs/<ts>/static.yml` matching
 *      `result.schema.json` with `backend: "static"` and
 *      `totals.cases >= 3`.
 *   4. The stamper refuses to emit a file when the analyser payload
 *      carries zero assertions.
 *
 * All work happens under `os.tmpdir()`. Nothing under the live repo is
 * mutated.
 */
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";

import Ajv from "ajv";
import { load as yamlLoad } from "js-yaml";

import {
  stampPytestPerPrimitive,
  extractAssertionNeedles,
} from "../scripts/eval-stamp.ts";
import { loadEvalPaths } from "../src/config-loader.js";

const PLUGIN_DIR = resolve(import.meta.dirname, "..");
const REPO_ROOT = resolve(PLUGIN_DIR, "..", "..");
const TPL_PYTEST = join(PLUGIN_DIR, "templates/static/pytest");

interface SmokePayload {
  schema_version: 1;
  analyser_version: string;
  model_id: string;
  target_id: string;
  kind: "skill" | "command" | "agent" | "hook" | "rule";
  source_path: string;
  source_hash: string;
  summary: string;
  cases: Array<{
    scenario: string;
    prompt: string;
    assertions: string[];
  }>;
}

function makePayload(
  kind: "skill" | "command" | "agent",
  name: string,
  hash: string,
): SmokePayload {
  const sourcePath =
    kind === "skill"
      ? `plugins/zoto-eval-system/skills/${name}/SKILL.md`
      : kind === "command"
        ? `plugins/zoto-eval-system/commands/${name}.md`
        : `plugins/zoto-eval-system/agents/${name}.md`;
  return {
    schema_version: 1,
    analyser_version: "2026.05.03-1",
    model_id: "composer-2.5",
    target_id: `${kind}:${name}`,
    kind,
    source_path: sourcePath,
    source_hash: hash,
    summary: `${kind} ${name} smoke fixture for subtask-06 self-test`,
    cases: [
      {
        scenario: "happy path",
        prompt:
          kind === "command"
            ? `/${name} go`
            : `Please trigger ${name} in the standard way.`,
        assertions: [
          "Documents the `askQuestion` interaction pattern in the body.",
          'Mentions "baseline-fixtures" overlay step.',
        ],
      },
      {
        scenario: "edge case missing config",
        prompt: `Run ${name} when .zoto/eval-system/config.yml is absent.`,
        assertions: ["Refuses to proceed without `zotoEvalConfig` present."],
      },
    ],
  };
}

function makeFakeSource(filePath: string, kind: string): void {
  mkdirSync(dirname(filePath), { recursive: true });
  const fm = `name: smoke-${kind}\ndescription: smoke ${kind} for subtask-06\n`;
  const body = [
    "# Smoke primitive",
    "",
    "Documents the askQuestion interaction pattern.",
    "",
    "Uses baseline-fixtures overlays before running.",
    "",
    "Refuses to proceed without zotoEvalConfig present.",
  ].join("\n");
  writeFileSync(filePath, `---\n${fm}---\n${body}\n`, "utf-8");
}

function checkNeedleExtraction(): void {
  const a1 = extractAssertionNeedles(
    "Documents the `askQuestion` interaction pattern in the body.",
  );
  if (!a1.includes("askQuestion")) {
    throw new Error(`needle extraction missed askQuestion: ${a1.join(",")}`);
  }
  const a2 = extractAssertionNeedles('Mentions "baseline-fixtures" overlay.');
  if (!a2.includes("baseline-fixtures")) {
    throw new Error(`missed baseline-fixtures: ${a2.join(",")}`);
  }
  const a3 = extractAssertionNeedles("freeform without identifiers");
  if (!a3.includes("freeform")) {
    throw new Error(`identifier fallback missed: ${a3.join(",")}`);
  }
  console.log(
    JSON.stringify({ extract_needles: "ok", samples: { a1, a2, a3 } }),
  );
}

function main(): void {
  checkNeedleExtraction();

  const root = mkdtempSync(join(tmpdir(), "eval-pytest-smoke-"));
  console.log(`smoke root: ${root}`);

  try {
    const evalHome = join(root, ".zoto", "eval-system");
    mkdirSync(evalHome, { recursive: true });
    cpSync(join(PLUGIN_DIR, "templates"), join(evalHome, "templates"), {
      recursive: true,
    });
    const evalsDir = loadEvalPaths(root).evalsDirAbs;
    mkdirSync(evalsDir, { recursive: true });

    /* Stage conftest + reporter from .tmpl files. The reporter template
     * is named ``_reporter.py.tmpl`` but the conftest expects to import
     * the stamped output from ``_zoto_static_reporter.py`` (matches
     * ``ensurePytestSupportFiles`` in ``scripts/eval-stamp.ts``). */
    const conftestSrc = readFileSync(
      join(TPL_PYTEST, "conftest.py.tmpl"),
      "utf-8",
    );
    writeFileSync(join(evalsDir, "conftest.py"), conftestSrc, "utf-8");
    const reporterSrc = readFileSync(
      join(TPL_PYTEST, "_reporter.py.tmpl"),
      "utf-8",
    );
    writeFileSync(
      join(evalsDir, "_zoto_static_reporter.py"),
      reporterSrc,
      "utf-8",
    );

    const targets: Array<{ kind: "skill" | "command" | "agent"; name: string }> =
      [
        { kind: "skill", name: "smoke-create-evals" },
        { kind: "command", name: "smoke-eval-help" },
        { kind: "agent", name: "smoke-eval-judge" },
      ];

    for (const t of targets) {
      const hash = "a".repeat(64);
      const payload = makePayload(t.kind, t.name, hash);
      const sourceAbs = join(root, payload.source_path);
      makeFakeSource(sourceAbs, t.kind);
      const result = stampPytestPerPrimitive(root, payload, {});
      if (!result.written) {
        throw new Error(
          `expected stampPytestPerPrimitive to write a file: ${JSON.stringify(result)}`,
        );
      }
      if (result.assertions < 1) {
        throw new Error(
          `expected at least one assertion stamped: ${JSON.stringify(result)}`,
        );
      }
      /* Idempotency: rewriting with the same payload must produce the same
       * file. We re-stamp and compare bytes rather than relying on the
       * `written` boolean (which depends on file-mtime / stat differences
       * across platforms). */
      const before = readFileSync(result.outPath, "utf-8");
      stampPytestPerPrimitive(root, payload, {});
      const after = readFileSync(result.outPath, "utf-8");
      if (before !== after) {
        throw new Error(
          `expected idempotent re-stamp; bytes differ for ${result.outPath}`,
        );
      }
      console.log(
        JSON.stringify({
          stamped: result.outPath,
          cases: result.cases,
          assertions: result.assertions,
        }),
      );
    }

    /* Refuse-on-zero-assertions */
    let threw = false;
    try {
      const empty = makePayload("command", "empty", "b".repeat(64));
      empty.cases.forEach((c) => {
        c.assertions = [];
      });
      stampPytestPerPrimitive(root, empty, { slug: "empty-zero" });
    } catch (e) {
      threw = true;
      if (!/zero assertions/i.test((e as Error).message)) {
        throw new Error(
          `expected "zero assertions" message; got: ${(e as Error).message}`,
        );
      }
    }
    if (!threw) {
      throw new Error("expected stamper to throw on zero assertions");
    }
    console.log(JSON.stringify({ refuse_on_zero: "ok" }));

    /* pytest --collect-only must succeed */
    const collectOut = execFileSync(
      "python3",
      ["-m", "pytest", evalsDir, "--collect-only", "-q"],
      {
        cwd: root,
        env: { ...process.env, ZOTO_EVAL_STATIC_REPORT: "off" },
      },
    ).toString();
    console.log("--- pytest --collect-only (head) ---");
    console.log(collectOut.split("\n").slice(0, 30).join("\n"));

    /* Run pytest for real to fire pytest_terminal_summary */
    let runOut = "";
    try {
      runOut = execFileSync(
        "python3",
        ["-m", "pytest", evalsDir, "-v", "--tb=short", "--no-header"],
        { cwd: root, env: { ...process.env } },
      ).toString();
    } catch (e: unknown) {
      runOut =
        (e as { stdout?: Buffer | string }).stdout?.toString() ??
        (e as { stderr?: Buffer | string }).stderr?.toString() ??
        "";
    }
    console.log("--- pytest run (tail) ---");
    console.log(runOut.split("\n").slice(-25).join("\n"));

    /* Locate static.yml */
    const runsRoot = join(evalsDir, "_runs");
    if (!existsSync(runsRoot)) {
      throw new Error(`expected ${runsRoot} to exist`);
    }
    const runDirs = readdirSync(runsRoot);
    if (runDirs.length === 0) {
      throw new Error(`no run dirs under ${runsRoot}`);
    }
    const yamlPath = join(runsRoot, runDirs[0]!, "static.yml");
    if (!existsSync(yamlPath)) {
      throw new Error(`static.yml missing at ${yamlPath}`);
    }
    console.log(`static.yml at: ${yamlPath}`);

    /* Validate against result.schema.json */
    const schemaPath = join(PLUGIN_DIR, "templates/schema/result.schema.json");
    const schema = JSON.parse(readFileSync(schemaPath, "utf-8")) as object;
    const ajv = new Ajv({ allErrors: true, strict: false });
    const validate = ajv.compile(schema);
    const data = yamlLoad(readFileSync(yamlPath, "utf-8")) as {
      backend: string;
      totals: { cases: number; passed: number; failed: number };
      aggregates: { tokens_total: number; duration_ms_total: number };
    };
    const ok = validate(data);
    if (!ok) {
      const errors = (validate as unknown as { errors?: unknown }).errors;
      console.error(JSON.stringify(errors, null, 2));
      throw new Error("static.yml failed schema validation");
    }
    if (data.backend !== "static") {
      throw new Error(`backend must be static; got ${data.backend}`);
    }
    if (data.totals.cases < 3) {
      throw new Error(
        `expected totals.cases >= 3; got ${data.totals.cases}: ${JSON.stringify(data.totals)}`,
      );
    }
    if (data.aggregates.tokens_total !== 0) {
      throw new Error(
        `static backend must report tokens_total=0; got ${data.aggregates.tokens_total}`,
      );
    }
    console.log(
      JSON.stringify({
        validate_ok: true,
        backend: data.backend,
        totals: data.totals,
        duration_ms_total: data.aggregates.duration_ms_total,
      }),
    );
    console.log("SMOKE OK");
  } finally {
    /* Always clean up the smoke directory. */
    try {
      rmSync(root, { recursive: true, force: true });
    } catch {
      /* best effort */
    }
  }
}

main();
