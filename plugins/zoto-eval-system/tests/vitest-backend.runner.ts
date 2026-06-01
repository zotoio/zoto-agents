// _meta.generated: false
/**
 * Subtask 07 self-test for the vitest static backend.
 *
 * Three independent checks live in this file:
 *
 *   1. **Stamp-and-typecheck** — generate three per-primitive `*.test.ts`
 *      files into a tmp host repo from fixed analyser payloads, then run
 *      `tsc --noEmit` over them. Confirms the emitted code compiles
 *      cleanly against the canonical `AnalyserPayload` types exported by
 *      `scripts/eval-analyse.ts`.
 *
 *   2. **Reporter YAML round-trip** — drive the custom reporter from
 *      `plugins/zoto-eval-system/templates/static/vitest/reporters/zoto-eval-reporter.ts.tmpl`
 *      with a synthetic vitest task tree and assert that:
 *        a) the emitted YAML loads back into a JS object,
 *        b) the object validates against
 *           `plugins/zoto-eval-system/templates/schema/result.schema.json`
 *           via ajv 2020-12,
 *        c) `backend === "static"`,
 *        d) `aggregates.duration_ms_total`/`tokens_total`/`verbosity_avg`
 *           match the synthetic input.
 *
 *   3. **Mutual-exclusion guard** — simulate having both `vitest` AND
 *      `jest` devDeps in a tmp host's `package.json` and confirm
 *      `assertNoConflictingFramework("vitest", host)` raises with the
 *      conflicting paths captured.
 *
 * Run via:
 *   pnpm tsx scripts/__tests__/vitest-backend.selftest.ts
 */
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";

import { load as yamlLoad } from "js-yaml";
import Ajv from "ajv";

import {
  ANALYSER_VERSION,
  type AnalyserPayload,
  type PrimitiveKind,
} from "../scripts/eval-analyse.ts";
import {
  assertNoConflictingFramework,
  FrameworkConflictError,
  stampVitestPerPrimitive,
  type PrimitiveMeta,
} from "../scripts/eval-stamp.ts";
import { loadEvalPaths } from "../src/config-loader.js";

const PLUGIN_DIR = resolve(import.meta.dirname, "..");
const REPO_ROOT = resolve(PLUGIN_DIR, "..", "..");
const SHARED_WRITER_TEMPLATE = join(
  PLUGIN_DIR,
  "templates/static/_shared/result-yaml-writer.ts.tmpl",
);

interface SharedWriterModule {
  buildStaticReportDocument: (input: {
    run_id: string;
    started_at: string;
    ended_at: string;
    framework: "vitest" | "jest";
    cases: StaticCaseRecord[];
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

const SCHEMA_PATH = join(PLUGIN_DIR, "templates/schema/result.schema.json");

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
      results.push({ name, passed: false, detail: e.message ?? String(e) });
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
          `${slug} writes manifest entry`,
          `${slug} updates source markdown reference`,
        ],
      },
      {
        scenario: "edge case — missing config rejects gracefully",
        prompt: `/${slug}`,
        assertions: [`${slug} surfaces clear error message`],
      },
    ],
  };
  /* The stamper itself prefixes `test_<kind>_` onto the slug, so we keep
   * `primitive.slug` clean — the resulting file name is
   * `evals/test_<kind>_<slug>.test.ts`. */
  const primitive: PrimitiveMeta = {
    slug,
    target_id: payload.target_id,
    source_path: sourcePath,
    source_hash: sourceHash,
  };
  return { payload, primitive };
}

function withTmpDir(label: string): string {
  const dir = join(tmpdir(), `zoto-vitest-selftest-${label}-${randomUUID()}`);
  mkdirSync(dir, { recursive: true, mode: 0o755 });
  return dir;
}

/** Seed self-contained eval-home templates so stamp helpers resolve paths. */
function seedEvalHost(host: string): void {
  const evalHome = join(host, ".zoto", "eval-system");
  mkdirSync(evalHome, { recursive: true });
  cpSync(join(PLUGIN_DIR, "templates"), join(evalHome, "templates"), {
    recursive: true,
  });
  loadEvalPaths(host);
}

/* ---------------------------------------------------------------------- */
/* Check 1: stamp + tsc                                                    */
/* ---------------------------------------------------------------------- */

async function checkStampAndTypecheck(): Promise<void> {
  const host = withTmpDir("stamp");
  const cleanup: string[] = [host];
  try {
    seedEvalHost(host);
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

    /* Symlink the repo's node_modules into the tmp host so vitest's
     * type declarations resolve when `tsc --noEmit` walks the stamped
     * tests. The stamped per-primitive test imports only `vitest` (not
     * `scripts/eval-analyse.ts`), so this is the single dependency
     * needed to make `--noEmit` succeed. */
    const { symlinkSync } = await import("node:fs");
    const hostNodeModules = join(host, "node_modules");
    try {
      symlinkSync(join(REPO_ROOT, "node_modules"), hostNodeModules, "dir");
    } catch {
      /* Fall back to a copy if symlink isn't permitted (e.g. on some
       * sandboxed CI workers). The copy is heavy but functionally
       * identical for the purposes of tsc resolution. */
      cpSync(join(REPO_ROOT, "node_modules"), hostNodeModules, { recursive: true });
    }

    const hostTsconfig = {
      compilerOptions: {
        target: "ES2022",
        module: "ESNext",
        moduleResolution: "Bundler",
        esModuleInterop: true,
        skipLibCheck: true,
        resolveJsonModule: true,
        strict: true,
        rootDir: ".",
        outDir: "dist",
        types: [],
      },
      include: ["evals/**/*.ts"],
    };
    writeFileSync(
      join(host, "tsconfig.json"),
      JSON.stringify(hostTsconfig, null, 2),
      "utf-8",
    );

    const stampedFiles: string[] = [];
    for (const { payload, primitive } of cases) {
      const result = stampVitestPerPrimitive(host, payload, primitive, {
        bypassGuard: true,
      });
      stampedFiles.push(result.testFile);
    }

    /* Each stamped *.test.ts MUST start with the literal first line. */
    for (const f of stampedFiles) {
      const head = readFileSync(f, "utf-8").split("\n", 1)[0] ?? "";
      if (head !== "// _meta.generated: true") {
        throw new Error(
          `stamped file missing _meta.generated: true marker on line 1: ${f} (got: ${JSON.stringify(head)})`,
        );
      }
    }

    /* tsc --noEmit over the host. We only check the stamped per-primitive
     * test files — the harness assets (config/setup/reporter/writer) are
     * type-checked separately at the repo level. */
    const tscBin = join(REPO_ROOT, "node_modules/.bin/tsc");
    /* Resolve @types/node from the pnpm content-addressed store —
     * pnpm hoists @types/* packages under .pnpm/<name@ver>/node_modules
     * rather than at the top level. tsc's `typeRoots` must point there
     * explicitly when we run outside the standard pnpm resolution
     * scope (we're invoking tsc with a list of file paths, not a
     * project, so typeRoots from a tsconfig wouldn't apply). */
    const { readdirSync } = await import("node:fs");
    const pnpmRoot = join(REPO_ROOT, "node_modules/.pnpm");
    const typeNodeDir = readdirSync(pnpmRoot)
      .filter((d) => d.startsWith("@types+node@"))
      .map((d) => join(pnpmRoot, d, "node_modules", "@types"))
      .find(() => true);
    const typeRootArgs = typeNodeDir ? ["--typeRoots", typeNodeDir] : [];

    const tsc = spawnSync(
      tscBin,
      [
        "--noEmit",
        "--target",
        "ES2022",
        "--module",
        "ESNext",
        "--moduleResolution",
        "Bundler",
        "--esModuleInterop",
        "--skipLibCheck",
        "--strict",
        "--types",
        "node",
        ...typeRootArgs,
        ...stampedFiles,
      ],
      {
        cwd: host,
        encoding: "utf-8",
        env: { ...process.env, NODE_PATH: hostNodeModules },
      },
    );
    if (tsc.status !== 0) {
      throw new Error(
        `tsc --noEmit failed for stamped tests:\n${tsc.stdout}\n${tsc.stderr}`,
      );
    }
  } finally {
    for (const d of cleanup) {
      try {
        rmSync(d, { recursive: true, force: true });
      } catch {
        /* ignore */
      }
    }
  }
}

/* ---------------------------------------------------------------------- */
/* Check 2: reporter YAML round-trip + ajv validation                      */
/* ---------------------------------------------------------------------- */

async function checkReporterYamlRoundTrip(): Promise<void> {
  const scratch = withTmpDir("writer");
  const writer = await loadSharedWriter(scratch);
  const cases: StaticCaseRecord[] = [
    {
      id: "alpha::happy path",
      status: "passed",
      duration_ms: 32,
      grader_reports: [{ grader: "vitest", verdict: "pass" }],
    },
    {
      id: "alpha::edge case",
      status: "failed",
      duration_ms: 12,
      grader_reports: [
        { grader: "vitest", verdict: "fail", detail: "expected 1, got 2" },
      ],
      verbosity: 128,
    },
    {
      id: "beta::skipped",
      status: "skipped",
      duration_ms: 0,
      grader_reports: [{ grader: "vitest", verdict: "warn" }],
    },
  ];

  const doc = writer.buildStaticReportDocument({
    run_id: "20260503T133824",
    started_at: "2026-05-03T13:38:24.000Z",
    ended_at: "2026-05-03T13:38:25.000Z",
    framework: "vitest",
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
  if (doc.aggregates.verbosity_avg !== 128) {
    throw new Error(
      `expected verbosity_avg=128 (single sample), got ${doc.aggregates.verbosity_avg}`,
    );
  }
  if (doc.totals.cases !== 3 || doc.totals.passed !== 1 || doc.totals.failed !== 1) {
    throw new Error(
      `unexpected totals: ${JSON.stringify(doc.totals)}`,
    );
  }
  if (doc.totals.skipped !== 1) {
    throw new Error(
      `expected totals.skipped=1, got ${JSON.stringify(doc.totals)}`,
    );
  }

  const yamlText = writer.dumpStaticReportYaml(doc);
  const parsed = yamlLoad(yamlText) as Record<string, unknown>;

  /* ajv schema validation. The schema declares draft-07 in `$schema`;
   * the default `Ajv` constructor compiles draft-07. With `strict: false`
   * unknown formats (`date-time`) are skipped without error, which is
   * what we want — format-level validation is not the contract under
   * test here. */
  const schema = JSON.parse(readFileSync(SCHEMA_PATH, "utf-8")) as Record<string, unknown>;
  const ajv = new Ajv({ allErrors: true, strict: false });
  const validate = ajv.compile(schema);
  const ok = validate(parsed);
  if (!ok) {
    throw new Error(
      `static.yml failed schema validation: ${JSON.stringify(validate.errors, null, 2)}\n--- yaml ---\n${yamlText}`,
    );
  }
}

/* ---------------------------------------------------------------------- */
/* Check 3: mutual-exclusion guard                                         */
/* ---------------------------------------------------------------------- */

async function checkMutualExclusionGuard(): Promise<void> {
  const host = withTmpDir("guard");
  try {
    /* Plant both vitest and jest devDeps + a jest config */
    const pkg = {
      name: "synthetic-host",
      version: "0.0.0",
      private: true,
      devDependencies: {
        vitest: "^4.0.0",
        jest: "^30.0.0",
      },
    };
    writeFileSync(join(host, "package.json"), JSON.stringify(pkg, null, 2));
    writeFileSync(
      join(host, "jest.config.ts"),
      "export default { preset: 'ts-jest' };\n",
    );

    let raised: FrameworkConflictError | null = null;
    try {
      assertNoConflictingFramework("vitest", host);
    } catch (e) {
      if (e instanceof FrameworkConflictError) raised = e;
      else throw e;
    }
    if (!raised) {
      throw new Error(
        `expected FrameworkConflictError when stamping vitest with jest deps + config`,
      );
    }
    if (raised.target !== "vitest") {
      throw new Error(`expected error.target === "vitest"`);
    }
    if (!raised.conflicts.some((c) => c.includes("jest.config.ts"))) {
      throw new Error(
        `expected jest.config.ts in conflicts, got: ${JSON.stringify(raised.conflicts)}`,
      );
    }
    if (!raised.conflicts.some((c) => c.includes("/jest"))) {
      throw new Error(
        `expected package.json#/devDependencies/jest in conflicts, got: ${JSON.stringify(raised.conflicts)}`,
      );
    }

    /* Inverse check: stamping jest also raises with vitest assets */
    writeFileSync(
      join(host, "vitest.config.ts"),
      "export default { test: {} };\n",
    );
    let inverse: FrameworkConflictError | null = null;
    try {
      assertNoConflictingFramework("jest", host);
    } catch (e) {
      if (e instanceof FrameworkConflictError) inverse = e;
      else throw e;
    }
    if (!inverse) {
      throw new Error(`expected FrameworkConflictError on inverse direction`);
    }
    if (inverse.target !== "jest") {
      throw new Error(`expected inverse.target === "jest"`);
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
/* Driver                                                                  */
/* ---------------------------------------------------------------------- */

async function main(): Promise<number> {
  await record("stamp + tsc --noEmit on three sample primitives", checkStampAndTypecheck);
  await record(
    "reporter YAML validates against result.schema.json",
    checkReporterYamlRoundTrip,
  );
  await record(
    "mutual-exclusion guard fires bidirectionally",
    checkMutualExclusionGuard,
  );

  let failures = 0;
  for (const r of results) {
    const tag = r.passed ? "PASS" : "FAIL";
    process.stdout.write(`[${tag}] ${r.name}\n`);
    if (!r.passed) {
      process.stdout.write(`       ${r.detail}\n`);
      failures += 1;
    }
  }
  return failures === 0 ? 0 : 1;
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
