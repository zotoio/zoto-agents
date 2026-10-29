# Chained & Batched Agent Workflows (`botz-mcp`)

This reference defines the canonical chained and batched tool execution patterns for agents consuming, evolving, testing, scoring, and promoting governed skills and subagent definitions on `botz-mcp` (`https://mcp.botz.ai/mcp`).

---

## 1. Canonical End-to-End Chained Agent Loop

When solving a task with `botz-mcp`, chain tools in this closed-loop lifecycle:

```text
search ──► select ──► use (get_compressed + batch resources) ──► feedback
                                                                    │
         ┌──────────────────────────────────────────────────────────┘
         ▼ (if retrieved skill is incomplete, outdated, or missing)
  evolve (targeted refinement → new @canary draft version)
  │ fork (structural/domain divergence → new GUID)
  │ create (skill_request / agent_request → net-new capability)
         │
         ▼
  select (@canary / draft version) ──► test (validate scripts & real task)
         │
         ▼
  rate (agent result scoring via sampling/createMessage + skill_feedback)
         │
         ▼
  promote (automatic canary A/B promotion, MCP skill_promote for admins, or Console review)
```

---

## 2. Step-by-Step Chained Execution Guide

### Phase A: Retrieve, Execute & Score (`search -> select -> use -> feedback`)

1. **Search (`skill_search` / `agent_search`)**
   - Call `skill_search(query="<capability description>", objective="balanced"|"quality"|"speed"|"cost")`.
   - Inspect `covered` (`true`/`false`), candidate `score`, `qsc` vector (`quality`, `speed`, `cost`, `reliability`), `security_score`, and `token_estimates` (`crux_tokens` vs `plain_tokens`).
2. **Select (`@live` or pinned version)**
   - If the workspace `.botz/skills.lock.json` already pins the selected skill's `guid`, verify freshness once per session via `updates_check(pins)` and honour the pinned version unless `evolution` is `"auto"` or `"patch-auto"`.
   - Otherwise select the top-ranked `@live` version.
3. **Use — Batched Fetch & Materialization (`skill_get_compressed` + `skill_resources_get`)**
   - Fetch the unified CRUX bundle in a single call:
     ```json
     { "tool": "skill_get_compressed", "arguments": { "name": "<guid-or-slug>", "version": 3 } }
     ```
   - If the skill includes executable scripts (`scripts/*.py`) or JSON schemas (`assets/*.schema.json`), materialize the entire bundle in **one batched call** instead of N sequential reads:
     ```json
     { "tool": "skill_resources_get", "arguments": { "name": "<guid-or-slug>", "paths": "*", "version": 3 } }
     ```
     *(Alternatively, read the RFC 6570 resource URI `skill://{name}@{version}/bundle`.)*
   - Verify SHA-256 digests, stage into `.botz/staged/<slug>@v<version>/`, run the workflow, and execute any bundled validation script.
4. **Feedback (`skill_feedback`)**
   - Always close the read loop by reporting actual execution telemetry:
     ```json
     {
       "tool": "skill_feedback",
       "arguments": {
         "name": "<guid-or-slug>",
         "outcome": "worked",
         "tokens": 1420,
         "seconds": 3.8,
         "notes": "Validated output against assets/output.schema.json"
       }
     }
     ```

---

### Phase B: Adapt When a Skill Is Not Quite Right (`evolve` vs `fork` vs `create`)

When a retrieved skill is close but fails an edge case, lacks a required flag, or targets a different runtime, immediately chain into the appropriate authoring tool rather than abandoning governed skills:

| Condition | Tool to Call | Identity & Versioning Effect | Initial Lifecycle State |
| --- | --- | --- | --- |
| **Targeted refinement** (fix instructions, add edge-case handling, update CLI flags, refine validation script) | `skill_evolve(name, instruction)` | **Same permanent GUID**, increments `version` (`vN -> vN+1`), preserves `.versions/vN/` snapshot | Created as a **draft / `@canary` version** (`vN+1`) alongside the current `@live` (`vN`) version |
| **Larger structural or domain changes** (new framework, different cloud provider, incompatible output contract) | `skill_fork(source, new_name, modification)` | **New permanent GUID**, `version: 1`, records `derived_from: "<source>@v<N>"` | Published as `v1` of the new forked skill (or draft if `BOTZ_QUARANTINE=true`) |
| **Combine complementary skills** (unify multi-phase workflows into one composite skill) | `skill_combine(sources, new_name, synthesis_goal)` | **New permanent GUID**, `version: 1`, records all parent GUIDs in `derived_from` | Published as `v1` of the combined skill (or draft if `BOTZ_QUARANTINE=true`) |
| **Net-new capability** (`covered=false` on search) | `skill_request(need, context, use_client_sampling=true)` / `agent_request(...)` | **New permanent GUID**, `version: 1`, full OWASP scan + async CRUX compile + WebP hero image | Published as `v1` (or draft in `_drafts/` if `BOTZ_QUARANTINE=true`) |

> **Mandatory Secret Redaction Before Any Mutation Call:** Strip all API keys (`sk-`, `ghp_`, `bzt_`, `AKIA...`), `Bearer` tokens, credentials in URLs, and `.env` secrets from `instruction`, `modification`, `need`, and `context`, replacing them with `<REDACTED>`.

---

### Phase C: Select, Test & Rate the Draft / `@canary` Version (`select -> test -> rate -> promote`)

1. **Select the New Draft / `@canary` Version**
   - Immediately select the newly created candidate version by passing its explicit `version` number (or `@canary` tag on resource URIs `skill://{slug}@canary/SKILL.crux.md`):
     ```json
     { "tool": "skill_get_compressed", "arguments": { "name": "<guid-or-slug>", "version": 4 } }
     ```
2. **Test the Candidate Version**
   - Stage its updated resources via `skill_resources_get(name="<guid-or-slug>", paths="*", version=4)` into `.botz/staged/<slug>@v4/`.
   - Run the skill's bundled verification script (`scripts/validate-output.py`) and verify task output against the real workload.
3. **Rate — Agent Result Scoring via Sampling & Feedback**
   - **Client Sampling Evaluation (`sampling/createMessage`)**: When the MCP client supports `capabilities.sampling`, `botz-mcp` (or the agent's local eval harness) invokes `sampling/createMessage` to score the execution outcome against the skill's quality rubric (`Ω` output gates, determinism, token budget, and latency).
   - **Telemetry & Rating Submission (`skill_feedback`)**: Submit structured scoring feedback tied to the candidate version:
     ```json
     {
       "tool": "skill_feedback",
       "arguments": {
         "name": "<guid-or-slug>",
         "outcome": "worked",
         "tokens": 1180,
         "seconds": 2.9,
         "notes": "Canary v4 passed all schema checks; 17% fewer tokens than v3"
       }
     }
     ```
4. **Promote (`@canary` -> `@live`)**
   - **Canary A/B Testing & Automatic Promotion**:
     - Draft versions created via `skill_evolve` run in **Canary A/B mode** (`@live` = `vN`, `@canary` = `vN+1`).
     - As agents execute and score `@canary` vs `@live` via `sampling/createMessage` result scoring and `skill_feedback`, the server tracks per-version Wilson-score lower bounds (`qsc.reliability`, `qsc.quality`, and latency/token deltas).
     - Once `@canary` achieves statistically superior or equivalent ratings over the minimum sample window with zero security regressions, `botz-mcp` **automatically promotes** `@canary` (`vN+1`) to be the new `@live` version and broadcasts `notifications/resources/list_changed` and `notifications/resources/updated`.
   - **Immediate Promotion by Admin Clients via MCP (`skill_promote`)**:
     - Clients authenticated with an **admin** or **catalog steward** role (`bzt_` admin key or OAuth org owner/admin session) can immediately promote a draft or canary skill via MCP:
       ```json
       { "tool": "skill_promote", "arguments": { "name": "<guid-or-slug>", "catalog": "default" } }
       ```
   - **Web Console Governance (`/admin#corpus` & `/console`)**:
     - For standard non-admin agent clients, manual promotion, canary traffic weight tuning, version diffs (`skill_diff`), and quarantine release are managed by operators in the Botz Web Console.

---

## 3. Batched Multi-Skill & Multi-Resource Patterns

- **Batch Resource Materialization**: Always prefer `skill_resources_get(name, paths="*", version=v)` (or a glob list like `paths=["scripts/*.py", "assets/*.json"]`) over calling `skill_resource_get` in a loop.
- **Batch Lockfile Update Check**: Pass all pinned workspace skills in a single `updates_check(pins={"<guid1>": 2, "<guid2>": 5})` call at session start rather than checking skills one by one.
- **Complementary Skill Chaining**: When `skill_get_compressed` returns `relationships.complements` or `related`, fetch only the specific complementary skill needed for the next phase and record separate `skill_feedback` telemetry for each consumed skill.

---

## 4. 24-Hour Generation Quotas & Graceful Read-Only Degradation

- **Per-User & Per-Team Rolling 24h Quota**: Authoring and mutation tools (`skill_request`, `agent_request`, `skill_evolve`, `skill_fork`, `skill_combine`) enforce a rolling 24-hour generation quota per user and per team (default: **10 generations / 24h**, configurable in `/admin#settings`).
- **Graceful Degradation to Read-Only**:
  - When the 24h generation quota is exhausted, mutation tools return a structured notice (`action: "quota_exceeded"`, `reason_code: "generation_quota_24h_exceeded"`, `limit: 10`, `window_hours: 24`, `retry_after_seconds`).
  - **All read-only and telemetry tools (`skill_search`, `agent_search`, `skill_get_compressed`, `skill_get`, `skill_resources_get`, `skill_install`, `updates_check`, `skill_diff`, `skill_feedback`) remain 100% available and unthrottled.**
  - When an agent encounters `quota_exceeded`, it must **not** retry `skill_evolve` / `skill_request` in a loop; instead, it consumes the closest `@live` skill via `skill_get_compressed`, applies any necessary adjustments locally for the current task, and logs the desired enhancement in `skill_feedback(notes=...)` for later evolution once the quota window resets.
