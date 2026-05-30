#!/usr/bin/env tsx
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

import type { AnalyserPayload } from "../../../scripts/eval-analyse.ts";
import { stampTargetWithBackendRouting } from "../../../scripts/eval-stamp.ts";

const REPO = resolve(import.meta.dirname, "../../..");
const targetId = "agent:zoto-eval-updater";

function loadCached(): AnalyserPayload {
  for (const f of readdirSync(join(REPO, ".zoto/eval-system/cache/analyser"))) {
    if (!f.endsWith(".json")) continue;
    const body = JSON.parse(
      readFileSync(join(REPO, ".zoto/eval-system/cache/analyser", f), "utf-8"),
    ) as AnalyserPayload;
    if (body.target_id === targetId) return body;
  }
  throw new Error("cache missing");
}

async function main(): Promise<void> {
  const payload = { ...loadCached(), requiresInteraction: false };
  const result = await stampTargetWithBackendRouting(REPO, targetId, payload, {
    apply: true,
    sourcePath: payload.source_path,
  });
  console.log(JSON.stringify(result, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
