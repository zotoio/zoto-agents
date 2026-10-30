# Changelog

## Unreleased

## [0.13.0] - 2026-10-30

- Pin every skill to `@zotoio/botz-mcp-swarm-cli` `0.16.0` (install/upgrade with `botz plugins install mcp-swarm --version 0.16.0`); server-updates, refresh/status and tags subcommands ship in CLI `0.16.0`.
- `mcp-swarm-server-updates` / `mcp-swarm-analyse`: refresh from server and last-introspected status (`project server refresh`, `project server status`, stale flag, drift as pending review) and check freshness before raising server findings; `mcp-swarm-platform`: Studio **Refresh from server** / **Last introspected**, the introspection API, `swarm_server_refresh`, `swarm_server_introspection_status` and the gated `swarm_remediation_prompt`.
- Local-mode skills (`mcp-swarm`, `-guided`, `-flow`, `-analyse`, `-descriptions`, `-diagnose`) document using a local inference provider when configured (`SWARM_LLM_PROVIDER`/`SWARM_LLM_BASE_URL`/`SWARM_LLM_MODEL` from the shell, `.env.local` or `.env`; Ollama and OpenAI-compatible `custom`). Allowed in local mode; not a platform feature.
- **Behaviour change — local mode by default.** The plugin no longer wires up the central `swarm` MCP server: `mcp.json` / `.mcp.json` are removed and `.cursor-plugin/plugin.json` has no `mcp` key. Skills and commands describe only local execution of the bundled CLI. The server entry moved to `platform/mcp.json` as an opt-in template.
- New `mcp-swarm-platform` skill and `/z-mcp-swarm-platform` command: turn platform mode on or off per host (Cursor `.cursor/mcp.json`, `claude mcp add`, `codex mcp add`, or `BOTZ_MCP_SWARM_MODE=platform` for CLI/CI). Central MCP server/OAuth, `run --remote` / `--server`, worker mode, service suites and `swarm_*` MCP tools are documented only there; other skills point to it only when platform mode is on.
- `mcp-swarm`: document MCP protocol eras (`protocolEra`, `--protocol-era`, both-era compare, `eraCompare.ignoreKeys`) from CLI `0.15.0`; `mcp-swarm-upgrade` feature table runs through `0.15.0`.
- `mcp-swarm-compare`: note the `scripts/runs-dataset.template.html` page shell from 0.12.1.
- `mcp-swarm-server-updates` / `mcp-swarm-tags` (from #43, local CLI only by default): note the CLI subcommands ship after `0.15.0` (botz-mcp-swarm-cli#28); their platform MCP equivalents are in `mcp-swarm-platform`.
- New `mcp-swarm-server-updates` skill and `/z-mcp-swarm-server-updates` command: check servers for updates (negotiated MCP spec version, serverInfo version, capabilities, tool/resource/template/prompt schemas), review the diff, accept per-proposal surgical suite updates, and manage the server changelog via `botz mcp-swarm project server updates|accept-update|discard-update|changelog` or the `swarm_server_check_updates` / `swarm_server_update_apply` / `swarm_server_changelog` MCP tools.
- New `mcp-swarm-tags` skill and `/z-mcp-swarm-tags` command: suite/server descriptions and ad-hoc tags on suites, scenarios and runs with tag filters (`project suite describe|tag|list --tags`, `project scenarios --tags`, `project scenario-tag`, `project run-tag`, `project runs --tags`; MCP `swarm_describe`, `swarm_tags_set`, `swarm_scenarios_list`, `tags` params).

## [0.12.1] - 2026-10-30

- `mcp-swarm-compare`: the `--html` page shell moved from an inline template literal in `scripts/runs-dataset.mjs` to `scripts/runs-dataset.template.html`, loaded relative to the script and filled with `{{name}}` placeholders. Output is byte-identical; the file ships with the skill directory.

## [0.12.0] - 2026-10-29

- Bundled default central MCP server `swarm` (`https://swarm.botz.ai/mcp`, `type: "http"`) in `mcp.json` and `.mcp.json` with OAuth 2.1 + PKCE + DCR sign-in (and headless `Bearer bzt_...` support), wired in `.cursor-plugin/plugin.json` (`"mcp": "./mcp.json"`).
- Updated `mcp-swarm` skill and docs for `@zotoio/botz-mcp-swarm-cli >= 0.14.0`:
  - **Central Swarm Suite Execution (`run --remote` / `--server https://swarm.botz.ai`)**: Trigger a suite run on the central Swarm server, stream real-time progress/VU/latency events, and retrieve the full `RunReport`.
  - **Distributed VU & OTEL Worker Mode (`botz mcp-swarm worker`)**: Defaults `--server` to `https://swarm.botz.ai`, registers worker capabilities and `--max-vus`, accepts distributed VU slice assignments (`User-Agent: botz-mcp-swarm/<version> (mcp-tester)`), and streams OpenTelemetry traces/metrics (`/otlp/v1/traces`, `/otlp/v1/metrics`, and worker progress events) to the central Swarm server.

## [0.11.0] - 2026-10-29

- Updated skills and docs for `@zotoio/botz-mcp-swarm-cli >= 0.13.0` and the 28-tool `https://swarm.botz.ai/mcp` Streamable-HTTP MCP Server:
  - **28-Tool Swarm MCP Server (`https://swarm.botz.ai/mcp`)**: Full MCP OAuth 2.1 + PKCE + DCR and `bzt_` IAM API keys (`viewer`, `runner`, `editor`, `operator`, `owner`, and least-privilege `service_bridge`), plus 4 `@mcp.prompt` slash workflows (`/swarm_remediate_latest_run`, `/audit_mcp_server`, `/triage_suite_run`, `/soak_test_plan`) and `completion/complete`.
  - **All 7 MCP Specification Stages (`0.13.0`)**: AJV `outputSchema` validation on `structuredContent` (`contract.ts`), 5-field `ToolAnnotations` capture, `ttfpMs` progress tracking (`notifications/progress`), deterministic zero-cost mock handlers for `sampling/createMessage` and `roots/list` (`mcp-session.ts`), and Streamable HTTP session reconnect.
  - **Load Profile Presets & 1h Soak Mode (`0.13.0`)**: `--preset smoke|baseline|peak|spike|soak` (including `soak: 10 VUs · 1h (3600s) hold · ~4 TPS/user · 4 lanes`), `--skip-image-gen` (`X-Swarm-Skip-Image-Gen: 1`), `--skip-expensive-llm` (`X-Swarm-Skip-Expensive-Llm: 1`), conversational load parser, live `vus`/`avgMs`/`p95`/`toolAvgMs` curves, `createdAssets` + `swarm_run_cleanup_assets`, and automatic end-of-run callee completion signaling (`signalCalleeRunCompleted`).

## [0.10.0] - 2026-10-28

- Update skills and docs for `@zotoio/botz-mcp-swarm-cli >= 0.12.0` and Swarm service (`swarm.botz.ai`) unified suite workspace:
  - **Suite version history, changelogs, and per-version disable flag (`0.12.0`):** `project suite versions <project>`, `project suite disable-version <project> --version <n>`, and `project suite enable-version <project> --version <n>`. Each version records a deterministic diff changelog (plus async LLM changelog on the service). Disabled versions are refused by `startSuiteRun` (`suite_version_disabled`), while their stored runs and step details remain inspectable.
  - **Latest-version-only editing rule:** Only the latest suite version (`vN`) and its latest run are editable to create `vN+1`; earlier versions (`v1..v(N-1)`) are strictly read-only for config, step definitions, and JEV eval definitions so edits never fork from an older version and skip newer changes.
  - **Inline JEV eval editing, testing, and batch version saving:** On the Swarm service, `EvalResultsPanel` supports inline editing of multiple eval prompts and assertion criteria, per-card and bulk `Test inline` (LLM probe + JEV judge) and `Re-judge assertions` (fast JEV re-score against existing transcript), and `Save all to new suite version (vN+1)`.
  - **Highlighted `Analyse Run` workflow:** `Analyse Run` is surfaced as a primary CTA across the unified suite workspace and works on all completed runs (errors, eval failures, and latency/SLO diagnostics).
  - **Remote MCP server OpenTelemetry instrumentation (Python & Node.js):** Document how Swarm propagates `X-Swarm-Run-Id: <runId>` on MCP HTTP calls, how remote Python (`psutil`) and Node.js (`AsyncLocalStorage`) MCP servers tag `process.runtime.rss.bytes`, `process.runtime.cpu.ratio`, and RPC/tool histograms with `run.id`, and how secret attributes are scrubbed on both client and server before ZSTD `otel_batches.parquet` compaction.

## [0.9.0] - 2026-10-26

- Plugin icon is now the green botz MCP Swarm mark used on the swarm dashboard and sign-in page: `assets/logo.svg` for the Cursor logo and OpenAI logo/composer icon, with a 256×256 `assets/logo.png`.
- Add `mcp-swarm-analyse` and `/z-mcp-swarm-analyse`: run `botz mcp-swarm suite analyse`, show every proposal with its id, and accept (`--apply <ids>`) or reject (`--reject <ids>`) only the ids the user names. Never auto-accepts or uses `--apply all`. Server bugs and environment issues are report only. Service suites (`0.6.0+`) auto-analyse failed smoke runs and keep the service's RBAC rules: runners analyse, editors and admins accept.
- Add `mcp-swarm-report` and `/z-mcp-swarm-report`: visualise one run in `/canvas` or a self-contained HTML page. `scripts/run-dataset.mjs` builds per-tool latency, error classes, last error, and a sample request and response capped at 4 KB with their source, preferring `sampleResults` (with extractor values redacted to `${name}` and response bodies omitted when the suite has extractors in CLI >= 0.11.1) and falling back to `report.redactedArgs`, record-replay recordings, tool-eval calls, or the suite step template. Multi-server tools are keyed `<alias>/<tool>`. The canvas and the HTML page both have a tool selector.
- `mcp-swarm-report`, `mcp-swarm`, `mcp-swarm-guided`, and `mcp-swarm-diagnose`: prefer `report.loadTimeline` (`buckets`/`points` and `summary.overall` / `summary.tools` with `peakActiveVus`/`peakVus`, `avgActiveVus`/`avgVus`, `peakTps`, `avgTps`) alongside `report.timeSeries` (whole-run per-second p50/p95 response time, never partial), falling back to `report.log` and `loadProfile` for older reports, and surface overall and per-tool peak/average active VUs and TPS.
- Add `mcp-swarm-flow` and `/z-mcp-swarm-flow`: turn a task described in words into a multi-server suite, with server aliases, required extractors between servers, write-like tool confirmation, and the cross-server data flows shown for approval before the first run.
- `mcp-swarm`, `mcp-swarm-guided`, `mcp-swarm-diagnose`, `mcp-swarm-compare`, and `mcp-swarm-upgrade` cover multi-server suites (`0.11.1`): `suite server add`, `--target <alias>=<url>`, alias-prefixed credential flags, per-server results, flow latency, and skipped steps. `mcp-swarm-record-replay` and `mcp-swarm-descriptions` say they work one server at a time.
- Cover CLI 0.8.0–0.11.2 runtime, limit, and ramp-down features across the skills and docs:
  - **Rate-limit retries (`0.8.0`):** HTTP 429, `Retry-After` headers, and rate-limit errors use the `rate_limit` error class (separate from `auth`) and are retried automatically with exponential backoff + jitter (`load.retry`, or `retry: { enabled: false }` to disable); `report.retries` and `nodeOutcomes[].retries` count retries separately without counting toward the suite's error limit until retries are exhausted.
  - **Configurable suite limits (`0.10.0`):** `limits` (`maxCallCount`, `maxPayloadBytes`) in `suite.json`, `--max-call-count <n>` and `--max-payload-bytes <n>` on `run --suite`, `SWARM_MAX_CALL_COUNT` / `SWARM_MAX_PAYLOAD_BYTES`, and `report.limits`. `runs-dataset.mjs` in `mcp-swarm-compare` checks `maxCallCount` and `maxPayloadBytes` for comparability.
  - **Graceful ramp-down (`0.11.0` & `0.11.1`):** `--ramp-down-strategy <graceful|immediate>`, `--drain-timeout-ms <ms>`, `load.rampDown` (`strategy`, `drainTimeoutMs`, `passEstimateMs`), and `report.rampDown` (`incompletePasses`, `cancelledByRampDown`, `skippedPasses`), where passes or server session opens cut off after the drain deadline on any server count as cancelled rather than errors and do not fail the suite.
  - **CLI `0.11.2`:** `@cursor/sdk` `^1.0.40` bump fixing `grok-4.7` default variant on local runtime.
- `mcp-swarm-compare`: `runs-dataset.mjs` keys multi-server tools as `<alias>/<tool>`, adds `serverRows`, `flowP95`, and `passesSkipped`, decides schema changes per server, and reports a flow p95 regression above 20%.
- `mcp-swarm-compare`: `runs-dataset.mjs` takes the server name, version, and endpoint from each report's `server` field, so runs with `--url` or `--target-file` are labelled with the endpoint actually tested. Reports without it (CLI 0.6.1 and earlier) still fall back to the saved suite, are flagged in `comparability`, and have their suite endpoint written the same way the CLI writes it (no URL credentials or query, stdio paths as basenames). Each run row has `serverSource` (`report`, `suite`, or `null`).
- `mcp-swarm-compare`: tools whose catalog schema hash changed between consecutive runs are listed in `comparability` and not scored for regressions, matching `botz mcp-swarm compare`. Only reports without a catalog get the "no tool catalog" note.
- `mcp-swarm`: take the server label from the report's `server` field when present.

## 0.8.0

- Add a `/z-<skill>` command for each skill (`/z-mcp-swarm`, `/z-mcp-swarm-guided`, `/z-mcp-swarm-compare`, `/z-mcp-swarm-descriptions`, `/z-mcp-swarm-record-replay`, `/z-mcp-swarm-diagnose`, `/z-mcp-swarm-upgrade`) that loads the skill with the text after the command as the request, with evals for each.

## 0.7.0

- Add the plugin logo (`assets/logo.png`) for Cursor and as the OpenAI listing logo and composer icon.
- Add `mcp-swarm-guided`: question-driven target, credential, test-data, tool, and load selection, followed by capture, review, run, and summary. Tool selection defaults to all tools; write-like tools need per-tool confirmation and are never enabled on production.
- Add `mcp-swarm-compare` with `scripts/runs-dataset.mjs`: compare two runs or a series, flag non-comparable runs, apply the CLI's regression rules, and chart results in `/canvas` or a self-contained HTML page.
- Add `mcp-swarm-descriptions` (tool description review, `optimize` suggestions, tool-eval measurement) and `mcp-swarm-record-replay`.
- Every output names the MCP server by name and URL or command; suites are named after the server.
- Move the MCP Swarm skills here from `@zotoio/botz-mcp-swarm-cli`, which bundled them through 0.6.x. The plugin is now versioned independently.
- Publish for Cursor, Claude Code, and Codex, with evals for each skill.
- Skills run only when invoked by name and install the `botz` host and its `mcp-swarm` extension on first use.
- `mcp-swarm-upgrade` removes skill copies installed by CLI 0.6.x instead of refreshing them.
