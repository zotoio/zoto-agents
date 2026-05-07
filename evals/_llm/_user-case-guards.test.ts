#!/usr/bin/env tsx
/**
 * Unit tests for `_user-case-guards.ts`. Run directly with
 * `tsx evals/_llm/_user-case-guards.test.ts`. The test harness is
 * intentionally dependency-free (no vitest/jest import) so it can run
 * without the rest of the eval toolchain being installed — subtasks 10
 * and 11 both consume these helpers and benefit from a hermetic probe.
 *
 * Coverage:
 *   - `classifyGeneratedFilePath` for .ts / .tsx / .js / .jsx / .py /
 *     test_*.py / *_test.py / unrecognised
 *   - `isGeneratedFile` permissive mode (header within first 20 lines)
 *   - `isGeneratedFile` strict mode (header MUST be line 1)
 *   - `isGeneratedCase` for every documented shape
 *   - `isUserAuthoredCase` mirrors the inverse
 */
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  classifyGeneratedFilePath,
  isGeneratedCase,
  isGeneratedFile,
  isUserAuthoredCase,
} from "./_user-case-guards.js";

type Result = { name: string; ok: boolean; detail?: string };

const results: Result[] = [];

function assertEqual<T>(actual: T, expected: T, name: string): void {
  const ok = actual === expected;
  results.push({
    name,
    ok,
    detail: ok ? undefined : `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
  });
}

function runFileTests(): void {
  const root = mkdtempSync(join(tmpdir(), "user-case-guards-test-"));
  try {
    const strictTs = join(root, "strict.test.ts");
    writeFileSync(
      strictTs,
      "// _meta.generated: true\nimport { it } from 'vitest';\nit('x', () => {});\n",
    );
    assertEqual(isGeneratedFile(strictTs), true, "strict ts header — permissive pass");
    assertEqual(isGeneratedFile(strictTs, { strict: true }), true, "strict ts header — strict pass");

    const lateTs = join(root, "late.test.ts");
    writeFileSync(
      lateTs,
      "#!/usr/bin/env tsx\n/* eslint-disable */\n// _meta.generated: true\nimport x from 'y';\n",
    );
    assertEqual(isGeneratedFile(lateTs), true, "late ts marker — permissive pass");
    assertEqual(isGeneratedFile(lateTs, { strict: true }), false, "late ts marker — strict fail");

    const noMarker = join(root, "user.test.ts");
    writeFileSync(noMarker, "import { it } from 'vitest';\nit('x', () => {});\n");
    assertEqual(isGeneratedFile(noMarker), false, "no marker — permissive false");
    assertEqual(isGeneratedFile(noMarker, { strict: true }), false, "no marker — strict false");

    const pyStrict = join(root, "test_strict.py");
    writeFileSync(pyStrict, "# _meta.generated: True\nimport pytest\n");
    assertEqual(isGeneratedFile(pyStrict), true, "py strict header — pass");
    assertEqual(isGeneratedFile(pyStrict, { strict: true }), true, "py strict header — strict pass");

    const pyLate = join(root, "test_late.py");
    writeFileSync(pyLate, '"""module docstring"""\n# _meta.generated: True\nimport pytest\n');
    assertEqual(isGeneratedFile(pyLate), true, "py late marker — permissive pass");
    assertEqual(isGeneratedFile(pyLate, { strict: true }), false, "py late marker — strict fail");

    const pyNoMarker = join(root, "test_user.py");
    writeFileSync(pyNoMarker, "import pytest\n");
    assertEqual(isGeneratedFile(pyNoMarker), false, "py no marker — false");

    const notATest = join(root, "helpers.ts");
    writeFileSync(notATest, "// _meta.generated: true\nexport const x = 1;\n");
    assertEqual(
      isGeneratedFile(notATest),
      false,
      "unrecognised file shape — false even with marker",
    );

    const missing = join(root, "does-not-exist.test.ts");
    assertEqual(isGeneratedFile(missing), false, "missing file — false");

    assertEqual(classifyGeneratedFilePath("x.test.ts"), "ts", "classify .test.ts");
    assertEqual(classifyGeneratedFilePath("x.test.tsx"), "ts", "classify .test.tsx");
    assertEqual(classifyGeneratedFilePath("x.test.js"), "ts", "classify .test.js");
    assertEqual(classifyGeneratedFilePath("x.test.jsx"), "ts", "classify .test.jsx");
    assertEqual(classifyGeneratedFilePath("x.test.py"), "py", "classify .test.py");
    assertEqual(
      classifyGeneratedFilePath("a/b/test_foo.py"),
      "py",
      "classify test_*.py",
    );
    assertEqual(
      classifyGeneratedFilePath("a/b/foo_test.py"),
      "py",
      "classify *_test.py",
    );
    assertEqual(classifyGeneratedFilePath("README.md"), null, "classify unrecognised");
    assertEqual(classifyGeneratedFilePath("helpers.ts"), null, "classify non-test .ts");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function runCaseTests(): void {
  assertEqual(isGeneratedCase({ _meta: { generated: true } }), true, "case generated=true → true");
  assertEqual(isGeneratedCase({ _meta: { generated: false } }), false, "case generated=false → false");
  assertEqual(isGeneratedCase({ _meta: {} }), false, "case missing generated → false");
  assertEqual(isGeneratedCase({}), false, "case no _meta → false");
  assertEqual(isGeneratedCase(null), false, "null → false");
  assertEqual(isGeneratedCase(undefined), false, "undefined → false");
  assertEqual(
    isGeneratedCase({ _meta: { generated: "true" as unknown as boolean } }),
    false,
    "non-boolean generated → false (defensive)",
  );

  assertEqual(isUserAuthoredCase({ _meta: { generated: true } }), false, "inverse generated=true");
  assertEqual(isUserAuthoredCase({ _meta: { generated: false } }), true, "inverse generated=false");
  assertEqual(isUserAuthoredCase({}), true, "inverse no _meta");
}

runFileTests();
runCaseTests();

const failures = results.filter((r) => !r.ok);
for (const r of results) {
  const tag = r.ok ? "PASS" : "FAIL";
  if (!r.ok) {
    process.stderr.write(`${tag} ${r.name}: ${r.detail ?? ""}\n`);
  } else {
    process.stdout.write(`${tag} ${r.name}\n`);
  }
}
process.stdout.write(
  `\n${results.length - failures.length}/${results.length} passed\n`,
);
if (failures.length > 0) process.exit(1);
