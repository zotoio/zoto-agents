import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { addFrontmatter, applyRewrites, mapPath } from "../scripts/sync-upstream.mjs";

const pluginDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const map = JSON.parse(await fs.readFile(path.join(pluginDir, "scripts/upstream-map.json"), "utf8"));

test("mapPath sends templates to templates/ before the agents and commands prefixes match", () => {
  assert.equal(mapPath(".cursor/agents/crux/templates/recall-canvas.tsx.md", map.layout), "templates/recall-canvas.tsx.md");
  assert.equal(mapPath(".cursor/commands/crux/templates/compress-prompts.md", map.layout), "templates/compress-prompts.md");
  assert.equal(mapPath(".cursor/agents/crux/crux-memory-dream.md", map.layout), "agents/crux-memory-dream.md");
  assert.equal(mapPath(".cursor/hooks.json", map.layout), "hooks/hooks.json");
  assert.equal(mapPath("CRUX.md", map.layout), "spec/CRUX.md");
  assert.equal(mapPath("README.md", map.layout), null);
});

test("applyRewrites prefers the longest match", () => {
  const rewrites = { ".cursor/agents/crux/": "<plugin>/agents/", ".cursor/agents/crux/templates/x.md": "<plugin>/templates/x.md" };
  assert.equal(
    applyRewrites("see .cursor/agents/crux/templates/x.md and .cursor/agents/crux/a.md", rewrites),
    "see <plugin>/templates/x.md and <plugin>/agents/a.md",
  );
});

test("applyRewrites leaves project paths alone", () => {
  const rewrites = Object.fromEntries(Object.entries(map.rewrites).filter(([k]) => k !== "$comment"));
  const text = "Compress `.cursor/rules/api.md` into `.cursor/rules/api.crux.mdc`; config in `.cursor/mcp.json`.";
  assert.equal(applyRewrites(text, rewrites), text);
});

test("addFrontmatter creates a block when there is none", () => {
  assert.equal(addFrontmatter("# Title\n", { name: "x", description: "Does x." }), '---\nname: "x"\ndescription: "Does x."\n---\n\n# Title\n');
});

test("addFrontmatter adds only missing keys to an existing block", () => {
  const text = "---\nname: keep\ngenerated: 2026-01-01\n---\nbody\n";
  assert.equal(addFrontmatter(text, { name: "new", description: "D" }), '---\ndescription: "D"\nname: keep\ngenerated: 2026-01-01\n---\nbody\n');
  assert.equal(addFrontmatter(text, { name: "new" }), text);
});

test("upstream.json records every synced file with checksums", async () => {
  const record = JSON.parse(await fs.readFile(path.join(pluginDir, "upstream.json"), "utf8"));
  assert.match(record.tag, /^v\d+\.\d+\.\d+$/);
  assert.match(record.commit, /^[0-9a-f]{40}$/);
  for (const [file, entry] of Object.entries(record.files)) {
    const data = await fs.readFile(path.join(pluginDir, file));
    assert.equal(createHash("sha256").update(data).digest("hex"), entry.sha256, `${file} changed since sync`);
  }
});
