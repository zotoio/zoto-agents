/**
 * Unit tests for `scripts/eval-migrate-ts-to-json.ts` (spec subtask 07).
 *
 * Coverage:
 *   - Fixture `.test.ts` with a known `CASES` literal extracts the
 *     expected JSON shape (`target_id`, `_meta.generated: true`,
 *     `_meta.model_id`, `_meta.judge_model`, `_meta.case_timeout_ms`,
 *     `_meta.migrated_from`, `_meta.migrated_at`, `cases`).
 *   - `defineLlmEval` arg extraction handles `process.env.X ?? "<default>"`
 *     correctly for `modelId` / `judgeModel`.
 *   - Hybrid / malformed input (missing CASES, missing defineLlmEval,
 *     template literal in CASES, `process.env` reference in CASES) is
 *     captured as an audit `failed` entry whose error message names the
 *     source file.
 *   - Idempotency: re-running on an already-migrated directory is a no-op.
 *   - Variable name detection handles `CASES`, `SUITE_CASES`, and
 *     `LlmCaseDefinition[]`-typed bindings.
 *   - Per-case `_meta.generated: true` markers are preserved verbatim.
 *   - `interactions.answers[]` blocks survive the round-trip.
 *
 * Run: pnpm exec vitest run scripts/eval-migrate-ts-to-json.test.ts
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it, beforeEach, afterEach } from "vitest";

import {
  extractFromSource,
  ExtractionError,
  migrateOne,
  runMigration,
  buildEvalFileJson,
  findCoLocatedTsEvals,
  parseCli,
} from "./eval-migrate-ts-to-json.ts";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, "..");
const SCHEMA_DIR = resolve(
  REPO_ROOT,
  "plugins",
  "zoto-eval-system",
  "templates",
  "schema",
);

const NOW_ISO = "2026-05-27T15:30:00.000Z";

function mkScratch(prefix: string): string {
  return mkdtempSync(join(tmpdir(), `eval-migrate-${prefix}-`));
}

function writeFixture(scratch: string, rel: string, body: string): string {
  const abs = join(scratch, rel);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, body, "utf-8");
  return abs;
}

function sampleTsBody(targetId: string, caseId: string): string {
  return [
    "// _meta.generated: true",
    "import { describe, it, afterAll, expect } from \"vitest\";",
    "import type { LlmCaseDefinition } from \"../../../evals/llm/_shared/llm-case.js\";",
    "import { defineLlmEval } from \"../../../evals/llm/_shared/run-llm-suite.js\";",
    "",
    "const CASES: LlmCaseDefinition[] = [",
    "  {",
    `    \"id\": \"${caseId}\",`,
    "    \"prompt\": \"hello world\",",
    "    \"assertions\": [\"response is friendly\"],",
    "    \"_meta\": {",
    "      \"generated\": true,",
    "      \"source_hash\": \"" + "a".repeat(64) + "\",",
    "      \"last_updated\": \"2026-05-26T03:26:08.418Z\",",
    "      \"generated_by\": \"zoto-create-evals\",",
    "      \"primitive_analysis\": {",
    "        \"source_hash\": \"" + "a".repeat(64) + "\",",
    "        \"analysed_at\": \"2026-05-26T03:26:08.418Z\",",
    "        \"analyser_version\": \"2026.05.26-1\",",
    "        \"summary\": \"sample primitive analysis summary\"",
    "      }",
    "    }",
    "  }",
    "];",
    "",
    "defineLlmEval({",
    `  targetId: \"${targetId}\",`,
    "  cases: CASES,",
    "  modelId: process.env.ZOTO_EVAL_MODEL ?? \"composer-2.5\",",
    "  judgeModel: process.env.ZOTO_EVAL_JUDGE_MODEL ?? \"claude-opus-4-8[]\",",
    "  caseTimeoutMs: 180000,",
    "  describe,",
    "  it,",
    "  afterAll,",
    "  expect,",
    "});",
    "",
  ].join("\n");
}

function sampleSuiteCasesBody(targetId: string): string {
  return [
    "// _meta.generated: true",
    "import { describe, it, afterAll, expect } from \"vitest\";",
    "import { defineLlmEval } from \"../../../evals/llm/_shared/run-llm-suite.js\";",
    "",
    "const SUITE_CASES = [",
    "  {",
    "    id: \"alpha\",",
    "    prompt: \"a\",",
    "    assertions: [\"x\"],",
    "  },",
    "  {",
    "    id: \"beta\",",
    "    prompt: \"b\",",
    "    assertions: [\"y\"],",
    "  },",
    "] as unknown as import(\"../../../evals/llm/_shared/llm-case.js\").LlmCaseDefinition[];",
    "",
    "defineLlmEval({",
    `  targetId: \"${targetId}\",`,
    "  cases: SUITE_CASES,",
    "  modelId: process.env.ZOTO_EVAL_MODEL ?? \"composer-2.5\",",
    "  judgeModel: process.env.ZOTO_EVAL_JUDGE_MODEL ?? \"claude-opus-4-8[]\",",
    "  caseTimeoutMs: 180000,",
    "  describe,",
    "  it,",
    "  afterAll,",
    "  expect,",
    "});",
    "",
  ].join("\n");
}

function sampleInteractionsBody(targetId: string): string {
  return [
    "// _meta.generated: true",
    "import { describe, it, afterAll, expect } from \"vitest\";",
    "import type { LlmCaseDefinition } from \"../../../evals/llm/_shared/llm-case.js\";",
    "import { defineLlmEval } from \"../../../evals/llm/_shared/run-llm-suite.js\";",
    "",
    "const CASES: LlmCaseDefinition[] = [",
    "  {",
    "    \"id\": \"with-interactions\",",
    "    \"prompt\": \"ask me\",",
    "    \"assertions\": [\"answers preserved\"],",
    "    \"interactions\": {",
    "      \"questions\": [\"q1\", \"q2\"],",
    "      \"answers\": [\"a1\", \"a2\"]",
    "    }",
    "  }",
    "];",
    "",
    "defineLlmEval({",
    `  targetId: \"${targetId}\",`,
    "  cases: CASES,",
    "  modelId: process.env.ZOTO_EVAL_MODEL ?? \"composer-2.5\",",
    "  judgeModel: process.env.ZOTO_EVAL_JUDGE_MODEL ?? \"claude-opus-4-8[]\",",
    "  caseTimeoutMs: 180000,",
    "  describe,",
    "  it,",
    "  afterAll,",
    "  expect,",
    "});",
    "",
  ].join("\n");
}

describe("extractFromSource", () => {
  it("extracts targetId, modelId default, judgeModel default, caseTimeoutMs, and cases", () => {
    const body = sampleTsBody("command:sample", "case-1");
    const r = extractFromSource(body, "/tmp/sample.test.ts");
    expect(r.targetId).toBe("command:sample");
    expect(r.modelId).toBe("composer-2.5");
    expect(r.judgeModel).toBe("claude-opus-4-8[]");
    expect(r.caseTimeoutMs).toBe(180000);
    expect(r.cases).toHaveLength(1);
    expect((r.cases[0] as { id: string }).id).toBe("case-1");
    expect((r.cases[0] as { _meta?: { generated?: boolean } })._meta?.generated).toBe(true);
    expect(r.casesVarName).toBe("CASES");
  });

  it("detects SUITE_CASES and the as-cast pattern", () => {
    const body = sampleSuiteCasesBody("agent:demo");
    const r = extractFromSource(body, "/tmp/demo.test.ts");
    expect(r.casesVarName).toBe("SUITE_CASES");
    expect(r.cases).toHaveLength(2);
    expect((r.cases[0] as { id: string }).id).toBe("alpha");
    expect((r.cases[1] as { id: string }).id).toBe("beta");
  });

  it("throws ExtractionError when CASES variable is missing", () => {
    const body = [
      "import { defineLlmEval } from \"x\";",
      "defineLlmEval({ targetId: \"command:nope\", cases: [], describe, it, afterAll, expect });",
    ].join("\n");
    expect(() => extractFromSource(body, "/tmp/missing-cases.test.ts")).toThrow(
      ExtractionError,
    );
  });

  it("throws ExtractionError when defineLlmEval call is missing", () => {
    const body = [
      "import type { LlmCaseDefinition } from \"x\";",
      "const CASES: LlmCaseDefinition[] = [];",
    ].join("\n");
    expect(() => extractFromSource(body, "/tmp/missing-define.test.ts")).toThrow(
      ExtractionError,
    );
  });

  it("throws ExtractionError when CASES contains template literals", () => {
    const body = [
      "import type { LlmCaseDefinition } from \"x\";",
      "import { defineLlmEval } from \"y\";",
      "const FOO = \"bar\";",
      "const CASES: LlmCaseDefinition[] = [",
      "  { id: `case-${FOO}`, prompt: \"x\", assertions: [\"y\"] }",
      "];",
      "defineLlmEval({ targetId: \"command:tpl\", cases: CASES, describe, it, afterAll, expect });",
    ].join("\n");
    expect(() => extractFromSource(body, "/tmp/tpl.test.ts")).toThrow(
      ExtractionError,
    );
  });

  it("throws ExtractionError when CASES references process.env", () => {
    const body = [
      "import type { LlmCaseDefinition } from \"x\";",
      "import { defineLlmEval } from \"y\";",
      "const CASES: LlmCaseDefinition[] = [",
      "  { id: process.env.FOO ?? \"x\", prompt: \"x\", assertions: [\"y\"] }",
      "];",
      "defineLlmEval({ targetId: \"command:env\", cases: CASES, describe, it, afterAll, expect });",
    ].join("\n");
    expect(() => extractFromSource(body, "/tmp/env.test.ts")).toThrow(
      ExtractionError,
    );
  });

  it("throws ExtractionError when CASES contains spread operators (with imported identifier)", () => {
    const body = [
      "import type { LlmCaseDefinition } from \"x\";",
      "import { defineLlmEval } from \"y\";",
      "import { MORE } from \"./more.js\";",
      "const CASES: LlmCaseDefinition[] = [",
      "  ...MORE,",
      "  { id: \"a\", prompt: \"x\", assertions: [\"y\"] }",
      "];",
      "defineLlmEval({ targetId: \"command:spread\", cases: CASES, describe, it, afterAll, expect });",
    ].join("\n");
    expect(() => extractFromSource(body, "/tmp/spread.test.ts")).toThrow(
      ExtractionError,
    );
  });
});

describe("buildEvalFileJson", () => {
  it("produces a fully-formed _meta envelope with migrated_from / migrated_at", () => {
    const body = sampleTsBody("command:e", "case-1");
    const ext = extractFromSource(body, "/tmp/e.test.ts");
    const json = buildEvalFileJson(ext, "plugins/x/commands/evals/e.test.ts", NOW_ISO);
    expect(json.target_id).toBe("command:e");
    const meta = json._meta as Record<string, unknown>;
    expect(meta.generated).toBe(true);
    expect(meta.model_id).toBe("composer-2.5");
    expect(meta.judge_model).toBe("claude-opus-4-8[]");
    expect(meta.case_timeout_ms).toBe(180000);
    expect(meta.migrated_from).toBe("plugins/x/commands/evals/e.test.ts");
    expect(meta.migrated_at).toBe(NOW_ISO);
    const cases = json.cases as Array<Record<string, unknown>>;
    expect(cases).toHaveLength(1);
    expect(cases[0].id).toBe("case-1");
  });

  it("preserves interactions.answers verbatim", () => {
    const body = sampleInteractionsBody("agent:i");
    const ext = extractFromSource(body, "/tmp/i.test.ts");
    const json = buildEvalFileJson(ext, "plugins/x/agents/evals/i.test.ts", NOW_ISO);
    const c0 = (json.cases as Array<Record<string, unknown>>)[0];
    const interactions = c0.interactions as Record<string, unknown>;
    expect(interactions.questions).toEqual(["q1", "q2"]);
    expect(interactions.answers).toEqual(["a1", "a2"]);
  });
});

describe("migrateOne + runMigration", () => {
  let scratch: string;

  beforeEach(() => {
    scratch = mkScratch("scratch");
  });
  afterEach(() => {
    rmSync(scratch, { recursive: true, force: true });
  });

  it("migrates a single fixture and validates against eval-file.schema.json", () => {
    const ts = writeFixture(
      scratch,
      "plugins/foo/commands/evals/bar.test.ts",
      sampleTsBody("command:bar", "case-1"),
    );
    const r = migrateOne(ts, { repoRoot: scratch, nowIso: NOW_ISO, schemaDir: SCHEMA_DIR });
    expect(r.audit.status).toBe("migrated");
    expect(r.audit.targetId).toBe("command:bar");
    expect(r.audit.caseCount).toBe(1);
    expect(r.payload).not.toBeNull();
  });

  it("dry-run writes nothing and audits as planned migrations", async () => {
    writeFixture(
      scratch,
      "plugins/foo/commands/evals/a.test.ts",
      sampleTsBody("command:a", "c1"),
    );
    writeFixture(
      scratch,
      "plugins/foo/agents/evals/b.test.ts",
      sampleTsBody("agent:b", "c2"),
    );
    const result = await runMigration(
      {
        repoRoot: scratch,
        apply: false,
        keepTs: false,
        singleFile: null,
        auditPath: "audit.md",
        schemaDir: SCHEMA_DIR,
      },
      "--dry-run",
    );
    expect(result.exitCode).toBe(0);
    expect(result.audit).toHaveLength(2);
    for (const e of result.audit) expect(e.status).toBe("migrated");
    // Nothing on disk in dry-run.
    expect(existsSync(join(scratch, "plugins/foo/commands/evals/a.json"))).toBe(false);
    expect(existsSync(join(scratch, "plugins/foo/agents/evals/b.json"))).toBe(false);
    expect(existsSync(join(scratch, "plugins/foo/commands/evals/a.test.ts"))).toBe(true);
  });

  it("keep-ts writes JSON but leaves TS in place", async () => {
    writeFixture(
      scratch,
      "plugins/foo/commands/evals/k.test.ts",
      sampleTsBody("command:k", "kc"),
    );
    const result = await runMigration(
      {
        repoRoot: scratch,
        apply: false,
        keepTs: true,
        singleFile: null,
        auditPath: "audit.md",
        schemaDir: SCHEMA_DIR,
      },
      "--keep-ts",
    );
    expect(result.exitCode).toBe(0);
    expect(existsSync(join(scratch, "plugins/foo/commands/evals/k.json"))).toBe(true);
    expect(existsSync(join(scratch, "plugins/foo/commands/evals/k.test.ts"))).toBe(true);
    const body = JSON.parse(readFileSync(join(scratch, "plugins/foo/commands/evals/k.json"), "utf-8"));
    expect(body.target_id).toBe("command:k");
    expect(body._meta.generated).toBe(true);
    expect(body._meta.model_id).toBe("composer-2.5");
  });

  it("apply writes JSON and deletes the TS source", async () => {
    writeFixture(
      scratch,
      "plugins/foo/commands/evals/x.test.ts",
      sampleTsBody("command:x", "xc"),
    );
    const result = await runMigration(
      {
        repoRoot: scratch,
        apply: true,
        keepTs: false,
        singleFile: null,
        auditPath: "audit.md",
        schemaDir: SCHEMA_DIR,
      },
      "--apply",
    );
    expect(result.exitCode).toBe(0);
    expect(existsSync(join(scratch, "plugins/foo/commands/evals/x.json"))).toBe(true);
    expect(existsSync(join(scratch, "plugins/foo/commands/evals/x.test.ts"))).toBe(false);
  });

  it("is idempotent: re-running on an already-migrated dir is a no-op", async () => {
    writeFixture(
      scratch,
      "plugins/foo/commands/evals/y.test.ts",
      sampleTsBody("command:y", "yc"),
    );
    const r1 = await runMigration(
      {
        repoRoot: scratch,
        apply: true,
        keepTs: false,
        singleFile: null,
        auditPath: "audit.md",
        schemaDir: SCHEMA_DIR,
      },
      "--apply",
    );
    expect(r1.exitCode).toBe(0);
    const r2 = await runMigration(
      {
        repoRoot: scratch,
        apply: true,
        keepTs: false,
        singleFile: null,
        auditPath: "audit2.md",
        schemaDir: SCHEMA_DIR,
      },
      "--apply",
    );
    expect(r2.exitCode).toBe(0);
    expect(r2.audit).toHaveLength(0);
    expect(r2.audit.filter((e) => e.status === "failed")).toHaveLength(0);
  });

  it("captures malformed input as a failed audit entry without writing JSON", async () => {
    const ts = writeFixture(
      scratch,
      "plugins/foo/commands/evals/bad.test.ts",
      [
        "// _meta.generated: true",
        "import { defineLlmEval } from \"x\";",
        "const FOO = \"bar\";",
        "const CASES = [",
        "  { id: `${FOO}`, prompt: \"x\", assertions: [\"y\"] }",
        "] as unknown as import(\"./llm-case.js\").LlmCaseDefinition[];",
        "defineLlmEval({ targetId: \"command:bad\", cases: CASES, describe, it, afterAll, expect });",
      ].join("\n"),
    );
    const result = await runMigration(
      {
        repoRoot: scratch,
        apply: true,
        keepTs: false,
        singleFile: null,
        auditPath: "audit.md",
        schemaDir: SCHEMA_DIR,
      },
      "--apply",
    );
    expect(result.exitCode).toBe(2);
    const failed = result.audit.filter((e) => e.status === "failed");
    expect(failed).toHaveLength(1);
    expect(failed[0].error).toMatch(/AST extraction failed/);
    // Source TS is preserved when extraction fails.
    expect(existsSync(ts)).toBe(true);
    expect(existsSync(join(scratch, "plugins/foo/commands/evals/bad.json"))).toBe(false);
  });

  it("--single migrates one file only and does not touch manifest", async () => {
    const ts = writeFixture(
      scratch,
      "plugins/foo/commands/evals/single.test.ts",
      sampleTsBody("command:single", "sc"),
    );
    writeFixture(
      scratch,
      "plugins/foo/commands/evals/other.test.ts",
      sampleTsBody("command:other", "oc"),
    );
    const result = await runMigration(
      {
        repoRoot: scratch,
        apply: false,
        keepTs: true,
        singleFile: ts,
        auditPath: "audit.md",
        schemaDir: SCHEMA_DIR,
      },
      "--single --keep-ts",
    );
    expect(result.exitCode).toBe(0);
    expect(result.audit).toHaveLength(1);
    expect(result.audit[0].targetId).toBe("command:single");
    expect(existsSync(join(scratch, "plugins/foo/commands/evals/single.json"))).toBe(true);
    expect(existsSync(join(scratch, "plugins/foo/commands/evals/other.json"))).toBe(false);
    // Manifest rewrite skipped for --single.
    expect(result.manifestRewrites).toBe(0);
    expect(result.historyAppended).toBe(false);
  });

  it("rewrites manifest eval_files entries from .test.ts to .json", async () => {
    writeFixture(
      scratch,
      "plugins/foo/commands/evals/m.test.ts",
      sampleTsBody("command:m", "mc"),
    );
    const manifestBody = [
      "schema_version: 1",
      "targets:",
      "  - id: command:m",
      "    kind: command",
      "    eval_files:",
      "      - plugins/foo/commands/evals/m.test.ts",
      "",
    ].join("\n");
    writeFixture(scratch, ".zoto/eval-system/manifest.yml", manifestBody);
    const result = await runMigration(
      {
        repoRoot: scratch,
        apply: true,
        keepTs: false,
        singleFile: null,
        auditPath: "audit.md",
        schemaDir: SCHEMA_DIR,
      },
      "--apply",
    );
    expect(result.exitCode).toBe(0);
    expect(result.manifestRewrites).toBe(1);
    expect(result.historyAppended).toBe(true);
    const rewritten = readFileSync(join(scratch, ".zoto/eval-system/manifest.yml"), "utf-8");
    expect(rewritten).toContain("plugins/foo/commands/evals/m.json");
    expect(rewritten).not.toContain("plugins/foo/commands/evals/m.test.ts");
    const history = readFileSync(
      join(scratch, ".zoto/eval-system/manifest.history.yml"),
      "utf-8",
    );
    expect(history).toContain("bulk-migration");
    expect(history).toContain("20260527-evals-json-first-migration");
  });

  it("preserves per-case _meta.generated: true marker", () => {
    const ts = writeFixture(
      scratch,
      "plugins/foo/agents/evals/p.test.ts",
      sampleTsBody("agent:p", "pc"),
    );
    const r = migrateOne(ts, { repoRoot: scratch, nowIso: NOW_ISO, schemaDir: SCHEMA_DIR });
    const c0 = (r.payload?.cases as Array<Record<string, unknown>>)[0];
    const meta = c0._meta as Record<string, unknown>;
    expect(meta.generated).toBe(true);
  });
});

describe("parseCli", () => {
  it("defaults to --dry-run when no mutation flag is supplied", () => {
    const r = parseCli([]);
    expect(r.dryRun).toBe(true);
    expect(r.apply).toBe(false);
    expect(r.keepTs).toBe(false);
  });

  it("--apply enables apply mode", () => {
    const r = parseCli(["--apply"]);
    expect(r.apply).toBe(true);
    expect(r.dryRun).toBe(false);
  });

  it("--keep-ts enables keep-ts mode", () => {
    const r = parseCli(["--keep-ts"]);
    expect(r.keepTs).toBe(true);
    expect(r.dryRun).toBe(false);
  });

  it("--single <path> records the single target", () => {
    const r = parseCli(["--single", "/abs/path/to/file.test.ts"]);
    expect(r.single).toBe("/abs/path/to/file.test.ts");
  });

  it("--audit <path> overrides the default audit path", () => {
    const r = parseCli(["--audit", "/tmp/custom-audit.md"]);
    expect(r.auditPath).toBe("/tmp/custom-audit.md");
  });
});

describe("findCoLocatedTsEvals (integration with repo layout)", () => {
  it("returns an array (may be zero after a successful --apply)", () => {
    const result = findCoLocatedTsEvals(REPO_ROOT);
    expect(Array.isArray(result)).toBe(true);
  });
});
