/**
 * Stamp eval-system primitives (agents, skills, commands) into Cursor-native paths
 * when ejecting to self-contained layout.
 *
 * Phase 0 (2026-06): Cursor IDE does **not** discover agents from nested
 * `.cursor/agents/<subdir>/` folders (forum feature request, Feb 2026). Commands
 * may appear in IDE subfolders but not in CLI. Skills expect
 * `.cursor/skills/<name>/SKILL.md` — an extra `eval-sys/` parent breaks default
 * `skillsRoots`. Default layout is therefore **flat-prefix** (`eval-sys--*`).
 */
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";

/** How ejected primitives are laid out under `.cursor/`. */
export type EjectedPrimitivesLayout = "flat-prefix" | "nested";

/** Default after Phase 0 validation — nested subdirs are not IDE-discoverable for agents. */
export const DEFAULT_EJECTED_PRIMITIVES_LAYOUT: EjectedPrimitivesLayout = "flat-prefix";

const FLAT_PREFIX = "eval-sys--";

export interface StampEjectedPrimitivesOptions {
  repoRoot: string;
  pluginRoot: string;
  dryRun?: boolean;
  /** Override layout; defaults to {@link DEFAULT_EJECTED_PRIMITIVES_LAYOUT}. */
  layout?: EjectedPrimitivesLayout;
}

export interface StampEjectedPrimitivesResult {
  layout: EjectedPrimitivesLayout;
  agents: string[];
  skills: string[];
  commands: string[];
  skipped: string[];
}

function agentDest(
  repoRoot: string,
  layout: EjectedPrimitivesLayout,
  fileName: string,
): string {
  if (layout === "nested") {
    return join(repoRoot, ".cursor", "agents", "eval-sys", fileName);
  }
  const base = fileName.replace(/\.md$/, "");
  return join(repoRoot, ".cursor", "agents", `${FLAT_PREFIX}${base}.md`);
}

function commandDest(
  repoRoot: string,
  layout: EjectedPrimitivesLayout,
  fileName: string,
): string {
  if (layout === "nested") {
    return join(repoRoot, ".cursor", "commands", "eval-sys", fileName);
  }
  const base = fileName.replace(/\.md$/, "");
  return join(repoRoot, ".cursor", "commands", `${FLAT_PREFIX}${base}.md`);
}

function skillDestDir(
  repoRoot: string,
  layout: EjectedPrimitivesLayout,
  skillName: string,
): string {
  if (layout === "nested") {
    return join(repoRoot, ".cursor", "skills", "eval-sys", skillName);
  }
  return join(repoRoot, ".cursor", "skills", `${FLAT_PREFIX}${skillName}`);
}

function copyFile(src: string, dest: string, dryRun: boolean): void {
  if (!dryRun) {
    mkdirSync(join(dest, ".."), { recursive: true });
    writeFileSync(dest, readFileSync(src, "utf-8"), "utf-8");
  }
}

function copyDir(src: string, dest: string, dryRun: boolean): void {
  if (!dryRun) {
    mkdirSync(dest, { recursive: true });
    cpSync(src, dest, { recursive: true });
  }
}

function stampAgents(
  repoRoot: string,
  pluginRoot: string,
  layout: EjectedPrimitivesLayout,
  dryRun: boolean,
  copied: string[],
  skipped: string[],
): void {
  const srcDir = join(pluginRoot, "agents");
  if (!existsSync(srcDir)) {
    skipped.push(`missing agents dir: ${srcDir}`);
    return;
  }

  if (layout === "nested" && !dryRun) {
    mkdirSync(join(repoRoot, ".cursor", "agents", "eval-sys"), { recursive: true });
  }

  for (const entry of readdirSync(srcDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
    if (entry.name === "README.md") continue;
    const src = join(srcDir, entry.name);
    const dest = agentDest(repoRoot, layout, entry.name);
    copyFile(src, dest, dryRun);
    copied.push(dest);
  }
}

function stampSkills(
  repoRoot: string,
  pluginRoot: string,
  layout: EjectedPrimitivesLayout,
  dryRun: boolean,
  copied: string[],
  skipped: string[],
): void {
  const srcDir = join(pluginRoot, "skills");
  if (!existsSync(srcDir)) {
    skipped.push(`missing skills dir: ${srcDir}`);
    return;
  }

  if (layout === "nested" && !dryRun) {
    mkdirSync(join(repoRoot, ".cursor", "skills", "eval-sys"), { recursive: true });
  }

  for (const entry of readdirSync(srcDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const skillMd = join(srcDir, entry.name, "SKILL.md");
    if (!existsSync(skillMd)) continue;
    const src = join(srcDir, entry.name);
    const dest = skillDestDir(repoRoot, layout, entry.name);
    copyDir(src, dest, dryRun);
    copied.push(dest);
  }
}

function stampCommands(
  repoRoot: string,
  pluginRoot: string,
  layout: EjectedPrimitivesLayout,
  dryRun: boolean,
  copied: string[],
  skipped: string[],
): void {
  const srcDir = join(pluginRoot, "commands");
  if (!existsSync(srcDir)) {
    skipped.push(`missing commands dir: ${srcDir}`);
    return;
  }

  if (layout === "nested" && !dryRun) {
    mkdirSync(join(repoRoot, ".cursor", "commands", "eval-sys"), { recursive: true });
  }

  for (const entry of readdirSync(srcDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
    const src = join(srcDir, entry.name);
    const dest = commandDest(repoRoot, layout, entry.name);
    copyFile(src, dest, dryRun);
    copied.push(dest);
  }
}

/** Copy eval agents/skills/commands from the plugin into Cursor-native paths. */
export function stampEjectedPrimitives(
  opts: StampEjectedPrimitivesOptions,
): StampEjectedPrimitivesResult {
  const repoRoot = resolve(opts.repoRoot);
  const pluginRoot = resolve(opts.pluginRoot);
  const layout = opts.layout ?? DEFAULT_EJECTED_PRIMITIVES_LAYOUT;
  const dryRun = !!opts.dryRun;

  const agents: string[] = [];
  const skills: string[] = [];
  const commands: string[] = [];
  const skipped: string[] = [];

  stampAgents(repoRoot, pluginRoot, layout, dryRun, agents, skipped);
  stampSkills(repoRoot, pluginRoot, layout, dryRun, skills, skipped);
  stampCommands(repoRoot, pluginRoot, layout, dryRun, commands, skipped);

  return { layout, agents, skills, commands, skipped };
}

/** Human-readable summary line for eject CLI output. */
export function describeEjectedPrimitivesLayout(layout: EjectedPrimitivesLayout): string {
  if (layout === "nested") {
    return ".cursor/{agents,skills,commands}/eval-sys/";
  }
  return `.cursor/{agents,skills,commands}/${FLAT_PREFIX}* (flat-prefix — Cursor IDE discovery)`;
}

/** Paths removed on un-eject for a given layout mode. */
export function ejectedPrimitivesCleanupTargets(
  repoRoot: string,
  layout: EjectedPrimitivesLayout = DEFAULT_EJECTED_PRIMITIVES_LAYOUT,
): string[] {
  const root = resolve(repoRoot);
  if (layout === "nested") {
    return [
      join(root, ".cursor", "agents", "eval-sys"),
      join(root, ".cursor", "skills", "eval-sys"),
      join(root, ".cursor", "commands", "eval-sys"),
    ];
  }

  const targets: string[] = [];
  for (const kind of ["agents", "skills", "commands"] as const) {
    const dir = join(root, ".cursor", kind);
    if (!existsSync(dir)) continue;
    for (const entry of readdirSync(dir)) {
      if (kind === "skills") {
        if (entry.startsWith(FLAT_PREFIX) && statSync(join(dir, entry)).isDirectory()) {
          targets.push(join(dir, entry));
        }
      } else if (entry.startsWith(FLAT_PREFIX) && entry.endsWith(".md")) {
        targets.push(join(dir, entry));
      }
    }
  }
  return targets;
}
