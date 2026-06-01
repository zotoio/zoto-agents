# Monorepo scripts

Eval-system CLI entrypoints (`eval:*` in root `package.json`) invoke `plugins/zoto-eval-system/scripts/` and `plugins/zoto-eval-system/engine/` directly. This directory keeps monorepo-only utilities: validation (`validate-template.mjs`, `validate-skills.mjs`), migration helpers (`eval-migrate-*`, `eval-relocate-migration.ts`), and sandbox cleanup (`eval-cleanup-sandboxes.ts`).
