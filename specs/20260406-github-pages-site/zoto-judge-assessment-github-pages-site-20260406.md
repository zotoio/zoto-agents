# Spec Assessment: GitHub Pages Site

**Target**: `specs/20260406-github-pages-site/spec-github-pages-site-20260406.md`
**Assessed**: 2026-04-06
**Verdict**: Approve

## Scores

| Dimension | Score | Notes |
|-----------|-------|-------|
| Completeness | 4/5 | All major areas covered; minor gap in subtask 05 config key enumeration |
| Feasibility | 3/5 | SVG diagram and IDE mockup generation by AI agents is the primary risk; subtask 08 scope is large |
| Structure | 5/5 | Excellent phasing, correct dependencies, good parallelism, graph matches manifest perfectly |
| Specificity | 4/5 | Detailed deliverables and implementation notes throughout; subtask 05 config key listing is incomplete |
| Risk Awareness | 4/5 | Good risk table covering 6 risks; missing rollback plan and agent capacity risk for large subtasks |
| Convention Compliance | 4/5 | Follows spec system naming and structure conventions; clean separation of site from plugin source |
| **Overall** | **4.0/5** | **Approve — ready for execution with noted advisories** |

## Findings

### Strengths

- **Phasing is exemplary.** The four-phase approach (foundation → assets + simple pages → content pages → integration) is well-reasoned. Foundation work in Phase 1 enables maximum parallelism in Phases 2 and 3, with a single integration pass in Phase 4.
- **Dependency graph is correct and complete.** Every edge in the Mermaid graph matches the manifest. Phase assignments are consistent with dependencies. No circular dependencies or ID ordering violations.
- **Implementation notes are unusually detailed.** Color palettes, CSS variable naming, navigation structures, content source references, and HTML structure guidance are all provided — giving executing agents clear, concrete direction.
- **"No build step" decision is pragmatic.** Eliminates an entire class of problems (Node.js version conflicts, build failures, dependency drift) while remaining appropriate for a documentation site of this scope.
- **Content accuracy is grounded in source files.** Each content subtask explicitly lists the plugin source files to read, reducing the risk of documentation drift.
- **Accessibility and responsive design are first-class concerns**, addressed in both individual subtask DoDs and the integration subtask.

### Issues

| # | Severity | Subtask | Finding | Recommendation |
|---|----------|---------|---------|----------------|
| 1 | HIGH | 02, 03 | SVG generation feasibility risk. Creating 8 complex, styled SVGs (4 diagrams + 4 IDE mockups) via text-based AI agents is inherently challenging. The IDE mockups (subtask 03) require reproducing Cursor's chrome, multiple panels, and realistic text — all as raw SVG markup. Quality may fall short of expectations. | Add explicit quality thresholds (e.g., "boxes with labels and arrows" is acceptable, pixel-perfect is not required). Consider adding a fallback in subtask 09 to replace SVGs with styled HTML/CSS diagram equivalents if SVG quality is insufficient. |
| 2 | HIGH | 08 | Subtask scope is very large. The design deep-dive page has 8+ major sections (Architecture, Agents, Skills, Commands, Hooks & Rules, Configuration, Spec File Format, Execution Model), each with multiple subsections, comparison tables, and embedded code examples. This is the most content-dense page on the site and risks exceeding a single agent session's effective capacity. | Consider splitting into two subtasks: one for component documentation (Agents, Skills, Commands, Hooks) and one for system design (Architecture, File Format, Execution Model, Extension Points). Both could run in Phase 3. |
| 3 | MEDIUM | 05 | Config key enumeration in the subtask body lists only 3 keys (`unitOfWork`, `specsDir`, `workDir`) with a vague "any additional keys from the config schema". The actual `config-schema.md` defines 10 fields including `hooks.sessionStartNudge.*`, `spec.maxSubtasks`, `spec.parallelLimit`, `spec.adversarialVerification`, and `extensions.memory.*`. The DoD says "all config keys" but the deliverables don't enumerate them. | List all 10 config fields explicitly in the deliverables section, or at minimum add a note like "10 fields total per config-schema.md" so the executing agent knows the expected scope. |
| 4 | MEDIUM | 01 | Base path strategy has a tension between `<base href="/zoto-agents/">` (breaks `file://` protocol) and relative paths (works everywhere). Subtask 01 presents both options without recommending one; subtask 09 recommends relative paths. This split guidance could lead the subtask 01 agent to choose `<base>` and the subtask 09 agent to later rework all links. | Resolve in subtask 01: recommend relative paths as the primary strategy and remove or clearly deprecate the `<base>` tag option. |
| 5 | LOW | 04 | Implicit soft dependency on subtask 02. The landing page's implementation notes say "use the workflow overview diagram from subtask 02 if available" — but subtask 04 runs in Phase 2 alongside subtask 02, so the diagram may not exist yet. The notes handle this gracefully ("or provide a text-based summary") but the executing agent may not handle the conditional well. | Add a brief note to the deliverables: "If `workflow-overview.svg` is not yet available, use a text-based 3-step summary that subtask 09 will enhance with the diagram." |
| 6 | LOW | — | No rollback plan. The spec's risk assessment covers 6 risks but does not describe what happens if the site deployment fails or needs to be reverted. | Add a brief rollback note to the spec index: "Rollback: delete the `site/` directory and the GitHub Actions workflow. No other repo files are modified." |
| 7 | LOW | — | Prism.js CDN version not pinned. The spec references "Prism.js from CDN" but does not specify a version, which could lead to breaking changes if the CDN updates. | Pin a specific Prism.js version in subtask 01's implementation notes (e.g., `prism@1.29.0`). |

### Dependency Graph

- **Graph matches manifest**: All 16 edges in the Mermaid diagram correspond exactly to declared dependencies in the subtask manifest. No missing or extra edges.
- **No missing implicit dependencies detected**: Subtask 09's transitive coverage of subtasks 02 and 03 (through pages 06–08) is sufficient for its verification role.
- **Parallelism is well-utilized**: Phase 2 runs 4 subtasks in parallel, Phase 3 runs 3. No over-serialization detected.
- **One potential optimization**: Subtask 05 (Config Reference) could theoretically run in parallel with Phase 3 subtasks since no Phase 3 subtask depends on it — only subtask 09 does. However, keeping it in Phase 2 is reasonable since it has no Phase 2 dependencies and can start immediately.

### Risk Summary

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| SVG/mockup quality insufficient | High | Medium | Set explicit quality floor; define fallback to HTML/CSS alternatives in subtask 09 |
| Subtask 08 exceeds agent session capacity | Medium | Medium | Split into two subtasks or set a clear priority order for sections |
| Base path strategy inconsistency across subtasks | Medium | Medium | Resolve in subtask 01 with a single clear recommendation |
| Config reference page misses keys | Low | Low | Enumerate all 10 fields explicitly in subtask 05 deliverables |
| Content drift from actual plugin | Low | Medium | Already mitigated well by referencing source files in each subtask |
| GitHub Actions deployment fails | Low | High | Standard `actions/deploy-pages` pattern; low risk if YAML is valid |

## Recommendation

The spec is well-structured with excellent phasing, thorough implementation guidance, and correct dependencies. It is ready for execution. The two advisories worth addressing before starting are: (1) consider splitting subtask 08 into two subtasks to manage its scope, and (2) set clearer expectations for SVG quality in subtasks 02 and 03, including a fallback strategy if agent-generated SVGs are not satisfactory. The base path strategy should also be resolved definitively in subtask 01 to avoid rework in the integration phase.
