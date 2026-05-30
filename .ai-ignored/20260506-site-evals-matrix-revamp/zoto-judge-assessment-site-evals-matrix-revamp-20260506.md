# Assessment: site-evals-matrix-revamp (Spec) — second adversarial pass

- **Spec**: `specs/20260506-site-evals-matrix-revamp/spec-site-evals-matrix-revamp-20260506.md`
- **Status at review**: Ready for Execution (post-fix)
- **Reviewer**: zoto-spec-judge (independent, fresh context)
- **Reviewed**: 20260506 (second pass — supersedes the first-pass section retained at the bottom)
- **Mode**: Spec assessment + fix application (Mode 3)

## Verdict (post-fix)

**Approve** — proceed to `/zoto-spec-execute`. Three new findings from this fresh pass were applied directly to the spec; none are blocking. The spec is internally consistent, the dependency graph resolves with no cycles, parallel-phase widths fit `spec.parallelLimit = 4`, every subtask is assigned to a CRUX agent (no `generalPurpose`), and every Definition-of-Done line is covered by at least one subtask deliverable.

## Score (post-fix)

| Dimension              | Score | Notes |
|------------------------|-------|-------|
| Completeness           | 4.5 / 5 | Every user-stated requirement (eval-system docs, Matrix theme, copy revamp, validation, no-framework rule, CRUX guard) maps to one or more subtasks with explicit deliverables. The `--charcoal-*` migration path is now explicitly owned end-to-end (subtask 02). |
| Feasibility            | 4.5 / 5 | Each subtask is scoped to one CRUX agent with a concrete file list. Lighthouse mobile gate now has a clean three-band block / warn / clean structure that produces an actionable verdict rather than a pendulum block. |
| Structure              | 4.5 / 5 | Subtask Manifest, dependency graph, and Execution Order are internally consistent; the Mermaid graph matches the manifest table; phase widths fit `parallelLimit = 4`. |
| Specificity            | 4.5 / 5 | Deliverables are file- and selector-level precise; the new `--charcoal-*` migration deliverable in subtask 02 names the inline override block, the consumers, and the `git grep` exit criterion. |
| Risk Awareness         | 4.5 / 5 | Mobile perf, contrast, mid-restyle visual breakage, README drift, marketplace churn, and Pages-publish risk are all itemised. The "spec-system pages look broken mid-restyle" risk is downgraded from Medium to Low to reflect that the alias bridge was fictive — only the inline `site/index.html` block migrates. |
| Convention Compliance  | 4.5 / 5 | `.zoto/eval-system/` workspace path enforced everywhere; no JS framework; CRUX guard called out at spec, subtask, and DoD level; all subtasks point at CRUX agents per `AGENTS.md`. |
| **Aggregate**          | **4.5 / 5** | Up from 4.33 / 5 first-pass after three additional fixes. Comfortably clears the 4.0 Approve threshold. |

## Independent Verification Performed

- **Status-pair round-trip**: ran `pnpm exec tsx plugins/zoto-spec-system/scripts/spec-status-roundtrip.ts validate --spec-dir specs/20260506-site-evals-matrix-revamp` (exit 0) plus a parallel script that compared every subtask's `## Deliverables Checklist` to its `status/*.status.yml` `checklist[].text` — all eight subtasks report MATCH after re-scaffold.
- **onStop consistency check**: ran `pnpm exec tsx plugins/zoto-spec-system/scripts/spec-onstop-check.ts --human --spec-dir specs/20260506-site-evals-matrix-revamp --repo-root .` → `checked=9 fixes=0 critical=0 warn=0 info=0` (exit 0) after fixes.
- **Token system audit**: `grep -n 'charcoal\|color-bg\|color-text\|--matrix' site/css/style.css` confirms the live tokens in `style.css` are `--color-*` semantic names (`--color-bg-primary`, `--color-text-primary`, etc.) — there is no `--charcoal-*` block in `style.css` today. The `--charcoal-*` declarations only exist as inline overrides under `body.landing-charcoal` inside `site/index.html` (`grep -in 'charcoal' site/`).
- **Flagship audit**: `git grep -in -E 'flagship|primary plugin|main plugin|the only plugin' -- ':!specs/' ':!.zoto*/'` returns exactly one hit: `site/index.html:420: <h2 class="section-heading">Flagship Plugin</h2>`. Subtask 02 D01 removes this. No occurrences exist in either plugin README, top-level `README.md`, `AGENTS.md`, or `.cursor-plugin/marketplace.json`.
- **Workspace path discipline**: `grep -i '\.zoto-eval-system\|\.zoto/eval-system' -r site/ specs/.../site-evals-matrix-revamp/ plugins/zoto-eval-system/` shows only one `.zoto-eval-system/` mention in `subtask-05-...md` (the migration note explaining the legacy path is no longer supported). All operative paths use `.zoto/eval-system/`.
- **CRUX-generated guard**: `grep -iIn 'generated:|sourceChecksum|sourceUrl|Generated file - do not edit'` over the editable surfaces (`README.md`, `AGENTS.md`, `plugins/*/README.md`, `plugins/*/CHANGELOG.md`, `.cursor-plugin/marketplace.json`) returns one hit at `plugins/zoto-eval-system/README.md:206: generated: true` — verified to be inside a fenced YAML code block (illustrating the eval-case `_meta.generated` contract), not actual frontmatter. No editable file in scope is CRUX-generated. ✓
- **GitHub Pages workflow**: confirmed `.github/workflows/deploy-pages.yml` triggers on `paths: ["site/**"]` and pins `actions/configure-pages@v5`, `actions/upload-pages-artifact@v3`, `actions/deploy-pages@v4` (matches subtask 08).
- **Site image inventory**: `site/images/diagrams/` has four existing diagrams; `site/images/mockups/` has four existing mockups. Subtask 04 ships eight new files (4 + 4) without filename collisions.
- **Eval-system plugin docs sub-tree**: confirmed `plugins/zoto-eval-system/docs/` does NOT exist (subtask 05's note is accurate). The eight commands, eight agents, and nine skills referenced by subtask 05 are all present under `plugins/zoto-eval-system/{commands,agents,skills}/`.
- **Round-trip drift on un-touched subtasks**: subtasks 04, 05, 06, 08 already had matching `.status.yml` ↔ subtask deliverables before this pass. Subtasks 01, 02, 03, 07 were intentionally regenerated after the fixes were applied.

## Findings (3 new, post-first-pass)

### N1. [MEDIUM] `--charcoal-*` alias-bridge plan was misaligned with where the tokens actually live

**What the spec said pre-fix**: subtask 01 D01 instructed "Keep `--charcoal-*` properties present and aliased to the new Matrix tokens (`--charcoal-bg: var(--matrix-bg);` etc.) so subtask 03 has a one-step migration path", and subtask 03 D03 instructed "remove the alias block introduced in subtask 01" from `site/css/style.css`.

**What I verified on disk**:
- `site/css/style.css` has **no** `--charcoal-*` tokens today. Its semantic palette is `--color-bg-primary`, `--color-text-primary`, `--color-bg-secondary`, etc.
- The four `site/spec-system/*.html` pages use **no** `--charcoal-*` references — they consume the `--color-*` tokens via `style.css` (`grep -i 'charcoal\|matrix-' site/spec-system/*.html` is empty).
- The **only** `--charcoal-*` consumers in the entire `site/` tree are the inline `<style>` block in `site/index.html` under `body.landing-charcoal { --charcoal-bg: …; --charcoal-surface: …; --charcoal-text: …; … }` (lines 32–47) and its surrounding rule selectors (lines 97–206).

So the alias-in-`style.css` plan accomplished nothing (no consumers), and the alias-removal step in subtask 03 was also a no-op. The actual tokens that need migrating live inside `site/index.html` and are owned by subtask 02's landing-page rewrite — but subtask 02 did not enumerate the migration.

**Severity**: MEDIUM. Execution would still complete because subtask 02 owns the landing-page rewrite (so the inline override would either be removed or overwritten organically), but the asymmetry between the spec's "alias bridge" claim and reality could mislead the subtask 01 executor into adding a vestigial alias block, and could leave subtask 03 confused about what to remove.

**Fix applied**:
- Subtask 01 D01 now reads "add a `--matrix-*` custom-property block at the top of `:root`. The existing `--color-*` semantic tokens are reassigned to the Matrix palette so every consumer of the semantic tokens picks up the new look without a rename. **Do not** add a `--charcoal-*` alias block in `site/css/style.css` — the only `--charcoal-*` consumers in the repo are inline in `site/index.html` (under `body.landing-charcoal`), and subtask 02 owns that migration directly."
- Subtask 01 DoD reflects the same: no alias block is introduced.
- Subtask 02 has a new explicit deliverable D13 (**Inline `--charcoal-*` migration**) naming the inline block, the consumer rules to update, the option to keep or rename `landing-charcoal` as a structural hook, and a `git grep -i 'charcoal' site/` exit criterion.
- Subtask 02 DoD adds `grep -n -i 'charcoal' site/index.html site/404.html` returns no matches.
- Subtask 03 D03 is now a **verification sweep** — `git grep -i 'charcoal' site/` returns no matches, and any straggler is fixed in place. Subtask 03 DoD mirrors the same exit.
- Spec index Decision #4 is rewritten to acknowledge the inline-only nature.
- Spec index Risk Assessment row "Spec-system pages look broken mid-restyle (token rename)" downgraded from Medium to Low likelihood; mitigation rewritten to reflect the new architecture.
- Spec index Subtask Manifest "Serialisation note" is rewritten — the S02 → S03 dep is retained as defensive serialisation against any residual concurrent write to `style.css`, even though subtask 03 should not write `style.css` after this re-architecture.
- Spec index Phase 3 Execution Order row for subtask 03 changed from "remove the `--charcoal-*` alias from `style.css`" to "verify (sweep) no `--charcoal-*` references remain anywhere in `site/`".

### N2. [LOW] Subtask 06 D02 / D03 "sweep for ... none should remain" wording inflates the perceived diff

**Pre-fix wording**: subtask 06 deliverables 2 and 3 said "sweep for 'flagship', 'primary plugin', or 'the only plugin' wording — none should remain." The first-pass review tightened the **Implementation Notes** for the same intent (Finding #4 in the first-pass section), but the deliverable lines themselves still used the "sweep" verb.

**Independent verification**: `git grep -in -E 'flagship|primary plugin|main plugin|only plugin' plugins/zoto-spec-system/README.md plugins/zoto-eval-system/README.md` returns **zero hits**. The defensive sweep is healthy but the deliverable verb implies an active search-and-replace where there is nothing to replace, inflating the perceived diff.

**Severity**: LOW. Cosmetic — only affects how the executor scopes the README diff.

**Fix applied**: subtask 06 D02 and D03 are rewritten to "verify (via `git grep -in '...'` against the specific README) that no occurrences exist — current state is already zero, so this is a defensive check, not a search-and-replace." The actual voice-pass deliverables (sharpen opening 1–3 paragraphs, sharpen "When to use this vs Plan mode" intro, sharpen "Migration from current state" intro) remain intact and are now the dominant signal in each deliverable.

### N3. [LOW] Subtask 07 D08 mobile Lighthouse threshold confused "block" and "warn"

**Pre-fix wording**: "Lighthouse Performance score **< 75** on mobile blocks this subtask. … If the score is between 70 and 75, add a recommendation back to subtask 01 to reduce canvas DPR / glyph density on mobile."

That logic produces a non-actionable verdict path: a score of 72 simultaneously **blocks** and **recommends an optimisation** to subtask 01 — but subtask 01 has already completed by Phase 5, so the recommendation has nowhere to land within the spec. The integrity-expert is left with no path forward.

**Severity**: LOW (the spec would still work — the executor would manually route the recommendation back to a follow-up — but the wording is a small step away from cleanly actionable).

**Fix applied**: subtask 07 D08 is rewritten as a clean three-band rule:
- **< 70 mobile Performance** → blocks this subtask;
- **70–74 mobile Performance** → does **not** block; records a `warn` finding plus a structured recommendation in the findings file, and adds the same recommendation to the judge `fix_list` so the executor can route it back to subtask 01 if a follow-up pass is desired;
- **≥ 75 mobile Performance** → clean pass.
Subtask 07 DoD line for Lighthouse is updated to mirror the three-band rule. Spec index Phase 5 Execution Order row for subtask 07 also reflects the updated band.

## What the Spec Gets Right (Worth Preserving)

- **Two-card peer billing** decision is well-defended — Decision 1 explains why no template engine is introduced; mitigation is centralising tokens in `style.css` + behaviour in `js/main.js`.
- **Reduced-motion gating** is double-fenced in subtask 01: matchMedia at startup, matchMedia `change` listener, and the canvas opacity falls back to zero so even JS-off readers see no rain artifact. Subtask 07 D04 then verifies the behaviour empirically.
- **CRUX guard** is enumerated at the spec level (Requirement 9), subtask 06 D06, and DoD level. Defence in depth.
- **Workspace-path discipline**: every reference to plugin config / manifests / caches reads `.zoto/eval-system/` per `.cursor/rules/zoto-plugin-conventions.mdc`. The single legacy mention in subtask 05 is the migration note, which is correct.
- **Subagent allocation** correctly uses CRUX agents from `AGENTS.md`: `crux-software-engineer` for visual / structural code (01, 02, 03, 04, 08), `crux-platform-architect` for content (05, 06), `integrity-expert` for adversarial accessibility / link / perf verification (07). No `generalPurpose` defaults.
- **Sitemap phasing**: `robots.txt` already references `https://zotoio.github.io/zoto-agents/sitemap.xml`. Subtask 08 creates the file after all pages exist, so sitemap entries do not point at not-yet-built pages.
- **Status-pair / round-trip discipline**: every subtask's status YML is faithful to its source markdown after the scaffold (verified via the round-trip helper and the cross-check script).

## Subtask Manifest Cross-Check (post-fix)

| ID | Manifest deps | Graph edges in | Match |
|----|---------------|----------------|-------|
| 01 | — | (root) | ✓ |
| 02 | 01 | 01→02 | ✓ |
| 03 | 01, 02 | 01→03, 02→03 | ✓ |
| 04 | 01 | 01→04 | ✓ |
| 05 | 01, 04 | 01→05, 04→05 | ✓ |
| 06 | 02, 05 | 02→06, 05→06 | ✓ |
| 07 | 02, 03, 05, 06 | 02→07, 03→07, 05→07, 06→07 | ✓ |
| 08 | 02, 03, 05, 06 | 02→08, 03→08, 05→08, 06→08 | ✓ |

No cycles. No missing edges. Phase widths: P1=1, P2=2, P3=2, P4=1, P5=2 — all within `spec.parallelLimit = 4`.

## Risk-Coverage Cross-Check vs User Brief

| User-stated risk axis | Spec coverage |
|------------------------|---------------|
| Missing or wrong dependency edges | Verified: every manifest dep is in the graph; the S02 → S03 edge is preserved as defensive serialisation. |
| Subtasks assigned to `generalPurpose` instead of CRUX agents | Audited: zero `generalPurpose`; all match `AGENTS.md` table. |
| DoD items not verified by any deliverable / exit criterion | Audited: every DoD line maps to ≥1 subtask deliverable (table below). |
| `prefers-reduced-motion` / WCAG AA contrast claims without verification steps | Subtask 01 D05 implements; subtask 07 D03 / D04 verify. |
| Performance / Lighthouse / canvas-rain perf without measurement | Subtask 01 sets the perf characteristics (30 fps cap, low DPR on mobile, density reduction). Subtask 07 D08 measures with the new three-band rule. |
| Edits to CRUX-generated files | Spec Requirement 9 + subtask 06 D06 + DoD #7 forbid. Repo audit confirms no editable file in scope is CRUX-generated. |
| Eval-system docs paths still pointing at legacy `.zoto-eval-system/` | Audited: only one mention exists, and it is the explicit migration note in subtask 05. |
| "Flagship" surviving anywhere | Audited: only one occurrence in `site/index.html:420`; subtask 02 D01 removes it; subtask 06 D07 verifies the broader inventory. |
| Status YAML/MD pair drift | Audited: all eight pairs MATCH after re-scaffold. |
| Copy/voice changes risking technical accuracy in plugin READMEs | Subtask 06 D02 / D03 explicitly bound the diff to opening paragraphs / framing intros and forbid changes to commands / paths / schemas. |
| Site preview / Pages publish workflow | Subtask 08 D02 reviews `.github/workflows/deploy-pages.yml`; D03 records a smoke-test result; D04 ships the sitemap. |
| Parallelism > `spec.parallelLimit` | Phase 1=1, P2=2, P3=2, P4=1, P5=2 — all within 4. |

## Definition-of-Done Alignment (post-fix)

| DoD line | Covering subtask deliverables |
|---|---|
| Equal billing, no flagship | Subtask 02 D01, D14; Subtask 06 D04, D07 |
| `site/eval-system/{index,quickstart,configuration,design}.html` exist | Subtask 05 D01–D04 |
| Matrix theme + reduced-motion + WCAG AA | Subtask 01 D03, D05; Subtask 07 D03, D04, D08 |
| Hero / section copy rewrite | Subtask 02 D03, D06; Subtask 06 voice pass |
| Marketplace + READMEs consistent | Subtask 06 D01, D02, D03, D04 |
| linkinator + pa11y + Pages publishes | Subtask 07 D01–D08; Subtask 08 D02, D03, D04 |
| No CRUX-generated files edited | Spec Requirement 9; Subtask 06 D06 |
| All eval-system paths read `.zoto/eval-system/` | Subtask 05 D09 |
| No JS framework / no plugin source change | Subtask 05 final DoD line; subtask-level "no new build step" notes throughout |

No DoD item is unmotivated. No user requirement lacks a DoD bullet.

## Pre-existing Repo Caveats (Out of Scope; Surfaced for Visibility)

- **Missing CRUX agent definitions on disk**: `AGENTS.md` lists `crux-platform-architect`, `crux-software-engineer`, `integrity-expert`, `docs-sync-agent` at `.cursor/agents/<name>.md`, but only `.cursor/agents/{crux-cursor-memory-manager,crux-cursor-rule-manager,zoto-plugin-manager}.md` exist on disk. Other specs in this repo (`20260506-eval-adviser`, `20260506-command-prefix-shortening`, `20260506-spec-system-live-status`) use the same agent names and presumably executed, so the executor's `Task` subagent_type resolution must already accommodate this gap — but it is worth noting that this spec is not the place to introduce the missing agent definitions.
- **`extractDeliverablesTexts` truncates nested bullets**: subtask 01 D05 (`site/js/matrix-rain.js`) describes the IIFE behaviour as nested sub-bullets. The round-trip helper captures only the leading line ("A self-contained IIFE that:") into `.status.yml`. Executors must read the full subtask `.md` for the IIFE behaviour list. This is a tooling property of `spec-status-roundtrip.ts` (lines 387–390), not a spec defect.

Both items are noted but **not fixed** in this assessment — they are properties of the surrounding tooling / repo state, not the spec under review.

## Fixes Applied (this pass)

| # | File | Change |
|---|------|--------|
| 1 | `subtask-01-...-theme-foundations-20260506.md` | D01 rewritten: drop the `--charcoal-*` alias-in-`style.css` plan; instead reassign existing `--color-*` semantic tokens to the Matrix palette. |
| 2 | `subtask-01-...-theme-foundations-20260506.md` | DoD lines updated to reflect "no alias block in `style.css`" and removal of `var(--charcoal-*)` consumer language. |
| 3 | `subtask-02-...-landing-revamp-20260506.md` | New deliverable D13 — explicit migration of the inline `body.landing-charcoal` `--charcoal-*` overrides in `site/index.html` to `--matrix-*` / `--color-*` with a `git grep -i 'charcoal' site/` exit criterion. |
| 4 | `subtask-02-...-landing-revamp-20260506.md` | DoD line added: `grep -n -i 'charcoal' site/index.html site/404.html` returns no matches. |
| 5 | `subtask-02-...-landing-revamp-20260506.md` | Implementation Notes — replaced the "Keep `body class="landing-charcoal"` for now" line with the migration option set (rename / drop / read-from-cascade). |
| 6 | `subtask-02-...-landing-revamp-20260506.md` | D02 / D03 — voice-pass deliverables for the two plugin READMEs reframed from "sweep for ... none should remain" to "verify via `git grep` that no occurrences exist — defensive check, not search-and-replace". |
| 7 | `subtask-03-...-spec-system-restyle-20260506.md` | D03 rewritten as a verification sweep (`git grep -i 'charcoal' site/`) rather than an alias-block removal. |
| 8 | `subtask-03-...-spec-system-restyle-20260506.md` | DoD line updated: `git grep -i 'charcoal' site/` returns no matches across the whole `site/` tree. |
| 9 | `subtask-03-...-spec-system-restyle-20260506.md` | D01 inline-`<style>` sub-bullet annotated "(none expected today — verify with `grep`)". |
| 10 | `subtask-03-...-spec-system-restyle-20260506.md` | Implementation Notes rewritten to explain the new role of the S02 → S03 dependency (defensive serialisation) and the verification-only nature of the charcoal sweep. |
| 11 | `subtask-06-...-copy-polish-20260506.md` | D02 / D03 reframed from "sweep for" to "verify via `git grep`". |
| 12 | `subtask-07-...-accessibility-perf-links-20260506.md` | D08 rewritten with the clean `< 70 blocks / 70–74 warn / ≥ 75 clean` three-band rule. |
| 13 | `subtask-07-...-accessibility-perf-links-20260506.md` | DoD Lighthouse line rewritten to match the three-band rule. |
| 14 | `spec-site-evals-matrix-revamp-20260506.md` | Decision #4 rewritten — drop alias-bridge framing; describe `--color-*` reassignment + inline-block migration. |
| 15 | `spec-site-evals-matrix-revamp-20260506.md` | Risk Assessment row "Spec-system pages look broken mid-restyle" downgraded Medium → Low and the mitigation rewritten. |
| 16 | `spec-site-evals-matrix-revamp-20260506.md` | Subtask Manifest "Serialisation note" rewritten — explains the S02 → S03 dep as defensive serialisation now that subtask 03 D03 is a verification sweep. |
| 17 | `spec-site-evals-matrix-revamp-20260506.md` | Phase 3 Execution Order row for subtask 03 — "remove alias from `style.css`" → "verify (sweep) no `--charcoal-*` references remain anywhere in `site/`". |
| 18 | `spec-site-evals-matrix-revamp-20260506.md` | Phase 5 Execution Order row for subtask 07 — Lighthouse target description updated to the three-band rule. |
| 19 | `spec-site-evals-matrix-revamp-20260506.md` | Status header refreshed to **Ready for Execution**; the second-pass judge verdict line records all three new fixes, alongside the preserved first-pass verdict. |
| 20 | `status/subtask-01-...status.{yml,md}` | Re-scaffolded from the rewritten subtask file (was 11 items; still 11 — text content updated). |
| 21 | `status/subtask-02-...status.{yml,md}` | Re-scaffolded from the rewritten subtask file (was 13 items; now 14 — new D13 inline `--charcoal-*` migration; original last item promoted to D14). |
| 22 | `status/subtask-03-...status.{yml,md}` | Re-scaffolded from the rewritten subtask file (5 items; D03 text content updated). |
| 23 | `status/subtask-07-...status.{yml,md}` | Re-scaffolded from the rewritten subtask file (10 items; D08 text content updated). |
| 24 | `status/subtask-{04,05,06,08}-...status.{yml,md}` | Untouched (already MATCH — no subtask edits in this pass). |

Round-trip verification (post-fix): all eight `.status.{md,yml}` pairs MATCH their source subtask `.md` (`node /tmp/check-status-drift.mjs`). `spec-onstop-check.ts --human` reports `checked=9 fixes=0 critical=0 warn=0 info=0`.

---

## First-Pass Section (preserved verbatim from previous review for traceability)

> The text below was the first-pass assessment. Findings #1–#6 from that pass were applied to the spec before this second-pass review began, and were independently re-verified during the second-pass independent verification above.

### First-pass Verdict

**Approve** — proceed to execution. Six findings are surfaced below; all are non-blocking refinements that would improve execution determinism. None require redesign.

### First-pass Score

| Dimension              | Score | Notes |
|------------------------|-------|-------|
| Completeness           | 4.5 / 5 | Every user-stated requirement (eval-system docs, Matrix theme, copy revamp, validation, no-framework rule, CRUX guard) maps to one or more subtasks with explicit deliverables. |
| Feasibility            | 4.0 / 5 | Each subtask is scoped to one CRUX agent with a concrete file list; minor concerns are the Lighthouse mobile threshold and a Phase 2 parallel-write coordination risk on `site/css/style.css`. |
| Structure              | 4.5 / 5 | Subtask Manifest, dependency graph, and Execution Order are internally consistent; the Mermaid graph matches the manifest table. |
| Specificity            | 4.0 / 5 | Most deliverables are file- and selector-level precise; a few items (`#plugins` anchor, glyph alphabet, SVG palette mapping) underspecified. |
| Risk Awareness         | 4.5 / 5 | Mobile perf, contrast, mid-restyle visual breakage, README drift, marketplace churn, and Pages-publish risk are all itemised with concrete mitigations. |
| Convention Compliance  | 4.5 / 5 | `.zoto/eval-system/` workspace path enforced everywhere; no JS framework; CRUX guard called out at spec, subtask, and DoD level. |
| **Aggregate**          | **4.33 / 5** | Comfortably clears the 4.0 Approve threshold. |

### First-pass Findings (6, applied)

1. **[MEDIUM] Phase 2 parallel writes to `site/css/style.css` lack a serialisation edge** — addressed by adding the S02 → S03 dependency edge and the Subtask Manifest "Serialisation note".
2. **[MEDIUM] Subtask 01 glyph-alphabet note contradicts itself** — addressed by rewriting the glyph note as UTF-8 + half-width katakana with explicit "do not call this 'ASCII-safe'" guidance.
3. **[LOW] Subtask 02 hero CTA targets `#plugins` but no deliverable adds the anchor** — addressed by promoting `id="plugins"` into the plugin-grid deliverable.
4. **[LOW] Subtask 06 "flagship sweep" overstates current-state scope** — addressed by reframing subtask 06 as opening-paragraph voice alignment (with the deliverable-level wording also tightened by N2 in this second pass).
5. **[LOW] Subtask 07 Lighthouse mobile ≥ 80 threshold may be optimistic** — addressed by relaxing the gate to ≥ 75 (and further refined by N3 in this second pass into the < 70 / 70–74 / ≥ 75 three-band rule).
6. **[LOW] Subtask 04 has no canonical Matrix-palette mapping for SVGs** — addressed by adding the six-row palette mapping table to subtask 04's Implementation Notes.

---

*Generated by `zoto-spec-judge` in fresh context. The reviewer did not author any portion of the spec under assessment, and the fixes applied above are concrete edits to the spec authored by the judge for the executor to act on — they are not speculative recommendations.*
