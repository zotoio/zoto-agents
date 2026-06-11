---
name: zoto-cursor-top-init
description: One-time setup after installing the Cursor Top plugin — builds the CLI, installs runtime dependencies, and puts cursor-top on PATH.
---

# zoto-cursor-top-init

One-time setup for the `cursor-top` CLI. Marketplace and local plugin installs
ship agents, skills, and commands only; the compiled binary is **not** ready
until you run this command (or `pnpm install-local` from a checkout).

`install-local` will:

1. Build `dist/cli.js` via `pnpm run build` (tsup) when missing.
2. Copy plugin files to `~/.cursor/plugins/zoto-cursor-top/`.
3. Run `npm install --omit=dev` there so Ink and React resolve at runtime.
4. Register the plugin in Cursor's local plugin config.
5. Symlink `cursor-top` into a directory on PATH (default `~/.local/bin`).

## Usage

```
/zoto-cursor-top-init                  - Run full local install (idempotent re-copy + rebuild if needed)
/zoto-cursor-top-init --dry-run       - Preview install steps without writing
/zoto-cursor-top-init --no-symlink    - Skip the PATH symlink (binary stays under ~/.cursor/plugins/…)
/zoto-cursor-top-init --bin-dir <dir> - Symlink into a specific directory instead of ~/.local/bin
```

## Instructions

1. Resolve the plugin root, in order:
   - `plugins/zoto-cursor-top/` under the workspace when present.
   - `~/.cursor/plugins/zoto-cursor-top/` when `scripts/install-local.ts` exists there.
   - Any other `~/.cursor/plugins/**/zoto-cursor-top/` tree that contains
     `scripts/install-local.ts`.
2. From that directory, invoke `scripts/install-local.ts` and forward flags
   from `$ARGUMENTS` (`--dry-run`, `--no-symlink`, `--bin-dir <path>`,
   `--no-build`). Prefer, in order:
   - `pnpm install-local` when `package.json` scripts are available and
     dependencies are installed (monorepo checkout).
   - `pnpm exec tsx scripts/install-local.ts` from the plugin root.
   - `npx -y tsx scripts/install-local.ts` when pnpm is unavailable.
3. **Do not** hand-roll copy/symlink steps when `install-local.ts` is
   reachable — delegate so build, runtime deps, and registration stay in one
   place.
4. After a successful (non-dry-run) install, print a short confirmation that
   includes:
   - the install directory (`~/.cursor/plugins/zoto-cursor-top/`),
   - the symlink path when created (or manual PATH instructions when
     `--no-symlink` or no writable bin dir),
   - a reminder to restart Cursor so marketplace commands pick up the
     registered plugin,
   - `cursor-top --help` (or `cursor-top --demo`) as the verification step,
   - a pointer that `/zoto-cursor-top` is ready once the binary resolves.
5. Do **not** launch the TUI from this command — init is setup only.

## Failure modes

- **Plugin root not found** — surface a precise error; do not guess paths.
- **Build fails** — show the tsup/build stderr; do not continue to copy.
- **`npm install --omit=dev` fails** — warn that `cursor-top` will throw
  `ERR_MODULE_NOT_FOUND` until runtime deps are present; suggest re-running init.
- **PATH missing `~/.local/bin`** — print the export snippet from
  `install-local` and offer `--bin-dir` on retry.

## Related

- `scripts/install-local.ts` — canonical installer
- `scripts/uninstall-local.ts` — remove install + symlink
- `/zoto-cursor-top` — requires init (or a working global/npm `cursor-top`) before launch
