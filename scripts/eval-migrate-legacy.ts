/**
 * Auto-migrate legacy `.zoto-eval-system/` to `.zoto/eval-system/`.
 *
 * Import this module for its side-effect: on first load it checks for the
 * legacy directory under `process.cwd()` and moves it in-place, converting
 * config.json content to proper YAML. Safe to import from any script; the
 * migration runs at most once per process.
 */
import { existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import YAML from "yaml";

const root = resolve(process.cwd());
const legacyDir = join(root, ".zoto-eval-system");
const newDir = join(root, ".zoto", "eval-system");

if (existsSync(legacyDir) && !existsSync(newDir)) {
  try {
    mkdirSync(dirname(newDir), { recursive: true });
    renameSync(legacyDir, newDir);

    const oldCfg = join(newDir, "config.json");
    const newCfg = join(newDir, "config.yml");
    if (existsSync(oldCfg) && !existsSync(newCfg)) {
      try {
        const json = JSON.parse(readFileSync(oldCfg, "utf-8"));
        writeFileSync(newCfg, YAML.stringify(json), "utf-8");
        unlinkSync(oldCfg);
      } catch {
        renameSync(oldCfg, newCfg);
      }
    }

    process.stderr.write(
      `[eval-system] migrated ${legacyDir} → ${newDir}\n`,
    );
  } catch {
    /* best-effort; readers will report the real error */
  }
}
