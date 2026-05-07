# Token budget & no-restart memo

## Current state

- **rg:** `tokenBudget|maxTokens|token_budget|max_tokens|context_window` in
  `plugins/zoto-spec-system` → **0 matches** (no excerpts).
- Implicit today: optional agent `model:` frontmatter only.

## Config-key contract (locked)

| Key | Default | Bounds |
| --- | --- | --- |
| `subagents.default.tokenBudget` | 200000 | min 1000, max 2000000 |
| `subagents.<role>.tokenBudget` | inherit | optional gen/exec/judge/subtask |
| `subagents.default.model` | — | optional |
| `subagents.<role>.model` | inherit | optional |
| `aggregator.pollIntervalMs` | 1500 | min 250, max 60000 |
| `aggregator.debounceMs` | 250 | min 50, max 5000 |
| `aggregator.enabled` | true | — |
| `spec.parallelLimit` | schema ST02 | live-reload |

## Resolution algorithm & spawn-role mapping

```text
# r ∈ generator|judge|subtask (executor role meta-only — no routine spawns)
TB(r)=subagents[r].tokenBudget??subagents.default.tokenBudget??200000
M(r)=subagents[r].model??subagents.default.model??<agent model:>
```

| Spawn target | Role |
| --- | --- |
| `zoto-spec-generator` | `generator` |
| `zoto-spec-judge` | `judge` |
| Other (`crux-*`, GP, explore, shell, plugin-mgr) | `subtask` |

## No-restart contract

| Tier | Keys | Reason |
| --- | --- | --- |
| Live-reload | `subagents.*.{tokenBudget,model}` | poll / prefix |
| Live-reload | `aggregator.*`,`spec.parallelLimit` | poll / prefix |
| Fresh invoke | unitOfWork,specsDir,workDir,hooks.*,extensions.* | startup |

## How the executor passes the budget & migration strategy

**How the executor passes the budget:** `Task` omits `maxTokens`. Run `tsx
scripts/spec-spawn-prefix.ts` (**04**) with `--role`, `--status-yml`, `--status-md`;
stdout adds `Token budget: <N>. …` → prepend spawn `prompt`. **Migration strategy:**
Sparse `subagents` → silent defaults (non-breaking); missing `status/` dirs → legacy
spawn (**04** docs branch).
