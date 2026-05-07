import {
  resolveSubagentBudget,
  type SpecSystemConfig,
} from "./config-loader.js";

export interface SpawnContext {
  role: "generator" | "executor" | "judge" | "subtask";
  tokenBudget: number;
  model: string | undefined;
  statusYmlPath: string;
  statusMdPath: string;
}

/**
 * Stable prefix fragment for spawn prompts and downstream grep/assertions.
 * Keep in sync with {@link buildSpawnPrefix}.
 */
export function spawnPromptBudgetLead(tokenBudget: number): string {
  return `Token budget: ${tokenBudget}`;
}

/**
 * Builds the spawn-time prompt prefix. Wording must stay in sync with docs and subtask eval greps.
 */
export function buildSpawnPrefix(ctx: SpawnContext): string {
  const budgetLine =
    `${spawnPromptBudgetLead(ctx.tokenBudget)}. Stay within this budget; record the resolved value in your status.yml token_budget field; if you exceed it, add a warn-level entry to your status.yml errors[] array.`;
  return [
    budgetLine,
    "Status files (you own these):",
    `  - ${ctx.statusMdPath}`,
    `  - ${ctx.statusYmlPath}`,
    "Heartbeat at start, after each checklist tick, and on completion. Final state must be one of: completed | blocked | failed.",
  ].join("\n");
}

/** Resolves per-role budget then builds the prefix (used by the spawn-prefix CLI and tests). */
export function buildSpawnPrefixFromConfig(
  cfg: SpecSystemConfig,
  role: SpawnContext["role"],
  statusYmlPath: string,
  statusMdPath: string,
): string {
  const { tokenBudget, model } = resolveSubagentBudget(cfg, role);
  return buildSpawnPrefix({
    role,
    tokenBudget,
    model,
    statusYmlPath,
    statusMdPath,
  });
}
