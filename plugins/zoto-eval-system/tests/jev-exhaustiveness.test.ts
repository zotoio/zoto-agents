/**
 * Row e: every consumer of the verdict / gate unions switches on the
 * discriminant with an `assertNever` default, so adding a kind without
 * handling it breaks `tsc --noEmit`. Proven here by type-checking a temp copy
 * of the Jev engine with an extra union member injected.
 */
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { PLUGIN_ROOT, REPO_ROOT } from "./jev-helpers.js";

function tscBin(): string {
  for (const p of [join(PLUGIN_ROOT, "node_modules", ".bin", "tsc"), join(REPO_ROOT, "node_modules", ".bin", "tsc")]) {
    if (existsSync(p)) return p;
  }
  throw new Error("tsc not found");
}

type Patch = { file: string; from: string | RegExp; to: string };

/** Type-check a temp copy of the engine with the same scope as tsconfig.jev.json. */
function typecheckCopy(patch?: Patch): { status: number | null; out: string } {
  const dir = mkdtempSync(join(tmpdir(), "zoto-jev-tsc-"));
  mkdirSync(join(dir, "engine"), { recursive: true });
  cpSync(join(PLUGIN_ROOT, "engine"), join(dir, "engine"), { recursive: true });
  if (patch) {
    const p = join(dir, patch.file);
    const src = readFileSync(p, "utf-8");
    const found = typeof patch.from === "string" ? src.includes(patch.from) : patch.from.test(src);
    if (!found) throw new Error(`patch anchor not found in ${patch.file}`);
    writeFileSync(p, src.replace(patch.from, patch.to));
  }
  writeFileSync(
    join(dir, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: {
        target: "ES2022",
        module: "Node16",
        moduleResolution: "Node16",
        strict: true,
        skipLibCheck: true,
        noEmit: true,
        types: ["node"],
        typeRoots: [join(REPO_ROOT, "node_modules", "@types")],
      },
      include: ["engine/jev/**/*.ts", "engine/graders/*.ts", "engine/case.ts"],
    }),
  );
  const r = spawnSync(tscBin(), ["--noEmit", "-p", join(dir, "tsconfig.json")], { encoding: "utf-8" });
  return { status: r.status, out: `${r.stdout}${r.stderr}` };
}

describe("row e: exhaustiveness is enforced by tsc", () => {
  it("control: unmodified copy type-checks", () => {
    const r = typecheckCopy();
    expect(r.out).toBe("");
    expect(r.status).toBe(0);
  }, 60_000);

  it("adding an unhandled JevVerdict kind makes tsc red", () => {
    const r = typecheckCopy({
      file: "engine/jev/verdict.ts",
      from: '| { kind: "inconclusive"; reason: string };',
      to: '| { kind: "inconclusive"; reason: string }\n  | { kind: "skipped" };',
    });
    expect(r.status).not.toBe(0);
    expect(r.out).toMatch(/engine\/jev\/verdict\.ts.*error TS2345.*"skipped"/);
  }, 60_000);

  it("adding a 5th GateOutcome kind makes tsc red", () => {
    const r = typecheckCopy({
      file: "engine/jev/gates.ts",
      from: 'export type GateOutcome = "act" | "ask_human" | "deny" | "abstain";',
      to: 'export type GateOutcome = "act" | "ask_human" | "deny" | "abstain" | "escalate";',
    });
    expect(r.status).not.toBe(0);
    expect(r.out).toMatch(/engine\/graders\/jev\.ts.*error TS2345.*"escalate"/);
  }, 60_000);

  /* jev is the fifth grader kind (contains | regex | tool-called | llm-judge | jev).
   * Its consumers are case.ts validation and graders/dispatch.ts, which runner.ts
   * and the unified harness (run-llm-suite.ts) both call. */
  it("fifth grader kind unhandled in the shared dispatcher (runner.ts + run-llm-suite.ts) makes tsc red", () => {
    const r = typecheckCopy({
      file: "engine/graders/dispatch.ts",
      from: /    case "jev":\n.*\n.*\n/,
      to: "",
    });
    expect(r.status).not.toBe(0);
    expect(r.out).toMatch(/engine\/graders\/dispatch\.ts.*error TS2345.*type: "jev"/s);
  }, 60_000);

  it("fifth grader kind unhandled in case.ts validation makes tsc red", () => {
    const r = typecheckCopy({
      file: "engine/case.ts",
      from: /    case "jev": \{[\s\S]*?      break;\n    \}\n/,
      to: "",
    });
    expect(r.status).not.toBe(0);
    expect(r.out).toMatch(/engine\/case\.ts.*error TS2345.*"jev"/);
  }, 60_000);
});
