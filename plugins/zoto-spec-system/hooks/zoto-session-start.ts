#!/usr/bin/env node
/**
 * Session start hook: nudge when workDir contains more items than threshold.
 *
 * Reads `.zoto/spec-system/config.yml` (the only supported config path).
 * If the file is missing the hook stays silent; the user must run
 * `/z-spec-init` to scaffold one.
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import YAML from "yaml";

const DEFAULT_UNIT = "spec";
const DEFAULT_WORK_DIR = "specs/current";
const DEFAULT_THRESHOLD = 20;
const DEFAULT_MESSAGE =
  "You have ${count} unprocessed ${unitOfWork}s. Consider running /z-spec-create to organize.";

function emitEmpty(): void {
  process.stdout.write("{}\n");
}

function loadYaml(path: string): unknown {
  try {
    const raw = YAML.parse(readFileSync(path, "utf-8"));
    return raw ?? {};
  } catch {
    return undefined;
  }
}

function countSubdirs(dir: string): number {
  try {
    return readdirSync(dir).filter((entry) => {
      try {
        return statSync(join(dir, entry)).isDirectory();
      } catch {
        return false;
      }
    }).length;
  } catch {
    return 0;
  }
}

function main(): void {
  // Consume stdin (required by hook protocol)
  try {
    readFileSync(0, "utf-8");
  } catch {
    // stdin may be empty or closed
  }

  const root = process.cwd();

  // Auto-migrate legacy .zoto-spec-system/ → .zoto/spec-system/
  const legacyDir = join(root, ".zoto-spec-system");
  const newDir = join(root, ".zoto", "spec-system");
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
    } catch {
      /* best-effort; loadConfig will handle the fallback */
    }
  }

  const configPath = join(root, ".zoto", "spec-system", "config.yml");

  const cfg = loadYaml(configPath);
  if (!cfg || typeof cfg !== "object" || Array.isArray(cfg)) {
    emitEmpty();
    return;
  }

  const config = cfg as Record<string, unknown>;
  const hooks = config.hooks;
  let nudgeCfg: Record<string, unknown> = {};

  if (hooks && typeof hooks === "object" && !Array.isArray(hooks)) {
    const raw = (hooks as Record<string, unknown>).sessionStartNudge;
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      nudgeCfg = raw as Record<string, unknown>;
    }
  }

  if (nudgeCfg.enabled === false) {
    emitEmpty();
    return;
  }

  let unitOfWork = config.unitOfWork;
  if (typeof unitOfWork !== "string" || !unitOfWork) {
    unitOfWork = DEFAULT_UNIT;
  }

  let workRel = config.workDir;
  if (typeof workRel !== "string" || !workRel) {
    workRel = DEFAULT_WORK_DIR;
  }
  const workDir = resolve(root, workRel as string);

  let threshold = nudgeCfg.threshold;
  if (typeof threshold !== "number") {
    threshold =
      typeof threshold === "string" ? parseInt(threshold, 10) : DEFAULT_THRESHOLD;
    if (isNaN(threshold as number)) {
      threshold = DEFAULT_THRESHOLD;
    }
  }

  let messageTemplate = nudgeCfg.message;
  if (typeof messageTemplate !== "string" || !messageTemplate) {
    messageTemplate = DEFAULT_MESSAGE;
  }

  const count = countSubdirs(workDir);

  if (count > (threshold as number)) {
    const msg = (messageTemplate as string)
      .replace("${count}", String(count))
      .replace("${unitOfWork}", String(unitOfWork));
    process.stdout.write(JSON.stringify({ additional_context: msg }) + "\n");
  } else {
    emitEmpty();
  }
}

main();
