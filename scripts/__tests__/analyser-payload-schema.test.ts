/**
 * Targeted schema tests for analyser-payload interaction classification fields
 * (subtask 04 — Eval AskQuestion Strategy Bridge).
 *
 * Run: pnpm exec vitest run scripts/__tests__/analyser-payload-schema.test.ts
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import Ajv from "ajv";
import { describe, expect, it } from "vitest";

import {
  ANALYSER_VERSION,
  buildPrimitiveAnalysisMeta,
  computeAnalyserCacheKey,
  normaliseContent,
  type AnalyserPayload,
} from "../eval-analyse.ts";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SCHEMA_PATH = join(
  REPO_ROOT,
  "plugins/zoto-eval-system/templates/schema/analyser-payload.schema.json",
);

function loadValidator() {
  const schema = JSON.parse(readFileSync(SCHEMA_PATH, "utf-8"));
  const ajv = new Ajv({ allErrors: true, strict: false });
  return ajv.compile(schema);
}

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
    target_id: "command:z-eval-configure",
    kind: "command",
    source_path: "plugins/zoto-eval-system/commands/z-eval-configure.md",
    source_hash: sourceHash,
    summary: "Command-owned askQuestion before config write.",
    requiresInteraction: true,
    interactionStyle: "command-owned",
    cases: [
      {
        scenario: "operator approves defaults",
        prompt: "/z-eval-configure",
        assertions: [
          "the command emitted askQuestion for enum-backed fields before spawning the configurer",
        ],
      },
    ],
    ...overrides,
  };
}

describe("analyser-payload.schema.json interaction fields", () => {
  const validate = loadValidator();

  it("accepts payloads omitting requiresInteraction and interactionStyle", () => {
    const payload = minimalPayload({
      requiresInteraction: undefined,
      interactionStyle: undefined,
    });
    expect(validate(payload)).toBe(true);
  });

  it("rejects non-boolean requiresInteraction", () => {
    const payload = minimalPayload({
      requiresInteraction: "yes" as unknown as boolean,
    });
    expect(validate(payload)).toBe(false);
    expect(validate.errors?.some((e) => e.instancePath === "/requiresInteraction")).toBe(
      true,
    );
  });

  it("round-trips a classified payload and projects into primitive_analysis", () => {
    const payload = minimalPayload();
    expect(validate(payload)).toBe(true);

    const meta = buildPrimitiveAnalysisMeta(payload, {
      analysedAt: "2026-05-26T00:00:00.000Z",
    });
    expect(meta.requiresInteraction).toBe(true);
    expect(meta.interactionStyle).toBe("command-owned");
    expect(meta.analyser_version).toBe(ANALYSER_VERSION);
    expect(meta.source_hash).toBe(payload.source_hash);
  });
});
