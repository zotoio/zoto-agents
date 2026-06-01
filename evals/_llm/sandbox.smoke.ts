#!/usr/bin/env tsx
/**
 * Smoke test for the per-case sandbox baseline plumbing (subtask 05).
 *
 * Run: `tsx evals/_llm/sandbox.smoke.ts`
 *
 * Asserts:
 *   1. `stampBaselineFixtures()` populates `<repo>/evals/fixtures/baseline/`
 *      with the expected file tree from the template.
 *   2. Re-running `stampBaselineFixtures()` is idempotent — checksum of the
 *      destination tree is unchanged across two consecutive runs.
 *   3. `prepareSandbox(tmpDir)` copies every baseline file into a per-case
 *      sandbox and applies `fixtures.files[]` overlays on top (overlays
 *      may overwrite baseline files).
 *
 * The script does NOT trigger any global test runner. It exits 0 on success
 * and 1 on failure with a JSON diagnostic on stderr.
 */
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, posix, relative, resolve, sep } from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

import { prepareSandbox, resolveBaselineDir } from "../../plugins/zoto-eval-system/engine/sandbox.ts";
import { stampBaselineFixtures } from "../plugin-script-bridge.ts";

const REPO_ROOT = resolve(process.cwd());

const EXPECTED_BASELINE_FILES = [
  ".cursor/.gitkeep",
  ".cursor/mcp.json",
  ".gitignore",
  ".zoto/eval-system/.gitkeep",
  ".zoto/eval-system/config.yml",
  "README.md",
  "package.json",
];

interface Failure {
  check: string;
  detail: string;
}

const failures: Failure[] = [];

function fail(check: string, detail: string): void {
  failures.push({ check, detail });
}

function listFiles(root: string): string[] {
  const out: string[] = [];
  const stack = [root];
  while (stack.length) {
    const cur = stack.pop()!;
    let names: string[];
    try {
      names = readdirSync(cur);
    } catch {
      continue;
    }
    for (const name of names) {
      const full = join(cur, name);
      let st;
      try {
        st = statSync(full);
      } catch {
        continue;
      }
      if (st.isSymbolicLink()) continue;
      if (st.isDirectory()) stack.push(full);
      else if (st.isFile()) {
        out.push(posix.normalize(relative(root, full).split(sep).join("/")));
      }
    }
  }
  return out.sort();
}

function treeChecksum(root: string): string {
  const parts: string[] = [];
  for (const rel of listFiles(root)) {
    const buf = readFileSync(join(root, rel));
    const sha = createHash("sha256").update(buf).digest("hex");
    parts.push(`${rel}:${sha}`);
  }
  return createHash("sha256").update(parts.join("\n")).digest("hex");
}

function check1_baselineStampWritesExpectedTree(): void {
  const tmp = mkdtempSync(join(tmpdir(), "zoto-eval-baseline-stamp-"));
  try {
    const dest = join(tmp, "evals", "fixtures", "baseline");
    const result = stampBaselineFixtures(REPO_ROOT, { dest });
    if (!result.written) {
      fail(
        "baseline-stamp.first-run",
        `expected first run to write; got result=${JSON.stringify(result)}`,
      );
    }
    const got = listFiles(dest);
    const missing = EXPECTED_BASELINE_FILES.filter((f) => !got.includes(f));
    const extra = got.filter((f) => !EXPECTED_BASELINE_FILES.includes(f));
    if (missing.length || extra.length) {
      fail(
        "baseline-stamp.tree-shape",
        `missing=${JSON.stringify(missing)} extra=${JSON.stringify(extra)} got=${JSON.stringify(got)}`,
      );
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

function check2_baselineStampIsIdempotent(): void {
  const tmp = mkdtempSync(join(tmpdir(), "zoto-eval-baseline-idem-"));
  try {
    const dest = join(tmp, "evals", "fixtures", "baseline");
    const first = stampBaselineFixtures(REPO_ROOT, { dest });
    const cs1 = treeChecksum(dest);
    const second = stampBaselineFixtures(REPO_ROOT, { dest });
    const cs2 = treeChecksum(dest);
    if (second.written) {
      fail(
        "baseline-stamp.idempotency",
        `second run wrote when it should have been a no-op; first=${JSON.stringify(first)} second=${JSON.stringify(second)}`,
      );
    }
    if (cs1 !== cs2) {
      fail(
        "baseline-stamp.checksum-stable",
        `tree checksum changed between runs: ${cs1} -> ${cs2}`,
      );
    }
    if (cs1 !== second.destChecksumAfter) {
      fail(
        "baseline-stamp.checksum-reported",
        `reported destChecksumAfter=${second.destChecksumAfter} differs from on-disk recompute=${cs1}`,
      );
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

function check3_prepareSandboxCopiesBaselineAndOverlays(): void {
  const baselineSrc = join(
    REPO_ROOT,
    "plugins",
    "zoto-eval-system",
    "templates",
    "baseline-fixtures",
  );
  if (!existsSync(baselineSrc)) {
    fail("prepare-sandbox.precondition", `baseline template missing at ${baselineSrc}`);
    return;
  }
  const tmp = mkdtempSync(join(tmpdir(), "zoto-eval-sandbox-"));
  try {
    const result = prepareSandbox(tmp, {
      baselineDir: baselineSrc,
      fixtures: {
        files: [
          { path: "package.json", content: '{"name":"overlay","private":true}\n' },
          {
            path: "fixtures/case-overlay.txt",
            content: "case-specific overlay\n",
          },
        ],
      },
    });

    /* Every baseline file must be present (overlays may have overwritten some). */
    for (const f of EXPECTED_BASELINE_FILES) {
      if (!existsSync(join(tmp, f))) {
        fail(
          "prepare-sandbox.baseline-present",
          `expected baseline file missing in sandbox: ${f}`,
        );
      }
    }

    /* Overlay must overwrite baseline package.json. */
    const pkg = readFileSync(join(tmp, "package.json"), "utf-8");
    if (!pkg.includes('"name":"overlay"')) {
      fail(
        "prepare-sandbox.overlay-overwrites",
        `package.json was not overwritten by overlay; got ${JSON.stringify(pkg)}`,
      );
    }

    /* Overlay must add new file. */
    const newFile = join(tmp, "fixtures", "case-overlay.txt");
    if (!existsSync(newFile)) {
      fail("prepare-sandbox.overlay-adds", `overlay file missing: ${newFile}`);
    } else if (readFileSync(newFile, "utf-8") !== "case-specific overlay\n") {
      fail(
        "prepare-sandbox.overlay-adds.content",
        `overlay file body mismatch: ${JSON.stringify(readFileSync(newFile, "utf-8"))}`,
      );
    }

    if (result.overlayFiles !== 2) {
      fail(
        "prepare-sandbox.overlay-count",
        `expected overlayFiles=2 got=${result.overlayFiles}`,
      );
    }
    if (result.baselineFiles < EXPECTED_BASELINE_FILES.length) {
      fail(
        "prepare-sandbox.baseline-count",
        `expected baselineFiles>=${EXPECTED_BASELINE_FILES.length} got=${result.baselineFiles}`,
      );
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

function check4_baselineLooksDeterministic(): void {
  /* Read the live template tree and confirm no leakage of repo identifiers.
   * The token list mirrors the explicit grep set in the subtask spec — host
   * paths, env-var interpolation, the operator's username, and the host repo
   * name. The plugin's own `.zoto/eval-system/` namespace is intentional. */
  const baselineSrc = join(
    REPO_ROOT,
    "plugins",
    "zoto-eval-system",
    "templates",
    "baseline-fixtures",
  );
  const banned = ["/home/", "${", "andrewv", "zoto-agents"];
  for (const rel of listFiles(baselineSrc)) {
    const body = readFileSync(join(baselineSrc, rel), "utf-8");
    for (const tok of banned) {
      if (body.includes(tok)) {
        fail(
          "baseline.no-leakage",
          `baseline file ${rel} contains banned token ${JSON.stringify(tok)}`,
        );
      }
    }
  }
}

function main(): number {
  check1_baselineStampWritesExpectedTree();
  check2_baselineStampIsIdempotent();
  check3_prepareSandboxCopiesBaselineAndOverlays();
  check4_baselineLooksDeterministic();

  if (failures.length) {
    process.stderr.write(
      JSON.stringify({ smoke: "sandbox.baseline", ok: false, failures }, null, 2) +
        "\n",
    );
    return 1;
  }
  process.stdout.write(
    JSON.stringify(
      {
        smoke: "sandbox.baseline",
        ok: true,
        checks: [
          "baseline-stamp.first-run",
          "baseline-stamp.idempotency",
          "prepare-sandbox.copies-baseline+overlays",
          "baseline.no-repo-leakage",
        ],
      },
      null,
      2,
    ) + "\n",
  );
  return 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exit(main());
}
