---
persona: zoto-backend-engineer
---

# Subtask: Foundation — `persona:` frontmatter contract, spawn-prefix widening, scaffold update, version bump

## Metadata
- **Subtask ID**: 01
- **Feature**: zoto-spec-system-sdlc-personas
- **Assigned Subagent**: generalPurpose
- **Dependencies**: None
- **Created**: 20260527

## Objective

Land the cross-cutting **foundation contract** that every later subtask depends
on:

1. Define the required `persona:` YAML frontmatter on subtask spec files (a new
   contract — subtasks today use a `## Metadata` bullet list with `**Assigned
   Subagent**`, no frontmatter).
2. Widen `plugins/zoto-spec-system/src/spawn-prompt.ts`,
   `plugins/zoto-spec-system/src/config-loader.ts`, and
   `plugins/zoto-spec-system/scripts/spec-spawn-prefix.ts` so the role union
   accepts `persona-*` keys (today the union is fixed to
   `"generator" | "executor" | "judge" | "subtask"`).
3. Teach `plugins/zoto-spec-system/scripts/spec-status-roundtrip.ts scaffold` to
   parse the new YAML frontmatter and write `assigned_agent: <persona>` into
   the paired `.status.yml`. Surface a clear error when frontmatter is missing.
4. Add the 10 commented `subagents.persona-<name>` blocks to
   `plugins/zoto-spec-system/templates/init-config.yml`.
5. Bump `plugins/zoto-spec-system/package.json` and
   `plugins/zoto-spec-system/.cursor-plugin/plugin.json` from `0.7.0` → `1.0.0`
   (the **stability milestone** for the Spec System).
6. Add a `1.0.0` entry to `plugins/zoto-spec-system/CHANGELOG.md` framed as
   the stability milestone with SDLC persona dispatch as the headline
   feature. Retain a `### Breaking` subsection enumerating the required
   `persona:` frontmatter contract.
7. Ship `plugins/zoto-spec-system/templates/schema/subtask-spec.schema.json`
   as the **canonical contract** for subtask spec markdown frontmatter.
   Wire the executor, judge, and `scaffold` parsers to load and validate
   against this schema as the single source of truth.

This subtask intentionally does **not** edit the workflow agents (executor,
generator, judge) or create persona agent files / phase skills — those live in
the parallel Phase 2 subtasks.

## Deliverables Checklist

- [ ] **D01** — Updated `plugins/zoto-spec-system/src/spawn-prompt.ts` with
      `SpawnContext["role"]` widened to accept `\`persona-${string}\`` (or an
      equivalent string-template literal type) in addition to the existing
      four roles. Update unit tests in `src/spawn-prompt.test.ts` (or create
      one) to cover a `persona-zoto-backend-engineer` role.
- [ ] **D02** — Updated `plugins/zoto-spec-system/src/config-loader.ts`:
      - widen the `role` parameter of `resolveSubagentBudget` to match D01's
        type;
      - widen the `SpecSystemConfig["subagents"]` interface so persona keys are
        type-safe (e.g. an index signature `[persona: \`persona-${string}\`]?: SubagentRoleConfig`
        or a documented `Record<string, SubagentRoleConfig | undefined>`);
      - confirm/document that `additionalProperties: true` on the JSON Schema
        already permits these keys at runtime (no schema change needed). Add
        `config-loader.test.ts` cases that:
        - resolve `subagents["persona-zoto-frontend-engineer"].tokenBudget`;
        - fall back to `subagents.default.tokenBudget` when the persona key
          is absent.
- [ ] **D03** — Updated `plugins/zoto-spec-system/scripts/spec-spawn-prefix.ts`
      to accept `--role persona-<name>` (any string starting with `persona-`).
      Replace the hardcoded `validRoles` array with a check that allows the
      four legacy roles **plus** any string matching `^persona-[a-z0-9-]+$`.
      Update `scripts/spec-spawn-prefix.test.ts` to cover a persona role.
- [ ] **D04** — Updated `plugins/zoto-spec-system/scripts/spec-status-roundtrip.ts`:
      - parse YAML frontmatter at the top of every `subtask-*.md` file;
      - validate the parsed frontmatter against the new
        `templates/schema/subtask-spec.schema.json` (D09) using `ajv` (already
        a dep of the plugin) — fail with a clear error naming the offending
        file and citing the schema violation when validation fails;
      - if validation passes, set `assigned_agent: <persona>` in the
        scaffolded `.status.yml`;
      - if frontmatter is absent **and** `--strict` (or default) is in effect,
        print a clear error naming the offending file and exit non-zero;
      - retain the existing `**Assigned Subagent**` bullet parser only as a
        fallback for legacy specs and emit a warning when it is used.
      - Add a unit test (or extend `spec-status-roundtrip.test.ts` if present)
        to cover all three branches (valid frontmatter, schema-violating
        frontmatter, missing frontmatter).
- [ ] **D05** — Updated `plugins/zoto-spec-system/templates/init-config.yml`
      with **10 commented `subagents.persona-<name>` blocks** under the
      existing commented `subagents:` section, one per Tier 1 persona. Each
      block follows the existing comment style and includes a commented
      `# tokenBudget:` and `# model:` example.
- [ ] **D06** — Bumped `plugins/zoto-spec-system/package.json` `version` to
      `1.0.0` and `plugins/zoto-spec-system/.cursor-plugin/plugin.json`
      `version` to `1.0.0` (lockstep). Verify any other places that mirror the
      version (search the plugin folder for `"0.7.0"` / `0\.7\.0` and update
      as needed). This is the **stability milestone** for the Spec System.
- [ ] **D07** — New `1.0.0` entry in
      `plugins/zoto-spec-system/CHANGELOG.md` matching existing style. The
      entry MUST open with a one-paragraph stability narrative of the form:
      *"v1.0.0 marks the Spec System as stable. The headline feature is
      SDLC persona dispatch — every subtask declares a `persona:` YAML
      frontmatter field, and the executor routes work to one of 10 Tier 1
      specialist agents …"*. Include a clearly labelled **`### Breaking`**
      subsection stating: "Subtask spec files now require `persona:` YAML
      frontmatter validated against
      `templates/schema/subtask-spec.schema.json`; the executor and judge
      will fail loudly on missing or invalid values. No migration script is
      provided." Include `### Added` lines covering the new
      `subtask-spec.schema.json`, persona role keys in `subagents.*`, and a
      forward reference to the new personas/skills landing in subsequent
      commits within the same release.
- [ ] **D08** — Persona contract reference. Add the canonical list of the 10
      Tier 1 persona ids and the regex `^persona-[a-z0-9-]+$` to a single
      authoritative location inside `plugins/zoto-spec-system/src/` (e.g. a
      new `src/personas.ts` exporting `TIER1_PERSONAS`, `TIER1_PERSONA_SET`,
      `isTier1Persona(value: string)`, and an `isPersonaRole(role: string)`
      predicate). The constants in `src/personas.ts` MUST stay aligned with
      the `persona` enum in the new `subtask-spec.schema.json` (D09) — the
      schema is canonical; if the two ever diverge, the build/test must
      fail. Re-use this constant from D01–D04 so future subtasks (executor /
      judge / scaffold) import it rather than duplicating the list.
- [ ] **D09** — New
      `plugins/zoto-spec-system/templates/schema/subtask-spec.schema.json`
      JSON Schema (draft-07) describing the subtask spec markdown frontmatter:
      - `$id`, `$schema`, `title`, `description` per project convention.
      - `type: object`, `additionalProperties: false`, `required: ["persona"]`.
      - `persona`: `{ type: "string", enum: [<10 Tier 1 ids>] }`.
      - Optional fields surfaced during exploration as candidates for
        machine-validated frontmatter — pick whichever set is genuinely useful
        to validate today (do NOT speculatively add fields). At minimum
        consider:
        - `subtask_id`: `{ type: "string", pattern: "^[0-9]{2}$" }`
        - `feature`: `{ type: "string", minLength: 1 }`
        - `dependencies`: `{ type: "array", items: { type: "string", pattern: "^[0-9]{2}$" } }`
        - `phase`: `{ type: "integer", minimum: 1 }`
      - Document the rationale for each included optional field in the schema's
        `description`.
      - Keep parser-level enforcement (D01–D04) — the schema is the source
        of truth, but the parsers continue to surface clear error messages.
- [ ] **D10** — Wire the schema into the executor + judge + scaffold parsers.
      Add a small shared helper (e.g. `src/subtask-spec-validator.ts`) that
      loads the schema, compiles it with `ajv` once, and exposes
      `validateSubtaskFrontmatter(frontmatter): { valid: boolean; errors: string[] }`.
      Re-export from `src/index.ts` if appropriate. Reuse this helper from
      D01–D04 (and from the executor, judge, and generator subtasks downstream).
      Add unit tests under `src/subtask-spec-validator.test.ts` covering:
      - valid Tier 1 persona passes;
      - Tier 2 persona name (e.g. `data-engineer`) fails with a helpful error;
      - missing `persona:` field fails;
      - extra unknown frontmatter key fails (`additionalProperties: false`).

## Definition of Done
- [ ] All deliverables D01–D10 complete.
- [ ] `pnpm --filter @zoto-agents/zoto-spec-system test` passes (unit + targeted integration).
- [ ] `pnpm --filter @zoto-agents/zoto-spec-system build` (or equivalent) passes.
- [ ] `node scripts/validate-template.mjs` still passes (templates remain valid).
- [ ] `subtask-spec.schema.json` compiles cleanly with `ajv` and validates the spec's own subtask files (smoke check during this subtask, formal verification in subtask 09).
- [ ] No linter errors in modified files.

## Implementation Notes

- `src/spawn-prompt.ts` already structures `role` as a discriminated union;
  prefer a TypeScript template-literal type (`\`persona-${string}\``) over an
  open-ended `string`, so misuse is caught at compile time.
- `src/config-loader.ts` keeps a strict TS interface for documented roles. For
  personas, prefer extending the interface with `& Partial<Record<\`persona-${string}\`, SubagentRoleConfig>>`
  so existing `cfg.subagents.generator` still autocompletes.
- The **config** JSON Schema (`templates/schema/config.schema.json`) already
  has `subagents.additionalProperties: true`. Do **not** add a per-persona
  property block to that schema — keep it open-ended so adding new persona
  config keys later requires no schema change. (Document this decision in
  the CHANGELOG.)
- The **subtask** JSON Schema (`templates/schema/subtask-spec.schema.json`,
  D09) is the new contract for the markdown frontmatter — this one **does**
  enumerate the 10 Tier 1 personas explicitly via `enum`, so adding a new
  persona later is a deliberate, reviewable schema change.
- `scripts/spec-spawn-prefix.ts` uses a hardcoded `validRoles` array — replace
  with an `isValidRole` predicate that returns `true` for legacy roles **or**
  `isPersonaRole(role)`.
- `spec-status-roundtrip.ts scaffold` currently regex-parses
  `**Assigned Subagent**: …` from `## Metadata`. Add a small frontmatter
  parser (use `js-yaml` if available in the plugin's deps; otherwise a minimal
  regex pulling out `^---\n(.*?)\n---` and grepping `persona:`) and prefer
  frontmatter when present.
- Keep the 10 Tier 1 persona id list as a single source of truth. The list:
  `zoto-product-analyst`, `zoto-software-architect`, `zoto-backend-engineer`,
  `zoto-frontend-engineer`, `zoto-test-engineer`, `zoto-devops-engineer`,
  `zoto-technical-writer`, `zoto-security-engineer`, `zoto-sre`,
  `zoto-code-reviewer`. The corresponding role keys are
  `persona-<id>` — preserve the dash structure exactly.
- This subtask MUST NOT create persona agent files or phase skills; those land
  in subtasks 02 and 03.

## Testing Strategy

**Do NOT trigger global test suites during parallel execution.** Instead:

- Run `pnpm --filter @zoto-agents/zoto-spec-system test` (the plugin-scoped
  vitest config) for unit and small integration tests.
- Add focused tests against the modified files (spawn-prompt, config-loader,
  spec-spawn-prefix script, spec-status-roundtrip script).
- Defer the repo-wide `pnpm test` to the final validation subtask (09).

## Execution Notes
_(to be filled by the executing agent)_

### Agent Session Info
- Agent: [Not yet assigned]
- Started: [Not yet started]
- Completed: [Not yet completed]

### Work Log
[Agent adds notes here during execution]

### Blockers Encountered
[Any blockers or issues]

### Files Modified
[List of files changed]
