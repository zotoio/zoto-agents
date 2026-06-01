# Spec Assessment: Eval Dual Host Layout

**Target**: `specs/20260601-eval-dual-host-layout/spec-eval-dual-host-layout-20260601.md`
**Assessed**: 2026-06-01
**Verdict**: Conditional

## Scores

| Dimension | Score | Notes |
|-----------|-------|-------|
| Completeness | 3.5/5 | Core flows covered; gaps in external-repo migration path and Cursor resolution validation |
| Feasibility | 3.5/5 | Monorepo path is solid; external-repo resolution wrapper and `.cursor/*/eval-sys/` discoverability are uncertain |
| Structure | 4.0/5 | Dependencies and phases well-ordered; two missing explicit edges (S09→S05, S06→S02) |
| Specificity | 4.0/5 | Concrete deliverables with code snippets; S03 resolution wrapper left too open-ended |
| Risk Awareness | 3.0/5 | Good per-subtask mitigations; no rollback plan for S06, Cursor subdirectory resolution unvalidated |
| Convention Compliance | 4.0/5 | Follows monorepo patterns; novel `.cursor/*/eval-sys/` convention needs validation |
| **Overall** | **3.7/5** | **Conditional** |

## Findings

### Strengths

- Clean separation of concerns: each subtask has a single responsibility with concrete deliverables
- Dependency graph is well-constructed — phases are logical (foundations → flows → details → reversal → docs/tests) and allow good parallelism in Phases 1, 2, 3, and 5
- Monorepo dogfood path is realistic — root `package.json` already points to `plugins/zoto-eval-system/scripts/`, so S06 is mostly deletions
- Existing `stamp-host-layout.ts` structure aligns with what S04 describes, making the refactor incremental rather than a rewrite
- Implementation notes include code snippets with the exact patterns to use (e.g. YAML `parseDocument()` for comment-preserving config patches)
- Testing strategies are sensible and include the important constraint about not triggering global test suites during parallel execution
- KD-5/KD-6 correctly identify that lean mode needs devDeps in the root package.json and that `pnpm install` must be part of init

### Issues

| # | Severity | Subtask | Finding | Recommendation |
|---|----------|---------|---------|----------------|
| 1 | HIGH | 05 | `.cursor/agents/eval-sys/`, `.cursor/skills/eval-sys/`, `.cursor/commands/eval-sys/` assumes Cursor recurses into subdirectories for agent/skill/command resolution. Cursor's documented resolution scans top-level entries in `.cursor/agents/`, `.cursor/skills/`, `.cursor/commands/` — subdirectory recursion is unverified. If it doesn't recurse, the entire ejected primitives layout is broken. | Add a validation step (S05 Phase 0 or as a pre-condition): verify Cursor's resolution behaviour for nested directories. If Cursor doesn't recurse, flatten primitives directly into `.cursor/agents/`, `.cursor/skills/`, `.cursor/commands/` with a naming prefix (e.g. `eval-sys--zoto-eval-*.md`) instead of a subdirectory. |
| 2 | HIGH | 03 | The resolution wrapper pattern for external (non-monorepo) repos is unresolved. S03 offers three alternatives ("tsx $(node -e '...')/scripts/...", "small wrapper", "resolve at install time") without choosing one. Shell interpolation in npm scripts is platform-dependent and fragile. | Commit to a single pattern. Recommended: a tiny `scripts/eval-bridge.ts` (3 lines: import resolvePluginRoot, exec the target) that every eval alias invokes. This avoids shell interpolation and works cross-platform. |
| 3 | MEDIUM | 06 | S06 modifies `config.yml` to set `hostLayout: plugin`, but the `hostLayout` field is only defined in the schema by S02. S06 depends on 01 and 03 (transitive through 03→02), but an explicit dependency on S02 would prevent a race condition if S03 is blocked or reordered. | Add S02 as an explicit dependency of S06 in the manifest and metadata. |
| 4 | MEDIUM | 09 | S09 (Tests/CI) should test the full eject flow including primitives stamping (S05), but does not list S05 as a dependency. The deliverable "Integration test: eject produces expected full file tree + primitives" requires S05's implementation. | Add S05 as a dependency of S09. |
| 5 | MEDIUM | 01 | Cursor install directory glob (`~/.cursor/plugins/*/zoto-eval-system/`) is Unix-specific. On Windows, the path would be `%APPDATA%/cursor/plugins/...` or similar. The spec doesn't address cross-platform resolution. | Add a platform-aware path resolution in S01's implementation notes (use `os.homedir()` + platform check, or document that Windows support is deferred). |
| 6 | MEDIUM | 06 | No rollback plan for the dogfood migration. S06 runs in Phase 3, before S07 (un-eject) is available in Phase 4. If the migration breaks eval scripts mid-execution, there's no scripted reversal. | Add a safety note to S06: "Before deleting, create a git stash or working-copy checkpoint. If eval scripts break, `git checkout -- .zoto/eval-system/` restores the vendored state." This is a documentation addition, not a blocker. |
| 7 | LOW | — | No explicit handling of existing external host repos that previously ran `/z-eval-create` with full-stamp. These repos have vendored runtime; the spec only addresses the monorepo dogfood. | Add a note to S08 (Docs) documenting the upgrade path for external repos: "Run `pnpm run eval:un-eject` to migrate from the legacy full-stamp layout to lean." |
| 8 | LOW | 01 | The marketplace version glob (`~/.cursor/plugins/cache/*/zoto-eval-system/`) picks "most-recently-modified if multiple" — this could pick a stale version if the user has multiple Cursor channels. | Consider checking `package.json` version in each candidate and picking the highest semver, or document the trade-off. |

### Dependency Graph

- Graph is consistent with the manifest — all 19 edges verified correct
- Phase assignments are valid — no subtask runs before all its dependencies' phases complete
- No circular dependencies detected
- Two missing edges identified:
  - S09 should depend on S05 (tests eject+primitives flow)
  - S06 should explicitly depend on S02 (uses `hostLayout` config field it defines)
- Good parallelism: Phase 1 has 2 parallel tasks, Phase 2 has 2, Phase 3 has 2, Phase 5 has 2

### Risk Summary

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Cursor doesn't recurse into `.cursor/*/eval-sys/` subdirectories | Medium | High | S05 Phase 0 validation; flat-prefix fallback documented |
| External repo resolution wrapper fails cross-platform | Low | Medium | S03 committed to `eval-bridge.ts` (no shell interpolation) |
| Dogfood migration breaks eval scripts with no rollback | Low | High | Git stash checkpoint before S06; eval:discover before/after comparison |
| Marketplace glob picks wrong plugin version | Low | Low | Document the "most recent" heuristic; consider semver comparison |
| `additionalProperties: true` in schema silently accepts `hostLayout` without validation | Low | Low | S02 adds `hostLayout` to schema explicitly; existing `additionalProperties: true` means unknown fields won't fail validation before S02 lands |

## Recommendation

**Conditional (3.7/5)** — Judge fixes applied to spec (2026-06-01). Ready for execution pending Phase 0 validation in S05 at runtime.

Previously flagged issues now addressed in spec:
1. S05 Phase 0 + flat-prefix fallback for Cursor subdirectory discovery
2. S03 committed to `scripts/eval-bridge.ts` wrapper pattern
3. S06→S02 and S09→S05 dependency edges added
4. S06 rollback plan documented
5. S08 external-repo upgrade path documented
6. S01 cross-platform paths + semver selection
