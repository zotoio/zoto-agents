#!/usr/bin/env node
/**
 * Session start hook: nudge when workDir contains more items than threshold.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const DEFAULT_UNIT = "spec";
const DEFAULT_WORK_DIR = "specs/current";
const DEFAULT_THRESHOLD = 20;
const DEFAULT_MESSAGE =
  "You have ${count} unprocessed ${unitOfWork}s. Consider running /zoto-plan to organize.";

function emitEmpty(): void {
  process.stdout.write("{}\n");
}

function loadJson(path: string): unknown {
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
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
  const configPath = join(root, ".spec-system", "config.json");

  const cfg = loadJson(configPath);
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
