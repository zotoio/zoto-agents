---
name: botz-mcp
description: Consume skills and subagent definitions from a botz-mcp server with zero-drift version pinning. Use whenever you need a capability you do not already have - dynamically locate a skill (skill_search) or subagent role (agent_search), download it (skill_get, served as a CRUX Compress document; agent_get, an installable definition rendered for your client), apply it, and report the outcome (skill_feedback, optionally with tokens/seconds telemetry). Silently maintains a .botz/skills.lock.json pinning every consumed artifact by permanent guid + version so forks and evolutions never change behaviour unexpectedly; checks skill_updates for enhancements and notifies the user (or auto-accepts when configured). Also covers requesting new primitives (skill_request / agent_request) - creation is CONVERSATIONAL, so send rich colleague-grade briefs and answer the server's clarifying elicitations from real task context - QSC search objectives (quality/speed/cost), and reading CRUX notation (compress.md) in place.
id: e15acdf95d3e485a93845e01468bb679
version: 3
changelog:
- 'v2: document whole-bundle CRUX serving and optional related-skill sourcing'
- 'v3: conversational creation, subagent definitions (agent_* tools), QSC objectives + telemetry'
---

# Consuming skills via botz-mcp

botz-mcp is an MCP server (streamable HTTP, endpoint `/mcp`) holding a
governed corpus of Agent Skills. Every skill has a **permanent guid** (`id`),
a `short_id` slug (`name@short_id`), and an immutable **version** history.
Never guess at a workflow you don't know: locate a skill, load it, follow it.
Keep ALL of the mechanics below invisible - the user just asks for work.

## The lockfile (handle silently)

Maintain `.botz/skills.lock.json` at the consuming repo root:

```json
{
  "evolution": "notify",
  "skills": {
    "<guid>": { "slug": "summarise-document@1f3a9c2b", "version": 2,
                "last_used": "2026-07-04" }
  }
}
```

- Create it (with `"evolution": "notify"`) on first use; update it after
  every consumption. Never ask the user about lockfile mechanics.
- `evolution` modes: `"notify"` (default - report enhancements, keep pins)
  or `"auto"` (accept enhancements automatically). Change it only when the
  user asks (e.g. "auto accept skill updates").

## Workflow

1. `skill_search(query)` - describe the needed capability in plain language.
2. Pick the best match and check the lock:
   - guid in lock -> `skill_get(name=<guid>, version=<pinned>)`. Pinned reads
     are immutable snapshots: forks, evolutions, or combinations of that
     skill can NEVER change what you receive.
   - not in lock -> `skill_get(name=<guid>)` (latest), then pin
     `{guid: latest_version}` in the lock.
3. The body arrives as a CRUX Compress document (`format: "crux"`) - read it
   in place with the legend below; never ask for decompression. The document
   compresses the ENTIRE skill bundle: SKILL.md plus every bundled reference
   file, so nothing else needs fetching. `raw=true` exists only for quoting
   original markdown (bundled files are then listed under `resources`).
4. OPTIONAL cross-skill sourcing: when the skill's `related` list (or body)
   names other skills and the task actually needs those capabilities, fetch
   them too via `skill_get` (pin them in the lock like any other skill).
   Skip them when the primary skill suffices - related skills are optional.
5. Apply the skill: follow its steps, honour edge cases, produce its output
   format.
6. Report reality: `skill_feedback(name, "worked"|"failed")`.
7. Gap (`covered=false`)? `skill_request(need, context)` - the server matches
   or authors a new skill; pin whatever you end up using. Creation is
   CONVERSATIONAL - see "Requesting new primitives" below before calling.
8. Every response carries a `gov` block: if `flag: "low_pr"` appears, treat
   the result with caution and verify before relying on it.

## Requesting new primitives (be conversational)

Rule of thumb: TERSE ON READS, CONVERSATIONAL ON WRITES. Searches and gets
stay short; whenever you ask the server to CREATE something (`skill_request`),
write to it the way you would brief a skilled colleague. Generation quality is
bounded by brief quality - you are sitting on the full task context, so hand
it over:

- the task narrative: what you are actually doing and why the capability is
  needed now;
- what you already tried, and why the nearest existing skills fell short;
- one or two CONCRETE input/output examples taken from the real task;
- environment, tools, formats, edge cases, and success criteria.

Put all of this in `context` on the first call. A one-line `need` plus an
empty `context` is a BAD brief and will trigger a clarification round.

Example - bad: `skill_request(need="parse invoices")`.
Example - good: `skill_request(need="parse supplier invoices into a ledger
schema", context="Working through ~200 PDF invoices from 12 suppliers in
data/invoices/. Need line items with VAT split out; output must match the
JSON schema in ledger/schema.json (example row attached below). Tried the
generic pdf-extract skill - it loses table structure on multi-page invoices.
Success = every invoice in the sample set round-trips into the schema with
totals matching. Input example: ... Output example: ...")`.

Clarification exchanges (answer from REAL task context, never invent):

- If your client supports MCP elicitation, the server may ask clarifying
  questions MID-CALL when the brief is thin. Answer them conversationally
  from the task at hand; the call then continues and returns the result.
- Without elicitation support you may get `action: "clarify"` with the
  questions. Answer them all in one string and re-call `skill_request` with
  the same `need` plus your answers in the `answers` parameter.
- For expensive or high-stakes primitives, pass `review=true` (elicitation
  clients only): the server shows you the draft BEFORE persisting; approve,
  request one revision round (approve=false + changes), or reject
  (approve=false, no changes).

## Subagent definitions (agent_* tools)

The corpus also holds SUBAGENT DEFINITIONS - reusable specialist personas you
can install and spawn. Same identity, pinning, and feedback machinery as
skills; the lock file treats them identically (pin by guid + version).

1. Need a specialist role (reviewer, triager, researcher...)? `agent_search`
   first; `agent_request` only when `covered=false` (same conversational
   brief rules as skill_request - describe the delegation scenario, the tasks
   the subagent will receive, allowed tools, and the output it must return).
2. `agent_get(name)` returns `definition` (exact file content) and
   `install_path` - the server auto-detects your client from the MCP
   handshake and renders the right dialect (`.cursor/agents/<name>.md` for
   Cursor, `.claude/agents/<name>.md` for Claude Code; pass `client` to
   override). Write the file verbatim to the install path, then spawn the
   subagent per your client's mechanism.
3. Report outcomes with `skill_feedback` using the agent's name/guid, like
   any other artifact.

## QSC objectives and telemetry

- Searches accept `objective`: `balanced` (default), `quality`, `speed`, or
  `cost`. Use `speed`/`cost` when the user's task is latency- or budget-
  sensitive; objectives only ever act as a capped tiebreak among semantically
  strong matches, so relevance is never sacrificed.
- After applying a skill, include measured telemetry in feedback when you
  can estimate it: `skill_feedback(name, outcome, tokens=<approx LLM tokens
  the application consumed>, seconds=<wall seconds>)`. This builds the
  measured speed/cost profiles that make objective-aware ranking work for
  everyone. Report honestly - telemetry is damped and audited server-side.

## Evolution check (once per session)

Before first skill use in a session, call `skill_updates(pins)` with the
lock entries (`[{"id": ..., "version": ...}, ...]`):

- All `current` -> proceed silently.
- Some `behind` and evolution=`notify` -> finish the user's task on the
  pinned versions first, then append one short line, e.g.:
  "Skill update available: summarise-document v3 (v2: risk-first ordering).
  Say 'accept skill updates' to adopt, or 'auto accept' to always adopt."
  Only bump the lock after the user accepts.
- Some `behind` and evolution=`auto` -> bump pins to latest, use them now,
  and mention in one line what was adopted.
- `unknown` (id retired) -> keep using the pinned snapshot if retrievable;
  otherwise search for a replacement and tell the user what changed.

## Reading CRUX Compress documents

Spec: `CRUX.md` (https://compress.md). Shape: frontmatter (`generated`,
`sourceChecksum`, `cruxLevel`, `beforeTokens`, `afterTokens`, `reducedBy`)
plus a `crux` fenced block `⟦CRUX:source ... ⟧`. Interpret in place:

| Marker | Meaning |
| --- | --- |
| `Ρ{}` `Κ{}` | purpose/context · concepts/definitions |
| `R{}` `P{}` | requirements · policies/constraints |
| `Λ{}` `Γ{}` | commands/actions · workflows/orchestration |
| `Π{}` `Φ{}` `M{}` `Ω{}` | architecture · config · state · quality gates |
| `→` `←` `»` | maps to · derives from · then (sequence) |
| `\|` `&` `¬` `∀` `∃` `∋` | or · and · not · for all · exists · contains |
| `⊤` `⊥` `@` `=` | true · false · at path · defined as |
| `?` `!` `⊛` `≻` | optional · required · critical · preferred over |

Treat `Γ` blocks as the workflow, `R`/`P` as hard constraints, `Ω` as the
output contract. Paths, commands, and tool names are verbatim.

## Edge cases

- 401 -> the server needs a bearer token; configure it in MCP client config,
  never inline in chat.
- `action: "clarify"` from skill_request -> the brief was too thin; answer
  the returned questions from real task context and re-call with `answers`.
- `action: "rejected"` from skill_request -> a near-duplicate exists (use the
  skill named in `reason`/`nearest`), or you rejected the draft at review.
- Draft skills (`status: "draft"`) are quarantined server-side; an operator
  can `skill_promote` them.
- Feedback not accepted -> anti-gaming gate (no recent load, or already
  voted today); not an error.
- `format: "raw"` despite CRUX -> compression refused or model down; the
  body is plain markdown, proceed normally.
- Pinned snapshot missing (`no snapshot vN`) -> the lock predates history;
  load latest, re-pin, and tell the user the skill advanced.

## Output

After applying a consumed skill, state: skill slug + version used (e.g.
`summarise-document@1f3a9c2b v2`), CRUX or raw, the action taken, feedback
reported, and any pending enhancement notice.
