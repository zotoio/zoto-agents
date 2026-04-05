#!/usr/bin/env node

// hooks/zoto-session-start.ts
import { readFileSync, readdirSync, statSync } from "fs";
import { join, resolve } from "path";
var DEFAULT_UNIT = "spec";
var DEFAULT_WORK_DIR = "specs/current";
var DEFAULT_THRESHOLD = 20;
var DEFAULT_MESSAGE = "You have ${count} unprocessed ${unitOfWork}s. Consider running /zoto-spec-create to organize.";
function emitEmpty() {
  process.stdout.write("{}\n");
}
function loadJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
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
  const configPath = join(root, ".zoto-spec-system", "config.json");
  const cfg = loadJson(configPath);
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
