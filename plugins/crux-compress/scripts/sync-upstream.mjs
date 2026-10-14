#!/usr/bin/env node
/**
 * Sync this plugin from a CRUX-Compress GitHub release.
 *
 *   node scripts/sync-upstream.mjs                  # latest release
 *   node scripts/sync-upstream.mjs --ref v2.11.5    # a specific release
 *   node scripts/sync-upstream.mjs --zip <file> --ref v2.11.5   # an already-downloaded release zip
 *   node scripts/sync-upstream.mjs --raw            # move files into the plugin layout, change no content
 *   node scripts/sync-upstream.mjs --check          # report drift from upstream.json, write nothing
 *
 * Every file is checked against the release's own .crux/crux-release-files.json
 * checksums before it is written. scripts/upstream-map.json lists every change
 * made to upstream files; upstream.json records what was synced.
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const pluginDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RECORD = "upstream.json";

const sha256 = data => createHash("sha256").update(data).digest("hex");
const withoutComments = obj => Object.fromEntries(Object.entries(obj).filter(([k]) => k !== "$comment"));

/** Plugin path for an upstream path, or null when no layout entry matches. */
export function mapPath(upstreamPath, layout) {
  for (const { from, to } of layout) {
    if (from.endsWith("/") ? upstreamPath.startsWith(from) : upstreamPath === from) {
      return from.endsWith("/") ? to + upstreamPath.slice(from.length) : to;
    }
  }
  return null;
}

/** Apply exact-string rewrites, longest match first so specific paths win over prefixes. */
export function applyRewrites(text, rewrites) {
  const keys = Object.keys(rewrites).sort((a, b) => b.length - a.length);
  if (keys.length === 0) return text;
  const escaped = keys.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return text.replace(new RegExp(escaped.join("|"), "g"), match => rewrites[match]);
}

/** Add missing frontmatter keys at the top of the block; existing keys are left alone. */
export function addFrontmatter(text, keys) {
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  const hasBlock = text.startsWith(`---${eol}`);
  const close = hasBlock ? text.indexOf(`${eol}---`, 3) : -1;
  const block = close > 0 ? text.slice(4, close) : "";
  const present = new Set(block.split(eol).map(line => line.split(":")[0].trim()));
  const lines = Object.entries(keys)
    .filter(([key]) => !present.has(key))
    .map(([key, value]) => `${key}: ${JSON.stringify(value)}`);
  if (lines.length === 0) return text;
  if (close > 0) return `---${eol}${lines.join(eol)}${eol}${text.slice(3 + eol.length)}`;
  return `---${eol}${lines.join(eol)}${eol}---${eol}${eol}${text}`;
}

/** JSON for a top-level `NAME = {...}` literal in a Python file, read with ast.literal_eval (nothing is executed). */
function pythonLiteralAsJson(file, name) {
  const program = [
    "import ast, json, sys",
    "tree = ast.parse(open(sys.argv[1], encoding='utf-8').read())",
    "node = next(n.value for n in tree.body if isinstance(n, ast.Assign) and getattr(n.targets[0], 'id', None) == sys.argv[2])",
    "print(json.dumps(ast.literal_eval(node), indent=2))",
  ].join("\n");
  return execFileSync("python3", ["-I", "-c", program, file, name], { encoding: "utf8" });
}

function parseArgs(argv) {
  const args = { ref: null, zip: null, raw: false, check: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--ref") args.ref = argv[++i];
    else if (arg === "--zip") args.zip = argv[++i];
    else if (arg === "--raw") args.raw = true;
    else if (arg === "--check") args.check = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (args.zip && !args.ref) throw new Error("--zip needs --ref to name the release it came from");
  return args;
}

async function fetchOk(url) {
  const res = await fetch(url, { headers: { "User-Agent": "zoto-agents-crux-compress-sync" } });
  if (!res.ok) throw new Error(`GET ${url} failed: ${res.status} ${res.statusText}`);
  return res;
}

async function latestTag(repo) {
  const res = await fetchOk(`https://api.github.com/repos/${repo}/releases/latest`);
  return (await res.json()).tag_name;
}

async function walk(dir, base = dir) {
  const out = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full, base)));
    else out.push(path.relative(base, full).split(path.sep).join("/"));
  }
  return out;
}

async function readIfExists(file) {
  try { return await fs.readFile(file); } catch { return null; }
}

/** Build the full set of plugin files for a release, in memory. */
async function buildRelease(map, args) {
  const tag = args.ref ?? (await latestTag(map.repo));
  const version = tag.replace(/^v/, "");
  const work = await fs.mkdtemp(path.join(os.tmpdir(), "crux-sync-"));
  try {
    const zipFile = args.zip ? path.resolve(args.zip) : path.join(work, "release.zip");
    if (!args.zip) {
      const url = `https://github.com/${map.repo}/releases/download/v${version}/${map.asset.replace("{version}", version)}`;
      await fs.writeFile(zipFile, Buffer.from(await (await fetchOk(url)).arrayBuffer()));
    }
    const extracted = path.join(work, "x");
    execFileSync("unzip", ["-q", zipFile, "-d", extracted]);

    const manifest = JSON.parse(await fs.readFile(path.join(extracted, ".crux/crux-release-files.json"), "utf8"));
    const release = manifest.releases?.[version];
    if (!release) throw new Error(`Release ${version} is not in the zip's .crux/crux-release-files.json`);

    const exclude = new Set(map.exclude);
    const warnings = [];
    const sources = new Map();
    for (const rel of await walk(extracted)) {
      if (exclude.has(rel)) continue;
      const data = await fs.readFile(path.join(extracted, rel));
      const expected = release.files[rel]?.checksum;
      if (!expected) warnings.push(`${rel} is in the zip but has no checksum in the release manifest`);
      else if (expected !== sha256(data)) throw new Error(`Checksum mismatch for ${rel}`);
      sources.set(rel, data);
    }
    for (const rel of Object.keys(release.files)) {
      if (!exclude.has(rel) && !sources.has(rel)) throw new Error(`${rel} is in the release manifest but not in the zip`);
    }
    for (const rel of Object.keys(withoutComments(map.extraFiles.files))) {
      const url = `https://raw.githubusercontent.com/${map.repo}/${release.commit}/${rel}`;
      sources.set(rel, Buffer.from(await (await fetchOk(url)).arrayBuffer()));
    }

    const derived = new Map();
    for (const [target, spec] of Object.entries(withoutComments(map.derived ?? {}))) {
      const url = `https://raw.githubusercontent.com/${map.repo}/${release.commit}/${spec.from}`;
      const source = path.join(work, path.basename(spec.from));
      await fs.writeFile(source, Buffer.from(await (await fetchOk(url)).arrayBuffer()));
      derived.set(target, { from: `${spec.from}#${spec.pythonLiteral}`, data: Buffer.from(pythonLiteralAsJson(source, spec.pythonLiteral)) });
    }

    const rewrites = withoutComments(map.rewrites);
    const frontmatter = withoutComments(map.frontmatter);
    const files = new Map();
    for (const [rel, data] of [...sources].sort(([a], [b]) => a.localeCompare(b))) {
      const target = map.extraFiles.rename?.[rel] ?? mapPath(rel, map.layout);
      if (!target) throw new Error(`No layout entry in upstream-map.json for ${rel}`);
      if (files.has(target)) throw new Error(`${rel} and ${files.get(target).from} both map to ${target}`);
      let out = data;
      if (!args.raw) {
        let text = applyRewrites(data.toString("utf8"), rewrites);
        if (frontmatter[target]) text = addFrontmatter(text, frontmatter[target]);
        out = Buffer.from(text, "utf8");
      }
      files.set(target, { from: rel, data: out, upstreamSha256: sha256(data), changed: !out.equals(data) });
    }
    for (const [target, { from, data }] of derived) {
      if (files.has(target)) throw new Error(`${from} and ${files.get(target).from} both map to ${target}`);
      const out = args.raw ? data : Buffer.from(applyRewrites(data.toString("utf8"), rewrites), "utf8");
      files.set(target, { from, data: out, upstreamSha256: sha256(data), changed: !out.equals(data) });
    }
    for (const target of Object.keys(frontmatter)) {
      if (!files.has(target)) warnings.push(`frontmatter entry ${target} matches no synced file`);
    }
    return { tag: `v${version}`, version, commit: release.commit, date: release.date, files, warnings };
  } finally {
    await fs.rm(work, { recursive: true, force: true });
  }
}

function recordFor(map, build, raw) {
  const files = {};
  for (const [target, f] of [...build.files].sort(([a], [b]) => a.localeCompare(b))) {
    files[target] = { from: f.from, upstreamSha256: f.upstreamSha256, sha256: sha256(f.data), changed: f.changed };
  }
  return { repo: map.repo, tag: build.tag, commit: build.commit, releaseDate: build.date, mode: raw ? "raw" : "plugin", files };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const map = JSON.parse(await fs.readFile(path.join(pluginDir, "scripts/upstream-map.json"), "utf8"));
  const build = await buildRelease(map, args);
  const record = recordFor(map, build, args.raw);
  const previous = JSON.parse((await readIfExists(path.join(pluginDir, RECORD)))?.toString("utf8") ?? "{\"files\":{}}");
  const stale = Object.keys(previous.files).filter(f => !build.files.has(f));

  for (const warning of build.warnings) console.warn(`warning: ${warning}`);

  if (args.check) {
    const drift = [];
    for (const [target, f] of build.files) {
      const onDisk = await readIfExists(path.join(pluginDir, target));
      if (!onDisk) drift.push(`missing   ${target}`);
      else if (!onDisk.equals(f.data)) drift.push(`differs   ${target}`);
    }
    for (const f of stale) drift.push(`stale     ${f}`);
    if (drift.length) {
      console.error(`Drift from ${build.tag}:\n${drift.join("\n")}`);
      process.exit(1);
    }
    console.log(`Plugin matches ${build.tag} (${build.files.size} files).`);
    return;
  }

  for (const f of stale) await fs.rm(path.join(pluginDir, f), { force: true });
  for (const [target, f] of build.files) {
    const out = path.join(pluginDir, target);
    await fs.mkdir(path.dirname(out), { recursive: true });
    await fs.writeFile(out, f.data);
  }
  await fs.writeFile(path.join(pluginDir, RECORD), `${JSON.stringify(record, null, 2)}\n`);
  const changed = [...build.files.values()].filter(f => f.changed).length;
  console.log(`Synced ${build.tag} (${build.commit.slice(0, 7)}): ${build.files.size} files, ${changed} changed for the plugin, ${stale.length} removed.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(err => {
    console.error(err.message);
    process.exit(1);
  });
}
