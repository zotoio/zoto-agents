# Findings 04 — Command, Agent & Skill Surface Ergonomics Review

**Subtask:** [`subtask-04-eval-plugin-review-surface-ergonomics-20260523.md`](../subtask-04-eval-plugin-review-surface-ergonomics-20260523.md)
**Prerequisite:** [`findings-01/findings-01-inventory.md`](../findings-01/findings-01-inventory.md)
**Authoritative source:** `/home/andrewv/.cursor/plugins/local/zoto-eval-system/` (referred to below as `<plugin>/`).
**Scope:** Read-only ergonomic critique of the 13-command / 9-skill / 8-agent / 1-rule / 1-hook surface. Architecture, schemas, and engine code are deferred to subtasks 03 / 05 / 07.

---

## TL;DR

The eval-system surface ships **30 user-facing components** (13 commands + 9 skills + 8 agents) plus 1 rule and 1 hook to do work that the plugin's own component matrix maps to **8 lifecycle stages**. The biggest ergonomic wins are:

- **Collapse the four-alias router family** (`/z-eval-start`, `/z-eval-jump`, `/z-eval-operator`, `/z-eval-workflow`) into **one** command.
- **Loosen the `alwaysApply: true` help-routing rule** — it intercepts trivial inline questions, contradicts the workflow router carve-out, and creates a chicken-and-egg for first-time users.
- **Drop ~4 thin-wrapper agents** (`zoto-eval-comparer`, `zoto-eval-judge`, `zoto-eval-adviser`, `zoto-eval-executor`) that each forward one command to one skill with no orchestration value — `/z-eval-help` already demonstrates the "command → skill" shortcut.

If those three cuts land, the surface drops from **30 components to 22** (-27%) without losing any user-visible capability. Every deletion below names the alternative path that keeps the capability available.

---

## Findings ledger

Severity scale: **blocker** (must fix before publish) · **major** (significant UX cost) · **minor** (notable but tolerable) · **info** (observation / nit). Effort: **S** ≤ 1d, **M** 1–3d, **L** > 3d.

| # | Severity | Confidence | Effort | Title |
|---|----------|-----------|--------|-------|
| F1 | major | high | S | Four-alias router family (`/z-eval-start` · `/z-eval-jump` · `/z-eval-operator` · `/z-eval-workflow`) is 100% duplication |
| F2 | major | high | S | Help-routing rule (`alwaysApply: true`) is over-broad and creates a first-run catch-22 |
| F3 | major | high | M | Four agents (`comparer`, `judge`, `adviser`, `executor`) are ceremonial thin wrappers — drop the agent layer or drop the carve-out for `/z-eval-help` |
| F4 | major | medium | M | `/z-eval-configure` happy path: 13 sequential `askQuestion` prompts with un-glossed jargon and no link-out to README |
| F5 | major | medium | S | Hook (`session-start`) nudges fire daily on manifest presence (not real drift) and can stack 3 banners per session |
| F6 | minor | high | S | Stale `config.json` references survive across **5 skill files** (post-`.yml` rename), reaching into runtime templates |
| F7 | minor | high | S | Identical 4-line init-gate copy is duplicated in 9 commands; one source of truth would shrink the surface |
| F8 | minor | high | S | Naming asymmetry: `zoto-<verb>-evals` (skills) vs `zoto-eval-<noun>` (agents) vs `/z-eval-<verb>` (commands) — pick one |
| F9 | minor | medium | S | No slash command for the LLM analyser path (`pnpm run eval:analyse`) — only the four redundant router commands exist for the public surface |
| F10 | minor | medium | S | `/z-eval-compare` askQuestion carve-out is the only inconsistency in an otherwise uniform `needs_user_input` contract — the carve-out is unjustified |
| F11 | minor | medium | S | `zoto-eval-tooling` is reference documentation with skill frontmatter — wrong primitive |
| F12 | minor | high | S | `/z-eval-help` is a heavy machine (askQuestion → README parse → 6 project signals → cited answer) for "tell me what `--check` does" |
| F13 | info | high | S | Plugin manifest declares `logo: assets/logo.png` but no `assets/` directory ships in the local tree (packaging gap) |
| F14 | info | high | S | README footnote (line 7) admits an `eval:live → eval:update` rename is "complete everywhere except this footnote" — stale rename residue |
| F15 | info | medium | S | `/z-eval-create` defaults to four-checklist multi-select (skills / commands / agents / hooks) on every fresh install — combine into one composite checklist |

The next sections expand each finding with concrete citations.

---

## F1 (major) — Four-alias router family is 100% duplication

Four slash commands resolve to the **same** Probe / Lifecycle router / Resolution block from `commands/z-eval-workflow.md`. The aliases lift the body **verbatim** — every Precondition, every `askQuestion` enum, every Resolution rule is identical:

```26:31:/home/andrewv/.cursor/plugins/local/zoto-eval-system/commands/z-eval-start.md
### Delegate routing semantics

After Preconditions succeed:

1. Resolve **`plugins/zoto-eval-system/commands/z-eval-workflow.md`** — fall back to the same relative path under the installed Eval System plugin mirror (for example **`~/.cursor/plugins/zoto-eval-system/commands/z-eval-workflow.md`**) when the host workspace does not ship the monorepo tree.
2. Execute **Probe**, **Lifecycle router**, and **Resolution** from that file **without omission or reinterpretation**, exactly as if the operator had invoked **`/z-eval-workflow`**.
```

`z-eval-jump.md`, `z-eval-operator.md`, and `z-eval-workflow.md` repeat the same lifecycle picker:

```17:31:/home/andrewv/.cursor/plugins/local/zoto-eval-system/commands/z-eval-jump.md
## Instructions

### Precondition

Before doing anything else, verify that **`.zoto/eval-system/config.yml`** exists at the repository root. If it does not, abort with the exact message:

> Eval System is not initialised. Run `/z-eval-init` first to create `.zoto/eval-system/config.yml`.

Do not synthesize a default config and do not proceed.

### Delegate routing semantics

After Preconditions succeed:

1. Resolve **`plugins/zoto-eval-system/commands/z-eval-workflow.md`** — fall back to the same relative path under the installed Eval System plugin mirror (for example **`~/.cursor/plugins/zoto-eval-system/commands/z-eval-workflow.md`**) when the host workspace does not ship the monorepo tree.
2. Execute **Probe**, **Lifecycle router**, and **Resolution** from that file **without omission or reinterpretation**, exactly as if the operator had invoked **`/z-eval-workflow`**.
```

The cost ripples through:

- **Operator memory**: four names for one behaviour (no semantic difference; same precondition, same prompt, same outputs). The advertised rationale ("runbooks want a `jump` verb", "ops docs want an `operator` label") is paper-thin — that purpose could be served by **doc aliases in the rule** without shipping additional command files.
- **Rule catalogue bloat**: `rules/zoto-eval-system.mdc` lists all four side-by-side and then has to re-explain the routing carve-out twice:

  ```13:16:/home/andrewv/.cursor/plugins/local/zoto-eval-system/rules/zoto-eval-system.mdc
  - `/z-eval-start` — operator jump into the evaluator workflow; after verifying config.yml, load `commands/z-eval-workflow.md` and apply Probe → Lifecycle router → Resolution verbatim (no subagents; read-only).
  - `/z-eval-jump` — same read-only delegation as `/z-eval-start`; use when docs or runbooks call for an explicit “jump” verb.
  - `/z-eval-operator` — same read-only delegation as `/z-eval-start`; use when runbooks or ops docs want an explicit operator entry label.
  - `/z-eval-workflow` — canonical lifecycle routing specification; one `askQuestion` maps lifecycle stage → next `/z-eval-*` command (no subagents; read-only).
  ```
- **README quick-start propagation**: ```36:39:/home/andrewv/.cursor/plugins/local/zoto-eval-system/README.md``` lists all four with `optional` annotations — first-time readers must scan past four "same thing" lines before reaching the actual lifecycle commands.
- **`/z-eval-init`'s `Related` footer** at ```40:40:/home/andrewv/.cursor/plugins/local/zoto-eval-system/commands/z-eval-init.md``` cites **all eleven** sibling commands, including the four aliases.
- **Help-router carve-out** at ```32:32:/home/andrewv/.cursor/plugins/local/zoto-eval-system/rules/zoto-eval-system.mdc``` must enumerate every alias when telling agents NOT to invoke `/z-eval-help` for lifecycle picks.

**User scenario:** An operator copies a runbook that says "run `/z-eval-jump`", lands in the workflow router, and immediately wonders which of the other three commands they should have used instead. The lifecycle router prompts the same `askQuestion`, so the answer is "none" — but the doubt is real.

**Recommendation:** Keep **`/z-eval-workflow`** as the canonical lifecycle picker. Delete `/z-eval-start`, `/z-eval-jump`, and `/z-eval-operator`. Add a one-line note in the rule and the README's Quick Start that says "operators may see `/z-eval-jump` / `/z-eval-operator` / `/z-eval-start` referenced in older runbooks — they all map to `/z-eval-workflow`". Capability preserved by **`/z-eval-workflow`** (lifecycle picker) plus the existing rule entry.

If the team insists on multiple verbs, the lighter alternative is **command-file aliases** (Cursor supports `name:` + alternate entry — needs verification with `zoto-plugin-manager`, but a one-file alias avoids 3 × 40-line near-clones).

---

## F2 (major) — Help-routing rule is over-broad and creates a first-run catch-22

```28:34:/home/andrewv/.cursor/plugins/local/zoto-eval-system/rules/zoto-eval-system.mdc
## Help-Intent Routing

Before answering ANY question about how to configure, create, update, execute, judge, compare, or advise on evals — or any question about `.zoto/eval-system/`, `evals/`, `llm.yml`, the `_meta.generated` contract, or `manifest.history.yml` — the agent MUST invoke `/z-eval-help` so the answer is anchored on the plugin's shipped README, tailored to this project's actual state (config, manifest, runs), and cited inline with `start:end:plugins/zoto-eval-system/README.md` code references. Do not answer from inferred knowledge.

When the operator only needs **which slash command to run next** (workflow routing, “where do I start after init”, or “what comes after execute?”) without README-cited narrative, use **`/z-eval-start`**, **`/z-eval-jump`**, **`/z-eval-operator`**, or **`/z-eval-workflow`** instead of **`/z-eval-help`** (`/z-eval-start`, `/z-eval-jump`, and `/z-eval-operator` delegate to the workflow rules after the init gate).

Questions about "what tests am I missing?", "eval coverage gaps", "are my evals sufficient?", or "eval recommendations" should be routed to `/z-eval-advise` rather than `/z-eval-help`.
```

Combined with `alwaysApply: true` (line 3), the rule **intercepts every conversational question** about the plugin. Three concrete failure modes:

### F2.1 — First-run catch-22

Day-1 user types: "How do I set up eval-system?" or "What does this plugin do?" The rule fires → agent MUST invoke `/z-eval-help`. `/z-eval-help` precondition (```19:25:/home/andrewv/.cursor/plugins/local/zoto-eval-system/commands/z-eval-help.md```) requires `.zoto/eval-system/config.yml` to exist. It doesn't, so the user is told:

> Eval System is not initialised. Run `/z-eval-init` first to create `.zoto/eval-system/config.yml`.

That is **not** an answer to the question. The user wanted to **learn** what to do, not get bounced. The hook does not nudge in this scenario either (```125:128:/home/andrewv/.cursor/plugins/local/zoto-eval-system/hooks/zoto-eval-session-start.ts``` — missing config silently emits `{}`).

### F2.2 — Ambiguous priority vs the workflow router carve-out

The rule says agents MUST invoke `/z-eval-help` for any eval question, **but** then says "when the operator only needs which command to run next, use `/z-eval-start` / `/z-eval-jump` / `/z-eval-operator` / `/z-eval-workflow`". The two clauses overlap: "what comes after execute?" is both a workflow pick **and** a documentation question. The agent has no deterministic way to choose.

### F2.3 — Trivial inline questions get the heavy machine

"What does `--check` do?" is answerable in one sentence from the operator's mental model of the README. The rule forces:

1. Invoke `/z-eval-help`
2. Precondition check (`config.yml` exists)
3. Section picker via `askQuestion`
4. Load README, parse `##` headers
5. Read up to six host project signals (```47:60:/home/andrewv/.cursor/plugins/local/zoto-eval-system/skills/zoto-help-evals/SKILL.md```)
6. Compose tailored answer with mandatory `start:end:path` citations

For a single sentence's worth of fact, the user paid a turn round-trip plus an `askQuestion`. The cost-benefit is poor for >50% of help-shaped questions.

**Recommendation:**

1. Drop `alwaysApply: true`. Either narrow the rule to `globs: [".zoto/eval-system/**", "evals/**"]` (file-context) or convert the help-routing block to a **soft recommendation** ("when the answer requires citing the plugin's contracts or tailoring to the user's config, prefer `/z-eval-help`").
2. Allow `/z-eval-help` to run **without** an existing `config.yml` (it can still cite the README and recommend `/z-eval-init`). Today's precondition is wrong for the docs path. The skill already handles "no `manifest.yml` yet" gracefully (```73:73:/home/andrewv/.cursor/plugins/local/zoto-eval-system/skills/zoto-help-evals/SKILL.md```); extend the same logic to `config.yml`.
3. Remove the workflow-router carve-out from the help-routing prose (it is no longer needed if `/z-eval-help` is recommended, not mandated; and it goes away entirely if F1 lands).

User scenario after fix: "What does `--check` do?" → agent answers from README citation inline. "Tailor `--check` to my repo's CI" → agent suggests `/z-eval-help` for project-tailored citation. "I'm brand new, help me set up evals" → agent answers from `/z-eval-help` (now config-less-safe) which recommends `/z-eval-init` in the body.

---

## F3 (major) — Four thin-wrapper agents have no orchestration value

Four agents are 30–60-line file shells around a single skill:

| Agent | File | Skill(s) | Orchestration done in the agent file |
|-------|------|----------|--------------------------------------|
| `zoto-eval-comparer` | ```1:32:/home/andrewv/.cursor/plugins/local/zoto-eval-system/agents/zoto-eval-comparer.md``` | `zoto-compare-evals` | None — repeats the skill's "no askQuestion" rule and resolution sketch. |
| `zoto-eval-judge` | ```1:37:/home/andrewv/.cursor/plugins/local/zoto-eval-system/agents/zoto-eval-judge.md``` | `zoto-judge-evals` (+ handoff to `zoto-update-evals`) | None — re-states the same five-step workflow already in the skill. |
| `zoto-eval-adviser` | ```1:62:/home/andrewv/.cursor/plugins/local/zoto-eval-system/agents/zoto-eval-adviser.md``` | `zoto-advise-evals` (+ handoff to `zoto-create-evals` / `zoto-update-evals`) | None — duplicates breakpoint structure from the skill. |
| `zoto-eval-executor` | ```1:45:/home/andrewv/.cursor/plugins/local/zoto-eval-system/agents/zoto-eval-executor.md``` | `zoto-execute-evals` (+ post-run drift line via `zoto-update-evals`) | None — same skill steps re-narrated. |

Compare with the existing `/z-eval-help` carve-out that **already** routes command → skill with no intermediate agent:

```26:27:/home/andrewv/.cursor/plugins/local/zoto-eval-system/commands/z-eval-help.md
Use the `zoto-help-evals` skill directly — no intermediate agent is required unless you prefer symmetry with other commands.
```

The agent layer is doing real orchestration **only** in three cases: `zoto-eval-generator` (orchestrates configure-handoff + create + post-create update-check), `zoto-eval-updater` (multi-mode dispatcher across framework/strategy helpers), and `zoto-eval-configurer` (manifest-snapshot read + cleanup_plan + `_meta.invalidate` stamping). The remaining four are pure tax.

Per-component token cost (rough): each thin agent adds ~40 lines × ~15 tokens/line ≈ **600 tokens** loaded for nothing every time the command spawns the agent. Across four agents per session that runs the full lifecycle, that's ~2400 unjustified tokens.

**Recommendation:**

- **Delete** `zoto-eval-comparer`, `zoto-eval-judge`, `zoto-eval-adviser`, `zoto-eval-executor`.
- Update `/z-eval-compare`, `/z-eval-judge`, `/z-eval-advise`, `/z-eval-execute` to invoke the corresponding skill **directly**, as `/z-eval-help` already does.
- Keep `zoto-eval-generator`, `zoto-eval-updater`, `zoto-eval-configurer` (real orchestration), and `zoto-eval-analyser-subagent` (LLM contract — special: it ships a JSON-only system prompt and has no slash command).

Capability preserved: every command continues to execute the same skill; the resume-with-needs_user_input contract is unchanged (the **command** owns askQuestion in both shapes); the rule's component table just gets shorter.

---

## F4 (major) — `/z-eval-configure` happy path: 13 sequential prompts, jargon-heavy, no link-out

```28:42:/home/andrewv/.cursor/plugins/local/zoto-eval-system/commands/z-eval-configure.md
Run `askQuestion` for each field in this order. Use enum-backed options (no free-form unless the schema allows).

1. **Existing config** — If `.zoto/eval-system/config.yml` exists: overwrite vs cancel vs show-only.
2. **evalsDir** — default `evals` vs custom (only if schema allows).
3. **skillsRoots** — multi-select: `.cursor/skills`, `skills`, `plugins/*/skills`, custom entries.
4. **discoveryTargets** — multi-select: `skill`, `command`, `agent`, `hook`, `cli`, `lib`.
5. **`static.framework`** *(new — subtask 02)* — `pytest` / `vitest` / `jest`. Recommendation hint: pytest if the repo has Python primitives, vitest by default for TS-only repos, jest if the repo already ships jest tooling.
6. **`llm.strategy`** *(new — subtask 02)* — `code` / `declarative`. Default `declarative` for new repos.
7. **`llm.codeFramework`** *(new — subtask 02; conditional)* — only ask when `llm.strategy === "code"`. Options: `vitest` / `jest`. When `static.framework` is also a TS framework, default the suggestion to match it.
8. **llm.runtime** — `tsx` vs `node`.
9. **llm.model.id** — `composer-2` / `opus-4.6` / `sonnet`.
10. **judgeModel** — same set; default `opus-4.6`.
11. **manualChecklists.enabled** — yes / no.
12. **additionalAutomation** — none / vitest / jest / bats (multi-select).
13. **update.criticalChangeRules.*** — five yes/no toggles (defaults on).
```

That's **13 sequential `askQuestion` calls** before the configurer subagent even runs (each round-trips through the user). Several fields are pure jargon for a first-time user (`evalsDir`, `skillsRoots`, `discoveryTargets`, `llm.strategy`, `llm.codeFramework`, `llm.runtime`, `criticalChangeRules`). Step 13 alone is **five** consecutive yes/no toggles.

Compounding factors:

- The init template (`templates/init-config.yml`) already ships every key commented with the internal default — a user who reads it can typically skip `/z-eval-configure` entirely. But `/z-eval-init`'s footer (```22:26:/home/andrewv/.cursor/plugins/local/zoto-eval-system/commands/z-eval-init.md```) actively recommends `/z-eval-configure` next.
- `/z-eval-configure` does not link out to the README or to `templates/schema/config.schema.json` from inside the prompts — users decoding `llm.strategy: code` vs `declarative` have to leave the chat to read the README's "side-by-side comparison" table (```204:214:/home/andrewv/.cursor/plugins/local/zoto-eval-system/README.md```).
- `additionalAutomation` still offers `bats` as an option (Step 12), but the README explicitly says `bats` was removed in eval-system v2 (```72:72:/home/andrewv/.cursor/plugins/local/zoto-eval-system/README.md```). Conflict.

**Recommendation:**

1. **Tier the prompts**: split into "express" (`static.framework`, `llm.strategy`, `llm.model.id`, `judgeModel` — the four with real defaults that need user judgement) and "advanced" (`skillsRoots`, `discoveryTargets`, `update.criticalChangeRules.*`, `additionalAutomation`). Offer "Use defaults" up front; only descend into advanced via an opt-in.
2. **Inline-link each prompt to its README anchor** via `prompt: "... See: /z-eval-help configuration"`.
3. **Combine the five `criticalChangeRules.*` toggles** into one multi-select.
4. **Remove `bats` from step 12** — it's contradicted by the v2 changelog.
5. **Pre-collect defaults during `/z-eval-init`**: have `/z-eval-init` ship a config with sensible non-commented values (so `/z-eval-configure` is genuinely optional, not "recommended next" by `/z-eval-init`'s own footer).

Effort estimate is **M** because it touches the command, the configurer skill's payload contract, and the rule's "configurer" description.

---

## F5 (major) — Hook nudges fire daily on manifest presence, not on real drift

```140:150:/home/andrewv/.cursor/plugins/local/zoto-eval-system/hooks/zoto-eval-session-start.ts
const misses = missingEvals(root);
if (misses.length > 0) {
  messages.push(`Eval System: ${misses.length} skill(s) missing evals.json: ${misses.slice(0, 3).join(", ")}${misses.length > 3 ? ", ..." : ""}. Run /z-eval-update.`);
}

const markerPath = join(root, ".zoto", "eval-system", ".last-drift-check");
if (markerShouldRun(markerPath)) {
  const manifestPath = join(root, ".zoto", "eval-system", "manifest.yml");
  if (existsSync(manifestPath)) {
    messages.push("Eval System: run /z-eval-update to check for drift (last check >= 1 day ago).");
  }
  touch(markerPath);
}
```

Three independent banners can stack in **one** session:

1. "N run(s) older than 14 days. Consider /z-eval-execute" (line 134-136)
2. "N skill(s) missing evals.json: a, b, c, ... Run /z-eval-update" (line 138-141)
3. "run /z-eval-update to check for drift (last check >= 1 day ago)" (line 144-149)

Problems:

- **Banner 3 fires every 24h** regardless of whether drift exists. It is purely time-based ("last check ≥ 1 day ago"); the hook does not call `eval:update --check` itself. After one week, the user has seen the same "go run /z-eval-update" line seven times for no actionable reason. Classic banner blindness.
- **Banner 2's `missingEvals()`** (lines 69-89) scans **only** hard-coded `.cursor/skills` and `skills` roots. It ignores `config.skillsRoots[]`, so any repo using `plugins/*/skills` (the eval-system itself!) produces false "missing" warnings or misses real ones.
- **`STALE_DAYS = 14`** (line 19) is a magic constant. Repos with infrequent eval runs see banner 1 forever.
- **Banner 1 says "Consider /z-eval-execute"** but stale runs are about cleanup, not execution. The correct nudge is `pnpm run eval:gc -- --apply` (per README ```108:113:/home/andrewv/.cursor/plugins/local/zoto-eval-system/README.md```).

**Recommendation:**

1. **Read `config.skillsRoots`** in `missingEvals()` and respect the configured roots (or use the same discovery the rest of the plugin uses).
2. **Run `eval:update --check`** behind the marker — if exit code is 0 (no drift), say nothing. The marker is the throttle; the check is the gate.
3. **Surface the right action for stale runs** — `pnpm run eval:gc -- --apply` (or `/z-eval-execute` to produce a fresh one, but be explicit which).
4. **Make `STALE_DAYS` and the drift-check cadence configurable** via `config.hooks.session.staleRunsDays` and `hooks.session.driftCheckHours` (or wire to the existing `runs.retention` value).
5. **Cap nudges to one banner per session** — pick the highest-priority message rather than stacking three.

User scenario: Operator opens Cursor each morning for a week on a healthy repo. Today they see "run /z-eval-update to check for drift" again — without context, they conclude the hook is broken or noisy and silence it.

---

## F6 (minor) — Stale `config.json` references survive across 5 skill files

The README acknowledges the rename:

```52:54:/home/andrewv/.cursor/plugins/local/zoto-eval-system/README.md
## Configuration

Configuration lives at **`.zoto/eval-system/config.yml`** (the only supported path; earlier versions used `.zoto-eval-system/config.json` — that path is no longer supported). The file is validated against `templates/schema/config.schema.json`.
```

But shipped skills still reference the old name in **6 distinct surfaces**:

- ```52:53:/home/andrewv/.cursor/plugins/local/zoto-eval-system/skills/zoto-help-evals/SKILL.md``` — `config.json → static.framework`, `config.json → llm.*`.
- ```58:58:/home/andrewv/.cursor/plugins/local/zoto-eval-system/skills/zoto-help-evals/SKILL.md``` — `config.json → judgeModel`.
- ```161:163:/home/andrewv/.cursor/plugins/local/zoto-eval-system/skills/zoto-configure-evals/SKILL.md``` (Conventions block: `File: config.json`).
- ```103:103:/home/andrewv/.cursor/plugins/local/zoto-eval-system/skills/zoto-execute-evals/SKILL.md` — "Do not modify `config.json` or `manifest.yml`".
- `skills/zoto-update-evals/evals/evals.json` (lines 33, 49) — eval cases still ask about `config.json`.
- `skills/zoto-execute-evals/evals/evals.json` (line 50) — eval case asserts about `.zoto-eval-system/config.json`.

This bleeds into runtime templates (out of scope for this subtask, deferred to subtask 02), e.g. ```73:73:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/llm/code-cursor-sdk/_shared/reporters/zoto-llm-reporter.jest.ts.tmpl``` and ```39:39:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/llm/code-cursor-sdk/_shared/graders/llm-judge.ts.tmpl``` still join paths to `config.json`. Subtask 02 owns the template fix; this finding only covers the user-facing docs.

**Ergonomic impact:** the help skill (the rule's mandated answer surface!) will read project signals from a non-existent `config.json` path, then either silently fail or fabricate "no config found yet" for repos that **do** have `config.yml`. Worst case: user asks "what's my judgeModel?" and the help skill says "no config yet — run `/z-eval-configure`" even though `config.yml` is present and populated.

**Recommendation:** Global rename across the 5 SKILL.md / evals.json files. Effort **S** (~30 minutes of targeted edits). Hand off to `zoto-eval-engineer`.

---

## F7 (minor) — Identical init-gate copy is duplicated in 9 commands

Every lifecycle command except `/z-eval-init` itself opens with the same five-line block:

```18:24:/home/andrewv/.cursor/plugins/local/zoto-eval-system/commands/z-eval-configure.md
### Precondition

Before doing anything else, verify that **`.zoto/eval-system/config.yml`** exists at the repository root. If it does not, abort with the exact message:

> Eval System is not initialised. Run `/z-eval-init` first to create `.zoto/eval-system/config.yml`.

Do not synthesize a default config and do not proceed.
```

Identical or near-identical text appears in: `z-eval-start.md` (20-24), `z-eval-jump.md` (20-24), `z-eval-operator.md` (20-24), `z-eval-workflow.md` (20-24), `z-eval-configure.md` (20-24), `z-eval-create.md` (20-24), `z-eval-update.md` (35-39), `z-eval-execute.md` (30-34), `z-eval-judge.md` (24-28), `z-eval-compare.md` (24-28), `z-eval-advise.md` (22-26), `z-eval-help.md` (21-25). That's **12 duplicates** of the same 4-line block (plus the rule echoes it at line 26).

This bloats every command file by ~5 lines and obscures the unique work. It also creates a maintenance hazard: if the init message text changes (e.g. to add a one-line "or run `/z-eval-configure` for guided setup"), every file must be updated in lockstep.

**Recommendation:**

1. Add a one-line preamble to the rule: "All lifecycle commands (every `/z-eval-*` except `/z-eval-init`) require `.zoto/eval-system/config.yml`. When missing, abort with the canonical message."
2. Replace the per-command block with a one-liner: `### Precondition: see rules/zoto-eval-system.mdc § "init gate".`

Net savings: ~50 lines across 12 command files; one canonical edit point.

---

## F8 (minor) — Naming asymmetry: skills vs agents vs commands

Three distinct schemes:

| Layer | Pattern | Example |
|-------|---------|---------|
| Command | `/z-eval-<verb>` | `/z-eval-create`, `/z-eval-update` |
| Skill | `zoto-<verb>-evals` | `zoto-create-evals`, `zoto-update-evals` |
| Agent | `zoto-eval-<noun-form>` | `zoto-eval-generator`, `zoto-eval-updater` |

This forces operators to mentally rotate the same domain word across three positions: `create` is `/z-eval-create` (command suffix) ↔ `zoto-create-evals` (middle of skill) ↔ `zoto-eval-generator` (re-noun'd as agent). Eight of nine skills follow the `zoto-<verb>-evals` pattern; the outlier is `zoto-eval-tooling` (verb-less, see F11).

Also notable:

- The plugin **rule name** is `zoto-eval-system.mdc` (`zoto-eval-` prefix, like agents).
- The **plugin name** is `zoto-eval-system` (same).
- The **plugin display name** is `Eval System` (per ```3:3:/home/andrewv/.cursor/plugins/local/zoto-eval-system/.cursor-plugin/plugin.json```).
- Commands use the **short prefix** `z-eval-` (saving 3 chars on every `/` invocation, which **is** ergonomic — slash typing is high-frequency).

The asymmetry is not strictly an artefact; the command-side abbreviation is intentional. The friction is the **skill ↔ agent split** (`zoto-X-evals` vs `zoto-eval-X`), which doesn't carry semantic information — both are infra-named "thing about evals named X".

**Recommendation:** Unify skills under `zoto-eval-<verb>` (matching agent and rule prefix). Renames required: `zoto-create-evals → zoto-eval-create`, `zoto-update-evals → zoto-eval-update`, `zoto-execute-evals → zoto-eval-execute`, `zoto-judge-evals → zoto-eval-judge`, `zoto-compare-evals → zoto-eval-compare`, `zoto-advise-evals → zoto-eval-advise`, `zoto-configure-evals → zoto-eval-configure`, `zoto-help-evals → zoto-eval-help`. That's 8 skill directory renames + ~50 cross-references to fix (every command's "Skills You Use" line, the agent files, the rule, the README).

Rename cost is real (**M** effort). The decisive question is whether the symmetry payoff justifies the disruption — defer to `zoto-eval-architect` consensus and `zoto-plugin-manager` for the renames. If the team rejects renames, accept the asymmetry but **call it out in the README** so first-time readers don't search for `zoto-eval-create` and miss `zoto-create-evals`.

**Note on agent ↔ skill collision after rename:** if skills move to `zoto-eval-<verb>`, the agents would collide. Resolve via agent-noun naming as today (e.g. `zoto-eval-judge` skill vs `zoto-eval-judge` agent → either keep agent as `-judge-agent` or, per F3, drop the agent entirely).

---

## F9 (minor) — No slash command for `eval:analyse`; four router commands instead

The LLM analyser is the single most expensive call path in the plugin — every `/z-eval-create` and `/z-eval-update --apply` invocation goes through it. Yet operators must type `pnpm run eval:analyse -- <target-id>` to invoke it standalone (per ```24:35:/home/andrewv/.cursor/plugins/local/zoto-eval-system/skills/zoto-eval-tooling/SKILL.md```). There is **no** `/z-eval-analyse` command.

Meanwhile, the surface ships **four** commands for the same lifecycle-picker behaviour (F1).

The asymmetry suggests the surface grew by feature shipment, not by use-case priority. Standalone analyser invocation is a real operator need (refreshing the cache for one target, running with `--pretty` for debugging) and would fit a `/z-eval-analyse <target-id>` shape cleanly.

**Recommendation:** Add `/z-eval-analyse [<target-id>] [--pretty] [--target <glob>] [--dry-run]` thinly wrapping `pnpm run eval:analyse`. The eval-system already has the analyser agent (`zoto-eval-analyser-subagent`) — but per F3, the slash command can call the underlying script via the shell subagent without a wrapper agent.

If F1 lands (drop three router commands), the surface still ships 11 commands without the new `/z-eval-analyse`, or 10 + 1 = 11 with it. Net: same count, better coverage.

---

## F10 (minor) — `/z-eval-compare` askQuestion carve-out breaks an otherwise uniform contract

The rule's `askQuestion` delegation table is clean (```44:48:/home/andrewv/.cursor/plugins/local/zoto-eval-system/rules/zoto-eval-system.mdc```) **except** for the inline exception:

```46:46:/home/andrewv/.cursor/plugins/local/zoto-eval-system/rules/zoto-eval-system.mdc
| **Commands** (`commands/*.md`) | Own **`askQuestion`**, except where a command explicitly documents otherwise. **`/z-eval-compare`** does **not** use **`askQuestion`** for multi-folder run resolution — forward fragments to the comparer and surface verbatim **`needs_user_input`** listing **`{evalsDir}/_runs/...`** candidates; the operator re-runs with resolved basenames. Pre-collect answers **before** spawning a subagent for all other flows. |
```

That carve-out is restated in `/z-eval-compare` itself:

```40:44:/home/andrewv/.cursor/plugins/local/zoto-eval-system/commands/z-eval-compare.md
### Ambiguous run resolution (**no askQuestion**, **no resume**)

If the subagent returns `needs_user_input` because one or more run arguments matched **multiple** directories under `{evalsDir}/_runs/`, output that structured block **verbatim** for the operator (YAML or JSON conforming to `templates/schema/needs-user-input.schema.json`). Explain that comparisons stay blocked until `/z-eval-compare` is re-run with **disambiguated** run basenames.

**Do not** invoke `askQuestion` or `resume` for this outcome — `/z-eval-compare` lists candidates inline and stops.
```

The justification is silent — neither the rule nor the command explains **why** `/z-eval-compare` ambiguity is different from `/z-eval-help`'s multi-header ambiguity (where `askQuestion` is used: ```33:33:/home/andrewv/.cursor/plugins/local/zoto-eval-system/commands/z-eval-help.md```).

User scenario: operator types `/z-eval-compare 20260503 20260504`, gets a YAML/JSON `needs_user_input` block back, has to **manually copy** the disambiguated basename, then re-type the full command. Compared to `askQuestion` flow (one click on a numbered option), the cost is meaningfully higher and the inconsistency is jarring.

**Recommendation:** Drop the carve-out. Have `/z-eval-compare` map `needs_user_input` → `askQuestion` (one question per ambiguous arg), then resume the comparer with resolved paths. The comparer agent's contract (no `askQuestion`) is unchanged — the command handles the surface, exactly as it does in every other lifecycle command.

If there's a technical reason for the carve-out (subagent state, resume semantics), document it. Today's silence reads as "we ran out of time to wire resume."

---

## F11 (minor) — `zoto-eval-tooling` is reference documentation, not a skill

```1:9:/home/andrewv/.cursor/plugins/local/zoto-eval-system/skills/zoto-eval-tooling/SKILL.md
---
name: zoto-eval-tooling
description: Invocation reference for all eval-system CLI commands. Use this skill when you need to run eval scripts — never reference script paths directly; always invoke via the package.json aliases documented here.
---

# Eval System CLI Tooling

This skill is the **single source of truth** for how agents invoke eval-system CLI commands. All commands are available as `pnpm run eval:<name>` aliases defined in the host repo's `package.json`. Agents and skills MUST invoke these aliases — never reference the underlying TypeScript file paths directly.
```

This is a CLI man-page wrapped in skill frontmatter. There is no "Workflow" section, no "When to Use" with trigger phrases, no `needs_user_input` pattern, no askQuestion contract. The content is **pure reference** — what every command takes, what it returns, what exit codes mean. It even has a stamped `evals/evals.json` (28 cases per the count) testing whether agents cite the correct path patterns.

The Agent Skills spec contract is "load this skill, follow these steps". `zoto-eval-tooling` doesn't fit that shape — it's load-and-look-up, not load-and-execute.

The right primitive for this content is **rule** or **plugin docs** (e.g. `docs/cli-reference.md` linked from README) — not a skill.

**Recommendation:**

1. **Convert** `zoto-eval-tooling` into either:
   - A new rule, `rules/zoto-eval-cli.mdc`, with `alwaysApply: false` and `globs: ["**/*.ts", "**/*.md"]` (or whatever scope agents typically need it in), or
   - A README section / `docs/CLI.md` that the help skill cites.
2. **Drop the directory and its `evals/evals.json`** — the eval cases (`28` per finding-01 inventory) can be redirected to test command bodies instead. The current cases score whether agents pick the right `pnpm run` alias; that's a coverage check on the **calling commands**, not on a skill workflow.

Effort **S–M** depending on the route. The 28 eval cases are real coverage and shouldn't be dropped — they need re-homing.

---

## F12 (minor) — `/z-eval-help` is a heavy machine for trivial questions

`/z-eval-help`'s contract:

```30:48:/home/andrewv/.cursor/plugins/local/zoto-eval-system/commands/z-eval-help.md
### Pre-collect (before invoking the skill)

1. Load `plugins/zoto-eval-system/README.md` and enumerate `##` sections.
2. If `<topic>` is missing → `askQuestion`: numbered list of sections.
3. If `<topic>` matches multiple headers → `askQuestion`: pick one.
4. If the user typed a free-form follow-up (instead of choosing a numbered option), capture it as `help_context.user_question`.
5. Build `help_context: { selected_section, user_question?, follow_up? }` for the skill.

Optional: after the skill returns its tailored answer, run `askQuestion` for related navigation vs exit; if the user wants another section, update `help_context` and re-invoke the skill (or resume a Task if you wrapped it).

### Resume loop

If the skill returns `needs_user_input` (missing context — e.g. ambiguous section, missing follow-up enum), run `askQuestion`, then call the skill again with completed `help_context`.

### What happens

1. README loaded (by you or the skill).
2. Section chosen via command-owned prompts.
3. Skill reads the README **and** the relevant project signals (`.zoto/eval-system/config.yml`, `manifest.yml`, `.env*`, `package.json` scripts, latest `evals/_runs/<run-id>/`), then composes a tailored answer anchored on the chosen section with `start:end:path` citations back to the README.
4. Follow-up navigation via command-owned `askQuestion` as needed.
```

Combined with the help-routing rule (F2), the question "what does `--check` do?" pays:

- 1 README load
- 1 `##` enumeration
- 1 askQuestion ("which section?" — even though `--check` is referenced from multiple sections)
- 1 README re-read for the chosen section
- Up to 6 project-signal reads (per the table at ```47:60:/home/andrewv/.cursor/plugins/local/zoto-eval-system/skills/zoto-help-evals/SKILL.md```)
- 1 composed answer with mandatory citations

The skill explicitly forbids inline answers — "Do not answer from inferred knowledge" — and the rule mandates routing here for ANY eval question. Result: even the simplest one-line answer requires the full machine.

**Recommendation:** Conditional execution:

1. **Direct-topic shortcut**: when `/z-eval-help <topic>` resolves unambiguously to one section, skip the askQuestion ("which section?") and answer directly.
2. **Skip project-signal reads for plugin-contract questions**: questions about contracts (e.g. `_meta.generated`, `update.preserveUserAuthoredCases`) don't need to read the host's `config.yml` to answer. Only tailor when the section explicitly calls for host-state interpolation.
3. **Combine F2 narrowing**: trivial in-conversation answers stay inline; only project-tailored answers route through `/z-eval-help`.

This is mostly a soft-recommendation cleanup — no schema or contract changes.

---

## F13 (info) — Plugin manifest declares `logo: assets/logo.png` but ships no `assets/`

```14:15:/home/andrewv/.cursor/plugins/local/zoto-eval-system/.cursor-plugin/plugin.json
"category": "developer-tools",
"logo": "assets/logo.png",
```

Per finding-01, the local mirror **does not** ship an `assets/` directory (cf. the 126-file delta in inventory). Marketplace rendering will fail or fall back; users will see a broken logo on the install page.

**Recommendation:** Either ship `assets/logo.png` or remove the `logo` key until one exists. Hand off to `zoto-plugin-manager`.

---

## F14 (info) — Stale rename residue ("eval:live → eval:update")

```5:7:/home/andrewv/.cursor/plugins/local/zoto-eval-system/README.md
The Eval System scaffolds two eval backends side by side: a **static** backend (pytest, vitest, or jest per `static.framework`) for fast, deterministic checks, and an **LLM backend** powered by `@cursor/sdk` for agent-based evaluations with soft metrics — tokens, duration, verbosity, accuracy, confidence. A diff-aware updater detects when covered targets have changed and presents each proposed eval update for user confirmation before writing — behavioural drift in AI primitives is managed consciously, never silently. User-authored cases stay sovereign — both runtime and compile-time guards refuse to touch them.

> **Note**: An earlier name for the continuous evaluation surface was `eval:live` / `_live`. The plugin now ships `eval:update` / `_update` throughout. The rename is complete everywhere except this single footnote.
```

The footnote is self-cancelling (it documents the rename but admits the rename has propagated everywhere). Drop the footnote — the rename **is** complete, and the footnote actively reintroduces the old name.

---

## F15 (info) — `/z-eval-create` defaults to four separate checklists

```28:36:/home/andrewv/.cursor/plugins/local/zoto-eval-system/commands/z-eval-create.md
Run `askQuestion` for:

1. **Missing config** — If `.zoto/eval-system/config.yml` is absent: hand off to `/z-eval-configure` now vs abort.
2. After running discovery (via explore subagent or instructing generator to run it first), present **four checklists** (default: all selected):
   - Which **skills** to scaffold evals for.
   - Which **commands** (plugin `plugins/*/commands/*.md` **and** `.cursor/commands/*.md`) to scaffold.
   - Which **agents** (plugin `plugins/*/agents/*.md` **and** `.cursor/agents/*.md`) to scaffold.
   - Which **hooks** (plugin `hooks/hooks.json`, plus workspace `.cursor/hooks.json` or `.cursor/hooks/hooks.json` → stable eval id `hook:cursor`) to scaffold.
```

Four sequential `askQuestion` calls on a fresh repo. Each defaults to "all selected", so the typical user clicks through four screens of "yes, all".

**Recommendation:** Combine into **one** composite checklist with kind-prefixed entries (`skill:<name>`, `command:<name>`, etc.) or one "use defaults / customise" gate that only expands to the four screens on `customise`. Effort **S**.

---

## Misc observations (no severity)

- Plugin uses **`pnpm`** throughout its surface (commands, skills, README CI snippet). The repo's user-rule prefers **`yarn`**. Either the plugin should detect the host's package manager, or the README should call out the `pnpm` assumption. Not a finding — flagged for future PR.
- The marketplace `displayName: "Eval System"` clashes with the rule's prose ("Eval System plugin", "eval-system") and the repo path `zoto-eval-system`. Three spellings of the same product. Pick one.

---

## Recommended surface — after cuts

Below is the proposed final inventory if **F1**, **F3**, **F7**, **F11**, **F9 (additive)**, and the configurer/hook simplifications (F4, F5) land. F8 (rename skills under `zoto-eval-<verb>`) is shown as **optional** in a separate column because it depends on whether the team accepts the rename churn.

### Commands — 11 (-2)

| Command | Status | Change |
|---------|--------|--------|
| `/z-eval-init` | keep | unchanged |
| `/z-eval-workflow` | keep | becomes the **only** router (replaces /-start, /-jump, /-operator) |
| `/z-eval-configure` | keep | tiered prompts (express vs advanced); link-outs to README per field |
| `/z-eval-create` | keep | one composite checklist (F15) |
| `/z-eval-update` | keep | unchanged |
| `/z-eval-execute` | keep | calls skill directly (F3) |
| `/z-eval-judge` | keep | calls skill directly (F3) |
| `/z-eval-compare` | keep | drop askQuestion carve-out (F10); calls skill directly (F3) |
| `/z-eval-advise` | keep | calls skill directly (F3) |
| `/z-eval-help` | keep | direct-topic shortcut; config-less-safe (F2, F12) |
| `/z-eval-analyse` | **add** | thin wrapper over `pnpm run eval:analyse` (F9) |
| `/z-eval-start` | **remove** | redirect to `/z-eval-workflow` in rule/docs |
| `/z-eval-jump` | **remove** | redirect to `/z-eval-workflow` in rule/docs |
| `/z-eval-operator` | **remove** | redirect to `/z-eval-workflow` in rule/docs |

**Net:** 13 → 11 (-2). One added (`/z-eval-analyse`), three removed.

### Skills — 8 (-1)

| Skill | Status | Change | Rename target (optional F8) |
|-------|--------|--------|------------------------------|
| `zoto-create-evals` | keep | unchanged | `zoto-eval-create` |
| `zoto-update-evals` | keep | unchanged | `zoto-eval-update` |
| `zoto-execute-evals` | keep | unchanged | `zoto-eval-execute` |
| `zoto-configure-evals` | keep | unchanged | `zoto-eval-configure` |
| `zoto-judge-evals` | keep | unchanged | `zoto-eval-judge-skill` (avoid agent collision) |
| `zoto-compare-evals` | keep | unchanged | `zoto-eval-compare-skill` |
| `zoto-advise-evals` | keep | unchanged | `zoto-eval-advise-skill` |
| `zoto-help-evals` | keep | config-less-safe (F2) | `zoto-eval-help-skill` |
| `zoto-eval-tooling` | **remove** | convert to `rules/zoto-eval-cli.mdc` or `docs/CLI.md` (F11) | n/a |

**Net:** 9 → 8 (-1).

### Agents — 4 (-4)

| Agent | Status | Change |
|-------|--------|--------|
| `zoto-eval-generator` | keep | unchanged (real orchestration) |
| `zoto-eval-updater` | keep | unchanged (real orchestration) |
| `zoto-eval-configurer` | keep | unchanged (real orchestration) |
| `zoto-eval-analyser-subagent` | keep | unchanged (LLM contract) |
| `zoto-eval-comparer` | **remove** | command calls skill directly (F3) |
| `zoto-eval-judge` | **remove** | command calls skill directly (F3) |
| `zoto-eval-adviser` | **remove** | command calls skill directly (F3) |
| `zoto-eval-executor` | **remove** | command calls skill directly (F3) |

**Net:** 8 → 4 (-4).

### Rules — 1 (unchanged) or 2 (with CLI-reference rule)

| Rule | Status | Change |
|------|--------|--------|
| `zoto-eval-system.mdc` | keep | drop `alwaysApply: true`; trim catalogue to 11 commands; soften help-routing prose; one-line init-gate preamble |
| `zoto-eval-cli.mdc` | **add (optional)** | absorbs `zoto-eval-tooling` content if F11 lands as a rule |

### Hooks — 1 (unchanged surface; behaviour fixed per F5)

| Hook | Status | Change |
|------|--------|--------|
| `session-start` | keep | respect `config.skillsRoots`; run actual `eval:update --check` behind marker; configurable thresholds; one banner per session |

### Surface totals

| Layer | Current | Recommended | Δ |
|-------|---------|-------------|----|
| Commands | 13 | 11 | -2 |
| Skills | 9 | 8 | -1 |
| Agents | 8 | 4 | -4 |
| Rules | 1 | 1 (or 2) | 0 (or +1) |
| Hooks | 1 | 1 | 0 |
| **Total** | **32** | **25 (or 26)** | **-7 (or -6)** |

Even with the additive `/z-eval-analyse` and the optional `zoto-eval-cli` rule, the recommended surface is **22% smaller** than today and removes every component that survives as a same-delegation alias or thin wrapper. No user-facing capability is lost — every removed component has its alternative path named in the change column.

---

## Downstream agents

- **`zoto-eval-engineer`** owns F6 (config.json renames), F4 (configurer payload contract changes), F10 (compare askQuestion wiring), F5 (hook behaviour changes), F12 (help skill conditionals), and F3 (command-skill direct invocation if accepted).
- **`zoto-plugin-manager`** owns F1 (command file deletions + rule edits), F11 (skill → rule/docs conversion), F13 (logo packaging), F8 (rename churn if accepted), and marketplace.json sync after the surface shrinks.
- **`zoto-eval-architect`** (this agent) is the right escalation point if any "remove" recommendation lacks team consensus or if F8 (renames) is contentious.

---

*Generated by `zoto-eval-architect` on 2026-05-23 against `/home/andrewv/.cursor/plugins/local/zoto-eval-system/` (authoritative mirror).*
