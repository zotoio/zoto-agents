/**
 * `pnpm eval:jev` CLI: stamp-trust gate runs before any Jev-graded case, the
 * summary prints three separate counts, and non-green runs exit non-zero.
 */
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { JEV_DIR, PLUGIN_ROOT, REPO_ROOT } from "./jev-helpers.js";

const SCRIPT = join(PLUGIN_ROOT, "scripts", "eval-jev.ts");

function tsxBin(): string {
  for (const p of [join(PLUGIN_ROOT, "node_modules", ".bin", "tsx"), join(REPO_ROOT, "node_modules", ".bin", "tsx")]) {
    if (existsSync(p)) return p;
  }
  throw new Error("tsx not found");
}

function run(cwd: string, args: string[] = []) {
  const env = { ...process.env };
  delete env.TYPESAFE_API_KEY;
  delete env.ZOTO_EVAL_JEV_MODE;
  const r = spawnSync(tsxBin(), [SCRIPT, ...args], { cwd, encoding: "utf-8", env });
  return { status: r.status, out: `${r.stdout}${r.stderr}` };
}

describe("eval:jev CLI", () => {
  it("green in fixture mode on this repo (stamp gate passes first)", () => {
    const r = run(REPO_ROOT, ["--no-write"]);
    expect(r.out).toContain("pass: 3\nfail: 0\ninconclusive: 0");
    expect(r.status).toBe(0);
  }, 60_000);

  it("stamp-trust gate refuses before any Jev case runs", () => {
    const host = mkdtempSync(join(tmpdir(), "zoto-jev-host-"));
    mkdirSync(join(host, "evals", "_zoto"), { recursive: true });
    cpSync(JEV_DIR, join(host, "evals", "jev"), { recursive: true });
    // No stamp-manifest.json → EVAL_STAMP_TRUNCATED.
    const r = run(host, ["--no-write"]);
    expect(r.status).toBe(2);
    expect(r.out).toMatch(/eval_stamp_truncated/i);
    expect(r.out).not.toContain("Jev evals (mode=");
  }, 60_000);

  it("--check-lock reports drift with a non-zero exit", () => {
    const host = mkdtempSync(join(tmpdir(), "zoto-jev-host-"));
    cpSync(JEV_DIR, join(host, "evals", "jev"), { recursive: true });
    writeFileSync(join(host, "evals", "jev", "fixtures", "new.json"), "{}");
    const r = run(host, ["--check-lock"]);
    expect(r.status).toBe(1);
    expect(r.out).toMatch(/fixture set changed/);
  }, 60_000);
});
