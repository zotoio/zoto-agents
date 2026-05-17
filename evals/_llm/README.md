# LLM eval backend — selftests, shims, and test harnesses

The core eval engine lives at `plugins/zoto-eval-system/engine/` (canonical).

This directory contains **only** the following:

1. **Selftests / smoke tests** — standalone scripts that probe engine modules
2. **Thin re-export shims** — one-line `export *` files so legacy import
   paths (used by templates and stamped files) resolve without the Vitest
   `#eval-engine/*` alias
3. **Python type mirror** (`types.py`) — parity-checked against the engine
4. This README

No file here carries an engine implementation. Full implementations live
exclusively in `plugins/zoto-eval-system/engine/`.

## Allow-list (spec Decision 2)

### Selftests / smoke tests

- `sdk-bridge.selftest.ts` — probes bridge surface + token fallback
- `sandbox.selftest.ts` — minimal sandbox/snapshot regression
- `sandbox.smoke.ts` — baseline fixture + prepareSandbox smoke
- `analyser.cache.selftest.ts` — analyser cache/replay tests
- `runner-validate-enriched.test.ts` — validateEnriched accept/reject
- `_user-case-guards.test.ts` — guard helper tests

### Re-export shims

- `sandbox.ts` — `export * from "../../plugins/zoto-eval-system/engine/sandbox.js"`
- `case.ts` — `export * from "../../plugins/zoto-eval-system/engine/case.js"`
- `_user-case-guards.ts` — `export * from "../../plugins/zoto-eval-system/engine/_user-case-guards.js"`

### Other

- `types.py` — Python mirror of analyser payload (parity-checked)
- `README.md` — this file

## Running selftests

```bash
pnpm exec tsx evals/_llm/sdk-bridge.selftest.ts
pnpm exec tsx evals/_llm/sandbox.selftest.ts
pnpm exec tsx evals/_llm/sandbox.smoke.ts
pnpm exec tsx evals/_llm/analyser.cache.selftest.ts
pnpm exec tsx evals/_llm/runner-validate-enriched.test.ts
pnpm exec tsx evals/_llm/_user-case-guards.test.ts
```
