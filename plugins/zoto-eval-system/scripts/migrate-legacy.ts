/**
 * Auto-migrate legacy `.zoto-eval-system/` to `.zoto/eval-system/`.
 *
 * - Moves the entire directory tree via rename(2).
 * - Converts `config.json` content to YAML and writes `config.yml`.
 * - If both old and new exist, does nothing and returns `conflict: true`.
 * - Safe to call repeatedly (no-op when already migrated).
 */
import { existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import YAML from "yaml";

export interface MigrationResult {
  migrated: boolean;
  from?: string;
  to?: string;
  conflict?: boolean;
}

export function migrateEvalSystemLegacy(repoRoot: string): MigrationResult {
  const legacyDir = join(repoRoot, ".zoto-eval-system");
  const newDir = join(repoRoot, ".zoto", "eval-system");

  if (!existsSync(legacyDir)) {
    return { migrated: false };
  }

  if (existsSync(newDir)) {
    return { migrated: false, conflict: true, from: legacyDir, to: newDir };
  }

  mkdirSync(dirname(newDir), { recursive: true });
  renameSync(legacyDir, newDir);

  const oldConfig = join(newDir, "config.json");
  const newConfig = join(newDir, "config.yml");
  if (existsSync(oldConfig) && !existsSync(newConfig)) {
    try {
      const json = JSON.parse(readFileSync(oldConfig, "utf-8"));
      writeFileSync(newConfig, YAML.stringify(json), "utf-8");
      unlinkSync(oldConfig);
    } catch {
      renameSync(oldConfig, newConfig);
    }
  }

  return { migrated: true, from: legacyDir, to: newDir };
}
