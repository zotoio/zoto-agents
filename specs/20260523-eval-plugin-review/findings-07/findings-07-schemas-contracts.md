# Schema & Contract Consistency Review — `zoto-eval-system`

**Subtask:** 07 (Eval Plugin Implementation & Application Review).
**Authority:** `/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/schema/*.schema.json` (7 files).
**Cross-refs:** [`findings-01-inventory.md` §3 (schema inventory)](../findings-01/findings-01-inventory.md), shipped init template `templates/init-config.yml`, applied config `/home/andrewv/git/cursor/zoto-agents/.zoto/eval-system/config.yml`.
**Method:** Static schema-vs-schema, schema-vs-template, schema-vs-README/rule/skill cross-reference. No tests run.

---

## 0. Findings ledger (severity × confidence × effort)

| # | Finding | Severity | Confidence | Effort | Owner |
|---|---------|---------:|-----------:|-------:|-------|
| F‑01 | `scripts/validate-plugin.ts` (compile-time `_meta?.generated === true` literal-string check) is **absent** from the authoritative plugin mirror — README and CHANGELOG advertise it as the validator hook | **high** | high | S | engineer |
| F‑02 | `update.failOnNoAnalyserInCI` exists in `config.schema.json` but is **missing from `templates/init-config.yml`** | medium | high | XS | engineer |
| F‑03 | `_meta.generated_by` — README pins to `"zoto-create-evals" \| "zoto-update-evals"` while `case-meta.schema.json` allows any string\|null (no enum) | medium | high | XS | engineer |
| F‑04 | `schema_version` field is inconsistently present across the 7 schemas (4 present / 3 absent) | medium | high | S | engineer / architect |
| F‑05 | `kind` / `target_id` enum drift across schemas: analyser-payload uses `[skill,command,agent,hook,rule]`; manifest / cleanup-plan / config use `[skill,command,agent,hook,cli,lib]`. `rule` only in analyser; `cli`/`lib` only in others | medium | high | S | architect |
| F‑06 | `cleanup-plan.file.preserve_user_authored` is `boolean default:true` but the schema description ("Hard-coded contract") says it should be locked — should be `const: true` to match the config-side hard-coded contracts | medium | high | XS | engineer |
| F‑07 | `case-meta` schema (`additionalProperties: true`) silently accepts TS-only `_meta` fields that no schema or doc describes (`primitive_analysis_hash`, `partial`, `primitive_analysis.fixture_justifications`) | medium | high | S | engineer / architect |
| F‑08 | `analyser.concurrency` / `analyser.maxCallsPerInvocation` documented in schema descriptions and shipped init template but **not** in README's config table | low | high | XS | plugin-manager |
| F‑09 | `static.framework` ↔ `llm.codeFramework` cross-field rule is enforced only imperatively (configurer skill step 3) and is **softer than the schema description claims**: schema says "must equal"; configurer downgrades to a `cleanup_plan` warning when they diverge instead of blocking | medium | high | S | architect |
| F‑10 | `cleanup-plan.snapshot.source` enum includes `"config"` which the configurer skill never enumerates (only mentions `manifest`/`filesystem`/`missing`) | low | medium | XS | engineer |
| F‑11 | `cleanup-plan.generated_by` enum uses `"zoto-eval-configure"` while the producer is the `/z-eval-configure` command / `zoto-eval-configurer` agent / `zoto-configure-evals` skill (none of these spellings match exactly) | low | medium | XS | engineer |
| F‑12 | Hard-coded `update.preserveUserAuthoredCases:true` / `update.writeMetaMarker:true` are correctly schema-enforced (`const: true`) and refused at configurer step 0 | **info** | high | — | — |
| F‑13 | `manifest.history.yml` has **no dedicated schema**; README references it but there is no validation contract distinct from `manifest.schema.json` | low | medium | M | architect |
| F‑14 | `result.schema.json` is single-schema (not split per-backend) and consistently covers `static.yml`/`llm.yml`/merged `report.yml` via `backend` enum + optional `report.{static,llm}` | info | high | — | — |
| F‑15 | `needs-user-input.schema.json` enforces all four invariants the rule documents (≥1 question, ≥2 options, slug ids, `additionalProperties: false`) | info | high | — | — |

Severity scale: **blocker** > **high** > **medium** > **low** > **info**. Effort: XS (<30 m) / S (<4 h) / M (<2 d) / L (>2 d).

---

## 1. `config.schema.json` — Verdict: **Drift**

**Schema:** ```1:152:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/schema/config.schema.json```
**Init template:** ```1:86:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/init-config.yml```
**Applied config:** ```1:86:/home/andrewv/git/cursor/zoto-agents/.zoto/eval-system/config.yml``` (identical to init template; entirely commented).

### Field-by-field walk vs init template

| # | Field | Schema | Init template | Status |
|---|-------|--------|--------------|--------|
| 1 | `evalsDir` | ```8:8:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/schema/config.schema.json``` | ```15:15:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/init-config.yml``` | ✓ |
| 2 | `skillsRoots` | ```9:13:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/schema/config.schema.json``` | ```16:19:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/init-config.yml``` | ✓ |
| 3 | `discoveryTargets` | ```14:21:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/schema/config.schema.json``` | ```20:24:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/init-config.yml``` | ✓ |
| 4 | `static.framework` | ```22:34:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/schema/config.schema.json``` | ```33:34:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/init-config.yml``` | ✓ |
| 5 | `llm.runtime` | ```39:39:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/schema/config.schema.json``` | ```36:36:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/init-config.yml``` | ✓ |
| 6 | `llm.model.id` | ```40:46:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/schema/config.schema.json``` | ```39:40:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/init-config.yml``` | ✓ |
| 7 | `llm.strategy` | ```47:52:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/schema/config.schema.json``` | ```37:37:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/init-config.yml``` | ✓ |
| 8 | `llm.codeFramework` | ```53:58:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/schema/config.schema.json``` | ```38:38:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/init-config.yml``` | ✓ |
| 9 | `judgeModel` | ```61:61:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/schema/config.schema.json``` | ```45:45:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/init-config.yml``` | ✓ |
| 10 | `manualChecklists.enabled` | ```62:67:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/schema/config.schema.json``` | ```49:50:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/init-config.yml``` | ✓ |
| 11 | `additionalAutomation` | ```68:72:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/schema/config.schema.json``` | ```55:55:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/init-config.yml``` | ✓ |
| 12 | `ignore` | ```73:78:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/schema/config.schema.json``` | ```25:25:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/init-config.yml``` | ✓ |
| 13 | `analyser.concurrency` | ```83:90:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/schema/config.schema.json``` | ```61:61:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/init-config.yml``` | ✓ |
| 14 | `analyser.maxCallsPerInvocation` | ```91:97:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/schema/config.schema.json``` | ```62:62:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/init-config.yml``` | ✓ |
| 15 | `runs.retention` | ```104:110:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/schema/config.schema.json``` | ```68:68:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/init-config.yml``` | ✓ |
| 16 | `update.criticalChangeRules.{5 keys}` | ```117:127:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/schema/config.schema.json``` | ```74:79:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/init-config.yml``` | ✓ |
| 17 | `update.preserveUserAuthoredCases` | ```128:133:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/schema/config.schema.json``` (`const: true`) | ```80:80:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/init-config.yml``` | ✓ |
| 18 | `update.writeMetaMarker` | ```134:139:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/schema/config.schema.json``` (`const: true`) | ```81:81:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/init-config.yml``` | ✓ |
| 19 | `update.manifestPath` | ```140:140:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/schema/config.schema.json``` | ```82:82:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/init-config.yml``` | ✓ |
| 20 | `update.historyPath` | ```141:141:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/schema/config.schema.json``` | ```83:83:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/init-config.yml``` | ✓ |
| 21 | `update.rediscoverWithSameDefaults` | ```142:142:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/schema/config.schema.json``` | ```84:84:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/init-config.yml``` | ✓ |
| 22 | `update.checkExitCodeOnCriticalDrift` | ```143:143:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/schema/config.schema.json``` | ```85:85:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/init-config.yml``` | ✓ |
| 23 | `update.failOnNoAnalyserInCI` | ```144:148:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/schema/config.schema.json``` | **MISSING** | **F‑02 Drift** |

### Hard-coded `const: true` fields ✓ (F‑12)

- `update.preserveUserAuthoredCases` carries `"const": true` plus matching `default: true`. ```128:133:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/schema/config.schema.json```
- `update.writeMetaMarker` carries `"const": true` plus matching `default: true`. ```134:139:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/schema/config.schema.json```
- Defence-in-depth at configurer skill step 0: ```43:60:/home/andrewv/.cursor/plugins/local/zoto-eval-system/skills/zoto-configure-evals/SKILL.md```.
- README documents both as "Hard-coded `true`" ```74:75:/home/andrewv/.cursor/plugins/local/zoto-eval-system/README.md```.

A `false` value would be rejected by AJV before the configurer runs because of `const: true`. The configurer additionally refuses bundled `false` before any read/write, providing both schema-level and code-level enforcement.

### Recommendation on visibility

**Keep config-visible (status quo).** Rationale:

- Schema `const: true` is itself the enforcement mechanism — removing the fields would also remove the validation gate.
- The configurer skill's step 0 refusal references the keys explicitly; removing them turns the documented refusal into a phantom check.
- The README, rule, and CHANGELOG all describe the contract; surfacing them in the init template (commented) keeps documentation aligned with what the validator actually checks. The "do not change" comment in the init template is already adequate prevention against well-meaning edits.

The cost of leaving them visible is two extra commented lines; the cost of removing them is loss of single-source-of-truth.

### `static.framework` ↔ `llm.codeFramework` mutual constraint (F‑09)

- Schema description on `static.framework`: *"Cross-field rule (enforced at runtime by the configurer): when `llm.strategy === \"code\"`, `static.framework` must equal `llm.codeFramework`."* ```28:32:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/schema/config.schema.json```
- Schema description on `llm.codeFramework`: same "must equal" wording. ```57:57:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/schema/config.schema.json```
- Draft-07 JSON Schema **cannot** express cross-property equality natively; expressing this would require `if/then` plus listing all equality permutations as enums. Practically, **only enforceable imperatively**.
- Configurer skill imperative enforcement: ```120:122:/home/andrewv/.cursor/plugins/local/zoto-eval-system/skills/zoto-configure-evals/SKILL.md``` says *"If they differ, **do not block** — emit a `cleanup_plan` group with `reason: \"framework-switch\"` for the orphan framework's assets and append a soft `warnings[]` entry to the plan."*

**Drift:** schema says "must equal" (mandatory); configurer says "SHOULD equal" (soft, warning + cleanup plan). Either the schema description should be softened to match the configurer, or the configurer should harden to match the schema description. Recommend hardening the configurer to reject the divergent payload (returns `needs_user_input` for re-entry) when `llm.strategy === "code"`, since the original design intent reads as a hard constraint.

---

## 2. `manifest.schema.json` — Verdict: **Consistent**

**Schema:** ```1:99:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/schema/manifest.schema.json```
**README example:** ```327:347:/home/andrewv/.cursor/plugins/local/zoto-eval-system/README.md```

### Required vs optional

- Top-level `required`: `schema_version`, `created_at`, `updated_at`, `git_ref`, `generated_by`, `discovery_config`, `targets`. ```6:6:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/schema/manifest.schema.json```
- `discovery_config` required keys: `discoveryTargets`, `skillsRoots`, `evalsDir`. ```19:19:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/schema/manifest.schema.json``` — `static` and `llm` snapshots are optional for backward compatibility.
- `targets[]` required: `id`, `kind`, `path`, `content_hash`, `eval_files`. ```68:68:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/schema/manifest.schema.json```
- `additionalProperties: false` at root ```7:7:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/schema/manifest.schema.json``` and on `targets[]` items ```69:69:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/schema/manifest.schema.json```. `discovery_config` and `discovery_config.static`/`llm` deliberately allow extras (`additionalProperties: true`) so future snapshots can carry extra fields without breaking older readers.

### Cross-reference to updater code

- README updater path ```285:286:/home/andrewv/.cursor/plugins/local/zoto-eval-system/README.md``` references `manifest.discovery_config` — present in schema ✓.
- Updater template `update.ts.tmpl` references `MANIFEST_PATH` / `HISTORY_PATH`. ```38:40:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/llm/agent-sdk/update.ts.tmpl``` ✓.
- Configurer skill snapshot reader ```75:80:/home/andrewv/.cursor/plugins/local/zoto-eval-system/skills/zoto-configure-evals/SKILL.md``` consumes `discovery_config.{static, llm}` snapshot fields — both optional in schema ✓.
- `targets[].id` pattern `^(skill|command|agent|hook|cli|lib):[^\\s]+$` matches `kind` enum ✓.

### Issues (low severity)

- **F‑13:** `manifest.history.yml` has no dedicated schema. README at ```322:323:/home/andrewv/.cursor/plugins/local/zoto-eval-system/README.md``` describes it as "append-only list of full manifest snapshots" but no contract enforces shape. Either reuse `manifest.schema.json` per entry (currently implicit) or author a `manifest-history.schema.json` that wraps it.

---

## 3. `result.schema.json` — Verdict: **Consistent**

**Schema:** ```1:159:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/schema/result.schema.json```

### Single-schema vs per-backend

The schema covers `static.yml`, `llm.yml`, and the merged `report.yml` together (F‑14):

- Top-level `backend` enum `["static", "llm", "mixed"]` ```13:13:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/schema/result.schema.json``` differentiates the artefact.
- `additionalProperties: true` at root ```7:7:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/schema/result.schema.json``` so backend-specific extras (e.g. `judge:` block appended into `llm.yml`) validate without bespoke schemas.
- Optional `report.static` and `report.llm` sub-objects mirror the per-backend totals/aggregates and only appear on the merged top-level file (description ```48:48:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/schema/result.schema.json```). Each carries `backend: const: "static"` / `const: "llm"` so consumers can defensively read by key. ✓ Cleanly captured.

### Variant aggregates

- `totals` required: `cases`, `passed`, `failed`; `skipped` optional. ```16:17:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/schema/result.schema.json```
- `aggregates` permits `tokens_total`, `duration_ms_total`, plus the LLM-only soft metrics `verbosity_avg`, `accuracy_avg`, `confidence_avg` ```25:35:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/schema/result.schema.json``` and is `additionalProperties: true` so static aggregates that lack soft metrics still validate. ✓
- `drift` block ```36:44:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/schema/result.schema.json``` is described in README §`Outputs` ```49:50:/home/andrewv/.cursor/plugins/local/zoto-eval-system/README.md``` and on the executor handoff. Schema-vs-README aligned.

### Drift / gaps

None observed. The single-schema choice is justified by the description and the optional `report.*` projection. Future per-backend tightening would require splitting; not needed today.

---

## 4. `case-meta.schema.json` — Verdict: **Drift**

**Schema:** ```1:64:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/schema/case-meta.schema.json```
**README contract:** ```288:302:/home/andrewv/.cursor/plugins/local/zoto-eval-system/README.md```
**TS interface:** ```38:47:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/llm/agent-sdk/case.ts.tmpl```

### Field-by-field

| Field | Schema | README claim | TS interface | Status |
|-------|--------|--------------|--------------|--------|
| `generated` | required, boolean ```7:10:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/schema/case-meta.schema.json``` | "Every generated eval case carries `_meta`" — implied required-when-generated ```291:298:/home/andrewv/.cursor/plugins/local/zoto-eval-system/README.md``` | `generated: boolean` ```39:39:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/llm/agent-sdk/case.ts.tmpl``` | ✓ |
| `source_hash` | optional, sha256 \| null ```11:16:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/schema/case-meta.schema.json``` | "sha256 of the target's normalised content" ```295:295:/home/andrewv/.cursor/plugins/local/zoto-eval-system/README.md``` | `source_hash?: string \| null` ```40:40:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/llm/agent-sdk/case.ts.tmpl``` | ✓ |
| `last_updated` | optional, date-time \| null ```17:22:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/schema/case-meta.schema.json``` | "ISO 8601 timestamp" ```296:296:/home/andrewv/.cursor/plugins/local/zoto-eval-system/README.md``` | `last_updated?: string \| null` ```42:42:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/llm/agent-sdk/case.ts.tmpl``` | ✓ |
| `generated_by` | optional, **string \| null (no enum)** ```23:28:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/schema/case-meta.schema.json``` | enum `"zoto-create-evals" \| "zoto-update-evals"` ```297:297:/home/andrewv/.cursor/plugins/local/zoto-eval-system/README.md``` | `generated_by?: string \| null` | **F‑03 Drift** |
| `primitive_analysis` | optional, structured ```29:60:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/schema/case-meta.schema.json``` | mentioned in CHANGELOG ```54:54:/home/andrewv/.cursor/plugins/local/zoto-eval-system/CHANGELOG.md``` and `Migration` §, not in README `_meta` table | `primitive_analysis?: CasePrimitiveAnalysis` ```46:46:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/llm/agent-sdk/case.ts.tmpl``` | partial doc drift |
| `primitive_analysis_hash` | **not in schema** (allowed via `additionalProperties: true`) | undocumented | `primitive_analysis_hash?: string \| null` ```41:41:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/llm/agent-sdk/case.ts.tmpl``` | **F‑07 Drift** |
| `partial` | **not in schema** (allowed via `additionalProperties: true`) | undocumented | `partial?: boolean` ```45:45:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/llm/agent-sdk/case.ts.tmpl``` | **F‑07 Drift** |
| `primitive_analysis.fixture_justifications` | **not in case-meta schema** (allowed via inner `additionalProperties: true`) — present in `analyser-payload` schema | undocumented in case-meta context | `fixture_justifications?: string[]` ```35:35:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/llm/agent-sdk/case.ts.tmpl``` | **F‑07 Drift** |

### Semantic-equivalence vs runtime guard

The schema declares `generated: { type: boolean }` (required when `_meta` is present). The runtime guard is the literal expression `_meta?.generated === true` — semantically *"only the exact literal true"*. The schema's `boolean` type matches because:

1. Required + boolean type means the value is **either** `true` or `false` — never null, never undefined-but-present.
2. The guard's `=== true` form rejects everything except the literal `true`, which is the strict subset the schema allows for "generated case".
3. `_meta` being absent on a case (allowed because `_meta` is optional on `EvalCase`) makes `_meta?.generated` evaluate to `undefined`, which fails `=== true` — i.e. a user-authored case lacking `_meta` is treated as immutable. ✓

**Semantic agreement confirmed.** The schema cannot produce a value (e.g. `"true"` string, `1`, `null`) that the guard would silently misclassify. ✓

### Issues

- **F‑03 generated_by enum drift:** README pins the enum; schema permits any string\|null. Recommend tightening the schema to `enum: ["zoto-create-evals", "zoto-update-evals", null]` to match documented contract. The manifest schema already restricts `generated_by` to those two values ```13:16:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/schema/manifest.schema.json``` — case-meta should do the same.
- **F‑07 silent acceptance of TS-only fields:** `case-meta.schema.json` has `additionalProperties: true` at line 8 and inner `primitive_analysis.additionalProperties: true` at line 31, so the runtime can emit `primitive_analysis_hash`, `partial`, and `fixture_justifications` without validation error. None of these appear in README, init template, or analyser/configurer skills. Recommend either:
    - Tighten `additionalProperties` to `false` and add the three TS-only fields as optional schema properties (preferred — single source of truth);
    - Or document them in the README's `_meta` contract and keep `additionalProperties: true` (lower-effort but weaker).
- **F‑04 schema_version absent:** the schema does not declare a `schema_version` field, unlike four sibling schemas. `_meta` is the most-embedded artefact in the system (every generated case carries one); future schema migrations will be unable to detect old `_meta` blocks. Recommend adding `schema_version` (with `const: 1`) to align with manifest/result/analyser-payload/cleanup-plan.

---

## 5. `analyser-payload.schema.json` — Verdict: **Drift**

**Schema:** ```1:148:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/schema/analyser-payload.schema.json```
**Analyser agent system prompt:** ```1:58:/home/andrewv/.cursor/plugins/local/zoto-eval-system/agents/zoto-eval-analyser-subagent.md```

### Schema-vs-analyser-agent cross-check

- Schema top-level required keys: `schema_version`, `analyser_version`, `model_id`, `target_id`, `kind`, `source_path`, `source_hash`, `summary`, `cases`. ```7:17:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/schema/analyser-payload.schema.json```
- Agent hard rules echo every required key by name ```15:15:/home/andrewv/.cursor/plugins/local/zoto-eval-system/agents/zoto-eval-analyser-subagent.md```; `schema_version: 1` pinned ✓.
- `additionalProperties: false` at root ```18:18:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/schema/analyser-payload.schema.json``` and on every nested object (case items ```67:67:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/schema/analyser-payload.schema.json```, fixtures ```88:88:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/schema/analyser-payload.schema.json```, file items ```96:96:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/schema/analyser-payload.schema.json```, `expected_filesystem` ```124:124:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/schema/analyser-payload.schema.json```). Strict.
- Per-case required: `scenario`, `prompt`, `assertions`. ```66:66:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/schema/analyser-payload.schema.json```
- `cases.minItems: 1` and `cases[].assertions.minItems: 1` enforce "at least one case + assertion" per the agent's rule 8 ✓.
- `cases[].follow_ups.minItems: 1` ```81:81:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/schema/analyser-payload.schema.json``` — note: passing an explicit empty array is rejected; the agent prompt explicitly tells the model to omit instead, which aligns. ✓ (info, not drift.)

### `kind` / `target_id` enum drift (F‑05)

This schema's `kind` enum is `["skill", "command", "agent", "hook", "rule"]` ```42:42:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/schema/analyser-payload.schema.json``` and `target_id` pattern is `^(skill|command|agent|hook|rule):[^\\s]+$` ```37:37:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/schema/analyser-payload.schema.json```.

Compared to siblings:

- `manifest.schema.json` `targets[].kind`: `["skill", "command", "agent", "hook", "cli", "lib"]` ```72:72:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/schema/manifest.schema.json```
- `config.schema.json` `discoveryTargets`: same as manifest ```17:20:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/schema/config.schema.json```
- `cleanup-plan.schema.json` `file.target_id` pattern: same as manifest ```167:168:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/schema/cleanup-plan.schema.json```

**Three-way drift:**

- `rule` is **only** in analyser-payload — yet config `discoveryTargets` cannot enumerate "rule", so rules aren't discovered for analysis by the standard discovery path. Either the analyser is implicitly invoked for rules through a side channel, or the schema describes a target kind that has no discovery surface today.
- `cli`, `lib` are **only** in the discovery/manifest/cleanup-plan trio — analyser can never analyse them.

Recommend reconciling: either (a) trim `rule` from analyser-payload until rules are first-class discovery targets, or (b) add `rule` to manifest/cleanup-plan/config enums and document the rule-analysis pipeline, and add `cli`/`lib` to analyser-payload if those primitive kinds should be analysable.

### `model_id` enum drift (informational)

- Schema: `model_id` is free-form `type: string, minLength: 1` ```30:34:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/schema/analyser-payload.schema.json``` (allows any value).
- Config schema's `llm.model.id`: enum `["composer-2", "opus-4.6", "sonnet"]` ```43:43:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/schema/config.schema.json```.
- README §Quick start lists the same three plus a default.

Free-form analyser `model_id` is the right design for forward-compat (judge can swap models without bumping the analyser schema), so this is **informational, not drift**.

### Documentation drift

The README never explicitly documents `analyser-payload.schema.json` fields anywhere user-facing — only the CHANGELOG references "AnalyserPayload" ```54:54:/home/andrewv/.cursor/plugins/local/zoto-eval-system/CHANGELOG.md```. For operators wanting to debug `eval:analyse` failures, this is a documentation gap; not strictly drift since the analyser schema is internal contract between subagent and caller, but worth a low-severity README addition.

---

## 6. `cleanup-plan.schema.json` — Verdict: **Drift**

**Schema:** ```1:178:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/schema/cleanup-plan.schema.json```
**Configurer skill emitter:** ```124:136:/home/andrewv/.cursor/plugins/local/zoto-eval-system/skills/zoto-configure-evals/SKILL.md```

### Schema-vs-skill cross-check

- Skill produces the same `groups[].reason` enum the schema declares (`framework-switch`, `strategy-switch`, `removed-target`). ```128:132:/home/andrewv/.cursor/plugins/local/zoto-eval-system/skills/zoto-configure-evals/SKILL.md` vs schema ```112:113:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/schema/cleanup-plan.schema.json```. ✓
- Skill validates payload against schema explicitly ```151:151:/home/andrewv/.cursor/plugins/local/zoto-eval-system/skills/zoto-configure-evals/SKILL.md```. ✓
- `additionalProperties: false` at root + every `definitions` object — strict. ✓

### Hard-coded contract: `preserve_user_authored` (F‑06)

Schema definition:

```164:174:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/schema/cleanup-plan.schema.json
        "preserve_user_authored": {
          "type": "boolean",
          "default": true,
          "description": "Sentinel. Always `true` for `llm-case` entries so the cleanup engine knows it must drop only rows whose `_meta.generated === true` and rewrite the surrounding JSON in place. Hard-coded contract — subtask 03 must refuse to delete a file when the rule cannot be honoured."
        }
```

The description **declares** the field is hard-coded `true` but the schema only sets a `default: true` — `false` is still validation-valid. By symmetry with `config.schema.json`'s `update.preserveUserAuthoredCases` (`const: true`), this should be `"const": true`:

```json
"preserve_user_authored": {
  "type": "boolean",
  "const": true,
  "default": true,
  "description": "..."
}
```

Recommend tightening to `const: true` (XS effort, no behavioural change because the default already covers it).

### `snapshot.source` enum vs configurer skill (F‑10)

- Schema enum: `["manifest", "filesystem", "config", "missing"]` ```100:100:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/schema/cleanup-plan.schema.json```
- Configurer skill enumerates `"manifest"`, `"filesystem"`, `"missing"` (lines 84-88) and never describes `"config"` as a source.

Either the schema's `"config"` value is unreachable dead enum, or the configurer is supposed to use it when emitting the **new** snapshot (the `new_snapshot.source` for the freshly chosen config). The schema description of `source` says `"config" is the chosen new config` — i.e. `new_snapshot.source = "config"` and `old_snapshot.source ∈ {manifest, filesystem, missing}`. That's a defensible split, but the skill doesn't document it. Add to the skill, or remove from the schema.

### `generated_by` enum vs producers (F‑11)

- Schema: `"enum": ["zoto-eval-configure", "eval-cleanup-stale"]` ```28:30:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/schema/cleanup-plan.schema.json```
- Actual producers: `/z-eval-configure` command, `zoto-eval-configurer` agent, `zoto-configure-evals` skill, and `scripts/eval-cleanup-stale.ts`. The schema value `"zoto-eval-configure"` doesn't match any documented name verbatim (no `/`, but spelled with one dash). Either:
    - Standardise on `"zoto-configure-evals"` (skill name) or `"zoto-eval-configurer"` (agent name), and document the convention; or
    - Treat `"zoto-eval-configure"` as a synthetic emitter-id and document the mapping in the schema description.

Low severity — cosmetic — but operators reading the plan will see a fourth name they can't easily map back to a component.

### Cross-schema `target_id` pattern parity

`cleanup-plan.file.target_id` pattern `^(skill|command|agent|hook|cli|lib):[^\\s]+$` ```167:168:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/schema/cleanup-plan.schema.json``` matches manifest's `targets[].id` pattern exactly. ✓ Good — these two schemas always travel together.

---

## 7. `needs-user-input.schema.json` — Verdict: **Consistent**

**Schema:** ```1:67:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/schema/needs-user-input.schema.json```
**Rule documentation:** ```49:65:/home/andrewv/.cursor/plugins/local/zoto-eval-system/rules/zoto-eval-system.mdc```

### Constraints documented by the rule, enforced by the schema (F‑15)

| Rule claim (line 65) | Schema enforcement |
|----------------------|--------------------|
| "at least one question" | `questions.minItems: 1` ```20:21:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/schema/needs-user-input.schema.json``` |
| "at least two options per question" | `options.minItems: 2` ```36:38:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/schema/needs-user-input.schema.json``` |
| "slug-format ids" | question/option `id` pattern `^[a-z0-9][a-z0-9_-]*$` ```27:31:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/schema/needs-user-input.schema.json``` and ```44:48:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/schema/needs-user-input.schema.json``` |
| "no additional properties" | `additionalProperties: false` at root, `needs_user_input` body, `questions[]` items, `options[]` items ```7:7:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/schema/needs-user-input.schema.json```, ```12:12:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/schema/needs-user-input.schema.json```, ```25:25:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/schema/needs-user-input.schema.json```, ```42:42:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/schema/needs-user-input.schema.json``` |
| `reason` and `questions` required | ```10:11:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/schema/needs-user-input.schema.json``` |

All four invariants enforced. `allow_multiple` is optional with `default: false` — consistent with the rule example.

### Minor observation

The schema **lacks** an `$id` and a `$schema` consistent with siblings — wait, it does have `$schema` ```2:2:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/schema/needs-user-input.schema.json``` but **no `$id`**. Every other schema declares `$id` pointing at the canonical URL. Adding `$id` is XS-effort and aligns the schema with the rest of the family. Not severity-level drift (validation works), but useful for tooling that resolves cross-refs.

---

## 8. Cross-schema redundancy

### Repeated definitions / drift hotspots

| Concept | Definitions | Drift? |
|---------|-------------|--------|
| `kind` / `target_id` enum | analyser-payload (`5`: `skill,command,agent,hook,rule`); manifest, config, cleanup-plan (`6`: `skill,command,agent,hook,cli,lib`) | **Yes — F‑05** |
| sha256 hex pattern `^[0-9a-f]{64}$` | case-meta `source_hash`, case-meta `primitive_analysis.source_hash`, analyser-payload `source_hash`, manifest `targets[].content_hash` | Format consistent; **naming inconsistent** — `content_hash` in manifest vs `source_hash` elsewhere |
| `schema_version: const 1` | manifest, result, analyser-payload, cleanup-plan | **Missing on case-meta, needs-user-input, config — F‑04** |
| `additionalProperties: false` (strict mode) | manifest root, analyser-payload everywhere, cleanup-plan everywhere, needs-user-input everywhere | result + case-meta + config root deliberately permit extras for forward-compat — documented |
| `generated_by` enum | manifest (`"zoto-create-evals" \| "zoto-update-evals"`), cleanup-plan (`"zoto-eval-configure" \| "eval-cleanup-stale"`), case-meta (free-form string) | **Three-way drift — F‑03 and F‑11** |
| `totals` shape | result (`{cases,passed,failed,skipped?}`), cleanup-plan (`{files,groups?}`) | Same key, distinct semantics — by design, not drift |

### Naming asymmetries (suggested rename)

- `manifest.targets[].content_hash` vs everywhere else's `source_hash`. The hashed thing is the same artefact (the primitive's source markdown body). Recommend renaming manifest's `content_hash` → `source_hash` for consistency, with a `schema_version` bump.

### Mergeable schemas

- **None recommended.** Each schema sits at a distinct contract boundary:
    - `config` ↔ user-edited YAML
    - `manifest` ↔ persisted state
    - `result` ↔ run artefacts
    - `case-meta` ↔ embedded marker on each case row
    - `analyser-payload` ↔ subagent ↔ caller
    - `cleanup-plan` ↔ configurer ↔ cleanup engine
    - `needs-user-input` ↔ subagent ↔ command

Merging any two would couple unrelated contract surfaces. **Stay separate.**

### Splits to consider

- **`manifest.history.yml` schema (F‑13)** — currently shares `manifest.schema.json` by implication; an explicit `manifest-history.schema.json` (wrapper: array of manifest snapshots) would let validators check the file directly and let consumers detect truncated histories.

---

## 9. Schema-vs-doc drift summary

| Doc location | Drift vs schemas |
|--------------|-------------------|
| README §`_meta` contract (lines 290-302) | Lists `generated_by` enum that schema doesn't enforce (**F‑03**); omits `_meta.primitive_analysis` and TS-only fields (**F‑07**) |
| README §`Configuration` table (lines 60-75) | Omits `analyser.concurrency`, `analyser.maxCallsPerInvocation` (**F‑08**); omits `update.failOnNoAnalyserInCI` (**F‑02** + doc drift) |
| README §`Validation pipeline` reference | CHANGELOG line 40 claims `scripts/validate-plugin.ts` performs compile-time check; **file absent** from local mirror and monorepo plugin tree (**F‑01**) |
| Init template `templates/init-config.yml` | Missing `update.failOnNoAnalyserInCI` (**F‑02**) |
| Configurer skill | Schema `static.framework` description says "must equal" `llm.codeFramework`; skill emits warning instead (**F‑09**); skill omits `snapshot.source: "config"` case (**F‑10**) |
| Configurer skill / cleanup-plan generator | Schema `generated_by` enum doesn't match emitter name (**F‑11**) |

---

## 10. Hard-coded contract review (summary)

### `update.preserveUserAuthoredCases: true` and `update.writeMetaMarker: true`

Both enforced by:

- Schema `const: true` (rejects any `false`). ✓
- Configurer skill step 0 (refuses bundled `false` before any read/write). ✓
- README + rule + init template document the contract.

**Recommendation: keep config-visible.** Removing them would amputate the schema-level enforcement that makes the contract real. The two commented lines in the init template are not clutter — they are the user-facing surface of a defence-in-depth rule.

### `_meta.generated === true` literal-string compile-time check

- **README claim:** ```302:302:/home/andrewv/.cursor/plugins/local/zoto-eval-system/README.md```: *"The validator rejects any `update.ts` source that does not enforce this guard at compile time (via a literal-string check for `_meta?.generated === true`)."*
- **CHANGELOG claim:** ```40:40:/home/andrewv/.cursor/plugins/local/zoto-eval-system/CHANGELOG.md```: *"Validation pipeline (`scripts/validate-plugin.ts`) enforcing the `_meta.generated` invariant at compile time."*
- **Reality:** `scripts/` directory does not exist in the local plugin mirror at `/home/andrewv/.cursor/plugins/local/zoto-eval-system/`; only `hooks/zoto-eval-session-start.ts` is a TS file in the entire plugin tree. The monorepo `plugins/zoto-eval-system/` is hollow (only `templates/env/` and `node_modules/`). The literal guard string `_meta?.generated === true` is **present** inside `templates/llm/agent-sdk/update.ts.tmpl` at line 14 — i.e. the guard is **declared in the source template** but **no validator checks for it**. — `**F‑01 Gap**`.

The runtime guard works (`update.ts.tmpl` at lines 314, 338, 354 implements it imperatively). The missing piece is the compile-time validator that ensures a future refactor of `update.ts` doesn't accidentally drop the literal-string guard. Recommend authoring `scripts/validate-plugin.ts` (the same pattern other plugins like `zoto-spec-system` already implement — see `/home/andrewv/git/cursor/zoto-agents/plugins/zoto-spec-system/scripts/validate-plugin.ts`).

---

## 11. Schema-merge / split proposals

| Proposal | Action | Rationale |
|----------|--------|-----------|
| Keep all 7 schemas as-is | **no merge** | Each represents a distinct contract surface; merging would couple producer/consumer pairs |
| Add `manifest-history.schema.json` | **split** (F‑13) | History file lacks dedicated validation; current implicit re-use of manifest schema is undocumented |
| Add `schema_version` to `case-meta`, `needs-user-input`, `config` | **harmonisation** (F‑04) | Four sibling schemas already carry it; future migrations need uniform versioning |
| Tighten `case-meta.additionalProperties` to `false`; add explicit `primitive_analysis_hash`, `partial`, `primitive_analysis.fixture_justifications` | **tighten** (F‑07) | Silent TS-only fields drift from documentation; explicit schema is single source of truth |
| Tighten `cleanup-plan.file.preserve_user_authored` to `const: true` | **tighten** (F‑06) | Description says "Hard-coded contract" but schema only declares `default: true` |
| Tighten `case-meta.generated_by` to manifest's enum | **tighten** (F‑03) | README and manifest agree on the two-value enum; case-meta is the outlier |
| Reconcile `kind` enums across analyser-payload / manifest / config / cleanup-plan | **architect-led decision** (F‑05) | Either promote `rule` to a discovery target or remove it from analyser-payload; either add `cli`/`lib` to analyser-payload or document them as analyser-skipped |
| Author `scripts/validate-plugin.ts` (or equivalent CI step) | **add** (F‑01) | Restore the documented compile-time guard for `_meta?.generated === true` |
| Add `update.failOnNoAnalyserInCI` to init template | **align** (F‑02) | Schema has the field; init template doesn't surface it |

---

## 12. Top-3 priorities

1. **F‑01 author `scripts/validate-plugin.ts`** (high / S / engineer) — the README and CHANGELOG both promise compile-time enforcement of the `_meta?.generated === true` literal-string guard, but no such validator ships. This is the highest-leverage gap because the documented invariant is currently runtime-only; a future refactor of `update.ts` could silently delete the guard with no CI signal.
2. **F‑05 reconcile `kind` / `target_id` enums across schemas** (medium / S / architect) — `rule` only in analyser; `cli`/`lib` only in manifest/config/cleanup-plan. This is a fundamental disagreement about which primitive kinds exist in the system. Surface the canonical taxonomy and align all four schemas.
3. **F‑09 tighten `static.framework` ↔ `llm.codeFramework` mismatch handling** (medium / S / architect) — schema says "must equal"; configurer downgrades to warning. Decide: schema lies (soften description) or configurer is too soft (harden enforcement). Recommend the latter so the runtime matches the schema's promise.

The remaining medium-severity drifts (F‑02, F‑03, F‑04, F‑06, F‑07) are XS–S engineer fixes that can be batched in a single PR once the architect calls F‑05 and F‑09.

---

## 13. Schema verdict tally

| Schema | Verdict |
|--------|---------|
| `config.schema.json` | **Drift** (F‑02, F‑09) |
| `manifest.schema.json` | **Consistent** (F‑13 is a forward-looking split, not current drift) |
| `result.schema.json` | **Consistent** (F‑14) |
| `case-meta.schema.json` | **Drift** (F‑03, F‑04, F‑07) |
| `analyser-payload.schema.json` | **Drift** (F‑05) |
| `cleanup-plan.schema.json` | **Drift** (F‑06, F‑10, F‑11) |
| `needs-user-input.schema.json` | **Consistent** (F‑15) |

**Tally:** 3 consistent · 4 drift · 0 hard gaps (F‑01 is a *cross-cutting* validator gap that affects the codebase, not a single schema).

---

*Findings produced under subtask 07. Static review only — no schema validators executed; no files mutated outside `specs/20260523-eval-plugin-review/findings-07/`.*
