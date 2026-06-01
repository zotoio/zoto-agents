#!/usr/bin/env tsx
/**
 * Unit tests for `scripts/eval-cleanup-stale.ts`.
 *
 * Hand-rolled tsx-runnable runner — no global test harness — so this can be
 * executed standalone via:
 *
 *   pnpm exec tsx scripts/__tests__/eval-cleanup-stale.test.ts
 *
 * Each test creates its own scratch repo under `os.tmpdir()` and operates on
 * tmp-dir fixtures only. Nothing under the live repo is mutated.
 *
 * Coverage matrix (per subtask 03 deliverables):
 *   (a) fresh repo --dry-run → empty deletion list, exit 0
 *   (b) pytest→vitest --dry-run with stamped pytest assets → enumerates conftest + test files
 *   (c) refusing-path guard fires
 *   (d) bats template enumeration
 *   (e) session-token round-trip (write + verify on apply)
 *   (f) --check exits 2 on drift, 0 on parity
 *   (g) regression: snapshot with no `llm.strategy` does not throw and emits empty/static-only groups
 */
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import YAML from "yaml";
import {
  computePlan,
  isPathAllowed,
  planHash,
  runMain,
  validatePlanAgainstSchema,
} from "../scripts/eval-cleanup-stale.ts";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const PLUGIN_DIR = resolve(SCRIPT_DIR, "..");
const REPO_ROOT = resolve(PLUGIN_DIR, "..", "..");

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

async function test(name: string, fn: () => void | Promise<void>): Promise<void> {
  try {
    await fn();
    results.push({ name, passed: true });
    process.stdout.write(`  ✓ ${name}\n`);
  } catch (e) {
    const msg = e instanceof Error ? e.stack ?? e.message : String(e);
    results.push({ name, passed: false, error: msg });
    process.stdout.write(`  ✗ ${name}\n    ${msg.replace(/\n/g, "\n    ")}\n`);
  }
}

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`assertion failed: ${msg}`);
}

function assertEqual<T>(actual: T, expected: T, label: string): void {
  if (actual !== expected) {
    throw new Error(
      `assertEqual(${label}): expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
    );
  }
}

/**
 * Create a scratch repo with the bare minimum needed by computePlan:
 *   - .zoto/eval-system/config.yml
 *   - .zoto/eval-system/manifest.yml (optional)
 *   - the cleanup-plan schema, copied from the live repo, so validation runs.
 */
function makeScratchRepo(label: string): string {
  const root = mkdtempSync(join(tmpdir(), `eval-cleanup-stale-${label}-`));
  // Copy the schema so plan validation works inside the scratch repo.
  const schemaSrc = join(PLUGIN_DIR, "templates", "schema", "cleanup-plan.schema.json");
  const schemaDst = join(
    root,
    "plugins",
    "zoto-eval-system",
    "templates",
    "schema",
    "cleanup-plan.schema.json",
  );
  mkdirSync(dirname(schemaDst), { recursive: true });
  writeFileSync(schemaDst, readFileSync(schemaSrc, "utf-8"));
  mkdirSync(join(root, ".zoto", "eval-system"), { recursive: true });
  return root;
}

function writeFile(repo: string, relPath: string, contents: string): void {
  const abs = join(repo, relPath);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, contents);
}

function writeConfig(repo: string, body: Record<string, unknown>): void {
  writeFile(repo, ".zoto/eval-system/config.yml", YAML.stringify(body));
}

function writeManifest(repo: string, body: string): void {
  writeFile(repo, ".zoto/eval-system/manifest.yml", body);
}

function cleanup(root: string): void {
  try {
    rmSync(root, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

async function main(): Promise<number> {
  process.stdout.write(`Running scripts/__tests__/eval-cleanup-stale.test.ts\n`);

  // Default mode (no flags) matches --dry-run for pnpm `eval:cleanup-stale`
  await test("default mode (no argv flags) runs dry-run", () => {
    const root = makeScratchRepo("default-dry");
    try {
      writeConfig(root, {
        evalsDir: "evals",
        skillsRoots: [".cursor/skills"],
        discoveryTargets: ["skill"],
        static: { framework: "pytest" },
      });
      writeManifest(
        root,
        `schema_version: 1\ndiscovery_config:\n  static:\n    framework: pytest\n  llm:\n    strategy: declarative\n  discoveryTargets: [skill]\n  skillsRoots: [.cursor/skills]\n  evalsDir: evals\n`,
      );
      let stdout = "";
      const exit = runMain({
        repoRoot: root,
        argv: [],
        stdoutWrite: (s) => {
          stdout += s;
        },
        stderrWrite: () => {},
      });
      assertEqual(exit, 0, "default mode exit");
      const plan = JSON.parse(stdout);
      assertEqual(plan.totals.files, 0, "default dry-run totals.files");
    } finally {
      cleanup(root);
    }
  });

  // (a) fresh repo --dry-run → empty list exit 0
  await test("fresh repo dry-run produces empty plan", () => {
    const root = makeScratchRepo("fresh");
    try {
      writeConfig(root, {
        evalsDir: "evals",
        skillsRoots: [".cursor/skills"],
        discoveryTargets: ["skill"],
        static: { framework: "pytest" },
      });
      writeManifest(
        root,
        `schema_version: 1\ndiscovery_config:\n  static:\n    framework: pytest\n  llm:\n    strategy: declarative\n  discoveryTargets: [skill]\n  skillsRoots: [.cursor/skills]\n  evalsDir: evals\n`,
      );
      const plan = computePlan(root);
      assertEqual(plan.totals.files, 0, "totals.files");
      assertEqual(plan.groups.length, 0, "groups.length");
      const v = validatePlanAgainstSchema(plan, root);
      assert(v.ok, `schema validation: ${(v as { errors?: string[] }).errors?.join("; ") ?? ""}`);
    } finally {
      cleanup(root);
    }
  });

  // (b) pytest→vitest dry-run enumerates conftest + generated test files
  await test("pytest→vitest dry-run enumerates fingerprint and stamped tests", () => {
    const root = makeScratchRepo("pytest-vitest");
    try {
      writeConfig(root, {
        static: { framework: "vitest" },
      });
      // Old snapshot is pytest
      writeManifest(
        root,
        `schema_version: 1\ndiscovery_config:\n  static:\n    framework: pytest\n  llm:\n    strategy: declarative\n  discoveryTargets: [skill]\n  skillsRoots: [.cursor/skills]\n  evalsDir: evals\n`,
      );
      // Stamp pytest assets
      writeFile(root, "evals/conftest.py", "# pytest fingerprint\n");
      writeFile(
        root,
        "evals/test_skill_alpha.py",
        "# _meta.generated: True\nimport pytest\n",
      );
      writeFile(
        root,
        "evals/test_user_authored.py",
        '"""User authored — no marker."""\nimport pytest\n',
      );
      const plan = computePlan(root);
      const g = plan.groups.find((x) => x.reason === "framework-switch");
      assert(g, "framework-switch group must exist");
      const paths = g!.files.map((f) => f.path).sort();
      assert(paths.includes("evals/conftest.py"), "conftest.py enumerated");
      assert(
        paths.includes("evals/test_skill_alpha.py"),
        "stamped test file enumerated",
      );
      assert(
        !paths.includes("evals/test_user_authored.py"),
        "user-authored test must NOT be enumerated",
      );
      const fingerprint = g!.files.find(
        (f) => f.path === "evals/conftest.py",
      );
      assertEqual(fingerprint!.kind, "framework-fingerprint", "conftest kind");
      const v = validatePlanAgainstSchema(plan, root);
      assert(
        v.ok,
        `schema validation: ${(v as { errors?: string[] }).errors?.join("; ") ?? ""}`,
      );
    } finally {
      cleanup(root);
    }
  });

  // (c) refusing-path guard fires
  await test("refusing-paths guard rejects out-of-scope paths", () => {
    assert(isPathAllowed("evals/test_x.py"), "evals/ allowed");
    assert(isPathAllowed("plugins/foo/evals/commands/x.json"), "plugins/.../evals allowed");
    assert(isPathAllowed(".cursor/evals/commands/x.json"), ".cursor/evals allowed");
    assert(
      isPathAllowed("plugins/zoto-eval-system/templates/additional/bats/example.bats.tmpl"),
      "bats carve-out allowed",
    );
    assert(!isPathAllowed("scripts/eval-analyse.ts"), "scripts/ refused");
    assert(!isPathAllowed("README.md"), "root markdown refused");
    assert(!isPathAllowed("../etc/passwd"), "path traversal refused");
    assert(!isPathAllowed(".cursor/rules/foo.mdc"), "rules dir refused");
  });

  // (d) bats template enumeration
  await test("bats template enumeration includes example.bats.tmpl + directory", () => {
    const root = makeScratchRepo("bats");
    try {
      writeConfig(root, {
        static: { framework: "pytest" },
      });
      writeManifest(
        root,
        `schema_version: 1\ndiscovery_config:\n  static:\n    framework: pytest\n  llm:\n    strategy: declarative\n  discoveryTargets: [skill]\n  skillsRoots: [.cursor/skills]\n  evalsDir: evals\n`,
      );
      writeFile(
        root,
        "plugins/zoto-eval-system/templates/additional/bats/example.bats.tmpl",
        "@test 'noop' { :; }\n",
      );
      const plan = computePlan(root);
      const g = plan.groups.find(
        (x) =>
          x.reason === "removed-target" &&
          x.from === "additionalAutomation:bats",
      );
      assert(g, "bats orphan group must exist");
      const paths = g!.files.map((f) => f.path);
      assert(
        paths.includes(
          "plugins/zoto-eval-system/templates/additional/bats/example.bats.tmpl",
        ),
        ".tmpl enumerated",
      );
      assert(
        paths.includes("plugins/zoto-eval-system/templates/additional/bats"),
        "bats directory enumerated",
      );
      const v = validatePlanAgainstSchema(plan, root);
      assert(
        v.ok,
        `schema validation: ${(v as { errors?: string[] }).errors?.join("; ") ?? ""}`,
      );
    } finally {
      cleanup(root);
    }
  });

  // (g) session-token round-trip
  await test("session-token round-trip: dry-run writes lockfile, apply consumes it", () => {
    const root = makeScratchRepo("session-token");
    try {
      writeConfig(root, {
        static: { framework: "pytest" },
      });
      writeManifest(
        root,
        `schema_version: 1\ndiscovery_config:\n  static:\n    framework: pytest\n  llm:\n    strategy: declarative\n  discoveryTargets: [skill]\n  skillsRoots: [.cursor/skills]\n  evalsDir: evals\n`,
      );
      writeFile(
        root,
        "plugins/zoto-eval-system/templates/additional/bats/example.bats.tmpl",
        "@test 'noop' { :; }\n",
      );

      let stdout = "";
      const exitDry = runMain({
        repoRoot: root,
        argv: ["--dry-run"],
        stdoutWrite: (s) => {
          stdout += s;
        },
        stderrWrite: () => {},
      });
      assertEqual(exitDry, 0, "dry-run exit code");
      const dryPlan = JSON.parse(stdout);
      const hash = planHash(dryPlan);
      assert(hash.length === 64, "plan_hash sha256 length");

      // Lockfile must exist under evals/_runs/
      const runsDir = join(root, "evals", "_runs");
      assert(existsSync(runsDir), "evals/_runs/ must exist after dry-run");

      // Apply with --token <plan_hash>
      let applyStderr = "";
      let applyStdout = "";
      const exitApply = runMain({
        repoRoot: root,
        argv: ["--apply", "--token", hash],
        stdoutWrite: (s) => {
          applyStdout += s;
        },
        stderrWrite: (s) => {
          applyStderr += s;
        },
      });
      assertEqual(exitApply, 0, `apply exit code (stderr=${applyStderr})`);
      const applyResult = JSON.parse(applyStdout);
      assertEqual(applyResult.applied, true, "applied true");
      assert(applyResult.deleted_count >= 1, "deleted at least one file");
      // bats file deleted
      assert(
        !existsSync(
          join(
            root,
            "plugins/zoto-eval-system/templates/additional/bats/example.bats.tmpl",
          ),
        ),
        "bats .tmpl was deleted",
      );
      // manifest.history.yml appended
      const hist = readFileSync(
        join(root, ".zoto", "eval-system", "manifest.history.yml"),
        "utf-8",
      );
      assert(hist.includes("migrated_at"), "history entry appended");
      assert(hist.includes("plan_hash"), "history entry includes plan_hash");
    } finally {
      cleanup(root);
    }
  });

  // (h) --check exits 2 on drift, 0 on parity
  await test("--check exits 2 on drift, 0 on parity", () => {
    const root = makeScratchRepo("check-mode");
    try {
      writeConfig(root, {
        static: { framework: "pytest" },
      });
      writeManifest(
        root,
        `schema_version: 1\ndiscovery_config:\n  static:\n    framework: pytest\n  llm:\n    strategy: declarative\n  discoveryTargets: [skill]\n  skillsRoots: [.cursor/skills]\n  evalsDir: evals\n`,
      );
      // Parity: no stale files
      const exitOk = runMain({
        repoRoot: root,
        argv: ["--check"],
        stdoutWrite: () => {},
        stderrWrite: () => {},
      });
      assertEqual(exitOk, 0, "check exit on parity");

      // Introduce drift via bats
      writeFile(
        root,
        "plugins/zoto-eval-system/templates/additional/bats/example.bats.tmpl",
        "@test 'noop' { :; }\n",
      );
      const exitDrift = runMain({
        repoRoot: root,
        argv: ["--check"],
        stdoutWrite: () => {},
        stderrWrite: () => {},
      });
      assertEqual(exitDrift, 2, "check exit on drift");
    } finally {
      cleanup(root);
    }
  });

  // (g) regression: snapshot with no `llm` block does not throw and emits
  //     only framework-switch / removed-target groups (no strategy-switch).
  await test("snapshot without llm.strategy does not throw and emits empty/static-only groups", () => {
    const root = makeScratchRepo("no-llm-strategy");
    try {
      writeConfig(root, {
        evalsDir: "evals",
        skillsRoots: [".cursor/skills"],
        discoveryTargets: ["skill"],
        static: { framework: "pytest" },
      });
      // Manifest has NO `llm` block (mimics post-strategy-removal repo state)
      writeManifest(
        root,
        `schema_version: 1\ndiscovery_config:\n  static:\n    framework: pytest\n  discoveryTargets: [skill]\n  skillsRoots: [.cursor/skills]\n  evalsDir: evals\n`,
      );
      let plan;
      try {
        plan = computePlan(root);
      } catch (e) {
        throw new Error(`computePlan threw: ${(e as Error).message}`);
      }
      // No strategy-switch group can exist post-removal; cleanup is silent.
      assertEqual(plan.totals.files, 0, "totals.files (no stale state)");
      assertEqual(plan.groups.length, 0, "groups.length (no stale state)");
      // Plan still validates against the post-cleanup schema.
      const v = validatePlanAgainstSchema(plan, root);
      assert(
        v.ok,
        `schema validation: ${(v as { errors?: string[] }).errors?.join("; ") ?? ""}`,
      );
      // Snapshots must not carry an `llm` field after this subtask.
      assert(
        !("llm" in (plan.old_snapshot as unknown as Record<string, unknown>)),
        "old_snapshot must not contain an `llm` field",
      );
      assert(
        !("llm" in (plan.new_snapshot as unknown as Record<string, unknown>)),
        "new_snapshot must not contain an `llm` field",
      );
    } finally {
      cleanup(root);
    }
  });

  // Apply without session/token without --force must refuse
  await test("apply without --session/--token/--force refuses with non-zero", () => {
    const root = makeScratchRepo("apply-no-session");
    try {
      writeConfig(root, {
        static: { framework: "pytest" },
      });
      writeManifest(
        root,
        `schema_version: 1\ndiscovery_config:\n  static:\n    framework: pytest\n  llm:\n    strategy: declarative\n  discoveryTargets: [skill]\n  skillsRoots: [.cursor/skills]\n  evalsDir: evals\n`,
      );
      const exit = runMain({
        repoRoot: root,
        argv: ["--apply"],
        stdoutWrite: () => {},
        stderrWrite: () => {},
      });
      assert(exit !== 0, `expected non-zero exit, got ${exit}`);
    } finally {
      cleanup(root);
    }
  });

  const failed = results.filter((r) => !r.passed);
  process.stdout.write(
    `\n${results.length - failed.length}/${results.length} tests passed\n`,
  );
  if (failed.length > 0) {
    process.stdout.write(`Failures:\n`);
    for (const f of failed) {
      process.stdout.write(`  ✗ ${f.name}\n`);
    }
    return 1;
  }
  return 0;
}

main().then((rc) => process.exit(rc));
