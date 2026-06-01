#!/usr/bin/env tsx
/**
 * TS↔Python `AnalyserPayload` parity gate.
 *
 * Reads the canonical TypeScript spec (`ANALYSER_PAYLOAD_PARITY_SPEC` exported
 * by `scripts/eval-analyse.ts`) and the Python dataclasses declared in
 * `evals/_llm/types.py`, normalises both into a comparable JSON shape, diffs
 * them at field granularity, and exits non-zero on drift with the diff
 * printed.
 *
 * This script is intentionally dependency-free and parses the Python source
 * with regex + a small AST-ish state machine. It does NOT shell out to
 * `python3` because the parity gate must run in CI environments without a
 * Python toolchain present.
 *
 * Wired into:
 *   - `pnpm run eval:analyser-parity-check` (this file)
 *   - subtask 11's `eval:update --check` flow (re-invokes this gate)
 */
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  ANALYSER_PAYLOAD_PARITY_SPEC,
  type ParityField,
  type ParityType,
} from "./eval-analyse.ts";
import { resolveHostRepoRoot } from "../src/config-loader.js";

const REPO_ROOT = resolveHostRepoRoot();
const PY_TYPES_REL = "evals/_llm/types.py";

interface NormalisedField {
  name: string;
  optional: boolean;
}

interface NormalisedType {
  name: string;
  fields: NormalisedField[];
}

function tsToNormalised(spec: ParityType): NormalisedType {
  const fields = spec.fields
    .map((f) => ({ name: f.name, optional: f.optional }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return { name: spec.name, fields };
}

interface PyDataclass {
  name: string;
  /** Ordered list of field declarations as appearing in the source. */
  rawFields: Array<{
    pythonName: string;
    annotation: string;
    hasDefault: boolean;
  }>;
}

/**
 * Lightweight Python dataclass parser. Looks for `@dataclass[(...)]` decorators
 * immediately followed by `class X[(Base)]:` blocks and extracts top-level
 * `name: type` lines until the next dedent.
 */
function parsePythonDataclasses(src: string): PyDataclass[] {
  const lines = src.split(/\r?\n/);
  const out: PyDataclass[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (!/^@dataclass\b/.test(line.trim())) continue;
    let j = i + 1;
    while (j < lines.length && /^\s*$/.test(lines[j]!)) j++;
    while (j < lines.length && /^@/.test(lines[j]!.trim())) j++;
    const classLine = lines[j];
    if (!classLine) continue;
    const cm = classLine.match(/^class\s+(\w+)\b/);
    if (!cm) continue;
    const className = cm[1]!;
    j++;
    const fields: PyDataclass["rawFields"] = [];
    while (j < lines.length) {
      const raw = lines[j]!;
      if (raw.length === 0) {
        j++;
        continue;
      }
      if (!/^\s/.test(raw)) break;
      const stripped = raw.replace(/^\s+/, "");
      if (
        stripped.startsWith("#") ||
        stripped.startsWith('"""') ||
        stripped.startsWith("'''") ||
        stripped.startsWith("def ") ||
        stripped.startsWith("@") ||
        stripped.startsWith("class ")
      ) {
        // skip over docstring blocks delimited by triple quotes
        if (stripped.startsWith('"""') || stripped.startsWith("'''")) {
          const quote = stripped.slice(0, 3);
          const rest = stripped.slice(3);
          if (!rest.includes(quote)) {
            j++;
            while (j < lines.length && !lines[j]!.includes(quote)) j++;
          }
        }
        j++;
        continue;
      }
      const fm = stripped.match(
        /^([A-Za-z_][\w]*)\s*:\s*([^=]+?)(\s*=\s*.*)?$/,
      );
      if (fm) {
        fields.push({
          pythonName: fm[1]!,
          annotation: fm[2]!.trim(),
          hasDefault: Boolean(fm[3]),
        });
      }
      j++;
    }
    out.push({ name: className, rawFields: fields });
    i = j - 1;
  }
  return out;
}

/**
 * "Optional" mirrors JSON-shape semantics: the key may be absent or null. In
 * Python that means the annotation is `Optional[T]` / `T | None`. A bare
 * default value (e.g. `= field(default_factory=list)`) does NOT make the
 * field optional in the analyser-payload contract — it's a Pythonic
 * convenience for always-populated collections.
 */
function pyOptional(annotation: string, _hasDefault: boolean): boolean {
  const a = annotation.trim();
  if (/\bOptional\[/.test(a)) return true;
  if (/\|\s*None\b/.test(a)) return true;
  if (/\bNone\s*\|/.test(a)) return true;
  return false;
}

function pyToNormalised(
  cls: PyDataclass,
  spec: ParityType,
): NormalisedType {
  const fields: NormalisedField[] = cls.rawFields.map((f) => {
    const tsName = (() => {
      if (!spec.renames) return f.pythonName;
      for (const [tsKey, pyKey] of Object.entries(spec.renames)) {
        if (pyKey === f.pythonName) return tsKey;
      }
      return f.pythonName;
    })();
    return {
      name: tsName,
      optional: pyOptional(f.annotation, f.hasDefault),
    };
  });
  fields.sort((a, b) => a.name.localeCompare(b.name));
  return { name: cls.name, fields };
}

function diffFields(
  ts: NormalisedField[],
  py: NormalisedField[],
): { ok: boolean; lines: string[] } {
  const lines: string[] = [];
  const tsMap = new Map(ts.map((f) => [f.name, f]));
  const pyMap = new Map(py.map((f) => [f.name, f]));
  for (const name of new Set([...tsMap.keys(), ...pyMap.keys()])) {
    const t = tsMap.get(name);
    const p = pyMap.get(name);
    if (t && !p) lines.push(`  - field '${name}' present in TS, missing in Python`);
    else if (!t && p)
      lines.push(`  - field '${name}' present in Python, missing in TS`);
    else if (t && p && t.optional !== p.optional)
      lines.push(
        `  - field '${name}' optionality drift: TS optional=${t.optional}, Python optional=${p.optional}`,
      );
  }
  return { ok: lines.length === 0, lines };
}

interface ParityReport {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

function runParityCheck(repoRoot: string = REPO_ROOT): ParityReport {
  const pySrc = readFileSync(join(repoRoot, PY_TYPES_REL), "utf-8");
  const pyClasses = parsePythonDataclasses(pySrc);
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const spec of ANALYSER_PAYLOAD_PARITY_SPEC) {
    const cls = pyClasses.find((c) => c.name === spec.pythonName);
    if (!cls) {
      errors.push(
        `missing Python dataclass '${spec.pythonName}' for TS type '${spec.name}'`,
      );
      continue;
    }
    const tsNorm = tsToNormalised(spec);
    const pyNorm = pyToNormalised(cls, spec);
    const d = diffFields(tsNorm.fields, pyNorm.fields);
    if (!d.ok) {
      errors.push(`type '${spec.name}' / '${spec.pythonName}' field drift:`);
      for (const ln of d.lines) errors.push(ln);
    }
  }

  for (const cls of pyClasses) {
    if (!ANALYSER_PAYLOAD_PARITY_SPEC.find((s) => s.pythonName === cls.name)) {
      warnings.push(
        `Python dataclass '${cls.name}' has no TS parity spec entry — add it to ANALYSER_PAYLOAD_PARITY_SPEC if it's part of the analyser payload contract.`,
      );
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}

function main(): number {
  const report = runParityCheck();
  if (report.warnings.length > 0) {
    process.stderr.write(
      `${JSON.stringify({ parity: "warning", warnings: report.warnings })}\n`,
    );
  }
  if (report.ok) {
    process.stdout.write(
      `${JSON.stringify({
        parity: "ok",
        ts_types: ANALYSER_PAYLOAD_PARITY_SPEC.map((s) => s.name),
      })}\n`,
    );
    return 0;
  }
  process.stderr.write(
    `${JSON.stringify({ parity: "drift", errors: report.errors }, null, 2)}\n`,
  );
  for (const ln of report.errors) {
    process.stderr.write(`${ln}\n`);
  }
  return 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exit(main());
}

export { runParityCheck };
