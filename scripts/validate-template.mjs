#!/usr/bin/env node

import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";

import YAML from "yaml";

const repoRoot = process.cwd();
const errors = [];
const warnings = [];

const pluginNamePattern = /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/;
const marketplaceNamePattern = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

function addError(message) {
  errors.push(message);
}

function addWarning(message) {
  warnings.push(message);
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function ensureDirectory(targetPath, context) {
  try {
    const stat = await fs.stat(targetPath);
    if (!stat.isDirectory()) {
      addError(`${context} exists but is not a directory: ${targetPath}`);
      return false;
    }
    return true;
  } catch {
    addError(`${context} directory is missing: ${targetPath}`);
    return false;
  }
}

async function readJsonFile(filePath, context) {
  let raw;
  try {
    raw = await fs.readFile(filePath, "utf8");
  } catch {
    addError(`${context} is missing: ${filePath}`);
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    addError(
      `${context} contains invalid JSON (${filePath}): ${error.message}`,
    );
    return null;
  }
}

function normalizeNewlines(content) {
  return content.replace(/\r\n/g, "\n");
}

function parseFrontmatter(content) {
  const normalized = normalizeNewlines(content);
  if (!normalized.startsWith("---\n")) {
    return null;
  }

  const closingIndex = normalized.indexOf("\n---\n", 4);
  if (closingIndex === -1) {
    return null;
  }

  const frontmatterBlock = normalized.slice(4, closingIndex);
  const fields = {};

  for (const line of frontmatterBlock.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const separator = line.indexOf(":");
    if (separator === -1) {
      continue;
    }
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    fields[key] = value;
  }

  return fields;
}

async function walkFiles(dirPath) {
  const files = [];
  const stack = [dirPath];

  while (stack.length > 0) {
    const current = stack.pop();
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(entryPath);
      } else if (entry.isFile()) {
        files.push(entryPath);
      }
    }
  }

  return files;
}

function isSafeRelativePath(value) {
  if (typeof value !== "string" || value.length === 0) {
    return false;
  }
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return true;
  }
  if (path.isAbsolute(value)) {
    return false;
  }
  const normalized = path.posix.normalize(value.replace(/\\/g, "/"));
  return !normalized.startsWith("../") && normalized !== "..";
}

function extractPathValues(value) {
  if (typeof value === "string") {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.flatMap((entry) => extractPathValues(entry));
  }

  if (value && typeof value === "object") {
    const candidates = [];
    if (typeof value.path === "string") {
      candidates.push(value.path);
    }
    if (typeof value.file === "string") {
      candidates.push(value.file);
    }
    return candidates;
  }

  return [];
}

async function validateReferencedPath(
  pluginDir,
  fieldName,
  pathValue,
  pluginName,
) {
  if (pathValue.startsWith("http://") || pathValue.startsWith("https://")) {
    return;
  }

  if (!isSafeRelativePath(pathValue)) {
    addError(
      `${pluginName}: field "${fieldName}" has invalid path "${pathValue}". Use a relative path without ".." or absolute prefixes.`,
    );
    return;
  }

  const resolved = path.resolve(pluginDir, pathValue);
  const exists = await pathExists(resolved);
  if (!exists) {
    addError(
      `${pluginName}: field "${fieldName}" references missing path "${pathValue}".`,
    );
  }
}

async function validateFrontmatterFile(
  filePath,
  componentName,
  requiredKeys,
  pluginName,
) {
  const content = await fs.readFile(filePath, "utf8");
  const parsed = parseFrontmatter(content);
  const relativeFile = path.relative(repoRoot, filePath);

  if (!parsed) {
    addError(
      `${pluginName}: ${componentName} file missing YAML frontmatter: ${relativeFile}`,
    );
    return;
  }

  for (const key of requiredKeys) {
    if (!parsed[key] || parsed[key].length === 0) {
      addError(
        `${pluginName}: ${componentName} file missing "${key}" in frontmatter: ${relativeFile}`,
      );
    }
  }
}

async function validateComponentFrontmatter(pluginDir, pluginName) {
  const rulesDir = path.join(pluginDir, "rules");
  if (await pathExists(rulesDir)) {
    const files = await walkFiles(rulesDir);
    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      if (ext === ".md" || ext === ".mdc" || ext === ".markdown") {
        await validateFrontmatterFile(
          file,
          "rule",
          ["description"],
          pluginName,
        );
      }
    }
  }

  const skillsDir = path.join(pluginDir, "skills");
  if (await pathExists(skillsDir)) {
    const files = await walkFiles(skillsDir);
    for (const file of files) {
      if (path.basename(file) === "SKILL.md") {
        await validateFrontmatterFile(
          file,
          "skill",
          ["name", "description"],
          pluginName,
        );
      }
    }
  }

  const agentsDir = path.join(pluginDir, "agents");
  if (await pathExists(agentsDir)) {
    const files = await walkFiles(agentsDir);
    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      if (ext === ".md" || ext === ".mdc" || ext === ".markdown") {
        await validateFrontmatterFile(
          file,
          "agent",
          ["name", "description"],
          pluginName,
        );
      }
    }
  }

  const commandsDir = path.join(pluginDir, "commands");
  if (await pathExists(commandsDir)) {
    const files = await walkFiles(commandsDir);
    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      if (
        ext === ".md" ||
        ext === ".mdc" ||
        ext === ".markdown" ||
        ext === ".txt"
      ) {
        await validateFrontmatterFile(
          file,
          "command",
          ["name", "description"],
          pluginName,
        );
      }
    }
  }
}

function resolveMarketplaceSource(source, pluginRoot) {
  if (typeof source !== "string" || source.length === 0) {
    return null;
  }
  if (!pluginRoot) {
    return source;
  }
  const normalizedRoot = pluginRoot.replace(/\\/g, "/").replace(/\/+$/, "");
  const normalizedSource = source.replace(/\\/g, "/");
  if (
    normalizedSource === normalizedRoot ||
    normalizedSource.startsWith(`${normalizedRoot}/`)
  ) {
    return normalizedSource;
  }
  return `${normalizedRoot}/${normalizedSource}`;
}

const COLOCATED_TS_KINDS = ["commands", "agents", "hooks"];
const COLOCATED_TS_EXCLUDE_FRAGMENTS = ["/scenarios/", "/_shared/", "/node_modules/"];

/**
 * JSON-first invariant: co-located `<kind>/evals/*.test.ts` LLM eval files are
 * forbidden (spec evals-json-first-migration-20260527). Scenario files under
 * `evals/scenarios/*.test.ts` are allowed via COLOCATED_TS_EXCLUDE_FRAGMENTS.
 */
async function enforceJsonFirstNoColocatedTsEvals() {
  const tsFiles = [];

  async function pushFromKindDir(kindDir) {
    const evalsDir = path.join(kindDir, "evals");
    if (!(await pathExists(evalsDir))) return;
    let entries;
    try {
      entries = await fs.readdir(evalsDir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".test.ts")) continue;
      const full = path.join(evalsDir, entry.name);
      const normalized = full.replace(/\\/g, "/");
      if (COLOCATED_TS_EXCLUDE_FRAGMENTS.some((frag) => normalized.includes(frag))) {
        continue;
      }
      tsFiles.push(full);
    }
  }

  const pluginsRoot = path.join(repoRoot, "plugins");
  if (await pathExists(pluginsRoot)) {
    let plugins;
    try {
      plugins = await fs.readdir(pluginsRoot, { withFileTypes: true });
    } catch {
      plugins = [];
    }
    for (const plugin of plugins) {
      if (!plugin.isDirectory()) continue;
      const pluginDir = path.join(pluginsRoot, plugin.name);
      for (const kind of COLOCATED_TS_KINDS) {
        await pushFromKindDir(path.join(pluginDir, kind));
      }
    }
  }

  const cursorRoot = path.join(repoRoot, ".cursor");
  if (await pathExists(cursorRoot)) {
    for (const kind of COLOCATED_TS_KINDS) {
      await pushFromKindDir(path.join(cursorRoot, kind));
    }
  }

  if (tsFiles.length === 0) return;

  const manifestJsonPaths = new Set();
  const manifestPath = path.join(repoRoot, ".zoto", "eval-system", "manifest.yml");
  if (await pathExists(manifestPath)) {
    try {
      const raw = await fs.readFile(manifestPath, "utf8");
      const doc = YAML.parse(raw);
      for (const target of doc?.targets ?? []) {
        for (const evalFile of target?.eval_files ?? []) {
          if (typeof evalFile === "string" && evalFile.endsWith(".json")) {
            manifestJsonPaths.add(evalFile.replace(/\\/g, "/"));
          }
        }
      }
    } catch {
      /* manifest parse failures are handled elsewhere */
    }
  }

  for (const abs of tsFiles.sort()) {
    const rel = path.relative(repoRoot, abs).replace(/\\/g, "/");
    const jsonRel = rel.replace(/\.test\.ts$/, ".json");
    if (manifestJsonPaths.size === 0 || manifestJsonPaths.has(jsonRel)) {
      addError(
        `JSON-first violation: co-located TS LLM eval \`${rel}\` must be \`${jsonRel}\` (see spec evals-json-first-migration-20260527).`,
      );
    } else {
      addError(
        `JSON-first violation: co-located TS LLM eval found at \`${rel}\` (use <kind>/evals/<name>.json instead).`,
      );
    }
  }
}

const AGENT_PLUGINS_SCHEMA = "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json";

/**
 * Every plugin ships for Cursor, Claude Code, and Codex: an Agent Plugins
 * `plugin.json` (with OpenAI metadata under `extensions["com.openai"]`) and a
 * `.claude-plugin/plugin.json`, both matching the Cursor manifest's name and version.
 */
async function validateClientManifests(entryName, pluginDir, cursorManifest) {
  const portable = await readJsonFile(path.join(pluginDir, "plugin.json"), `${entryName} Agent Plugins manifest`);
  if (portable) {
    if (portable.$schema !== AGENT_PLUGINS_SCHEMA) addError(`${entryName}: plugin.json "$schema" must be ${AGENT_PLUGINS_SCHEMA}`);
    if (typeof portable.extensions?.["com.openai"]?.interface?.displayName !== "string") {
      addError(`${entryName}: plugin.json must set extensions["com.openai"].interface.displayName`);
    }
  }
  const claude = await readJsonFile(path.join(pluginDir, ".claude-plugin", "plugin.json"), `${entryName} Claude Code manifest`);
  for (const [label, manifest] of [["plugin.json", portable], [".claude-plugin/plugin.json", claude]]) {
    if (!manifest) continue;
    if (manifest.name !== cursorManifest.name) addError(`${entryName}: ${label} name must be "${cursorManifest.name}"`);
    if (manifest.version !== cursorManifest.version) addError(`${entryName}: ${label} version must match .cursor-plugin/plugin.json (${cursorManifest.version})`);
  }
}

/** The Claude Code and Codex marketplaces list exactly the Cursor marketplace's plugins and paths. */
async function validateClientMarketplaces(cursorEntries) {
  const expected = new Map(cursorEntries.map(entry => [entry.name, `./${String(entry.source).replace(/^\.\//, "")}`]));
  const clients = [
    [".claude-plugin/marketplace.json", "Claude Code marketplace", entry => entry.source],
    [".agents/plugins/marketplace.json", "Codex marketplace", entry => typeof entry.source === "string" ? entry.source : entry.source?.path],
  ];
  for (const [file, label, sourceOf] of clients) {
    const marketplace = await readJsonFile(path.join(repoRoot, file), label);
    if (!marketplace) continue;
    const entries = Array.isArray(marketplace.plugins) ? marketplace.plugins : [];
    const names = entries.map(entry => entry.name);
    for (const [name, source] of expected) {
      const entry = entries.find(candidate => candidate.name === name);
      if (!entry) addError(`${label} (${file}) is missing plugin "${name}"`);
      else if (sourceOf(entry) !== source) addError(`${label} (${file}): "${name}" source must be "${source}"`);
      if (file.startsWith(".agents") && entry && typeof entry.category !== "string") addError(`${label} (${file}): "${name}" needs a category`);
    }
    for (const name of names) if (!expected.has(name)) addError(`${label} (${file}) lists "${name}", which is not in .cursor-plugin/marketplace.json`);
  }
}

async function main() {
  const marketplacePath = path.join(
    repoRoot,
    ".cursor-plugin",
    "marketplace.json",
  );
  const marketplace = await readJsonFile(
    marketplacePath,
    "Marketplace manifest",
  );
  if (!marketplace) {
    summarizeAndExit();
    return;
  }

  if (
    typeof marketplace.name !== "string" ||
    !marketplaceNamePattern.test(marketplace.name)
  ) {
    addError(
      'Marketplace "name" must be lowercase kebab-case and start/end with an alphanumeric character.',
    );
  }

  if (
    !marketplace.owner ||
    typeof marketplace.owner.name !== "string" ||
    marketplace.owner.name.length === 0
  ) {
    addError('Marketplace "owner.name" is required.');
  }

  if (!Array.isArray(marketplace.plugins) || marketplace.plugins.length === 0) {
    addError('Marketplace "plugins" must be a non-empty array.');
    summarizeAndExit();
    return;
  }

  const pluginRoot = marketplace.metadata?.pluginRoot;
  if (pluginRoot !== undefined) {
    if (typeof pluginRoot !== "string" || !isSafeRelativePath(pluginRoot)) {
      addError(
        'Marketplace "metadata.pluginRoot" must be a safe relative path.',
      );
    } else {
      const pluginRootAbs = path.join(repoRoot, pluginRoot);
      await ensureDirectory(pluginRootAbs, 'Marketplace "metadata.pluginRoot"');
    }
  }

  const seenNames = new Set();
  for (const [index, entry] of marketplace.plugins.entries()) {
    const label = `plugins[${index}]`;

    if (!entry || typeof entry !== "object") {
      addError(`${label} must be an object.`);
      continue;
    }

    if (
      typeof entry.name !== "string" ||
      !pluginNamePattern.test(entry.name)
    ) {
      addError(
        `${label}.name must be lowercase and use only alphanumerics, hyphens, and periods.`,
      );
      continue;
    }

    if (seenNames.has(entry.name)) {
      addError(
        `Duplicate plugin name in marketplace manifest: "${entry.name}"`,
      );
    }
    seenNames.add(entry.name);

    const sourcePath = resolveMarketplaceSource(
      entry.source,
      pluginRoot ?? "",
    );
    if (!sourcePath) {
      addError(`${label}.source must be a string path.`);
      continue;
    }
    if (!isSafeRelativePath(sourcePath)) {
      addError(
        `${label}.source is not a safe relative path: "${sourcePath}"`,
      );
      continue;
    }

    const pluginDir = path.join(repoRoot, sourcePath);
    const pluginDirExists = await ensureDirectory(pluginDir, `${label}.source`);
    if (!pluginDirExists) {
      continue;
    }

    const manifestPath = path.join(
      pluginDir,
      ".cursor-plugin",
      "plugin.json",
    );
    const pluginManifest = await readJsonFile(
      manifestPath,
      `${entry.name} plugin manifest`,
    );
    if (!pluginManifest) {
      continue;
    }
    await validateClientManifests(entry.name, pluginDir, pluginManifest);

    if (
      typeof pluginManifest.name !== "string" ||
      !pluginNamePattern.test(pluginManifest.name)
    ) {
      addError(
        `${entry.name}: "name" in plugin.json must be lowercase and use only alphanumerics, hyphens, and periods.`,
      );
    }

    if (pluginManifest.name && pluginManifest.name !== entry.name) {
      addError(
        `${entry.name}: marketplace entry name does not match plugin.json name ("${pluginManifest.name}").`,
      );
    }

    const manifestFields = [
      "logo",
      "rules",
      "skills",
      "agents",
      "commands",
      "hooks",
      "mcpServers",
    ];
    for (const field of manifestFields) {
      const values = extractPathValues(pluginManifest[field]);
      for (const value of values) {
        await validateReferencedPath(pluginDir, field, value, entry.name);
      }
    }

    await validateComponentFrontmatter(pluginDir, entry.name);

    const hooksPath = path.join(pluginDir, "hooks", "hooks.json");
    if (!(await pathExists(hooksPath))) {
      addWarning(
        `${entry.name}: no hooks/hooks.json file found (only needed when using hooks).`,
      );
    }

    const mcpPath = path.join(pluginDir, "mcp.json");
    if (!(await pathExists(mcpPath))) {
      addWarning(
        `${entry.name}: no mcp.json file found (only needed when using MCP servers).`,
      );
    }
  }

  await validateClientMarketplaces(Array.isArray(marketplace.plugins) ? marketplace.plugins : []);
  await enforceJsonFirstNoColocatedTsEvals();

  summarizeAndExit();
}

function summarizeAndExit() {
  if (warnings.length > 0) {
    console.log("Warnings:");
    for (const warning of warnings) {
      console.log(`- ${warning}`);
    }
    console.log("");
  }

  if (errors.length > 0) {
    console.error("Validation failed:");
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log("Validation passed.");
}

await main();
