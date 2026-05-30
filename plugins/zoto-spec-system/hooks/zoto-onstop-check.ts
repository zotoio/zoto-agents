#!/usr/bin/env node
/**
 * Cursor `stop` event hook for the spec-system plugin.
 *
 * Defence-in-depth backstop for the reviewer / executor non-interference
 * contract: every time an agent stops, walk the workspace's spec-system
 * status pairs and config and:
 *   - schema-validate every `.status.yml` and the spec-root `status.yml`
 *   - schema-validate `.zoto/spec-system/config.yml` if present
 *   - re-render any `.status.md` that disagrees with its yml (yml authoritative)
 *   - surface a critical-issue summary back to the user via Cursor's
 *     `additional_context` channel when the inconsistency cannot be auto-fixed
 *
 * The hook always exits 0 — it must not block the stop event itself. Critical
 * issues are surfaced via stdout `additional_context` so the next agent turn
 * sees them.
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { checkAllSpecs } from "../src/onstop-check.js";

interface HookOutput {
  additional_context?: string;
}

function emit(output: HookOutput): void {
  process.stdout.write(`${JSON.stringify(output)}\n`);
}

function consumeStdin(): void {
  // Cursor pipes context to hooks via stdin. We don't need to inspect it but
  // we do drain it so the parent process doesn't block on a back-pressured
  // pipe. Errors are silently ignored — empty stdin is also fine.
  try {
    readFileSync(0, "utf-8");
  } catch {
    /* ignore — empty stdin or non-piped invocation */
  }
}

function main(): void {
  consumeStdin();

  const repoRoot = resolve(process.cwd());

  // Skip silently when neither the spec-system config nor any spec dir with a
  // status/ subdirectory is present — most repos won't have either.
  const hasConfig = existsSync(resolve(repoRoot, ".zoto", "spec-system", "config.yml"));
  const hasSpecsRoot = existsSync(resolve(repoRoot, "specs"));
  if (!hasConfig && !hasSpecsRoot) {
    emit({});
    return;
  }

  let result: ReturnType<typeof checkAllSpecs>;
  try {
    result = checkAllSpecs({ repoRoot, writeFixes: true });
  } catch {
    emit({});
    return;
  }

  if (result.checked === 0) {
    emit({});
    return;
  }

  const critical = result.issues.filter((i) => i.severity === "critical");
  const warn = result.issues.filter((i) => i.severity === "warn");

  // Clean run — nothing to surface to the user.
  if (result.fixes.length === 0 && critical.length === 0 && warn.length === 0) {
    emit({});
    return;
  }

  const lines: string[] = [];
  lines.push("Spec System onStop check:");
  if (result.fixes.length > 0) {
    lines.push(`- Auto-fixed ${result.fixes.length} status-pair inconsistency(ies):`);
    for (const f of result.fixes.slice(0, 10)) {
      lines.push(`  • [${f.kind}] ${f.path}`);
    }
    if (result.fixes.length > 10) {
      lines.push(`  • ... and ${result.fixes.length - 10} more`);
    }
  }
  if (critical.length > 0) {
    lines.push(`- ${critical.length} CRITICAL issue(s) require attention:`);
    for (const i of critical.slice(0, 10)) {
      lines.push(`  • [${i.kind}] ${i.path}: ${i.message}`);
    }
    if (critical.length > 10) {
      lines.push(`  • ... and ${critical.length - 10} more`);
    }
  }
  if (warn.length > 0 && critical.length === 0) {
    lines.push(`- ${warn.length} warning(s):`);
    for (const i of warn.slice(0, 5)) {
      lines.push(`  • [${i.kind}] ${i.path}: ${i.message}`);
    }
    if (warn.length > 5) {
      lines.push(`  • ... and ${warn.length - 5} more`);
    }
  }

  emit({ additional_context: lines.join("\n") });
}

main();
