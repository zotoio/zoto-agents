# Documentation update map — Eval AskQuestion Strategy Bridge

**Subtask:** 03 (docs discovery)  
**Phase 5 owners:** subtask 11 (`site/eval-system/*.html` + SVG), subtask 12 (`README.md`, `zoto-help-evals`, `evals/llm/_shared/README.md`)  
**Spec:** `spec-eval-askquestion-strategy-bridge-20260526.md` (KD-1, KD-8, KD-9)

## Summary

| Metric | Count |
|--------|------:|
| `site/eval-system/*.html` pages enumerated | 4 |
| Flagged HTML sections (strategy / LLM / declarative / code / AskQuestion / help) | **19** |
| README `##` sections mapped | 21 |
| Cross-link impact entries | 14 |
| Planned new files (Phase 5) | 1 (`evals/llm/_shared/README.md`) |

---

## (a) `site/eval-system/index.html`

| Anchor | Lines | Flag? | One-line change (subtask 11) |
|--------|------:|:-----:|------------------------------|
| `#overview` | 86–100 | partial | Keep dual-backend intro; add one sentence that LLM cases may be **declarative JSON or code-strategy TS per target** after analyser classification (not a single global mode). |
| `#when-to-use` | 107–118 | — | No strategy wording; leave unchanged. |
| `#dual-backend` | 120–151 | **yes** | Extend `report.yml` row to mention per-case `backend: declarative\|code` rollup; note hybrid suites can populate both artifact shapes under one run. |
| `#user-confirmation` | 153–168 | **yes** | Clarify figcaption: user-approval flow (existing SVG) is **orthogonal** to eval-time `AskQuestion` simulation via `askquestion-bridge`; link forward to new design subsection. |
| `#meta-generated` | 170–183 | partial | Optional cross-link: classification metadata (`requiresInteraction`) lives in `_meta.primitive_analysis` on stamped cases. |
| `#see-also` | 185–206 | partial | Update Design card blurb to mention strategy bridge + hybrid stamping. |
| External README link | 205 | partial | Anchor still valid; target content changes in subtask 12 (line numbers in citations will shift). |

**Assets:** `eval-askquestion-flow.svg` (161) — see section (e); retain for command/subagent UX, add second diagram or expanded caption for eval harness path (optional subtask 11 follow-up).

---

## (b) `site/eval-system/design.html`

| Anchor | Lines | Flag? | One-line change (subtask 11) |
|--------|------:|:-----:|------------------------------|
| `#lifecycle` | 95–99 | — | Lifecycle diagram unchanged. |
| `#user-confirmation` | 101–107 | partial | Keep gate narrative; distinguish **operator** confirmation from **eval-runner** scripted `AskQuestion`. |
| `#askquestion-plumbing` | 108–122 | **yes** | Keep command-owned `askQuestion` / `needs_user_input` contract; add paragraph + link that **code-strategy evals** simulate the same turns via `evals/llm/_shared/askquestion-bridge.ts` (surface pinned by Phase 1 ADR). |
| `#static-backend` | 124–132 | — | Unchanged. |
| `#llm-backend` | 134–163 | **yes** | **Major rewrite:** replace global `llm.strategy` fork with **analyser-driven per-target routing** (`requiresInteraction` → declarative JSON vs code TS); document `_shared/` helpers including new bridge; default scaffold = declarative, interactive primitives → code + bridge. |
| `#run-outputs` | 165–177 | **yes** | Document `backend:` per row in `report.yml` / case entries; both strategies still write `llm.yml` + merged `report.yml`. |
| `#result-schema` | 179–201 | **yes** | Add example `backend: code` / `backend: declarative` on a sample case row. |
| `#meta-generated` | 203–218 | partial | Mention analyser classification fields in `_meta.primitive_analysis`. |
| `#manifest` | 234–254 | **yes** | Show `eval_files[]` listing **either** `plugins/.../evals.json` **or** `evals/llm/test_*.test.ts` per target (mutual exclusion). |
| `#judge-vs-advise` | 256+ | — | No strategy change. |
| See also / schema links | 297–299 | partial | `result.schema.json` may gain `backend` field — link text unchanged, schema doc must stay in sync (subtask 08/13). |

**Assets:** `eval-askquestion-flow.svg` (120), `eval-run-report.svg` (175), `eval-update-contract.svg` (206).

---

## (c) `site/eval-system/configuration.html`

| Anchor | Lines | Flag? | One-line change (subtask 11) |
|--------|------:|:-----:|------------------------------|
| Intro / legacy path callout | 88–100 | — | Paths unchanged. |
| `#init-template` YAML comment block | 109–161 | **yes** | Reframe `llm.strategy` comment: **default/fallback** for unscaffolded targets and cleanup semantics — **not** “one strategy for entire repo”; per-target backend chosen at stamp time from analyser. |
| `#field-reference` → `#llm-backend` | 184–193 | **yes** | **Major rewrite** of `llm.strategy` and `llm.codeFramework` rows: hybrid coexistence, `codeFramework` applies to all code-strategy targets, `eval:cleanup-stale` removes wrong-backend artefacts on reclassification. |
| `#discovery`, `#static-backend`, env, manifest | 165–253 | partial | `evalsDir` purpose line may mention `evals/llm/` tree alongside `_llm/` declarative runner. |

---

## (d) `site/eval-system/quickstart.html`

| Anchor | Lines | Flag? | One-line change (subtask 11) |
|--------|------:|:-----:|------------------------------|
| `#init` | 100–110 | — | Unchanged. |
| `#configure` | 112–119 | **yes** | Note `llm.strategy` prompt sets **default** only; explain hybrid outcome after `/z-eval-create` / update with analyser. |
| `#create` | 121–135 | **yes** | Bullet list: stamper may write **per-target** `evals.json` and/or `evals/llm/test_*.test.ts`; analyser sets `requiresInteraction`. |
| `#update` | 137–155 | partial | Table OK; footnote that apply-mode may migrate backend shape when classification flips (cleanup_plan). |
| `#execute` | 157–175 | partial | Mention `report.yml` rows include `backend` when both strategies ran in one `--full` pass. |
| `#judge` | 177–194 | partial | `askQuestion` wording stays (command-owned); no bridge detail needed. |
| `#advise` | 196–210 | partial | Interactive breakpoints unchanged. |
| `#compare` | 212–224 | partial | Note comparer can group/filter by `backend` dimension. |
| README link card | 251 | partial | Description should mention Strategy bridge section after subtask 12. |

---

## (e) `site/images/diagrams/eval-askquestion-flow.svg`

### Current contents (summary)

- **Title:** “askQuestion Flow — Command Owns User Interaction”
- **Actors (lifelines):** User (left), Command `/z-eval-*` (centre), Subagent skill/agent (right)
- **Flow (top → bottom):**
  1. User → Command: `/z-eval-configure`
  2. Command → User: `askQuestion("framework?")`
  3. User → Command: answer `"pytest"`
  4. Command → Subagent: `spawn(zoto-eval-configurer, answers)` (pre-collected)
  5. Subagent self-loop: validate + draft `cleanup_plan`
  6. Subagent → Command: `needs_user_input` (red arrow; “subagent NEVER calls askQuestion”)
  7. Command → User: `askQuestion("static.framework?")` → user answer → Command `resume(answers)` → Subagent
- **Footer:** “Skills + agents never call askQuestion. Only commands do.”
- **Does not depict:** analyser, stamper, declarative vs code backends, SDK eval runner, or `report.yml`.

### SVG redraw spec (subtask 11)

**Option A (recommended):** New diagram `eval-strategy-bridge-flow.svg` for the harness path; keep existing SVG for operator UX.

**Option B:** Expand viewBox and add a lower “eval harness” band in the same file.

**Required nodes and directed edges (left → right pipeline):**

```
Analyser (zoto-eval-analyser-subagent)
  → emits requiresInteraction (+ optional interactionStyle)
Classification flag (per target)
  → Stamper (eval-stamp / update apply)
  → branch:
       [requiresInteraction: false] → Declarative JSON (plugins/*/evals/**/evals.json)
       [requiresInteraction: true]  → Code-strategy TS (evals/llm/test_*.test.ts)
  → Code branch only: askquestion-bridge.ts (wraps sdk-bridge.ts)
  → @cursor/sdk Agent.run
  → zoto-llm-reporter / writer
  → report.yml row annotated backend: declarative|code
```

**Visual conventions:** Match existing matrix theme (`#000000` bg, `#00ff7f` accent arrows, monospace step labels). Label the bridge box with file path `evals/llm/_shared/askquestion-bridge.ts`. Annotate declarative path with `pnpm run eval:llm:declarative` and code path with `pnpm run eval:llm:code` (both may run in one `--full` execute).

**Alt text / figcaption** on embedding pages must distinguish operator flow (existing SVG) from eval simulation flow (new/redrawn SVG).

---

## (f) `plugins/zoto-eval-system/README.md` — every `##` section

| `##` section | Lines (approx.) | Change summary (subtask 12) |
|--------------|----------------:|-----------------------------|
| Overview | 9–18 | Add hybrid one-liner: analyser picks backend per target; link to new Strategy bridge section. |
| Migration from current state | 20–30 | Item 3: reword “strategy mutually exclusive” → **per-target backends coexist**; global `llm.strategy` is default/cleanup only. |
| Quick start | 32–50 | `/z-eval-help` menu gains Strategy bridge topic; no command list change. |
| Configuration | 52–75 | Rewrite `llm.strategy` / `llm.codeFramework` table rows to match configuration.html semantics. |
| File layout and run outputs | 77–87 | Document `backend:` on `report.yml` rows. |
| Run retention and cleanup | 89–115 | `eval:cleanup-stale` removes **wrong-backend** artefacts per target, not whole-repo strategy flip only. |
| Lifecycle walk-through | 117–145 | Create/Update bullets: analyser classification + dual artifact shapes. |
| Static backend (pytest) | 147–156 | Unchanged. |
| LLM backend (@cursor/sdk) | 158–192 | Split global strategy sentence into per-target routing; pointer to Strategy bridge section. |
| **LLM eval strategies (declarative + code)** | 194–264 | **Major rewrite:** rename/reframe as hybrid model; replace “mutually exclusive repo-wide” with per-target table; update playbook to analyser-driven rules (`requiresInteraction`); refresh examples (configure/create/help → code+bridge). |
| Updating evals when code changes | 266–348 | Note stamp path dispatches by classification; migration may move targets between JSON and TS. |
| Result schema | 350–379 | Add `backend` field to documented YAML shapes. |
| Run logs | 381–383 | Unchanged. |
| Comparing runs (`/canvas` hand-off) | 385–394 | Document `backend` as comparer dimension. |
| Judge & soft metrics | 396–405 | Unchanged (askQuestion handoff stays command-owned). |
| Adviser — pre-hoc coverage gap analysis | 407–443 | Unchanged. |
| Manual checklists | 445–447 | Unchanged. |
| CI integration | 449–462 | Mention hybrid collect-only may list both `eval:llm:declarative` and `eval:llm:code`. |
| Troubleshooting | 464–470 | Add symptom: wrong backend artefact / mixed strategy confusion → `eval:cleanup-stale`. |
| Development | 472–496 | Link `evals/llm/_shared/README.md`. |
| License | 498+ | Unchanged. |

**New README section (subtask 12):** `## Strategy bridge (AskQuestion eval simulation)` — analyser flag, stamper routing, `askquestion-bridge.ts` import pattern, `follow_ups[]` deprecation for interactive cases, ADR link `specs/20260526-eval-askquestion-strategy-bridge/audit/sdk-askquestion-adr.md`.

---

## (g) Planned `evals/llm/_shared/README.md` (outline only — subtask 12)

1. **Purpose** — Single import surface for code-strategy LLM evals; SDK changes patch one bridge layer.
2. **Import rules** — Stamped `test_*.test.ts` import only from `./_shared/*` and `#eval-engine/*`; never duplicate SDK imports.
3. **Module catalogue**
   - `sdk-bridge.ts` — `createAgent`, `sendPrompt`, `awaitRun`, token pinning
   - `askquestion-bridge.ts` **[NEW]** — scripted `AskQuestion` / tool interception (ADR surface)
   - `run-code-strategy-suite.ts` — `defineLlmCodeEval`, opt-in interactive path
   - `code-strategy-case.ts` — case shape, interaction expectations
   - `zoto-llm-reporter.ts` — `reportCase`, `flush`, `backend` annotation
   - `sandbox-helpers.ts`, `setup.ts`, `_user-case-guards.ts`
   - `graders/*` — re-exports / thin wrappers
4. **Consumer map** — Mirror `sdk-bridge.ts` JSDoc list; add bridge consumers (stamped tests, suite harness).
5. **Interaction case authoring** — When to set `requiresInteraction` in analyser payload vs case `follow_ups`; bridge vs synthetic follow-up (legacy).
6. **Barrel / re-export policy** — All helpers exported through one index for template stability.
7. **Related docs** — Plugin README Strategy bridge section, `site/eval-system/design.html#llm-backend`.

---

## (h) `plugins/zoto-eval-system/skills/zoto-help-evals/SKILL.md` — anchor tables

### Step 3 — Section anchor → signals (verbatim + proposed row)

| Section anchor | Signals to read |
|---|---|
| Overview, Quick start | `.zoto/eval-system/config.yml` (presence), `.zoto/eval-system/manifest.yml` (presence), `package.json` (`scripts.eval*`) |
| Configuration | `.zoto/eval-system/config.yml` (full), `templates/schema/config.schema.json` for field reference |
| Static backend | `config.json` → `static.framework`, host repo's `evalsDir` contents |
| LLM backend (`@cursor/sdk`) | `config.json` → `llm.*`, `.env.example`, `.env` (presence only — never read secret values from `.env`), `package.json` devDeps for `@cursor/sdk`, `dotenv` |
| Updating evals | `manifest.yml` → `discovery_config`, `targets[]`; `manifest.history.yml` (last entry) |
| Result schema | latest `evals/_runs/<run-id>/report.yml` and per-backend `static.yml` / `llm.yml` if any |
| Run logs | `evals/_runs/` directory listing; latest `<run-id>/logs/` |
| Comparing runs | last 2 entries under `evals/_runs/` |
| Judge & soft metrics | `config.json` → `judgeModel`, latest `llm.yml` |
| CI integration | `.github/workflows/*.yml` if present, host `package.json` scripts |
| Troubleshooting | whichever signals match the symptom in `user_question` |
| **[NEW] Strategy bridge** | `.zoto/eval-system/config.yml` → `llm.strategy`, `llm.codeFramework`; `manifest.yml` → per-target `eval_files[]` (JSON vs `evals/llm/test_*.test.ts`); latest `report.yml` per-case `backend:`; presence of `evals/llm/_shared/askquestion-bridge.ts`; cached analyser payloads under `.zoto/eval-system/cache/analyser/` for `requiresInteraction` |

### Step 1 menu implication

`/z-eval-help` command builds the numbered picker from README `##` headers (Step 1). Subtask 12 must add **Strategy bridge** header so it appears in the menu and in `z-eval-help` eval cases.

### Citation examples in skill (lines 106–114)

Update example block line numbers after README insert; anti-patterns unchanged.

---

## Cross-link impact list (re-resolve in subtasks 11 / 12)

| Source file | Lines | Target / pattern | Broken-link risk | Action |
|-------------|------:|------------------|------------------|--------|
| `site/eval-system/index.html` | 205 | `github.com/.../plugins/zoto-eval-system/README.md` | **Medium** — README section order/length changes | Re-verify link lands on repo root README; no anchor in URL today. |
| `site/eval-system/design.html` | 297–299 | README + `config.schema.json` + `result.schema.json` | **Medium** for result schema if `backend` added | Confirm schema URLs; update design prose if field added. |
| `site/eval-system/configuration.html` | 90 | `config.schema.json` | Low | Align `llm.strategy` description with schema `description` strings (subtask 04/08). |
| `site/eval-system/quickstart.html` | 251 | README | Low | Update link-card blurb only. |
| `site/eval-system/*.html` | nav | `../spec-system/*.html` | None | Bidirectional nav only (see `docs-spec-system-impact.md`). |
| `site/eval-system/index.html` | 161 | `../images/diagrams/eval-askquestion-flow.svg` | Low | Alt text may need split if second SVG added. |
| `site/eval-system/design.html` | 120 | same SVG | Low | Same as above. |
| `plugins/zoto-eval-system/skills/zoto-help-evals/SKILL.md` | 76–78, 108–110 | `start:end:plugins/zoto-eval-system/README.md` | **High** — line numbers in skill evals + skill body | Re-read README after edit; restamp help evals if citations embedded in cases. |
| `plugins/zoto-eval-system/skills/zoto-help-evals/evals/evals.json` | multiple | `LLM backend`, `Configuration` anchors | **High** | Cases assert line-specific citations; run `eval:update` on help skill after README change. |
| `plugins/zoto-eval-system/README.md` | 221 | `evals/llm/_shared/` (sdk-bridge list) | **Medium** | Add `askquestion-bridge.ts`; new `_shared/README.md` link. |
| `evals/llm/_shared/sdk-bridge.ts` | 1–48 | JSDoc consumer list | **Medium** | Add bridge module to consumer list when created (subtask 05). |
| `site/eval-system/design.html` | 248–254 | `evals/evals.json` path example | Low | May show `evals/llm/test_*.test.ts` for interactive target instead. |
| `site/spec-system/*.html` | 42–47 | `../eval-system/index.html` (+ children) | None | Nav-only; no content sync required. |
| Phase 3 code (not edited in subtask 03) | TBD | `12:14:evals/llm/_shared/sdk-bridge.ts` style cites in docs/evals | **High** after bridge land | Grep repo for `evals/llm/_shared` line citations post-migration; refresh in subtask 12. |

---

## Flagged section count (for executor reporting)

| Surface | Flagged sections |
|---------|-----------------:|
| `index.html` | 4 |
| `design.html` | 6 |
| `configuration.html` | 2 |
| `quickstart.html` | 5 |
| SVG redraw spec | 1 (artefact) |
| README `##` sections needing edits | 15 of 21 (6 unchanged/minor) |
| Help skill Step 3 row | 1 **[NEW]** |
| **Total HTML+SVG flagged** | **19** |

---

## Phase 5 — Subtask 11 completion (20260526)

| Surface | Status | Notes |
|---------|--------|-------|
| `site/eval-system/index.html` | done | Strategy bridge section, dual-backend `backend:` row, orthogonal operator vs eval AskQuestion |
| `site/eval-system/design.html` | done | Full analyser → stamper → bridge → SDK → report flow; `interaction_style` annotation |
| `site/eval-system/configuration.html` | done | `llm.strategy` reframed as fallback default; hybrid per-target semantics |
| `site/eval-system/quickstart.html` | done | "What gets stamped where?" callout; hybrid create/update/execute/compare notes |
| `site/images/diagrams/eval-askquestion-flow.svg` | done | Regenerated as strategy-bridge pipeline with `<title>` + `<desc>` |
| `site/spec-system/*.html` cross-link audit | done | Nav links verified; no content edits required per `docs-spec-system-impact.md` |
| HTML markup smoke check | done | Tag-balance script passed on all four eval-system pages |

*Completed by subtask 11 — 20260526.*

---

*Generated by subtask 03 fix round — 20260526.*
