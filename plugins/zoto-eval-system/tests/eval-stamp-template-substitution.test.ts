/**
 * Template substitution safety for eval-stamp renderers.
 *
 * `String.prototype.replaceAll` treats `$'`, `$&`, `$1`, … specially in the
 * replacement string. JSON payloads with regex end anchors followed by single
 * quotes (e.g. Jest mapper keys `'$': 'ts-jest'`) must survive stamping.
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
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  ANALYSER_VERSION,
  computeAnalyserCacheKey,
  normaliseContent,
  type AnalyserPayload,
} from "../scripts/eval-analyse.ts";
import {
  buildPrimitiveMetaFromPayload,
  stampVitestPerPrimitive,
} from "../scripts/eval-stamp.ts";

const PLUGIN_DIR = join(import.meta.dirname, "..");

function minimalPayload(
  overrides: Partial<AnalyserPayload> = {},
): AnalyserPayload {
  const source = "---\nname: x\ndescription: y\n---\n\nbody\n";
  const sourceHash = computeAnalyserCacheKey({
    normalisedSource: normaliseContent(source),
    analyserVersion: ANALYSER_VERSION,
    modelId: "composer-2.5",
  });
  return {
    schema_version: 1,
    analyser_version: ANALYSER_VERSION,
    model_id: "composer-2.5",
    target_id: "skill:nab-testing",
    kind: "skill",
    source_path: "plugins/zoto-test/skills/nab-testing/SKILL.md",
    source_hash: sourceHash,
    summary: "Synthetic substitution test payload.",
    cases: [
      {
        scenario: "jest mapper regex",
        prompt: "configure jest moduleNameMapper",
        assertions: [
          "uses regex ^.+\\.tsx?$ for TypeScript files",
          "mapper includes '$': 'ts-jest'",
        ],
        fixtures: {
          files: [
            {
              path: "jest.config.js",
              content:
                "module.exports = { '\\.(tsx?)$': 'ts-jest', '^[0-9]{6}$': 'numeric' };",
            },
          ],
        },
      },
    ],
    ...overrides,
  };
}

function stampHost(payload: AnalyserPayload) {
  const host = mkdtempSync(join(tmpdir(), "eval-stamp-subst-"));
  mkdirSync(join(host, ".zoto", "eval-system"), { recursive: true });
  cpSync(join(PLUGIN_DIR, "templates"), join(host, ".zoto", "eval-system", "templates"), {
    recursive: true,
  });
  writeFileSync(
    join(host, ".zoto", "eval-system", "config.yml"),
    [
      "schema_version: 1",
      "static:",
      "  framework: vitest",
      "",
    ].join("\n"),
    "utf-8",
  );
  const primitive = buildPrimitiveMetaFromPayload(payload);
  const result = stampVitestPerPrimitive(host, payload, primitive, {
    bypassGuard: true,
  });
  return { host, result };
}

describe("eval-stamp template substitution", () => {
  it("preserves JSON payloads containing $' replacement metacharacters", () => {
    const payload = minimalPayload();
    const { host, result } = stampHost(payload);
    try {
      const body = readFileSync(result.testFile, "utf-8");
      expect(body).toContain("uses regex ^.+\\\\.tsx?$ for TypeScript files");
      expect(body).toContain("mapper includes '$': 'ts-jest'");
      expect(body).toContain("'\\\\.(tsx?)$': 'ts-jest'");
      expect(body).toContain("'^[0-9]{6}$': 'numeric'");
      expect(body).toContain("const SOURCE_PATH =");
      expect(body.indexOf("const PAYLOAD")).toBeLessThan(body.indexOf("const SOURCE_PATH"));
    } finally {
      rmSync(host, { recursive: true, force: true });
    }
  });

  it("stamps vitest config with #eval-engine alias and underscore scenario exclude", () => {
    const payload = minimalPayload();
    const { host, result } = stampHost(payload);
    try {
      const config = readFileSync(result.configFile, "utf-8");
      expect(config).toContain('import { evalEngineRoot } from "./_zoto/plugin-root.js"');
      expect(config).toContain('"#eval-engine": evalEngineRoot');
      expect(config).toContain('"**/evals/scenarios/_*"');
    } finally {
      rmSync(host, { recursive: true, force: true });
    }
  });

  it("stamps plugin-root and sandbox shims required by setup.ts", () => {
    const payload = minimalPayload();
    const { host, result } = stampHost(payload);
    try {
      const pluginRoot = join(result.evalsDir, "_zoto", "plugin-root.ts");
      const sandbox = join(result.evalsDir, "_llm", "sandbox.ts");
      expect(existsSync(pluginRoot)).toBe(true);
      expect(existsSync(sandbox)).toBe(true);
      expect(readFileSync(sandbox, "utf-8")).toContain(
        'export * from "#eval-engine/sandbox.js"',
      );
    } finally {
      rmSync(host, { recursive: true, force: true });
    }
  });
});
