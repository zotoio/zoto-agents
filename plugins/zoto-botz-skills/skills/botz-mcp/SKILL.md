---
name: botz-mcp
description: Consume, stage, and install governed Agent Skills and subagent definitions from a botz-mcp server with zero-drift version pinning and SHA-256 verification. Use whenever you need a capability you do not already have - dynamically locate a skill (skill_search) or subagent role (agent_search), fetch its unified CRUX bundle (skill_get_compressed / agent_get_compressed) or plain Markdown + bundled resources (skill_get, skill_resources_get, skill_install, agent_install, or skill:// MCP resource templates with ETag/TTL caching), apply it, and report the outcome (skill_feedback with tokens/seconds telemetry). Silently maintains .botz/skills.lock.json and checks updates_check / skill_updates plus skill_diff / agent_diff.
id: e15acdf95d3e485a93845e01468bb679
version: 6
compatibility: "Cursor, Claude Code, Codex, OpenClaw, and any MCP client supporting streamable HTTP (/mcp)"
changelog:
- 'v2: document whole-bundle CRUX serving and optional related-skill sourcing'
- 'v3: conversational creation, subagent definitions (agent_* tools), QSC objectives + telemetry'
- 'v4: prefer skill_get_compressed (unified CRUX incorporating all references and scripts); skill_get + skill_resource_get as plain-markdown alternative'
- 'v5: add silent staging (.botz/staged/), skill_install/agent_install, batch skill_resources_get, RFC 6570 MCP resource templates (skill://{name}@{version}/resources/{path} & /bundle) with ETag/TTL caching, updates_check + skill_diff/agent_diff, requires preflight, and brief secret redaction'
- 'v6: document all 7 MCP specification coverage stages (24 tools with outputSchema + structuredContent, 5-field ToolAnnotations, 4 @mcp.prompt slash workflows /use_skill, /author_skill, /evolve_skill, /delegate_subagent, 4-stage notifications/progress, completion/complete autocomplete, client sampling/createMessage & roots/list workspace detection, binary BlobResourceContents on skill://{name}/illustration, resourceLinks, notifications/resources/list_changed, BoundedMemoryEventStore SSE resumability, and swarm_run_completed lifecycle)'
---

# Consuming & installing skills via botz-mcp

`botz-mcp` is an MCP server (streamable HTTP, endpoint `/mcp`) holding a
governed corpus of Agent Skills and Subagent Definitions. Every artifact has a
**permanent guid** (`id`), a `short_id` slug (`name@short_id`), an immutable
**version** snapshot history (`.versions/v<N>/`), and a `sha256` content digest.
Never guess at a workflow you don't know: locate a skill, load or stage it,
follow it, and report reality. Keep lockfile and staging mechanics invisible to
the user unless they ask.

## Lockfile & optional repo policy (handle silently)

Maintain `.botz/skills.lock.json` at the consuming repo root (v1 lockfiles
without `schema_version` remain supported and are upgraded in place):

```json
{
  "schema_version": 2,
  "evolution": "notify",
  "default_variant": "crux",
  "skills": {
    "<guid>": {
      "slug": "clarify-brief@7f2f85fb",
      "version": 1,
      "variant": "crux",
      "sha256": "<sha256>",
      "installed_paths": [".botz/staged/clarify-brief@1/crux/SKILL.md"],
      "resource_hashes": { "scripts/validate-output.py": "<sha256>" },
      "last_used": "2026-10-26"
    }
  },
  "agents": {}
}
```

- `evolution` modes: `"notify"` (default — report enhancements, keep pins),
  `"patch-auto"` (auto-adopt when `breaking: false`), `"pin"` (never prompt),
  or `"auto"` (adopt latest automatically and state what changed in one line).
- If `.botz/policy.json` exists in the workspace, honour its constraints
  (`allowed_publishers`, `min_security_score`, `allow_scripts`,
  `default_variant`) before staging or executing bundled scripts.

## Two consumption modes

Choose the mode that matches the user's intent:

1. **Mode A — Ephemeral / Staged Execution (default for one-off tasks):**
   - Call `skill_get_compressed(name=<guid>, version=<pinned>)` (or latest if
     unpinned, then record in `.botz/skills.lock.json`).
   - Every CRUX bundle (`SKILL.crux.md`) is LLM-compiled via `CRUX.md` and
     carries provenance frontmatter (`sourceUrl`, `sourceRawUrl`,
     `sourceVersion`, `sourceSha256`, `cruxBaseLevel`, `cruxLevel`,
     `cruxVerified: true`) plus symbolic encodings of all bundled
     `references/`, `scripts/`, and `assets/`.
   - **When executing a bundled script (`scripts/*.py`) or validating against
     `assets/*.schema.json`:** materialize the frozen bundle into
     `.botz/staged/<slug>@v<version>/<variant>/` using ONE batch call:
     `skill_resources_get(name=<guid>, paths="*", version=<pinned>)` (or read
     `skill://{name}@{version}/bundle`), verify each file's `sha256`, mark
     `scripts/*` executable (`chmod 0755`), and ensure `.botz/staged/` is in
     `.gitignore`. Execute scripts from the staged directory and clean up or
     reuse by `(guid, version, sha256)`.
2. **Mode B — Persistent Workspace / User Installation (when the user asks to
   install a skill/agent or reuse it natively across sessions):**
   - Call `skill_install(name=<guid>, version=<pinned>, variant="crux"|"plain", scope="workspace"|"user")`
     or `agent_install(name=<guid>, version=<pinned>, variant="crux"|"plain", scope="workspace"|"user")`.
   - The server auto-detects your client dialect from the MCP handshake
     (`cursor` -> `.cursor/skills/<slug>/` & `.cursor/agents/<slug>.md`,
     `claude-code` -> `.claude/skills/<slug>/` & `.claude/agents/<slug>.md`,
     `codex` -> `.agents/skills/<slug>/` & `.agents/agents/<slug>.md`,
     `canonical` -> `skills/<slug>/` & `agents/<slug>/`).
   - Write every entry in `files[]` to `target_dir`, verify `sha256`, set
     `0755` when `executable: true`, and merge `lockfile_entry` into
     `.botz/skills.lock.json`.
   - Note: when `variant="crux"`, the installed `SKILL.md` (or agent file)
     contains the CRUX-compressed document with `sourceUrl` and `sourceRawUrl`
     in frontmatter so your host loads the token-frugal artifact natively while
     retaining a 1-click link to the immutable plain Markdown source.

## MCP Resource Templates & Configurable Caching

In addition to tools, `botz-mcp` exposes RFC 6570 MCP Resource Templates via
`resources/templates/list` and `resources/read`:

| URI Template | Returns | Cache Policy (`_meta`) |
| --- | --- | --- |
| `skill://{name}/SKILL.md` · `skill://{name}@{version}/SKILL.md` | Plain Markdown `SKILL.md` | Unpinned: TTL + ETag · `@version`: `immutable: true` |
| `skill://{name}/SKILL.crux.md` · `skill://{name}@{version}/SKILL.crux.md` | Verified `SKILL.crux.md` bundle | Unpinned: TTL + ETag · `@version`: `immutable: true` |
| `skill://{name}/resources/{+path}` · `skill://{name}@{version}/resources/{+path}` | Individual file in `references/`, `scripts/`, or `assets/` (served from frozen snapshot when `@version` is pinned) | Unpinned: TTL + ETag · `@version`: `immutable: true` |
| `skill://{name}/bundle` · `skill://{name}@{version}/bundle` | Full JSON manifest + all bundled files + `sha256` digests in one read | Unpinned: TTL + ETag · `@version`: `immutable: true` |
| `agent://{name}/AGENT.md` · `agent://{name}@{version}/AGENT.md` | Rendered client agent definition | Unpinned: TTL + ETag · `@version`: `immutable: true` |
| `agent://{name}/AGENT.crux.md` · `agent://{name}@{version}/AGENT.crux.md` | Verified `AGENT.crux.md` bundle | Unpinned: TTL + ETag · `@version`: `immutable: true` |

- **Client caching rules:** Every resource read includes `_meta` with `etag`
  (`"<sha256>"`), `sha256`, `immutable`, `ttl_seconds`, and `cache_control`:
  - Version-pinned URIs (`@{version}`) are **immutable forever**
    (`cache_control: "public, max-age=31536000, immutable"`). Once cached in
    `.botz/staged/` with a matching `sha256`, never re-fetch them.
  - Unpinned URIs (`skill://{name}/...`) carry `ttl_seconds` (configurable in
    `/admin#settings`, default `3600`s) and support MCP `resources/subscribe`
    (`notifications/resources/updated` fires immediately when a skill evolves
    or promotes).
- **Partial plain-Markdown reads:** When using `skill_get(name, raw=true)` on a
  large skill, pass `sections=["Workflow", "Output contract"]` to load only
  matching `##` headings and save context tokens.


## MCP Specification Coverage (v6 — All 7 Stages)

The hosted `https://mcp.botz.ai/mcp` server implements all 7 stages of the Model Context Protocol (`2025-03-26`, `2025-06-18`, `2025-11-25`):

1. **24 Typed Tools with `outputSchema` & `structuredContent`**: Every tool (`skill_*`, `agent_*`, `graph_*`, `swarm_run_completed`) declares a JSON Schema `outputSchema` (`SkillToolResponse`) and returns structured JSON in `CallToolResult.structuredContent` alongside `resourceLinks` (`skill://{slug}@{version}/SKILL.crux.md`, `SKILL.md`).
2. **5-Field `ToolAnnotations`**: Every tool declares `title`, `readOnlyHint`, `destructiveHint`, `idempotentHint`, and `openWorldHint`.
3. **4 `@mcp.prompt` Slash-Command Workflows**: Invoke `/use_skill(task, objective)`, `/author_skill(need, context)`, `/evolve_skill(name, improvement)`, or `/delegate_subagent(role, task, client)` via `prompts/list` and `prompts/get`.
4. **Real-Time Progress (`notifications/progress`)**: Authoring and mutation tools (`skill_request`, `agent_request`, `skill_evolve`, `skill_fork`, `skill_combine`) emit 4-stage progress updates (`1/4 Coverage Check` → `2/4 Draft Synthesis` → `3/4 Safety Scan & CRUX Compile` → `4/4 Index & Publish`).
5. **Autocomplete (`completion/complete`)**: Prefix autocomplete for `ref/resource` (`skill://` and `agent://` `{name}`, `{version}`, `{path}`, `{client_id}`) and `ref/prompt` arguments.
6. **Client Sampling (`sampling/createMessage`) & Workspace Roots (`roots/list`)**: `skill_install` and `agent_install` inspect `roots/list` to return `detected_workspace_roots`; `skill_request(..., use_client_sampling=True)` can request a draft synthesis hint from the client IDE's LLM.
7. **Binary `BlobResourceContents`, `list_changed` & SSE Resumability**: `skill://{name}/illustration` and `skill://{name}@{version}/illustration` serve WebP illustrations as base64 `BlobResourceContents`; mutations emit `notifications/resources/list_changed`; and `BoundedMemoryEventStore` replays missed SSE events via `Last-Event-ID`.

## Dependency & environment preflight (`requires`)

Before running any bundled script in `scripts/`:
1. Inspect `requires` in the skill metadata (`bins`, `env`, `packages`).
2. Verify required binaries (`shutil.which`) and environment variable **names**
   (check presence only — never print or transmit secret values).
3. If Python scripts carry PEP 723 `# /// script` headers, prefer running them
   with `uv run scripts/<name>.py` (or `python3 scripts/<name>.py` when only
   stdlib/installed packages are needed).

## Workflow

1. `skill_search(query)` (or `agent_search(query)`) — describe the needed
   capability. Each result includes `token_estimates` (`plain_tokens`,
   `crux_tokens`, `bundle_tokens`, `crux_reduction_pct`).
2. Load or stage the best match (`skill_get_compressed` by default, or
   `skill://{name}@{version}/SKILL.crux.md`).
3. If `cruxVerified` is `false` or you need exact prose/lines from a reference,
   follow `sourceRawUrl` or fetch the specific file via
   `skill://{name}@{version}/resources/{path}` / `skill_resources_get`.
4. Optionally source complements listed in `relationships` / `related` when the
   task genuinely spans phases.
5. Apply the workflow, run any bundled validation script
   (`python3 scripts/validate-output.py < output.json`), and report reality:
   `skill_feedback(name, "worked"|"failed", tokens=<approx>, seconds=<wall>)`.
6. Gap (`covered=false`)? Call `skill_request(need, context)` or
   `agent_request(need, context)` with a rich conversational brief.

## Requesting new primitives & secret redaction

- **TERSE ON READS, CONVERSATIONAL ON WRITES.** Include the task narrative,
  what existing skills fell short, 1–2 concrete input/output examples, target
  environment, and success criteria in `context`.
- **Mandatory secret hygiene:** Before calling `skill_request` or
  `agent_request`, strip all credentials, API keys (`sk-`, `ghp_`, `bzt_`,
  `AKIA...`), `Bearer` tokens, private URLs with embedded credentials, and
  `.env` secret values from `need`, `context`, and `answers`. Replace them with
  `<REDACTED>`.

## Session evolution check & diffs

Once per session before first skill use, call `updates_check(pins)` (or
`skill_updates(pins)`) with your lockfile entries:
- `current` -> proceed silently.
- `yanked` -> warn immediately (`yanked_reason`), inspect `skill_diff` /
  `agent_diff`, and switch to the latest non-yanked version.
- `behind` -> when `evolution="notify"`, finish the task on the pinned snapshot
  first, then mention the update in one line (use `skill_diff(name, from_version, to_version)`
  if the user asks what changed). When `evolution="auto"` (or `"patch-auto"` on
  non-breaking updates), adopt and re-stage automatically.

## Reading CRUX Compress documents

Spec: `CRUX.md` (`zotoio/CRUX-Compress`). Interpret `⟦CRUX:...⟧` blocks in place:

| Marker | Meaning |
| --- | --- |
| `Ρ{}` `Κ{}` | purpose/context · concepts/definitions |
| `R{}` `P{}` | requirements · policies/constraints |
| `Λ{}` `Γ{}` | commands/scripts · workflows/orchestration |
| `Π{}` `Φ{}` `M{}` `Ω{}` | architecture · config · schemas/state · quality gates/outputs |
| `→` `←` `»` | maps to · derives from · then (sequence) |
| `\|` `&` `¬` `∀` `∃` `∋` | or · and · not · for all · exists · contains |
| `⊤` `⊥` `@` `=` | true · false · at path · defined as |
| `?` `!` `⊛` `≻` | optional · required · critical · preferred over |

Treat `Γ` blocks as the workflow, `R`/`P` as hard constraints, `M.schema`/`Ω`
as the output contract, and `Λ.script` as bundled script interfaces. All file
paths, CLI flags, function names, and schema property keys are preserved
verbatim inside the CRUX notation.

## Output

After applying a consumed skill or subagent, state: slug + version used (e.g.
`clarify-brief@7f2f85fb v1`), mode (`CRUX` or `plain`, staged or installed),
validation result, feedback reported (`reason_code` if rate-limited), and any
pending update notice.
