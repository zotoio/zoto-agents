#!/usr/bin/env bash
# Subtask 09 — batched eval migration via full-catalog eval:update (no --target;
# targeted apply overwrites manifest.targets). Restores manifest after each batch.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
AUDIT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

MANIFEST="$ROOT/.zoto/eval-system/manifest.yml"
HISTORY="$ROOT/.zoto/eval-system/manifest.history.yml"
PRE_MANIFEST="$AUDIT/manifest-pre-migration.yml"
PRE_HISTORY="$AUDIT/manifest-history-pre-migration.yml"
LOG="$AUDIT/migration-update-log.txt"

restore_manifest() {
  cp "$PRE_MANIFEST" "$MANIFEST"
  if [[ -f "$PRE_HISTORY" ]]; then
    cp "$PRE_HISTORY" "$HISTORY"
  fi
}

run_batch() {
  local label="$1"
  shift
  echo "" | tee -a "$LOG"
  echo "===== BATCH: $label @ $(date -u +%Y-%m-%dT%H:%M:%SZ) =====" | tee -a "$LOG"
  # Full-catalog apply only — expandTargetsForRoutingMigration needs full scope.
  if pnpm run eval:update --apply --with-analyser "$@" 2>&1 | tee -a "$LOG"; then
    echo "MIGRATION_EXIT=0" | tee -a "$LOG"
  else
    echo "MIGRATION_EXIT=$?" | tee -a "$LOG"
  fi
  restore_manifest
  pnpm run eval:list >/dev/null 2>&1 && echo "eval:list OK after $label" | tee -a "$LOG" || echo "eval:list FAIL after $label" | tee -a "$LOG"
  pnpm run eval -- --collect-only >/dev/null 2>&1 && echo "collect-only OK after $label" | tee -a "$LOG" || echo "collect-only FAIL after $label" | tee -a "$LOG"
}

: > "$LOG"
echo "Migration started @ $(date -u +%Y-%m-%dT%H:%M:%SZ)" >> "$LOG"

# Single full-catalog run (batched re-runs would re-analyse everything).
run_batch "full-catalog-routing-migration"

echo "Migration batches complete @ $(date -u +%Y-%m-%dT%H:%M:%SZ)" >> "$LOG"
