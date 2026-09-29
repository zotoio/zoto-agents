/** Shared paths/helpers for the Jev grader tests. */
import { cpSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { JevCase, JevCaseFile } from "../engine/jev/suite.js";

export const PLUGIN_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const REPO_ROOT = resolve(PLUGIN_ROOT, "..", "..");
export const JEV_DIR = join(REPO_ROOT, "evals", "jev");

export function readCases(rel: string): Array<{ source: string; case: JevCase }> {
  const file = JSON.parse(readFileSync(join(JEV_DIR, rel), "utf-8")) as JevCaseFile;
  return file.cases.map((c) => ({ source: rel, case: c }));
}

export function adversarialCase(id: string): JevCase {
  const found = readCases("adversarial/cases.json").find((c) => c.case.id === id);
  if (!found) throw new Error(`no adversarial case ${id}`);
  return found.case;
}

/** Copy evals/jev to a temp dir so tests can mutate fixtures/templates safely. */
export function copyJevDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "zoto-jev-"));
  cpSync(JEV_DIR, dir, { recursive: true });
  return dir;
}

/** Env with no key and default (fixture) mode. */
export const FIXTURE_ENV = {} as const;
