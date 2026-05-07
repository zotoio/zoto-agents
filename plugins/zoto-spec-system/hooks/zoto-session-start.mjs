#!/usr/bin/env node

// hooks/zoto-session-start.ts
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, statSync, unlinkSync, writeFileSync } from "fs";
import { dirname, join, resolve } from "path";
import YAML from "yaml";
var DEFAULT_UNIT = "spec";
var DEFAULT_WORK_DIR = "specs/current";
var DEFAULT_THRESHOLD = 20;
var DEFAULT_MESSAGE = "You have ${count} unprocessed ${unitOfWork}s. Consider running /z-spec-create to organize.";
function emitEmpty() {
  process.stdout.write("{}\n");
}
function loadYaml(path) {
  try {
    const raw = YAML.parse(readFileSync(path, "utf-8"));
    return raw ?? {};
  } catch {
    return void 0;
  }
}
function countSubdirs(dir) {
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
function main() {
  try {
    readFileSync(0, "utf-8");
  } catch {
  }
  const root = process.cwd();
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
    }
  }
  const configPath = join(root, ".zoto", "spec-system", "config.yml");
  const cfg = loadYaml(configPath);
  if (!cfg || typeof cfg !== "object" || Array.isArray(cfg)) {
    emitEmpty();
    return;
  }
  const config = cfg;
  const hooks = config.hooks;
  let nudgeCfg = {};
  if (hooks && typeof hooks === "object" && !Array.isArray(hooks)) {
    const raw = hooks.sessionStartNudge;
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      nudgeCfg = raw;
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
  const workDir = resolve(root, workRel);
  let threshold = nudgeCfg.threshold;
  if (typeof threshold !== "number") {
    threshold = typeof threshold === "string" ? parseInt(threshold, 10) : DEFAULT_THRESHOLD;
    if (isNaN(threshold)) {
      threshold = DEFAULT_THRESHOLD;
    }
  }
  let messageTemplate = nudgeCfg.message;
  if (typeof messageTemplate !== "string" || !messageTemplate) {
    messageTemplate = DEFAULT_MESSAGE;
  }
  const count = countSubdirs(workDir);
  if (count > threshold) {
    const msg = messageTemplate.replace("${count}", String(count)).replace("${unitOfWork}", String(unitOfWork));
    process.stdout.write(JSON.stringify({ additional_context: msg }) + "\n");
  } else {
    emitEmpty();
  }
}
main();
