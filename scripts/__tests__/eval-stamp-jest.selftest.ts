#!/usr/bin/env tsx
/**
 * Subtask 08 self-test for the jest static backend stamp helper.
 *
 * Mirrors the structure of `vitest-backend.selftest.ts` (subtask 07) so the
 * two backends share an audit-trail-style test surface.
 *
 * Three checks live in this file:
 *
 *   1. **Stamp + marker + lex check** — generate three per-primitive
 *      `*.test.ts` files into a tmp host repo from fixed analyser
 *      payloads, verify each carries the literal first-line marker
 *      `// _meta.generated: true`, contains `expect(...)` blocks derived
 *      from the analyser payload (one per case scenario), and has all
 *      `{{HANDLEBARS}}` substituted.
 *
 *   2. **Reporter YAML round-trip** — drive the shared writer (the same
 *      module the jest reporter delegates to) with a synthetic test-case
 *      list and assert that:
 *        a) the emitted YAML loads back into a JS object,
 *        b) the object validates against
 *           `plugins/zoto-eval-system/templates/schema/result.schema.json`
 *           via ajv,
 *        c) `backend === "static"`,
 *        d) every case carries `grader_reports[grader=jest]`,
 *        e) `aggregates.tokens_total === 0`, `duration_ms_total` matches.
 *
 *   3. **Mutual-exclusion guard** — bidirectional. Refuse to stamp jest
 *      when vitest config or vitest devDep is present, and the symmetric
 *      direction (refuse vitest when jest devDep is present).
 *
 * Run via:
 *   pnpm exec tsx scripts/__tests__/eval-stamp-jest.selftest.ts
 *
 * The script does NOT spawn a real jest worker — that requires
 * `node --experimental-vm-modules` and `ts-jest`'s ESM preset, which
 * deserves its own integration test once the orchestrator (subtask 12)
 * is wired up. The reporter logic is exercised via the shared writer it
 * delegates to plus a synthetic constructor smoke test.
 */
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";

import Ajv from "ajv";
import { load as yamlLoad } from "js-yaml";

import {
  ANALYSER_VERSION,
  type AnalyserPayload,
  type PrimitiveKind,
} from "../eval-analyse.ts";
import {
  assertNoConflictingFramework,
  FrameworkConflictError,
  stampJestPerPrimitive,
  type PrimitiveMeta,
} from "../eval-stamp.ts";

const REPO_ROOT = resolve(process.cwd());
const SHARED_WRITER_TEMPLATE = join(
  REPO_ROOT,
  "plugins/zoto-eval-system/templates/static/_shared/result-yaml-writer.ts.tmpl",
);
const SCHEMA_PATH = join(
  REPO_ROOT,
  "plugins/zoto-eval-system/templates/schema/result.schema.json",
);

interface SharedWriterModule {
  buildStaticReportDocument: (input: {
    run_id: string;
    started_at: string;
    ended_at: string;
    framework: "vitest" | "jest";
    cases: StaticCaseRecord[];
    model?: string;
  }) => StaticReportDocument;
  dumpStaticReportYaml: (doc: StaticReportDocument) => string;
}

interface StaticCaseRecord {
  id: string;
  status: "passed" | "failed" | "skipped" | "errored";
  duration_ms?: number;
  verbosity?: number;
  grader_reports?: Array<{
    grader: string;
    verdict: "pass" | "fail" | "warn";
    detail?: string;
  }>;
  log_path?: string;
}

interface StaticReportDocument {
  schema_version: number;
  run_id: string;
  started_at: string;
  ended_at: string;
  backend: string;
  totals: { cases: number; passed: number; failed: number; skipped?: number };
  aggregates: {
    tokens_total: number;
    duration_ms_total: number;
    verbosity_avg?: number;
  };
  report: { framework: "vitest" | "jest" };
  cases: StaticCaseRecord[];
}

async function loadSharedWriter(scratchDir: string): Promise<SharedWriterModule> {
  const dest = join(scratchDir, "result-yaml-writer.ts");
  const body = readFileSync(SHARED_WRITER_TEMPLATE, "utf-8");
  writeFileSync(dest, body, "utf-8");
  /* tsx's loader picks up `.ts` files anywhere on disk via dynamic import. */
  const mod = (await import(dest)) as SharedWriterModule;
  return mod;
}

interface CheckResult {
  name: string;
  passed: boolean;
  detail: string;
}

const results: CheckResult[] = [];

function record(name: string, fn: () => void | Promise<void>): Promise<void> {
  return Promise.resolve()
    .then(() => fn())
    .then(() => {
      results.push({ name, passed: true, detail: "ok" });
    })
    .catch((e: Error) => {
      results.push({ name, passed: false, detail: e.stack ?? e.message ?? String(e) });
    });
}

/* ---------------------------------------------------------------------- */
/* Fixtures                                                                */
/* ---------------------------------------------------------------------- */

function fakePayload(
  kind: PrimitiveKind,
  slug: string,
  sourcePath: string,
): { payload: AnalyserPayload; primitive: PrimitiveMeta } {
  const sourceHash = "f".repeat(64);
  const payload: AnalyserPayload = {
    schema_version: 1,
    analyser_version: ANALYSER_VERSION,
    model_id: "composer-2.5",
    target_id: `${kind}:${slug}`,
    kind,
    source_path: sourcePath,
    source_hash: sourceHash,
    summary: `Synthetic analyser payload for ${kind}:${slug}.`,
    cases: [
      {
        scenario: "happy path — operator approves all defaults",
        prompt: `/${slug} --apply`,
        assertions: [
          `${slug} writes manifest entry under .zoto/eval-system/manifest.yml`,
          `${slug} updates source markdown reference within evals/_runs/<ts>/`,
        ],
      },
      {
        scenario: "edge case — missing config rejects gracefully",
        prompt: `/${slug}`,
        assertions: [`${slug} surfaces clear error message and exits non-zero`],
      },
    ],
  };
  const primitive: PrimitiveMeta = {
    slug: `test_${kind}_${slug}`,
    target_id: payload.target_id,
    source_path: sourcePath,
    source_hash: sourceHash,
  };
  return { payload, primitive };
}

function withTmpDir(label: string): string {
  const dir = join(tmpdir(), `zoto-jest-selftest-${label}-${randomUUID()}`);
  mkdirSync(dir, { recursive: true, mode: 0o755 });
  return dir;
}

/* ---------------------------------------------------------------------- */
/* Check 1: stamp + marker + lex check                                     */
/* ---------------------------------------------------------------------- */

async function checkStampMarkerAndLex(): Promise<void> {
  const host = withTmpDir("stamp");
  try {
    /* Source markdowns referenced by the per-primitive payload exist in
     * the tmp host so any analyser-payload-driven assertions could resolve
     * if executed. We don't run jest here. */
    const cases = [
      fakePayload("skill", "alpha-skill", "skills/alpha-skill/SKILL.md"),
      fakePayload("command", "beta-command", "commands/beta-command.md"),
      fakePayload("agent", "gamma-agent", "agents/gamma-agent.md"),
    ];
    for (const c of cases) {
      const abs = join(host, c.primitive.source_path);
      mkdirSync(dirname(abs), { recursive: true, mode: 0o755 });
      writeFileSync(abs, `# ${c.primitive.target_id}\n\nSynthetic source.\n`);
    }

    const stampedFiles: string[] = [];
    let firstWrittenCount = -1;
    for (let i = 0; i < cases.length; i++) {
      const { payload, primitive } = cases[i];
      const result = stampJestPerPrimitive(host, payload, primitive);
      stampedFiles.push(result.testFile);
      if (i === 0) {
        firstWrittenCount = result.written.length;
        if (firstWrittenCount !== 5) {
          throw new Error(
            `expected 5 files on first stamp, got ${firstWrittenCount}: ${result.written.join(", ")}`,
          );
        }
      } else {
        if (result.written.length !== 1) {
          throw new Error(
            `expected only the new test file on stamp ${i + 1}, got ${result.written.length}`,
          );
        }
        if (result.unchanged.length !== 4) {
          throw new Error(
            `expected 4 shared files unchanged on stamp ${i + 1}, got ${result.unchanged.length}`,
          );
        }
      }
    }

    /* Marker check + lex sanity */
    for (const f of stampedFiles) {
      const body = readFileSync(f, "utf-8");
      const head = body.split("\n", 1)[0] ?? "";
      if (head !== "// _meta.generated: true") {
        throw new Error(
          `stamped file missing _meta.generated marker on line 1: ${f} (got: ${JSON.stringify(head)})`,
        );
      }
      if (!body.includes("from \"@jest/globals\"")) {
        throw new Error(`stamped file missing @jest/globals import: ${f}`);
      }
      if (!body.includes("PAYLOAD.cases.forEach")) {
        throw new Error(`stamped file does not iterate PAYLOAD.cases: ${f}`);
      }
      const expectCount = (body.match(/\bexpect\(/g) ?? []).length;
      if (expectCount < 6) {
        throw new Error(
          `stamped file should contain at least 6 expect(...) calls (5 shape + per-case), got ${expectCount}: ${f}`,
        );
      }
      const unsubbed = body.match(/\{\{[A-Z_]+\}\}/g) ?? [];
      if (unsubbed.length > 0) {
        throw new Error(
          `unsubstituted handlebars in ${f}: ${unsubbed.join(", ")}`,
        );
      }
    }

    /* Verify shared scaffolding lives at the documented paths */
    const evalsDir = join(host, "evals");
    const must = [
      "jest.config.ts",
      "setup.ts",
      "reporters/zoto-eval-reporter.ts",
      "_shared/result-yaml-writer.ts",
    ];
    for (const rel of must) {
      const abs = join(evalsDir, rel);
      if (!existsSync(abs)) {
        throw new Error(`missing stamped file: ${rel} (expected at ${abs})`);
      }
      const head = readFileSync(abs, "utf-8").split("\n", 1)[0] ?? "";
      if (head !== "// _meta.generated: true") {
        throw new Error(
          `${rel} missing _meta.generated marker (got: ${JSON.stringify(head)})`,
        );
      }
    }
  } finally {
    try {
      rmSync(host, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
}

/* ---------------------------------------------------------------------- */
/* Check 2: reporter YAML round-trip                                       */
/* ---------------------------------------------------------------------- */

async function checkReporterYamlRoundTrip(): Promise<void> {
  const scratch = withTmpDir("writer");
  try {
    const writer = await loadSharedWriter(scratch);
    const cases: StaticCaseRecord[] = [
      {
        id: "alpha-skill::happy path",
        status: "passed",
        duration_ms: 32,
        grader_reports: [{ grader: "jest", verdict: "pass" }],
      },
      {
        id: "alpha-skill::edge case",
        status: "failed",
        duration_ms: 12,
        grader_reports: [
          { grader: "jest", verdict: "fail", detail: "expected true" },
        ],
        verbosity: 128,
      },
      {
        id: "beta-command::skipped scenario",
        status: "skipped",
        duration_ms: 0,
        grader_reports: [{ grader: "jest", verdict: "warn" }],
      },
    ];

    const doc = writer.buildStaticReportDocument({
      run_id: "20260503T133824",
      started_at: "2026-05-03T13:38:24.000Z",
      ended_at: "2026-05-03T13:38:25.000Z",
      framework: "jest",
      cases,
    });

    if (doc.backend !== "static") {
      throw new Error(`expected backend=static, got ${doc.backend}`);
    }
    if (doc.aggregates.duration_ms_total !== 44) {
      throw new Error(
        `expected duration_ms_total=44, got ${doc.aggregates.duration_ms_total}`,
      );
    }
    if (doc.aggregates.tokens_total !== 0) {
      throw new Error(`expected tokens_total=0`);
    }
    if (doc.totals.cases !== 3 || doc.totals.passed !== 1 || doc.totals.failed !== 1) {
      throw new Error(`unexpected totals: ${JSON.stringify(doc.totals)}`);
    }
    if (doc.totals.skipped !== 1) {
      throw new Error(
        `expected totals.skipped=1, got ${JSON.stringify(doc.totals)}`,
      );
    }
    if (doc.report?.framework !== "jest") {
      throw new Error(
        `expected report.framework=jest, got ${JSON.stringify(doc.report)}`,
      );
    }

    const yamlText = writer.dumpStaticReportYaml(doc);
    const parsed = yamlLoad(yamlText) as Record<string, unknown>;

    /* ajv schema validation. The schema declares draft-07 in `$schema`;
     * the default `Ajv` constructor compiles draft-07. With `strict: false`
     * unknown formats (`date-time`) are skipped without error, which is
     * what we want here — format-level validation is not the contract
     * under test. */
    const schema = JSON.parse(readFileSync(SCHEMA_PATH, "utf-8")) as Record<string, unknown>;
    const ajv = new Ajv({ allErrors: true, strict: false });
    const validate = ajv.compile(schema);
    const ok = validate(parsed);
    if (!ok) {
      throw new Error(
        `static.yml failed schema validation: ${JSON.stringify(validate.errors, null, 2)}\n--- yaml ---\n${yamlText}`,
      );
    }

    /* Every case must carry grader_reports[grader=jest] */
    const parsedCases = parsed.cases as Array<Record<string, unknown>>;
    for (const c of parsedCases) {
      const reports = (c.grader_reports ?? []) as Array<Record<string, unknown>>;
      if (!reports.some((r) => r.grader === "jest")) {
        throw new Error(
          `case ${c.id} missing grader_reports[grader=jest]: ${JSON.stringify(c.grader_reports)}`,
        );
      }
    }

    /* Determinism — second dump must equal the first */
    const yamlAgain = writer.dumpStaticReportYaml(doc);
    if (yamlAgain !== yamlText) {
      throw new Error("dumpStaticReportYaml output is not deterministic");
    }
  } finally {
    try {
      rmSync(scratch, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
}

/* ---------------------------------------------------------------------- */
/* Check 3: mutual-exclusion guard (bidirectional)                         */
/* ---------------------------------------------------------------------- */

async function checkMutualExclusionGuard(): Promise<void> {
  /* Direction 1: stamping jest with vitest config-file present */
  const tmpVitestCfg = withTmpDir("vitest-cfg");
  try {
    mkdirSync(join(tmpVitestCfg, "evals"), { recursive: true });
    writeFileSync(
      join(tmpVitestCfg, "evals", "vitest.config.ts"),
      "export default {};\n",
      "utf-8",
    );
    let cfgErr: unknown = null;
    try {
      assertNoConflictingFramework("jest", tmpVitestCfg);
    } catch (e) {
      cfgErr = e;
    }
    if (!(cfgErr instanceof FrameworkConflictError)) {
      throw new Error(
        `expected FrameworkConflictError on vitest cfg, got: ${cfgErr ? String(cfgErr) : "no throw"}`,
      );
    }
    if (!cfgErr.conflicts.includes("evals/vitest.config.ts")) {
      throw new Error(
        `expected conflicts to include evals/vitest.config.ts, got: ${cfgErr.conflicts.join(", ")}`,
      );
    }

    /* The stamp helper must also throw before writing anything */
    const fake = fakePayload("skill", "alpha", "skills/alpha/SKILL.md");
    let stampErr: unknown = null;
    try {
      stampJestPerPrimitive(tmpVitestCfg, fake.payload, fake.primitive);
    } catch (e) {
      stampErr = e;
    }
    if (!(stampErr instanceof FrameworkConflictError)) {
      throw new Error(
        `expected stampJestPerPrimitive to throw FrameworkConflictError, got: ${stampErr ? String(stampErr) : "no throw"}`,
      );
    }
    if (existsSync(join(tmpVitestCfg, "evals", "jest.config.ts"))) {
      throw new Error("jest config stamped despite refusal");
    }
  } finally {
    rmSync(tmpVitestCfg, { recursive: true, force: true });
  }

  /* Direction 2: stamping jest with vitest devDep */
  const tmpVitestDev = withTmpDir("vitest-dev");
  try {
    writeFileSync(
      join(tmpVitestDev, "package.json"),
      JSON.stringify(
        { name: "host", devDependencies: { vitest: "^4.0.0" } },
        null,
        2,
      ),
      "utf-8",
    );
    let depErr: unknown = null;
    try {
      assertNoConflictingFramework("jest", tmpVitestDev);
    } catch (e) {
      depErr = e;
    }
    if (!(depErr instanceof FrameworkConflictError)) {
      throw new Error(
        `expected FrameworkConflictError on vitest devDep, got: ${depErr ? String(depErr) : "no throw"}`,
      );
    }
    if (!depErr.conflicts.some((c) => c.endsWith("/vitest"))) {
      throw new Error(
        `expected conflicts to include devDependencies/vitest, got: ${depErr.conflicts.join(", ")}`,
      );
    }
  } finally {
    rmSync(tmpVitestDev, { recursive: true, force: true });
  }

  /* Direction 3 — symmetric: refusing vitest stamping when jest devDep present */
  const tmpJestDev = withTmpDir("jest-dev");
  try {
    writeFileSync(
      join(tmpJestDev, "package.json"),
      JSON.stringify(
        { name: "host", devDependencies: { jest: "^30.0.0" } },
        null,
        2,
      ),
      "utf-8",
    );
    let symErr: unknown = null;
    try {
      assertNoConflictingFramework("vitest", tmpJestDev);
    } catch (e) {
      symErr = e;
    }
    if (!(symErr instanceof FrameworkConflictError)) {
      throw new Error(
        `expected symmetric FrameworkConflictError when stamping vitest with jest devDep present, got: ${symErr ? String(symErr) : "no throw"}`,
      );
    }
  } finally {
    rmSync(tmpJestDev, { recursive: true, force: true });
  }

  /* Direction 4 — clean host: no error */
  const tmpClean = withTmpDir("clean");
  try {
    let cleanErr: unknown = null;
    try {
      assertNoConflictingFramework("jest", tmpClean);
    } catch (e) {
      cleanErr = e;
    }
    if (cleanErr !== null) {
      throw new Error(
        `expected guard to be silent on clean host, got: ${String(cleanErr)}`,
      );
    }
  } finally {
    rmSync(tmpClean, { recursive: true, force: true });
  }

  /* Direction 5 — bypassGuard escape hatch (test-only) */
  const tmpBypass = withTmpDir("bypass");
  try {
    writeFileSync(
      join(tmpBypass, "vitest.config.ts"),
      "export default {};\n",
      "utf-8",
    );
    const fake = fakePayload("skill", "alpha", "skills/alpha/SKILL.md");
    const result = stampJestPerPrimitive(
      tmpBypass,
      fake.payload,
      fake.primitive,
      { bypassGuard: true },
    );
    if (!existsSync(result.testFile)) {
      throw new Error("bypassGuard did not allow stamping");
    }
  } finally {
    rmSync(tmpBypass, { recursive: true, force: true });
  }
}

/* ---------------------------------------------------------------------- */
/* Check 4: tsc --noEmit smoke check on a single stamped test file         */
/* ---------------------------------------------------------------------- */
/* Best-effort: skipped if the monorepo's @types/jest is not present.      */

async function checkTscNoEmit(): Promise<void> {
  const host = withTmpDir("tsc");
  try {
    const fake = fakePayload("skill", "alpha-skill", "skills/alpha-skill/SKILL.md");
    const srcAbs = join(host, fake.primitive.source_path);
    mkdirSync(dirname(srcAbs), { recursive: true, mode: 0o755 });
    writeFileSync(srcAbs, `# ${fake.primitive.target_id}\nSynthetic source.\n`);
    stampJestPerPrimitive(host, fake.payload, fake.primitive);

    /* Stub `_llm/sandbox.ts` so the stamped setup.ts can resolve its import. */
    const sandboxStubDir = join(host, "evals", "_llm");
    mkdirSync(sandboxStubDir, { recursive: true });
    writeFileSync(
      join(sandboxStubDir, "sandbox.ts"),
      `export interface SandboxHandle { runId: string; caseId: number | string; rootDir: string; }
export function caseSlug(id: number | string): string {
  return String(id).toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "case";
}
export function createSandbox(runId: string, caseId: number | string): SandboxHandle {
  return { runId, caseId, rootDir: \`/tmp/selftest-sandbox-\${runId}-\${caseSlug(caseId)}\` };
}
`,
      "utf-8",
    );

    /* Symlink node_modules so jest typings resolve. */
    cpSync(join(REPO_ROOT, "node_modules", "@jest"), join(host, "node_modules", "@jest"), {
      recursive: true,
      dereference: false,
      preserveTimestamps: false,
      errorOnExist: false,
      force: true,
    });
    /* Best-effort copy of `@types/jest` if present in workspace */
    const typesJestSrc = join(REPO_ROOT, "node_modules", "@types", "jest");
    if (existsSync(typesJestSrc)) {
      cpSync(typesJestSrc, join(host, "node_modules", "@types", "jest"), {
        recursive: true,
        dereference: false,
        preserveTimestamps: false,
        errorOnExist: false,
        force: true,
      });
    }

    const tsconfig = {
      compilerOptions: {
        target: "ES2022",
        module: "ESNext",
        moduleResolution: "Bundler",
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        allowImportingTsExtensions: true,
        noEmit: true,
        strict: true,
        skipLibCheck: true,
        baseUrl: ".",
      },
      include: ["evals/*.test.ts"],
    };
    writeFileSync(
      join(host, "tsconfig.selftest.json"),
      JSON.stringify(tsconfig, null, 2),
      "utf-8",
    );

    const tscBin = join(REPO_ROOT, "node_modules/.bin/tsc");
    if (!existsSync(tscBin)) {
      /* tsc not installed — skip rather than fail. The Definition of Done
       * permits this test to be best-effort; the substantive contract is
       * the schema/markers/guard, all exercised above. */
      return;
    }
    const res = spawnSync(
      tscBin,
      ["--noEmit", "--project", join(host, "tsconfig.selftest.json")],
      { encoding: "utf-8", cwd: host, env: process.env },
    );
    if (res.status !== 0) {
      throw new Error(
        `tsc --noEmit failed (exit ${res.status})\nstdout:\n${res.stdout}\nstderr:\n${res.stderr}`,
      );
    }
  } finally {
    rmSync(host, { recursive: true, force: true });
  }
}

/* ---------------------------------------------------------------------- */
/* Driver                                                                  */
/* ---------------------------------------------------------------------- */

async function main(): Promise<number> {
  await record("stamp + marker + lex check on three primitives", checkStampMarkerAndLex);
  await record(
    "reporter YAML validates against result.schema.json (grader=jest)",
    checkReporterYamlRoundTrip,
  );
  await record(
    "mutual-exclusion guard fires bidirectionally + bypass works",
    checkMutualExclusionGuard,
  );
  await record(
    "tsc --noEmit on stamped jest test file (best-effort)",
    checkTscNoEmit,
  );

  let failures = 0;
  for (const r of results) {
    const tag = r.passed ? "PASS" : "FAIL";
    process.stdout.write(`[${tag}] ${r.name}\n`);
    if (!r.passed) {
      process.stdout.write(`       ${r.detail.replace(/\n/g, "\n       ")}\n`);
      failures += 1;
    }
  }
  process.stdout.write(`\n${results.length - failures}/${results.length} steps passed\n`);
  return failures === 0 ? 0 : 1;
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
