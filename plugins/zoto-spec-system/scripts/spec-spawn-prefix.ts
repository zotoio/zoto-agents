#!/usr/bin/env tsx
/**
 * Prints the spawn-time prompt prefix for a role (resolved token budget from live config).
 * Executor LLM shells out to this script per spawn; do not import the loader in the executor prompt.
 */

import {
  ConfigValidationError,
  loadConfig,
  resolveSubagentBudget,
} from "../src/config-loader.js";
import { buildSpawnPrefix } from "../src/spawn-prompt.js";

type SpawnRole = "generator" | "executor" | "judge" | "subtask";

function parseArgs(argv: string[]): {
  role: SpawnRole;
  statusYmlPath: string;
  statusMdPath: string;
} {
  let role: SpawnRole | undefined;
  let statusYmlPath: string | undefined;
  let statusMdPath: string | undefined;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--role") {
      role = argv[++i] as SpawnRole;
    } else if (a === "--status-yml") {
      statusYmlPath = argv[++i];
    } else if (a === "--status-md") {
      statusMdPath = argv[++i];
    }
  }

  const validRoles: SpawnRole[] = ["generator", "executor", "judge", "subtask"];
  if (!role || !validRoles.includes(role)) {
    throw new Error(
      `Missing or invalid --role (expected one of: ${validRoles.join("|")})`,
    );
  }
  if (!statusYmlPath || !statusMdPath) {
    throw new Error("Both --status-yml and --status-md are required");
  }

  return { role, statusYmlPath, statusMdPath };
}

function main(): void {
  let role: SpawnRole;
  let statusYmlPath: string;
  let statusMdPath: string;
  try {
    ({ role, statusYmlPath, statusMdPath } = parseArgs(process.argv.slice(2)));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(JSON.stringify({ error: msg, code: "INVALID_ARGS" }));
    process.exit(1);
    return;
  }

  const repoRoot = process.cwd();

  try {
    const { config } = loadConfig(repoRoot);
    const { tokenBudget, model } = resolveSubagentBudget(config, role);
    const prefix = buildSpawnPrefix({
      role,
      tokenBudget,
      model,
      statusYmlPath,
      statusMdPath,
    });
    process.stdout.write(`${prefix}\n`);
  } catch (e) {
    if (e instanceof ConfigValidationError) {
      console.error(
        JSON.stringify({
          error: e.message,
          code: "ConfigValidationError",
        }),
      );
    } else {
      console.error(
        JSON.stringify({
          error: e instanceof Error ? e.message : String(e),
          code: "LOAD_CONFIG_ERROR",
        }),
      );
    }
    process.exit(1);
  }
}

main();
