#!/usr/bin/env tsx
/**
 * Idempotent host-repo bootstrapper for env, gitignore, and root docs.
 *
 * Invoked by `stamp-lean-layout`, `/z-eval-init`, `zoto-create-evals`, and
 * re-runnable via `pnpm run eval:ensure-host`. Responsibilities:
 *
 *   1. Stamp `.env.example` from `templates/env/.env.example.tmpl` when
 *      the host repo does not already have one. Existing files are
 *      surfaced as a note and NEVER overwritten — operators may have
 *      other env vars in there.
 *   2. Ensure `.gitignore` excludes `.env` (and `.env.*`) so secrets
 *      cannot be committed by accident. We add three lines under a
 *      labelled section if they are missing; existing entries are left
 *      alone so this is safe to re-run after operators have customised
 *      their `.gitignore`.
 *   3. Stamp repo-root `README.md` and `AGENTS.md` from
 *      `templates/host-package/*.tmpl` when missing (never overwrite).
 *
 * Outputs a JSON summary on stdout describing what happened. The
 * `--dry-run` flag inspects without writing.
 *
 * Usage:
 *   tsx scripts/ensure-host-env-and-gitignore.ts [--repo-root <path>] [--dry-run]
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

interface CliOptions {
  repoRoot: string;
  templatePath: string;
  pluginRoot?: string;
  dryRun: boolean;
}

type RootDocAction = "created" | "skipped-existing" | "skipped-template-missing";

interface RootDocReport {
  path: string;
  action: RootDocAction;
  templatePath: string;
}

interface RunReport {
  repoRoot: string;
  envExample: {
    path: string;
    action: RootDocAction;
    templatePath: string;
  };
  gitignore: {
    path: string;
    action: "created" | "appended" | "no-change";
    addedLines: string[];
  };
  readme: RootDocReport;
  agentsMd: RootDocReport;
  dryRun: boolean;
}

const HOST_PACKAGE_TEMPLATES = join("templates", "host-package");

const GITIGNORE_HEADER = "# zoto-eval-system: keep local secrets out of git";
const GITIGNORE_LINES: readonly string[] = [
  GITIGNORE_HEADER,
  ".env",
  ".env.*",
  "!.env.example",
];

function parseArgs(argv: string[]): CliOptions {
  const opts: CliOptions = {
    repoRoot: process.cwd(),
    templatePath: resolve(
      import.meta.dirname,
      "..",
      "templates",
      "env",
      ".env.example.tmpl",
    ),
    dryRun: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i]!;
    if (a === "--repo-root") {
      const v = argv[++i];
      if (v) opts.repoRoot = resolve(v);
    } else if (a === "--template") {
      const v = argv[++i];
      if (v) opts.templatePath = resolve(v);
    } else if (a === "--dry-run") {
      opts.dryRun = true;
    }
  }
  return opts;
}

export function ensureEnvExample(opts: {
  repoRoot: string;
  templatePath: string;
  dryRun: boolean;
}): RunReport["envExample"] {
  const destPath = join(opts.repoRoot, ".env.example");
  if (existsSync(destPath)) {
    return {
      path: destPath,
      action: "skipped-existing",
      templatePath: opts.templatePath,
    };
  }
  if (!existsSync(opts.templatePath)) {
    return {
      path: destPath,
      action: "skipped-template-missing",
      templatePath: opts.templatePath,
    };
  }
  if (!opts.dryRun) {
    mkdirSync(dirname(destPath), { recursive: true });
    const body = readFileSync(opts.templatePath, "utf-8");
    writeFileSync(destPath, body, "utf-8");
  }
  return {
    path: destPath,
    action: "created",
    templatePath: opts.templatePath,
  };
}

export function ensureGitignore(opts: {
  repoRoot: string;
  dryRun: boolean;
}): RunReport["gitignore"] {
  const destPath = join(opts.repoRoot, ".gitignore");
  const exists = existsSync(destPath);
  const current = exists ? readFileSync(destPath, "utf-8") : "";

  // Treat a line as "present" when it appears verbatim on its own line —
  // accounts for trailing whitespace but not comment-stripped matches.
  // Comments and `.env` style globs are matched literally so we never
  // duplicate the operator's existing entries.
  const existingLines = current.split(/\r?\n/);
  const has = (line: string): boolean =>
    existingLines.some((l) => l.trimEnd() === line);
  const missing = GITIGNORE_LINES.filter((line) => !has(line));

  // Defensive: if `.env` is covered by an equivalent rule (e.g. `*env*`
  // or a top-level `.env*`), treat it as present so we don't append a
  // duplicate section. Conservative rule — only skip when an exact
  // common alternative is found.
  const altEnvCovers = existingLines.some((l) => {
    const t = l.trim();
    return t === ".env*" || t === "*.env";
  });

  // Always make sure the human-readable header lands when we are about
  // to add any of the rule lines; never duplicate it if it is already
  // present.
  let toAppend = missing.filter((line) => {
    if (altEnvCovers && (line === ".env" || line === ".env.*")) return false;
    return true;
  });
  // Drop the header from the append list if it is the only thing left
  // (no rule lines to add).
  if (toAppend.length === 1 && toAppend[0] === GITIGNORE_HEADER && exists) {
    toAppend = [];
  }

  if (toAppend.length === 0) {
    return {
      path: destPath,
      action: "no-change",
      addedLines: [],
    };
  }

  if (!opts.dryRun) {
    mkdirSync(dirname(destPath), { recursive: true });
    const needsLeadingNewline = exists && current.length > 0 && !current.endsWith("\n");
    const separator = exists && current.trim().length > 0 ? "\n" : "";
    const block = `${separator}${toAppend.join("\n")}\n`;
    const prefix = needsLeadingNewline ? "\n" : "";
    writeFileSync(destPath, current + prefix + block, "utf-8");
  }

  return {
    path: destPath,
    action: exists ? "appended" : "created",
    addedLines: toAppend,
  };
}

function defaultPluginRoot(): string {
  return resolve(import.meta.dirname, "..");
}

export function ensureRootDoc(opts: {
  repoRoot: string;
  pluginRoot: string;
  destBasename: string;
  templateBasename: string;
  dryRun: boolean;
}): RootDocReport {
  const destPath = join(opts.repoRoot, opts.destBasename);
  const templatePath = join(
    opts.pluginRoot,
    HOST_PACKAGE_TEMPLATES,
    opts.templateBasename,
  );
  if (existsSync(destPath)) {
    return { path: destPath, action: "skipped-existing", templatePath };
  }
  if (!existsSync(templatePath)) {
    return { path: destPath, action: "skipped-template-missing", templatePath };
  }
  if (!opts.dryRun) {
    mkdirSync(dirname(destPath), { recursive: true });
    writeFileSync(destPath, readFileSync(templatePath, "utf-8"), "utf-8");
  }
  return { path: destPath, action: "created", templatePath };
}

export function ensureHostFiles(opts: CliOptions): RunReport {
  const pluginRoot = opts.pluginRoot ?? defaultPluginRoot();
  const envExample = ensureEnvExample({
    repoRoot: opts.repoRoot,
    templatePath: opts.templatePath,
    dryRun: opts.dryRun,
  });
  const gitignore = ensureGitignore({
    repoRoot: opts.repoRoot,
    dryRun: opts.dryRun,
  });
  const readme = ensureRootDoc({
    repoRoot: opts.repoRoot,
    pluginRoot,
    destBasename: "README.md",
    templateBasename: "README.md.tmpl",
    dryRun: opts.dryRun,
  });
  const agentsMd = ensureRootDoc({
    repoRoot: opts.repoRoot,
    pluginRoot,
    destBasename: "AGENTS.md",
    templateBasename: "AGENTS.md.tmpl",
    dryRun: opts.dryRun,
  });
  return {
    repoRoot: opts.repoRoot,
    envExample,
    gitignore,
    readme,
    agentsMd,
    dryRun: opts.dryRun,
  };
}

const invokedDirectly =
  process.argv[1]?.endsWith("ensure-host-env-and-gitignore.ts") ||
  process.argv[1]?.endsWith("ensure-host-env-and-gitignore.js") ||
  process.argv[1]?.endsWith("ensure-host-env-and-gitignore");

if (invokedDirectly) {
  const opts = parseArgs(process.argv.slice(2));
  const report = ensureHostFiles(opts);
  process.stdout.write(JSON.stringify(report, null, 2) + "\n");
}
