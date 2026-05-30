#!/usr/bin/env tsx
/** Subtask 13: single declarative LLM smoke case (backend: declarative). */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { casesOf, loadEvalFile, validateEnriched } from "../../../plugins/zoto-eval-system/engine/case.js";
import { createAgent, sendPrompt, awaitRun, closeAgent, resolveTokens } from "../../../plugins/zoto-eval-system/engine/sdk-bridge.js";
import { llmJudge } from "../../../plugins/zoto-eval-system/engine/graders/llm-judge.js";
import { contains } from "../../../plugins/zoto-eval-system/engine/graders/contains.js";
import { regex } from "../../../plugins/zoto-eval-system/engine/graders/regex.js";
import type { EvalCase } from "../../../plugins/zoto-eval-system/engine/case.js";

const REPO_ROOT = resolve(process.cwd());
const EVAL_FILE = join(REPO_ROOT, "plugins/zoto-eval-system/evals/commands/z-eval-jump.json");
const CASE_ID = "1";

async function main(): Promise<number> {
  if (!process.env.CURSOR_API_KEY) {
    console.log(JSON.stringify({ backend: "declarative", status: "deferred", reason: "CURSOR_API_KEY missing" }));
    return 0;
  }
  const c = casesOf(loadEvalFile(EVAL_FILE)).find((x) => String(x.id) === CASE_ID);
  if (!c) throw new Error(`case ${CASE_ID} not found`);
  const v = validateEnriched(c);
  if (!v.ok) throw new Error(v.reason ?? "validate failed");
  console.log(JSON.stringify({ backend: "declarative", case_id: c.id, target: "command:z-eval-jump", phase: "start" }));
  const agent = await createAgent({ modelId: process.env.ZOTO_EVAL_MODEL ?? "composer-2", cwd: REPO_ROOT });
  try {
    const run = await sendPrompt(agent, c.prompt);
    const awaited = await awaitRun(run);
    const text = awaited.text;
    let pass = true;
    for (const g of c.graders ?? []) {
      const t = (g as { type?: string }).type;
      if (t === "contains") pass &&= contains(g as never, text).verdict === "pass";
      else if (t === "regex") pass &&= regex(g as never, text).verdict === "pass";
    }
    if (c.assertions?.length) {
      const rubric = c.assertions.map((a, i) => `${i + 1}. ${a}`).join("\n");
      const jr = await llmJudge({ type: "llm-judge", rubric, passThreshold: 0.72 }, text, {
        judge: async ({ prompt }) => {
          const ja = await createAgent({ modelId: process.env.ZOTO_EVAL_JUDGE_MODEL ?? "opus-4.6", cwd: REPO_ROOT });
          try {
            const r = await sendPrompt(ja, prompt);
            const a = await awaitRun(r);
            const m = a.text.match(/\{[\s\S]*\}/);
            const score = m ? (JSON.parse(m[0]).score as number) : 0;
            return { score: typeof score === "number" ? score : 0, detail: "" };
          } finally {
            await closeAgent(ja);
          }
        },
      });
      pass &&= jr.verdict === "pass";
    }
    resolveTokens(awaited.result, c.prompt, text);
    console.log(JSON.stringify({ backend: "declarative", case_id: c.id, status: pass ? "passed" : "failed" }));
    return pass ? 0 : 1;
  } finally {
    await closeAgent(agent);
  }
}

main().then((c) => process.exit(c));
