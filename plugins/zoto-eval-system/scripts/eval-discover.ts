#!/usr/bin/env tsx
/**
 * Discover eval targets in a host repository.
 *
 * Walks the configured discovery roots and emits a manifest-shaped YAML
 * document validated against templates/schema/manifest.schema.json.
 *
 * Usage:
 *   tsx scripts/eval-discover.ts [--config <path>] [--resolve <file>]
 *
 * --config      Path to .zoto-eval-system/config.json. Defaults to
 *               $CWD/.zoto-eval-system/config.json.
 * --resolve     Resolve a single file path to its target_id(s) and print
 *               the matching target records. Useful for targeted
 *               `/zoto-eval-update <file>`.
 *
 * Output is YAML on stdout.
 */
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { join, relative, resolve } from "node:path";

function parseArgs(argv: string[]): { configPath?: string; resolveFile?: string } {
  const out: { configPath?: string; resolveFile?: string } = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--config") out.configPath = argv[++i];
    else if (a === "--resolve") out.resolveFile = argv[++i];
  }
  return out;
}

interface Target {
  id: string;
  kind: "skill" | "command" | "agent" | "hook" | "cli" | "lib";
  path: string;
  content_hash: string;
  public_surface?: Record<string, unknown>;
  eval_files: string[];
}

function sha256(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

function normalise(s: string): string {
  return s.replace(/\r\n/g, "\n").replace(/\s+\n/g, "\n").trim();
}

function listDir(p: string): string[] {
  try {
    return readdirSync(p);
  } catch {
    return [];
  }
}

function isDir(p: string): boolean {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
}

function isFile(p: string): boolean {
  try {
    return statSync(p).isFile();
  } catch {
    return false;
  }
}

function parseFrontmatter(raw: string): Record<string, string> | null {
  const m = /^---\n([\s\S]*?)\n---/m.exec(raw);
  if (!m) return null;
  const out: Record<string, string> = {};
  for (const line of m[1].split("\n")) {
    const i = line.indexOf(":");
    if (i === -1) continue;
    out[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^"|"$/g, "");
  }
  return out;
}

export function discover(repoRoot: string, config: Record<string, unknown>): Target[] {
  const targets: Target[] = [];
  const seenIds = new Set<string>();
  const roots = (config.skillsRoots as string[]) ?? [
    ".cursor/skills",
    "skills",
    "plugins/*/skills",
  ];
  const kinds = (config.discoveryTargets as string[]) ?? [
    "skill",
    "command",
    "agent",
    "hook",
  ];

  const add = (t: Target): void => {
    if (seenIds.has(t.id)) return;
    seenIds.add(t.id);
    targets.push(t);
  };

  if (kinds.includes("skill")) {
    for (const root of expandRoots(repoRoot, roots)) {
      for (const name of listDir(root)) {
        const skillDir = join(root, name);
        if (!isDir(skillDir)) continue;
        const md = join(skillDir, "SKILL.md");
        if (!isFile(md)) continue;
        const raw = readFileSync(md, "utf-8");
        const fm = parseFrontmatter(raw);
        const evalsFile = join(skillDir, "evals", "evals.json");
        add({
          id: `skill:${name}`,
          kind: "skill",
          path: relative(repoRoot, md),
          content_hash: sha256(normalise(raw)),
          public_surface: { frontmatter: fm ?? {}, tools: [] },
          eval_files: isFile(evalsFile) ? [relative(repoRoot, evalsFile)] : [],
        });
      }
    }
  }

  if (kinds.includes("command")) {
    const commandRoots = [".cursor/commands", "commands", "plugins"];
    for (const root of commandRoots) {
      const abs = join(repoRoot, root);
      if (!isDir(abs)) continue;
      walkFiles(abs, (f) => {
        if (!f.endsWith(".md")) return;
        const name = f.split("/").pop()!.replace(/\.md$/, "");
        if (!/^zoto-/.test(name) && !/^\/?commands\//.test(relative(repoRoot, f))) {
          if (!/commands\//.test(f)) return;
        }
        const raw = readFileSync(f, "utf-8");
        const fm = parseFrontmatter(raw);
        if (!fm) return;
        add({
          id: `command:${name}`,
          kind: "command",
          path: relative(repoRoot, f),
          content_hash: sha256(normalise(raw)),
          public_surface: { frontmatter: fm, tools: [] },
          eval_files: [],
        });
      });
    }
  }

  if (kinds.includes("agent")) {
    for (const root of [".cursor/agents", "agents", "plugins"]) {
      const abs = join(repoRoot, root);
      if (!isDir(abs)) continue;
      walkFiles(abs, (f) => {
        if (!f.endsWith(".md")) return;
        if (!/agents\//.test(f)) return;
        const name = f.split("/").pop()!.replace(/\.md$/, "");
        const raw = readFileSync(f, "utf-8");
        const fm = parseFrontmatter(raw);
        if (!fm) return;
        add({
          id: `agent:${name}`,
          kind: "agent",
          path: relative(repoRoot, f),
          content_hash: sha256(normalise(raw)),
          public_surface: { frontmatter: fm, tools: [] },
          eval_files: [],
        });
      });
    }
  }

  if (kinds.includes("hook")) {
    const hookDirs = [".cursor/hooks", "hooks", "plugins"];
    for (const root of hookDirs) {
      const abs = join(repoRoot, root);
      if (!isDir(abs)) continue;
      walkFiles(abs, (f) => {
        if (!/hooks\//.test(f)) return;
        if (!/\.(m?js|ts|py|sh)$/.test(f)) return;
        const name = f.split("/").pop()!;
        const raw = readFileSync(f, "utf-8");
        add({
          id: `hook:${name}`,
          kind: "hook",
          path: relative(repoRoot, f),
          content_hash: sha256(normalise(raw)),
          eval_files: [],
        });
      });
    }
  }

  return targets;
}

function expandRoots(repoRoot: string, roots: string[]): string[] {
  const out: string[] = [];
  for (const r of roots) {
    if (r.includes("*")) {
      const [prefix] = r.split("*");
      const prefixAbs = join(repoRoot, prefix);
      if (!isDir(prefixAbs)) continue;
      for (const entry of listDir(prefixAbs)) {
        const candidate = r.replace(/\*/g, entry);
        const abs = join(repoRoot, candidate);
        if (isDir(abs)) out.push(abs);
      }
    } else {
      const abs = join(repoRoot, r);
      if (isDir(abs)) out.push(abs);
    }
  }
  return out;
}

function walkFiles(dir: string, cb: (full: string) => void): void {
  for (const entry of listDir(dir)) {
    if (entry === "node_modules" || entry === "dist") continue;
    const full = join(dir, entry);
    if (isDir(full)) walkFiles(full, cb);
    else cb(full);
  }
}

function headSha(repoRoot: string): string {
  try {
    return execSync("git rev-parse HEAD", { cwd: repoRoot }).toString().trim();
  } catch {
    return "0000000000000000000000000000000000000000";
  }
}

export function manifestFor(
  repoRoot: string,
  config: Record<string, unknown>,
  generatedBy: "zoto-create-evals" | "zoto-update-evals",
): Record<string, unknown> {
  const now = new Date().toISOString();
  return {
    schema_version: 1,
    created_at: now,
    updated_at: now,
    git_ref: headSha(repoRoot),
    generated_by: generatedBy,
    discovery_config: {
      discoveryTargets: config.discoveryTargets,
      skillsRoots: config.skillsRoots,
      evalsDir: config.evalsDir,
      additionalAutomation: config.additionalAutomation ?? [],
    },
    targets: discover(repoRoot, config),
  };
}

async function main(): Promise<number> {
  const args = parseArgs(process.argv.slice(2));
  const repoRoot = process.cwd();
  const cfgPath =
    args.configPath ?? join(repoRoot, ".zoto-eval-system", "config.json");
  if (!existsSync(cfgPath)) {
    console.error(`missing config: ${cfgPath}`);
    return 1;
  }
  const config = JSON.parse(readFileSync(cfgPath, "utf-8"));

  if (args.resolveFile) {
    const all = discover(repoRoot, config);
    const resolved = resolve(repoRoot, args.resolveFile);
    const hits = all.filter((t) => resolved.endsWith(t.path));
    console.log(JSON.stringify(hits, null, 2));
    return 0;
  }

  const mf = manifestFor(repoRoot, config, "zoto-create-evals");
  process.stdout.write(JSON.stringify(mf, null, 2) + "\n");
  return 0;
}

if (process.argv[1] && process.argv[1].endsWith("eval-discover.ts")) {
  main().then((c) => process.exit(c), (err) => {
    console.error(err);
    process.exit(1);
  });
}
