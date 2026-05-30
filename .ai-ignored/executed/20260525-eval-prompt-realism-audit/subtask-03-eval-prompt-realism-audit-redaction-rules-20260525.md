# Subtask: Redaction rules & helper

## Metadata
- **Subtask ID**: 03
- **Feature**: Eval Prompt Realism Audit
- **Assigned Subagent**: generalPurpose
- **Suggested Model**: composer-2.5-fast
- **Dependencies**: None
- **Created**: 20260525

## Objective

Define the redaction rules that every transcript-sourced prompt MUST pass through before it lands in an eval JSON, and ship a small TypeScript helper that Subtask 04 (and the Phase 3 rewrite subtasks, if they need to re-derive a redacted form) can import deterministically.

## Deliverables Checklist
- [x] `specs/20260525-eval-prompt-realism-audit/audit/redaction-rules.md` — one section per rule with the literal regex, the rationale, and a worked input → output example.
- [x] `specs/20260525-eval-prompt-realism-audit/audit/redact.ts` — exports `redact(text: string): string` and `redactPath(p: string): string`; the helper is pure (no I/O, no globals), runs under `tsx` with no extra dependencies, and is < 200 lines.
- [x] `specs/20260525-eval-prompt-realism-audit/audit/redact.test.ts` — Vitest-compatible self-test (or a tiny `tsx` `assert`-based script) that exercises each rule against the worked examples from the rules document. Runs in < 5 seconds.
- [x] Self-test command line and exit code captured in this subtask's execution notes.

## Definition of Done
- [x] Every rule in `redaction-rules.md` is implemented in `redact.ts`.
- [x] Self-test exits 0 with every documented rule covered by at least one assertion.
- [x] `redact("/home/andrewv/git/cursor/zoto-agents/plugins/zoto-eval-system")` returns `plugins/zoto-eval-system` (repo-relative canonical form documented in `redaction-rules.md`).
- [x] `redact("Email me at andrew@example.com with token gh_pat_AAAAA")` returns text with the email and token stripped to placeholder tokens like `<email>` and `<token>`.
- [x] `redact` never throws on empty / null-ish input.
- [x] The helper does NOT depend on any package outside the existing devDependencies in the root `package.json`.

## Implementation Notes

Rules (minimum set — extend if exploration uncovers more):

1. **Absolute home paths.** Match `/home/<segment>/`, `/Users/<segment>/`, and `C:\\Users\\<segment>\\`. Replace the matched prefix with `~/`. Worked example: `/home/andrewv/git/cursor/zoto-agents/foo` → `~/git/cursor/zoto-agents/foo`.
2. **Repo-relative normalisation.** When the input contains an absolute path under the current repo root (detect via the literal substring `zoto-agents/`), strip everything up to and including the repo-root segment so the trailing path becomes repo-relative. Worked example: `~/git/cursor/zoto-agents/plugins/foo` → `plugins/foo`.
3. **Email addresses.** Match `[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}` and replace with `<email>`.
4. **Generic API tokens.** Cover the prefixes Cursor users commonly leak: `sk-[A-Za-z0-9_-]{16,}`, `ghp_[A-Za-z0-9]{30,}`, `gh_pat_[A-Za-z0-9_]{20,}`, `ghs_[A-Za-z0-9]{20,}`, `xox[baprs]-[A-Za-z0-9-]{10,}` (Slack), `AKIA[0-9A-Z]{16}` (AWS). Replace each match with `<token>`.
5. **CURSOR_API_KEY values.** Strip the value after `CURSOR_API_KEY=` (or `CURSOR_API_KEY:`); preserve the key name so the resulting text still tells the reader what kind of secret was removed. Worked example: `CURSOR_API_KEY=ck_live_abc123` → `CURSOR_API_KEY=<redacted>`.
6. **Generic env-value redaction.** Inside obvious `.env`-style lines (key in `[A-Z_][A-Z0-9_]*` followed by `=`), strip values longer than 8 characters to `<redacted>`. Skip this rule when the value looks like a literal placeholder already (`<...>`, `your-...-here`, `xxx...`).
7. **Operator name normalisation.** Replace any standalone `andrewv` token with `<operator>`. (The username appears in the discovered transcript directory and is the most common leak vector.) Configure as a constant so future maintainers can extend the list.
8. **Machine identifiers.** Drop standalone UUIDs (`[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}`) that are NOT recognisable as `target_id` (i.e. do not match `^(skill|command|agent|hook|rule):`). Replace with `<uuid>`.
9. **Third-party customer names / company strings.** Provide a configurable allow-list (initially empty) plus a clearly-named function so future audits can extend it without re-writing the helper.

Helper API:

```ts
// audit/redact.ts
export function redactPath(input: string): string;
export function redact(input: string): string;
// Optional: export const RULES: ReadonlyArray<{ name: string; apply(s: string): string }>;
```

Implementation constraints:
- Pure — no `process.cwd`, no `fs`, no `path` module beyond pure string operations.
- All rules are applied in deterministic order; the order is the one listed above and is documented at the top of `redact.ts`.
- No NPM dependencies beyond what is already in the root `package.json`. Prefer `RegExp` literals.
- < 200 lines including JSDoc and rule comments.

Self-test format:
- Either a Vitest file (`redact.test.ts`) callable via `npx vitest run specs/20260525-eval-prompt-realism-audit/audit/redact.test.ts --run`, or an `assert`-based `tsx` script `redact.selftest.ts` runnable via `npx tsx specs/20260525-eval-prompt-realism-audit/audit/redact.selftest.ts`. Either way it MUST exit 0 when all rules pass and exit non-zero on any failure.

## Testing Strategy
**IMPORTANT**: Do NOT trigger the global test suite. Run only:
- The self-test command described above (Vitest scoped to the single file, or the standalone tsx script).

No targeted modifications to existing test files are required.

## Execution Notes

### Agent Session Info
- Agent: generalPurpose (composer-2.5-fast)
- Started: 2026-05-25T06:55:05.134Z
- Completed: 2026-05-25T06:55:18.183Z

### Work Log
- Shipped 9 redaction rules in `audit/redaction-rules.md` with regex, rationale, and worked examples.
- Implemented pure `redact.ts` (126 lines): exports `redact`, `redactPath`, `redactThirdPartyNames`; canonical full-redact path form is repo-relative under `zoto-agents/`.
- Added Vitest self-test with 12 cases covering all 9 rules plus null-safe input.

### Self-test
```bash
npx vitest run specs/20260525-eval-prompt-realism-audit/audit/redact.test.ts --run
```
Exit code: **0** (12 passed, ~439ms)

### Blockers Encountered
None.

### Files Modified
- `specs/20260525-eval-prompt-realism-audit/audit/redaction-rules.md` (created)
- `specs/20260525-eval-prompt-realism-audit/audit/redact.ts` (created)
- `specs/20260525-eval-prompt-realism-audit/audit/redact.test.ts` (created)
