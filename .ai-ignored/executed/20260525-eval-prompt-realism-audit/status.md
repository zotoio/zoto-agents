# Spec 20260525-eval-prompt-realism-audit — aggregate live status

<!-- status:overview:start -->
| Key | Value |
|-----|-------|
| spec_id | 20260525-eval-prompt-realism-audit |
| phase | 0 |
| aggregate_state | completed |
| started_at | 2026-05-25T06:27:55.979Z |
| updated_at | 2026-05-25T13:36:37.184Z |

**config_reloaded**
_None._
<!-- status:overview:end -->

<!-- status:progress:start -->
| Metric | Count |
|--------|-------|
| Total | 12 |
| Completed | 12 |
| In progress | 0 |
| Blocked | 0 |
| Failed | 0 |
<!-- status:progress:end -->

<!-- status:subtasks:start -->
| Subtask | State | Status (yml) | Last heartbeat |
|---------|-------|--------------|----------------|
| 01 | completed | `specs/20260525-eval-prompt-realism-audit/status/subtask-01-eval-prompt-realism-audit-eval-file-inventory-20260525.status.yml` | 2026-05-25T06:57:38.222Z |
| 02 | completed | `specs/20260525-eval-prompt-realism-audit/status/subtask-02-eval-prompt-realism-audit-transcript-mining-20260525.status.yml` | 2026-05-25T06:56:08.358Z |
| 03 | completed | `specs/20260525-eval-prompt-realism-audit/status/subtask-03-eval-prompt-realism-audit-redaction-rules-20260525.status.yml` | 2026-05-25T16:59:30.000Z |
| 04 | completed | `specs/20260525-eval-prompt-realism-audit/status/subtask-04-eval-prompt-realism-audit-rubric-and-rewrites-20260525.status.yml` | 2026-05-25T18:05:00.000Z |
| 05 | completed | `specs/20260525-eval-prompt-realism-audit/status/subtask-05-eval-prompt-realism-audit-rewrite-eval-system-commands-20260525.status.yml` | 2026-05-25T07:02:30.000Z |
| 06 | completed | `specs/20260525-eval-prompt-realism-audit/status/subtask-06-eval-prompt-realism-audit-rewrite-eval-system-agents-20260525.status.yml` | — |
| 07 | completed | `specs/20260525-eval-prompt-realism-audit/status/subtask-07-eval-prompt-realism-audit-rewrite-eval-system-hooks-and-skills-20260525.status.yml` | — |
| 08 | completed | `specs/20260525-eval-prompt-realism-audit/status/subtask-08-eval-prompt-realism-audit-rewrite-spec-system-suite-20260525.status.yml` | — |
| 09 | completed | `specs/20260525-eval-prompt-realism-audit/status/subtask-09-eval-prompt-realism-audit-rewrite-workspace-and-cursor-top-20260525.status.yml` | 2026-05-25T07:04:35.000Z |
| 10 | completed | `specs/20260525-eval-prompt-realism-audit/status/subtask-10-eval-prompt-realism-audit-tighten-analyser-prompt-20260525.status.yml` | 2026-05-25T13:31:17.000Z |
| 11 | completed | `specs/20260525-eval-prompt-realism-audit/status/subtask-11-eval-prompt-realism-audit-validation-and-manifest-refresh-20260525.status.yml` | 2026-05-25T13:36:00Z |
| 12 | completed | `specs/20260525-eval-prompt-realism-audit/status/subtask-12-eval-prompt-realism-audit-update-analyser-cache-and-restamp-20260525.status.yml` | — |
<!-- status:subtasks:end -->

<!-- status:blockers:start -->
_None._
<!-- status:blockers:end -->

<!-- status:definition-of-done:start -->
- [x] **DOD01** — Every in-scope eval file is enumerated in `audit/eval-inventory.md` and reconciled against `.zoto/eval-system/manifest.yml`.
- [x] **DOD02** — `audit/transcript-index.json` exists and maps every in-scope command/agent target to at least one transcript-uuid seed OR a documented `synthetic_seed: readme|skill-usage` fallback.
- [x] **DOD03** — `audit/redaction-rules.md` documents every redaction rule and `audit/redact.ts` exports a pure `redact(text: string): string` helper the rewrite subtasks consume.
- [x] **DOD04** — `audit/realism-rubric.md`, `audit/eval-case-audit.md`, and `audit/eval-rewrites.json` exist with one entry per in-scope case.
- [x] **DOD05** — Every rewritten case retains `_meta.generated: true` and carries a refreshed `last_updated`; `generated_by` remains `"zoto-update-evals"` and `source_hash` is preserved per Subtask 05's "Source-hash recomputation rule".
- [x] **DOD06** — Every user-authored case (no `_meta` or `_meta.generated !== true`) is byte-identical to its pre-spec state; subtasks 05–09 record a diff-empty proof.
- [x] **DOD07** — `plugins/zoto-eval-system/agents/zoto-eval-analyser-subagent.md` has a "Forbidden internal-mechanic vocabulary" section with ≥ 2 worked before/after examples; `analyser_version` is unchanged.
- [x] **DOD08** — `pnpm run eval:list` exits 0.
- [x] **DOD09** — `pnpm run eval -- --collect-only` exits 0.
- [x] **DOD10** — `pnpm run eval:update --check` exits 0.
- [x] **DOD11** — `.zoto/eval-system/manifest.yml` is refreshed exactly once and `.zoto/eval-system/manifest.history.yml` gains exactly one new appended entry.
- [x] **DOD12** — Execution report captures all three gate exit logs and the redaction rule citations used per rewrite suite.
<!-- status:definition-of-done:end -->

<!-- status:events:start -->
- **2026-05-25T13:26:39.704Z** `source_validation_warn` — Schema validation failed for specs/20260525-eval-prompt-realism-audit/status/subtask-11-eval-prompt-realism-audit-validation-and-manifest-refresh-20260525.status.yml
- **2026-05-25T13:26:39.704Z** `source_validation_warn` — Schema validation failed for specs/20260525-eval-prompt-realism-audit/status/subtask-12-eval-prompt-realism-audit-update-analyser-cache-and-restamp-20260525.status.yml
- **2026-05-25T13:26:39.704Z** `rebuild` — Aggregated 7 subtask source(s); digest 03233c6c…
- **2026-05-25T13:26:42.840Z** `source_validation_warn` — Schema validation failed for specs/20260525-eval-prompt-realism-audit/status/subtask-07-eval-prompt-realism-audit-rewrite-eval-system-hooks-and-skills-20260525.status.yml
- **2026-05-25T13:26:42.840Z** `source_validation_warn` — Schema validation failed for specs/20260525-eval-prompt-realism-audit/status/subtask-09-eval-prompt-realism-audit-rewrite-workspace-and-cursor-top-20260525.status.yml
- **2026-05-25T13:26:42.840Z** `source_validation_warn` — Schema validation failed for specs/20260525-eval-prompt-realism-audit/status/subtask-10-eval-prompt-realism-audit-tighten-analyser-prompt-20260525.status.yml
- **2026-05-25T13:26:42.840Z** `source_validation_warn` — Schema validation failed for specs/20260525-eval-prompt-realism-audit/status/subtask-11-eval-prompt-realism-audit-validation-and-manifest-refresh-20260525.status.yml
- **2026-05-25T13:26:42.840Z** `source_validation_warn` — Schema validation failed for specs/20260525-eval-prompt-realism-audit/status/subtask-12-eval-prompt-realism-audit-update-analyser-cache-and-restamp-20260525.status.yml
- **2026-05-25T13:26:42.840Z** `rebuild` — Aggregated 7 subtask source(s); digest 50a3cc9d…
- **2026-05-25T13:26:44.408Z** `source_validation_warn` — Schema validation failed for specs/20260525-eval-prompt-realism-audit/status/subtask-09-eval-prompt-realism-audit-rewrite-workspace-and-cursor-top-20260525.status.yml
- **2026-05-25T13:26:44.408Z** `source_validation_warn` — Schema validation failed for specs/20260525-eval-prompt-realism-audit/status/subtask-10-eval-prompt-realism-audit-tighten-analyser-prompt-20260525.status.yml
- **2026-05-25T13:26:44.408Z** `source_validation_warn` — Schema validation failed for specs/20260525-eval-prompt-realism-audit/status/subtask-11-eval-prompt-realism-audit-validation-and-manifest-refresh-20260525.status.yml
- **2026-05-25T13:26:44.408Z** `source_validation_warn` — Schema validation failed for specs/20260525-eval-prompt-realism-audit/status/subtask-12-eval-prompt-realism-audit-update-analyser-cache-and-restamp-20260525.status.yml
- **2026-05-25T13:26:44.408Z** `rebuild` — Aggregated 8 subtask source(s); digest c97e30db…
- **2026-05-25T13:26:46.056Z** `source_validation_warn` — Schema validation failed for specs/20260525-eval-prompt-realism-audit/status/subtask-09-eval-prompt-realism-audit-rewrite-workspace-and-cursor-top-20260525.status.yml
- **2026-05-25T13:26:46.056Z** `source_validation_warn` — Schema validation failed for specs/20260525-eval-prompt-realism-audit/status/subtask-10-eval-prompt-realism-audit-tighten-analyser-prompt-20260525.status.yml
- **2026-05-25T13:26:46.056Z** `source_validation_warn` — Schema validation failed for specs/20260525-eval-prompt-realism-audit/status/subtask-11-eval-prompt-realism-audit-validation-and-manifest-refresh-20260525.status.yml
- **2026-05-25T13:26:46.056Z** `source_validation_warn` — Schema validation failed for specs/20260525-eval-prompt-realism-audit/status/subtask-12-eval-prompt-realism-audit-update-analyser-cache-and-restamp-20260525.status.yml
- **2026-05-25T13:26:46.056Z** `rebuild` — Aggregated 8 subtask source(s); digest 43168ec1…
- **2026-05-25T13:26:50.811Z** `source_validation_warn` — Schema validation failed for specs/20260525-eval-prompt-realism-audit/status/subtask-09-eval-prompt-realism-audit-rewrite-workspace-and-cursor-top-20260525.status.yml
- **2026-05-25T13:26:50.811Z** `source_validation_warn` — Schema validation failed for specs/20260525-eval-prompt-realism-audit/status/subtask-10-eval-prompt-realism-audit-tighten-analyser-prompt-20260525.status.yml
- **2026-05-25T13:26:50.811Z** `source_validation_warn` — Schema validation failed for specs/20260525-eval-prompt-realism-audit/status/subtask-11-eval-prompt-realism-audit-validation-and-manifest-refresh-20260525.status.yml
- **2026-05-25T13:26:50.811Z** `source_validation_warn` — Schema validation failed for specs/20260525-eval-prompt-realism-audit/status/subtask-12-eval-prompt-realism-audit-update-analyser-cache-and-restamp-20260525.status.yml
- **2026-05-25T13:26:50.811Z** `rebuild` — Aggregated 8 subtask source(s); digest 9f556e06…
- **2026-05-25T13:27:00.135Z** `source_validation_warn` — Schema validation failed for specs/20260525-eval-prompt-realism-audit/status/subtask-09-eval-prompt-realism-audit-rewrite-workspace-and-cursor-top-20260525.status.yml
- **2026-05-25T13:27:00.135Z** `source_validation_warn` — Schema validation failed for specs/20260525-eval-prompt-realism-audit/status/subtask-10-eval-prompt-realism-audit-tighten-analyser-prompt-20260525.status.yml
- **2026-05-25T13:27:00.135Z** `source_validation_warn` — Schema validation failed for specs/20260525-eval-prompt-realism-audit/status/subtask-11-eval-prompt-realism-audit-validation-and-manifest-refresh-20260525.status.yml
- **2026-05-25T13:27:00.135Z** `source_validation_warn` — Schema validation failed for specs/20260525-eval-prompt-realism-audit/status/subtask-12-eval-prompt-realism-audit-update-analyser-cache-and-restamp-20260525.status.yml
- **2026-05-25T13:27:00.135Z** `rebuild` — Aggregated 8 subtask source(s); digest 09fc3db0…
- **2026-05-25T13:27:01.767Z** `source_validation_warn` — Schema validation failed for specs/20260525-eval-prompt-realism-audit/status/subtask-09-eval-prompt-realism-audit-rewrite-workspace-and-cursor-top-20260525.status.yml
- **2026-05-25T13:27:01.767Z** `source_validation_warn` — Schema validation failed for specs/20260525-eval-prompt-realism-audit/status/subtask-11-eval-prompt-realism-audit-validation-and-manifest-refresh-20260525.status.yml
- **2026-05-25T13:27:01.767Z** `source_validation_warn` — Schema validation failed for specs/20260525-eval-prompt-realism-audit/status/subtask-12-eval-prompt-realism-audit-update-analyser-cache-and-restamp-20260525.status.yml
- **2026-05-25T13:27:01.767Z** `rebuild` — Aggregated 9 subtask source(s); digest 178f89ce…
- **2026-05-25T13:27:03.366Z** `source_validation_warn` — Schema validation failed for specs/20260525-eval-prompt-realism-audit/status/subtask-09-eval-prompt-realism-audit-rewrite-workspace-and-cursor-top-20260525.status.yml
- **2026-05-25T13:27:03.366Z** `source_validation_warn` — Schema validation failed for specs/20260525-eval-prompt-realism-audit/status/subtask-11-eval-prompt-realism-audit-validation-and-manifest-refresh-20260525.status.yml
- **2026-05-25T13:27:03.366Z** `source_validation_warn` — Schema validation failed for specs/20260525-eval-prompt-realism-audit/status/subtask-12-eval-prompt-realism-audit-update-analyser-cache-and-restamp-20260525.status.yml
- **2026-05-25T13:27:03.366Z** `rebuild` — Aggregated 9 subtask source(s); digest 314f9b8e…
- **2026-05-25T13:27:12.769Z** `source_validation_warn` — Schema validation failed for specs/20260525-eval-prompt-realism-audit/status/subtask-11-eval-prompt-realism-audit-validation-and-manifest-refresh-20260525.status.yml
- **2026-05-25T13:27:12.769Z** `source_validation_warn` — Schema validation failed for specs/20260525-eval-prompt-realism-audit/status/subtask-12-eval-prompt-realism-audit-update-analyser-cache-and-restamp-20260525.status.yml
- **2026-05-25T13:27:12.769Z** `rebuild` — Aggregated 10 subtask source(s); digest 326759c1…
- **2026-05-25T13:27:14.350Z** `source_validation_warn` — Schema validation failed for specs/20260525-eval-prompt-realism-audit/status/subtask-11-eval-prompt-realism-audit-validation-and-manifest-refresh-20260525.status.yml
- **2026-05-25T13:27:14.350Z** `source_validation_warn` — Schema validation failed for specs/20260525-eval-prompt-realism-audit/status/subtask-12-eval-prompt-realism-audit-update-analyser-cache-and-restamp-20260525.status.yml
- **2026-05-25T13:27:14.350Z** `rebuild` — Aggregated 10 subtask source(s); digest 9aecadcd…
- **2026-05-25T13:27:34.746Z** `source_validation_warn` — Schema validation failed for specs/20260525-eval-prompt-realism-audit/status/subtask-11-eval-prompt-realism-audit-validation-and-manifest-refresh-20260525.status.yml
- **2026-05-25T13:27:34.746Z** `source_validation_warn` — Schema validation failed for specs/20260525-eval-prompt-realism-audit/status/subtask-12-eval-prompt-realism-audit-update-analyser-cache-and-restamp-20260525.status.yml
- **2026-05-25T13:27:34.746Z** `rebuild` — Aggregated 10 subtask source(s); digest e7c63155…
- **2026-05-25T13:27:47.194Z** `source_validation_warn` — Schema validation failed for specs/20260525-eval-prompt-realism-audit/status/subtask-11-eval-prompt-realism-audit-validation-and-manifest-refresh-20260525.status.yml
- **2026-05-25T13:27:47.194Z** `source_validation_warn` — Schema validation failed for specs/20260525-eval-prompt-realism-audit/status/subtask-12-eval-prompt-realism-audit-update-analyser-cache-and-restamp-20260525.status.yml
- **2026-05-25T13:27:47.194Z** `rebuild` — Aggregated 10 subtask source(s); digest 0543bb08…
- **2026-05-25T13:27:50.288Z** `source_validation_warn` — Schema validation failed for specs/20260525-eval-prompt-realism-audit/status/subtask-11-eval-prompt-realism-audit-validation-and-manifest-refresh-20260525.status.yml
- **2026-05-25T13:27:50.288Z** `source_validation_warn` — Schema validation failed for specs/20260525-eval-prompt-realism-audit/status/subtask-12-eval-prompt-realism-audit-update-analyser-cache-and-restamp-20260525.status.yml
- **2026-05-25T13:27:50.288Z** `rebuild` — Aggregated 10 subtask source(s); digest b44a645b…
- **2026-05-25T13:28:13.498Z** `source_validation_warn` — Schema validation failed for specs/20260525-eval-prompt-realism-audit/status/subtask-11-eval-prompt-realism-audit-validation-and-manifest-refresh-20260525.status.yml
- **2026-05-25T13:28:13.498Z** `rebuild` — Aggregated 11 subtask source(s); digest 9d74100d…
- **2026-05-25T13:28:15.057Z** `source_validation_warn` — Schema validation failed for specs/20260525-eval-prompt-realism-audit/status/subtask-11-eval-prompt-realism-audit-validation-and-manifest-refresh-20260525.status.yml
- **2026-05-25T13:28:15.057Z** `rebuild` — Aggregated 11 subtask source(s); digest d6502b1f…
- **2026-05-25T13:29:06.300Z** `source_validation_warn` — Schema validation failed for specs/20260525-eval-prompt-realism-audit/status/subtask-11-eval-prompt-realism-audit-validation-and-manifest-refresh-20260525.status.yml
- **2026-05-25T13:29:06.300Z** `rebuild` — Aggregated 11 subtask source(s); digest 995d3e73…
- **2026-05-25T13:29:09.426Z** `source_validation_warn` — Schema validation failed for specs/20260525-eval-prompt-realism-audit/status/subtask-11-eval-prompt-realism-audit-validation-and-manifest-refresh-20260525.status.yml
- **2026-05-25T13:29:09.426Z** `rebuild` — Aggregated 11 subtask source(s); digest 688e2ba9…
- **2026-05-25T13:29:12.558Z** `source_validation_warn` — Schema validation failed for specs/20260525-eval-prompt-realism-audit/status/subtask-11-eval-prompt-realism-audit-validation-and-manifest-refresh-20260525.status.yml
- **2026-05-25T13:29:12.558Z** `rebuild` — Aggregated 11 subtask source(s); digest f9fdfac8…
- **2026-05-25T13:29:14.095Z** `source_validation_warn` — Schema validation failed for specs/20260525-eval-prompt-realism-audit/status/subtask-11-eval-prompt-realism-audit-validation-and-manifest-refresh-20260525.status.yml
- **2026-05-25T13:29:14.095Z** `rebuild` — Aggregated 11 subtask source(s); digest 760f6005…
- **2026-05-25T13:29:21.803Z** `source_validation_warn` — Schema validation failed for specs/20260525-eval-prompt-realism-audit/status/subtask-11-eval-prompt-realism-audit-validation-and-manifest-refresh-20260525.status.yml
- **2026-05-25T13:29:21.803Z** `rebuild` — Aggregated 11 subtask source(s); digest a50139f9…
- **2026-05-25T13:29:23.345Z** `source_validation_warn` — Schema validation failed for specs/20260525-eval-prompt-realism-audit/status/subtask-11-eval-prompt-realism-audit-validation-and-manifest-refresh-20260525.status.yml
- **2026-05-25T13:29:23.345Z** `rebuild` — Aggregated 11 subtask source(s); digest 97834295…
- **2026-05-25T13:29:26.485Z** `source_validation_warn` — Schema validation failed for specs/20260525-eval-prompt-realism-audit/status/subtask-11-eval-prompt-realism-audit-validation-and-manifest-refresh-20260525.status.yml
- **2026-05-25T13:29:26.485Z** `rebuild` — Aggregated 11 subtask source(s); digest 4455a11d…
- **2026-05-25T13:29:29.648Z** `source_validation_warn` — Schema validation failed for specs/20260525-eval-prompt-realism-audit/status/subtask-11-eval-prompt-realism-audit-validation-and-manifest-refresh-20260525.status.yml
- **2026-05-25T13:29:29.648Z** `rebuild` — Aggregated 11 subtask source(s); digest 9a62f266…
- **2026-05-25T13:29:37.389Z** `source_validation_warn` — Schema validation failed for specs/20260525-eval-prompt-realism-audit/status/subtask-11-eval-prompt-realism-audit-validation-and-manifest-refresh-20260525.status.yml
- **2026-05-25T13:29:37.389Z** `rebuild` — Aggregated 11 subtask source(s); digest c795382c…
- **2026-05-25T13:30:22.313Z** `source_validation_warn` — Schema validation failed for specs/20260525-eval-prompt-realism-audit/status/subtask-11-eval-prompt-realism-audit-validation-and-manifest-refresh-20260525.status.yml
- **2026-05-25T13:30:22.313Z** `rebuild` — Aggregated 11 subtask source(s); digest 28f507fd…
- **2026-05-25T13:31:55.195Z** `source_validation_warn` — Schema validation failed for specs/20260525-eval-prompt-realism-audit/status/subtask-11-eval-prompt-realism-audit-validation-and-manifest-refresh-20260525.status.yml
- **2026-05-25T13:31:55.195Z** `rebuild` — Aggregated 11 subtask source(s); digest 70c41e76…
- **2026-05-25T13:31:58.294Z** `source_validation_warn` — Schema validation failed for specs/20260525-eval-prompt-realism-audit/status/subtask-11-eval-prompt-realism-audit-validation-and-manifest-refresh-20260525.status.yml
- **2026-05-25T13:31:58.294Z** `rebuild` — Aggregated 11 subtask source(s); digest 14561214…
- **2026-05-25T13:32:02.955Z** `source_validation_warn` — Schema validation failed for specs/20260525-eval-prompt-realism-audit/status/subtask-11-eval-prompt-realism-audit-validation-and-manifest-refresh-20260525.status.yml
- **2026-05-25T13:32:02.955Z** `rebuild` — Aggregated 11 subtask source(s); digest 66f92546…
- **2026-05-25T13:32:18.558Z** `rebuild` — Aggregated 12 subtask source(s); digest 46f4941b…
- **2026-05-25T13:32:20.131Z** `rebuild` — Aggregated 12 subtask source(s); digest 03956263…
- **2026-05-25T13:32:47.925Z** `rebuild` — Aggregated 12 subtask source(s); digest 9c385f83…
- **2026-05-25T13:32:51.040Z** `rebuild` — Aggregated 12 subtask source(s); digest 0449b6bc…
- **2026-05-25T13:32:54.140Z** `rebuild` — Aggregated 12 subtask source(s); digest 24ab156c…
- **2026-05-25T13:33:05.009Z** `rebuild` — Aggregated 12 subtask source(s); digest 9f858d8e…
- **2026-05-25T13:33:36.116Z** `rebuild` — Aggregated 12 subtask source(s); digest 9679068e…
- **2026-05-25T13:34:34.975Z** `rebuild` — Aggregated 12 subtask source(s); digest 54ff5771…
- **2026-05-25T13:34:36.509Z** `rebuild` — Aggregated 12 subtask source(s); digest fa89cb9a…
- **2026-05-25T13:34:38.051Z** `rebuild` — Aggregated 12 subtask source(s); digest d532269d…
- **2026-05-25T13:34:39.587Z** `rebuild` — Aggregated 12 subtask source(s); digest 0f29d8ce…
- **2026-05-25T13:35:53.775Z** `rebuild` — Aggregated 12 subtask source(s); digest 2160cedd…
- **2026-05-25T13:35:56.860Z** `rebuild` — Aggregated 12 subtask source(s); digest 0b929b4e…
- **2026-05-25T13:35:59.942Z** `rebuild` — Aggregated 12 subtask source(s); digest df365da5…
- **2026-05-25T13:36:12.608Z** `rebuild` — Aggregated 12 subtask source(s); digest 8f4564e2…
- **2026-05-25T13:36:31.081Z** `rebuild` — Aggregated 12 subtask source(s); digest c4d6d134…
- **2026-05-25T13:36:34.134Z** `rebuild` — Aggregated 12 subtask source(s); digest ec0c1381…
- **2026-05-25T13:36:37.184Z** `rebuild` — Aggregated 12 subtask source(s); digest 2a7b08be…
<!-- status:events:end -->
