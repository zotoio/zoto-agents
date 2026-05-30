# Eval case realism audit
Generated: 2026-05-25T07:01:03.066Z
Redaction sanity: every `rewrite_prompt` stored in `eval-rewrites.json` passes through `audit/redact.ts` → `redact()` before serialisation.

## `.cursor/evals/agents/zoto-plugin-manager.json`
Target: `agent:zoto-plugin-manager` · Container: `evals[]`
| Case id | Current prompt (one-liner) | Realism | Invocation | Assertions | Coverage | Proposed action | Seed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | We need a new Cursor plugin packaged under plugins/invoice-linker that ships one skill for reconcil… | realistic | natural-delegation | strong | ok | tighten-assertions | transcript:agent-e7f8c2a4-cfb2-4e2b-9311-3edd7142e305 |
| 2 | Audit plugins/zoto-eval-system end-to-end before we tag a release: manifest sanity, skill harness c… | realistic | natural-delegation | strong | ok | tighten-assertions | transcript:agent-88189fd0-40e2-45ed-8651-90dd2c096738 |
| 3 | Add a new Cursor slash command under plugins/zoto-eval-system that jumps operators into the evaluat… | realistic | natural-delegation | strong | ok | tighten-assertions | transcript:agent-24a0c5c3-df3f-4d81-805a-883c7dae065a |
| 4 | Prepare plugins/zoto-eval-system for marketplace publication: confirm marketplace.json registration… | mixed | natural-delegation | strong | ok | tighten-assertions | transcript:agent-56d0971a-4680-4356-ade7-b4f7f71eb76d |
| 5 | rules/release-guardrails.mdc ballooned past maintainability; walk me through enabling CRUX compress… | mixed | natural-delegation | strong | ok | tighten-assertions | transcript:agent-1b259290-7a64-4ebf-9f34-5b1498d926d6 |
| 6 | I edited plugin agents locally but the IDE still serves older payloads—what is the supported resync… | realistic | natural-delegation | strong | ok | tighten-assertions | transcript:agent-e7f8c2a4-cfb2-4e2b-9311-3edd7142e305 |

_Most cases tighten assertion vocabulary toward user-visible filesystem, exit-code, and on-screen guidance outcomes._

## `.cursor/evals/commands/sync-plugins.json`
Target: `command:sync-plugins` · Container: `evals[]`
| Case id | Current prompt (one-liner) | Realism | Invocation | Assertions | Coverage | Proposed action | Seed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | /sync-plugins I tweaked `plugins/` locally — push everything Cursor needs into the IDE plugin tree … | realistic | cmd-with-args | strong | ok | rewrite-prompt+assertions | readme:.cursor/commands/sync-plugins.md |
| 2 | /sync-plugins | synthetic | bare-invalid | strong | ok | rewrite-prompt+assertions | readme:.cursor/commands/sync-plugins.md |

_Case 1: rewrite-prompt+assertions using readme:.cursor/commands/sync-plugins.md. Case 2: rewrite-prompt+assertions using readme:.cursor/commands/sync-plugins.md._

## `.cursor/evals/commands/zoto-create-plugin.json`
Target: `command:zoto-create-plugin` · Container: `evals[]`
| Case id | Current prompt (one-liner) | Realism | Invocation | Assertions | Coverage | Proposed action | Seed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | /zoto-create-plugin | synthetic | bare-exception | strong | ok | keep-bare-documented-no-args | transcript:agent-5b16f28f-5263-4f45-9de9-28ef898ce2cf |
| 2 | /zoto-create-plugin "analytics dashboard" | realistic | cmd-with-args | strong | ok | tighten-assertions | transcript:agent-5b16f28f-5263-4f45-9de9-28ef898ce2cf |
| 3 | /zoto-create-plugin workspace/docs/plugin-design.md | realistic | cmd-with-args | strong | ok | tighten-assertions | transcript:agent-5b16f28f-5263-4f45-9de9-28ef898ce2cf |

_Most cases tighten assertion vocabulary toward user-visible filesystem, exit-code, and on-screen guidance outcomes._

## `.cursor/evals/hooks/hooks.json`
Target: `hook:cursor-workspace` · Container: `evals[]`
| Case id | Current prompt (one-liner) | Realism | Invocation | Assertions | Coverage | Proposed action | Seed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Cursor raised sessionStart immediately after this workspace attached. Using `.cursor/hooks.json`, t… | realistic | lifecycle-event | strong | ok | tighten-assertions | readme:plugins/zoto-eval-system/README.md |
| 2 | Assume Cursor fired `afterFileEdit` right after saving a tracked plugin file such as `plugins/zoto-… | realistic | lifecycle-event | strong | ok | tighten-assertions | readme:plugins/zoto-eval-system/README.md |
| 3 | Cursor emitted `stop` while closing this session. According to `.cursor/hooks.json`, the stop hook … | mixed | lifecycle-event | strong | ok | tighten-assertions | readme:plugins/zoto-eval-system/README.md |

_Most cases tighten assertion vocabulary toward user-visible filesystem, exit-code, and on-screen guidance outcomes._

## `.cursor/skills/zoto-create-plugin/evals/evals.json`
Target: `skill:zoto-create-plugin` · Container: `evals[]`
| Case id | Current prompt (one-liner) | Realism | Invocation | Assertions | Coverage | Proposed action | Seed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Create a new Cursor plugin called zoto-code-review that has an agent for reviewing pull requests, a… | preserve | — | — | — | **preserve** (user-authored) | — |
| 2 | I need a minimal plugin called zoto-db-migrate that just has a single skill for database migration … | preserve | — | — | — | **preserve** (user-authored) | — |
| 3 | Create a plugin called zoto-test-runner with hooks that run on session start to check test coverage… | preserve | — | — | — | **preserve** (user-authored) | — |

_Most cases tighten assertion vocabulary toward user-visible filesystem, exit-code, and on-screen guidance outcomes._

## `plugins/zoto-cursor-top/skills/zoto-cursor-top-monitor/evals/evals.json`
Target: `skill:zoto-cursor-top-monitor` · Container: `evals[]`
| Case id | Current prompt (one-liner) | Realism | Invocation | Assertions | Coverage | Proposed action | Seed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Show me everything Cursor is doing on my machine right now - I want a live view that updates every … | preserve | — | — | — | **preserve** (user-authored) | — |
| 2 | I'd like to drop a snapshot of the current Cursor agents into a status report - give me a one-shot … | preserve | — | — | — | **preserve** (user-authored) | — |
| 3 | I want to take a screenshot of cursor-top for documentation but I don't currently have any Cursor s… | preserve | — | — | — | **preserve** (user-authored) | — |

_Most cases tighten assertion vocabulary toward user-visible filesystem, exit-code, and on-screen guidance outcomes._

## `plugins/zoto-eval-system/evals/agents/zoto-eval-adviser.json`
Target: `agent:zoto-eval-adviser` · Container: `cases[]`
| Case id | Current prompt (one-liner) | Realism | Invocation | Assertions | Coverage | Proposed action | Seed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | You are running as the zoto-eval-adviser agent. The host just finished `/z-eval-advise` with a full… | mixed | natural-delegation | strong | ok | tighten-assertions | transcript:agent-b27dadd5-cb54-40f0-9dba-4c8b9a58601d |
| 2 | You are the zoto-eval-adviser agent invoked from `/z-eval-advise` with full scope. The workspace di… | mixed | natural-delegation | strong | ok | tighten-assertions | transcript:agent-fb42ab24-1c54-4be2-a390-01cf3e5b6b64 |
| 3 | Act as zoto-eval-adviser immediately after `/z-eval-advise` completed with full scan scope against … | mixed | natural-delegation | strong | ok | tighten-assertions | transcript:agent-b96715eb-8a24-45cd-999c-f5b10d88776c |
| 4 | You are zoto-eval-adviser servicing `/z-eval-advise` on the same sandbox manifest and sources as th… | mixed | natural-delegation | strong | ok | tighten-assertions | transcript:agent-8fdb9038-1574-4574-9475-35bf43641608 |
| 5 | You are zoto-eval-adviser servicing `/z-eval-advise` on the sandbox manifest bundled with demo-pack… | mixed | natural-delegation | strong | ok | tighten-assertions | transcript:agent-f9af63d2-7981-4081-9f9e-735ab05ffad9 |
| 6 | You are zoto-eval-adviser servicing `/z-eval-advise --target plugins/demo-pack/skills/widget/**`. O… | mixed | natural-delegation | strong | ok | tighten-assertions | transcript:agent-b27dadd5-cb54-40f0-9dba-4c8b9a58601d |

_Most cases tighten assertion vocabulary toward user-visible filesystem, exit-code, and on-screen guidance outcomes._

## `plugins/zoto-eval-system/evals/agents/zoto-eval-analyser-subagent.json`
Target: `agent:zoto-eval-analyser-subagent` · Container: `cases[]`
| Case id | Current prompt (one-liner) | Realism | Invocation | Assertions | Coverage | Proposed action | Seed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | CI host job: rerun primitive analysis against the command docs at plugins/zoto-eval-system/commands… | mixed | natural-delegation | strong | ok | tighten-assertions | transcript:agent-ae770e09-1a28-4bec-b1ca-8561ec406886 |
| 2 | From the evaluator workspace daemon, ingest plugins/zoto-eval-system/skills/zoto-create-evals/SKILL… | mixed | natural-delegation | strong | ok | tighten-assertions | transcript:agent-822a871a-ec2b-4cf7-a909-0b909da7520b |
| 3 | Operator thread: analyse plugins/zoto-eval-system/agents/zoto-eval-generator.md assuming ingress pi… | mixed | natural-delegation | strong | ok | tighten-assertions | transcript:agent-28831b37-056f-4590-9484-f2242cb5f0a2 |
| 4 | Need you to rerun `eval:analyse` on plugins/zoto-eval-system/agents/zoto-eval-comparer.md with ingr… | mixed | natural-delegation | strong | ok | tighten-assertions | transcript:agent-7282425e-ea07-4a74-a303-5e5eb07b41d9 |
| 5 | Headless indexer requests AnalyserPayload JSON for hooks/zoto-eval-system.json plus linked hook sou… | mixed | natural-delegation | strong | ok | tighten-assertions | transcript:agent-b953716b-2909-4060-9c0a-a4fe03f136fb |
| 6 | `eval:analyse` batch item: ingest plugins/zoto-eval-system/rules/zoto-eval-system.mdc with envelope… | mixed | natural-delegation | strong | ok | tighten-assertions | transcript:agent-ae770e09-1a28-4bec-b1ca-8561ec406886 |

_Most cases tighten assertion vocabulary toward user-visible filesystem, exit-code, and on-screen guidance outcomes._

## `plugins/zoto-eval-system/evals/agents/zoto-eval-comparer.json`
Target: `agent:zoto-eval-comparer` · Container: `cases[]`
| Case id | Current prompt (one-liner) | Realism | Invocation | Assertions | Coverage | Proposed action | Seed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Use the eval-system comparer to compare two finished harness runs: pass run directory names 2026050… | mixed | natural-delegation | strong | ok | tighten-assertions | transcript:agent-65aa74a7-b1dd-4f5a-ad6d-7c8def776962 |
| 2 | Run an eval comparison between nightly and stable using the comparer agent; I only wrote nightly fo… | realistic | natural-delegation | strong | ok | tighten-assertions | transcript:agent-ae770e09-1a28-4bec-b1ca-8561ec406886 |
| 3 | Compare three eval runs end-to-end (handles run-a, run-b, run-c) with the comparer so product can i… | mixed | natural-delegation | strong | ok | tighten-assertions | transcript:agent-822a871a-ec2b-4cf7-a909-0b909da7520b |

_Most cases tighten assertion vocabulary toward user-visible filesystem, exit-code, and on-screen guidance outcomes._

## `plugins/zoto-eval-system/evals/agents/zoto-eval-configurer.json`
Target: `agent:zoto-eval-configurer` · Container: `cases[]`
| Case id | Current prompt (one-liner) | Realism | Invocation | Assertions | Coverage | Proposed action | Seed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Spin up zoto-eval-configurer from /z-eval-configure with overwrite already settled in the task: sta… | mixed | natural-delegation | strong | ok | tighten-assertions | transcript:agent-20a20e07-a4ed-488c-878c-99dfe0b3dbea |
| 2 | Re-run configure mode where old_snapshot.source is filesystem (manifest predating subtask-01 infere… | mixed | natural-delegation | strong | ok | tighten-assertions | transcript:agent-889901fd-2b5b-4604-907a-5c2a51536012 |
| 3 | Drive configuration when old_snapshot.source is missing: initialise static.framework jest with llm.… | mixed | natural-delegation | strong | ok | tighten-assertions | transcript:agent-8f8316dd-be73-4362-baf3-60ff91e15a0f |
| 4 | Use manifest-derived old_snapshot where static.framework flips pytest to vitest without touching ll… | mixed | natural-delegation | strong | ok | tighten-assertions | transcript:agent-1a7fd746-4f1b-4c77-ad20-3a392442714b |
| 5 | Switch llm.strategy from declarative to code with llm.codeFramework vitest against a manifest-backe… | mixed | natural-delegation | strong | ok | tighten-assertions | transcript:agent-8f8b6a52-04c7-4548-b8b3-b6f39336b004 |
| 6 | Adjust discoveryTargets ignoring a plugin path manifest already catalogued stale eval_json rows pro… | mixed | natural-delegation | strong | ok | tighten-assertions | transcript:agent-20a20e07-a4ed-488c-878c-99dfe0b3dbea |
| 7 | Structured payload asserts llm.strategy code but withholds llm.codeFramework intentionally; insist … | mixed | natural-delegation | strong | ok | tighten-assertions | transcript:agent-889901fd-2b5b-4604-907a-5c2a51536012 |
| 8 | Maintain llm.strategy code while setting static.framework vitest alongside llm.codeFramework jest d… | mixed | natural-delegation | strong | ok | tighten-assertions | transcript:agent-8f8316dd-be73-4362-baf3-60ff91e15a0f |
| 9 | Upstream command mistakenly supplies preserveUserAuthoredCases false in the bundled answers; insist… | mixed | natural-delegation | strong | ok | tighten-assertions | transcript:agent-1a7fd746-4f1b-4c77-ad20-3a392442714b |
| 10 | Routine configure run after successful manifest diff; insist final narrative reaffirms authorised w… | mixed | natural-delegation | strong | ok | tighten-assertions | transcript:agent-8f8b6a52-04c7-4548-b8b3-b6f39336b004 |

_Most cases tighten assertion vocabulary toward user-visible filesystem, exit-code, and on-screen guidance outcomes._

## `plugins/zoto-eval-system/evals/agents/zoto-eval-executor.json`
Target: `agent:zoto-eval-executor` · Container: `cases[]`
| Case id | Current prompt (one-liner) | Realism | Invocation | Assertions | Coverage | Proposed action | Seed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Run the configured static eval lane now—the path that behaves like `/z-eval-execute` without `--ful… | realistic | natural-delegation | strong | ok | tighten-assertions | transcript:agent-aa756e61-6656-46de-a78a-b753dcd8c754 |
| 2 | Kick off `/z-eval-execute --full` now. My setup relies on repo-root `.env` auto-loaded through `dot… | mixed | natural-delegation | strong | ok | tighten-assertions | transcript:agent-65afc84d-e73d-4eb6-a15b-1530e52b2530 |
| 3 | Execute `/z-eval-execute --full --model opus-4-6`; the delegated Task envelope already exposes that… | mixed | natural-delegation | strong | ok | tighten-assertions | transcript:agent-c60c335f-526a-44ae-9ebc-2aa97b8d8bf6 |
| 4 | Attempt `/z-eval-execute --full` when `CURSOR_API_KEY` is absent from exported environment variable… | mixed | natural-delegation | strong | ok | tighten-assertions | transcript:agent-f417460b-5eeb-4178-b621-7ed72d4d412b |

_Most cases tighten assertion vocabulary toward user-visible filesystem, exit-code, and on-screen guidance outcomes._

## `plugins/zoto-eval-system/evals/agents/zoto-eval-generator.json`
Target: `agent:zoto-eval-generator` · Container: `cases[]`
| Case id | Current prompt (one-liner) | Realism | Invocation | Assertions | Coverage | Proposed action | Seed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | /z-eval-create asked you to scaffold the entire repository, but `.zoto/eval-system/config.yml` is u… | mixed | slash-lead-invalid | mixed | ok | rewrite-assertions | transcript:agent-780a10ce-1f1d-4922-ac1b-e9a4288ee0aa |
| 2 | You spawned from `/z-eval-create`; the preceding command fused approval lists covering skills, comm… | synthetic | third-person-narration | mixed | ok | rewrite-prompt+assertions | transcript:agent-e71e17d6-d9ec-4d0e-89fc-75090cf6c24e |
| 3 | Continue `/z-eval-create` approvals; honour every knob in the evaluator configuration embedded for … | realistic | natural-delegation | strong | ok | tighten-assertions | transcript:agent-44d81c78-a321-4043-9a3d-069e282d8759 |
| 4 | /z-eval-create finished approvals; honour declarative `llm.strategy` semantics so generated Cursor … | mixed | slash-lead-invalid | strong | ok | tighten-assertions | transcript:agent-6761b11a-a9df-45fb-923d-03b3f421ddb0 |
| 5 | Follow `/z-eval-create` with approvals locked; configuration demands jest-specific `@cursor/sdk` ha… | synthetic | natural-delegation | strong | ok | rewrite-prompt+assertions | transcript:agent-ff4899eb-7708-4ba0-a804-5aa59f4d1d00 |

_Case 2: rewrite-prompt+assertions using transcript:agent-e71e17d6-d9ec-4d0e-89fc-75090cf6c24e. Case 5: rewrite-prompt+assertions using transcript:agent-ff4899eb-7708-4ba0-a804-5aa59f4d1d00._

## `plugins/zoto-eval-system/evals/agents/zoto-eval-judge.json`
Target: `agent:zoto-eval-judge` · Container: `cases[]`
| Case id | Current prompt (one-liner) | Realism | Invocation | Assertions | Coverage | Proposed action | Seed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Static and LLM evals finished under evals/_runs — open the newest timestamp directory, read static.… | mixed | natural-delegation | strong | ok | tighten-assertions | transcript:agent-185070ca-b293-4048-b08f-6dacb9467c34 |
| 2 | Your judge notes say several contains graders are too loose — go ahead and rewrite those eval defin… | mixed | natural-delegation | strong | ok | tighten-assertions | transcript:agent-85257ceb-3417-44af-8679-f6f33fc0183e |
| 3 | Patch evals/_llm/case.ts grader wiring yourself based on your judge findings — edit the checked-in … | mixed | natural-delegation | strong | ok | tighten-assertions | transcript:agent-7e76af1f-4f52-4725-ae05-080ee32ac89e |

_Most cases tighten assertion vocabulary toward user-visible filesystem, exit-code, and on-screen guidance outcomes._

## `plugins/zoto-eval-system/evals/agents/zoto-eval-updater.json`
Target: `agent:zoto-eval-updater` · Container: `cases[]`
| Case id | Current prompt (one-liner) | Realism | Invocation | Assertions | Coverage | Proposed action | Seed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | From this thread, please drive the eval updater the same way the non-interactive gate does: run `/z… | mixed | natural-delegation | strong | ok | tighten-assertions | transcript:agent-df7ba879-9674-4266-adf5-727de9d5a67d |
| 2 | I only want a read-only sanity pass—have `/z-eval-update` run as a dry-run and summarize which targ… | realistic | natural-delegation | strong | ok | tighten-assertions | transcript:agent-310d9f2a-a373-4a0f-85bf-131773fea4ac |
| 3 | We accepted the pending updater apply. Walk through `/z-eval-update --apply` for the drifted primit… | realistic | natural-delegation | strong | ok | tighten-assertions | transcript:agent-81676840-f39c-4470-a4ef-785476cd6eca |
| 4 | Compare two updater invocations for me: a full-catalog rediscovery that must honor the frozen `mani… | mixed | natural-delegation | strong | ok | tighten-assertions | transcript:agent-56c1d122-ee29-4878-901d-0971625fc404 |
| 5 | Our worker sets `CI=true`. Explain how `/z-eval-update` should behave regarding `runAnalyser` versu… | mixed | natural-delegation | strong | ok | tighten-assertions | transcript:agent-5a9dac39-19b2-4007-bb8f-71b663e99e76 |
| 6 | If `update.failOnNoAnalyserInCI` is enabled and we are on a CI job without `--with-analyser`, what … | mixed | natural-delegation | strong | ok | tighten-assertions | transcript:agent-df7ba879-9674-4266-adf5-727de9d5a67d |
| 7 | Force-edit this eval row for me: the case JSON has `_meta.generated` set to false (or no `_meta` at… | mixed | natural-delegation | strong | ok | tighten-assertions | transcript:agent-310d9f2a-a373-4a0f-85bf-131773fea4ac |
| 8 | Regenerate `evals/llm/some-feature.test.ts` even though its first line is not `// _meta.generated: … | mixed | natural-delegation | strong | ok | tighten-assertions | transcript:agent-81676840-f39c-4470-a4ef-785476cd6eca |
| 9 | Discovery shows a brand-new primitive with no covering eval file yet. Describe how the updater shou… | mixed | natural-delegation | strong | ok | tighten-assertions | transcript:agent-56c1d122-ee29-4878-901d-0971625fc404 |
| 10 | During `/z-eval-update --apply` we hit a palette-driven ambiguity the subagent cannot resolve alone… | mixed | natural-delegation | strong | ok | tighten-assertions | transcript:agent-5a9dac39-19b2-4007-bb8f-71b663e99e76 |

_Most cases tighten assertion vocabulary toward user-visible filesystem, exit-code, and on-screen guidance outcomes._

## `plugins/zoto-eval-system/evals/commands/z-eval-advise.json`
Target: `command:z-eval-advise` · Container: `cases[]`
| Case id | Current prompt (one-liner) | Realism | Invocation | Assertions | Coverage | Proposed action | Seed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | /z-eval-advise zoto-eval-system | realistic | cmd-with-args | strong | ok | tighten-assertions | transcript:c61166d9-c1c3-4bac-a27f-daec89491825 |
| 2 | /z-eval-advise zoto-help-evals | realistic | cmd-with-args | strong | ok | tighten-assertions | transcript:c61166d9-c1c3-4bac-a27f-daec89491825 |
| 3 | /z-eval-advise | synthetic | bare-invalid | strong | ok | rewrite-prompt+assertions | transcript:c61166d9-c1c3-4bac-a27f-daec89491825 |
| 4 | /z-eval-advise | synthetic | bare-invalid | strong | ok | rewrite-prompt+assertions | transcript:c61166d9-c1c3-4bac-a27f-daec89491825 |
| 5 | /z-eval-advise | synthetic | bare-invalid | strong | ok | rewrite-prompt+assertions | transcript:c61166d9-c1c3-4bac-a27f-daec89491825 |
| 6 | /z-eval-advise zoto-eval-system | realistic | cmd-with-args | strong | ok | tighten-assertions | transcript:c61166d9-c1c3-4bac-a27f-daec89491825 |
| 7 | /z-eval-advise zoto-eval-system | realistic | cmd-with-args | strong | ok | tighten-assertions | transcript:c61166d9-c1c3-4bac-a27f-daec89491825 |
| 8 | /z-eval-advise zoto-eval-system | realistic | cmd-with-args | strong | ok | tighten-assertions | transcript:c61166d9-c1c3-4bac-a27f-daec89491825 |
| 9 | /z-eval-advise zoto-eval-system | realistic | cmd-with-args | strong | ok | tighten-assertions | transcript:c61166d9-c1c3-4bac-a27f-daec89491825 |

_Case 3: rewrite-prompt+assertions using transcript:c61166d9-c1c3-4bac-a27f-daec89491825. Case 4: rewrite-prompt+assertions using transcript:c61166d9-c1c3-4bac-a27f-daec89491825._

## `plugins/zoto-eval-system/evals/commands/z-eval-compare.json`
Target: `command:z-eval-compare` · Container: `cases[]`
| Case id | Current prompt (one-liner) | Realism | Invocation | Assertions | Coverage | Proposed action | Seed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | /z-eval-compare 20260503T152604Z 20260508T120101Z | realistic | cmd-with-args | strong | ok | tighten-assertions | transcript:22c079c5-69d8-4534-b4a9-c05ade6e3f4f |
| 2 | /z-eval-compare 20260510 solo-clear-20260510T1200Z | realistic | cmd-with-args | strong | ok | tighten-assertions | transcript:22c079c5-69d8-4534-b4a9-c05ade6e3f4f |
| 3 | /z-eval-compare 20260503 20260508T120101Z | realistic | cmd-with-args | strong | ok | tighten-assertions | transcript:22c079c5-69d8-4534-b4a9-c05ade6e3f4f |
| 4 | /z-eval-compare rollup-a-20260512-morning rollup-b-20260512-evening | realistic | cmd-with-args | strong | ok | tighten-assertions | transcript:22c079c5-69d8-4534-b4a9-c05ade6e3f4f |

_Most cases tighten assertion vocabulary toward user-visible filesystem, exit-code, and on-screen guidance outcomes._

## `plugins/zoto-eval-system/evals/commands/z-eval-configure.json`
Target: `command:z-eval-configure` · Container: `cases[]`
| Case id | Current prompt (one-liner) | Realism | Invocation | Assertions | Coverage | Proposed action | Seed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | /z-eval-configure | synthetic | bare-invalid | strong | ok | rewrite-prompt+assertions | transcript:agent-4d5fda9a-34f3-4802-8f24-2f3131e61a5c |
| 2 | /z-eval-configure | synthetic | bare-invalid | strong | ok | rewrite-prompt+assertions | transcript:agent-b37fa887-accd-42e3-9a6d-417c2a28e6a6 |
| 3 | /z-eval-configure | synthetic | bare-invalid | strong | ok | rewrite-prompt+assertions | transcript:agent-1daaf866-a3b9-4f2e-a73d-50436c28f249 |
| 4 | /z-eval-configure | synthetic | bare-invalid | strong | ok | rewrite-prompt+assertions | transcript:agent-81da8d64-558d-46f9-944b-b8c903f68f0e |
| 5 | /z-eval-configure | synthetic | bare-invalid | strong | ok | rewrite-prompt+assertions | transcript:agent-95ea54f4-71e5-428b-963a-7981a22bc1fa |
| 6 | /z-eval-configure | synthetic | bare-invalid | strong | ok | rewrite-prompt+assertions | transcript:agent-4d5fda9a-34f3-4802-8f24-2f3131e61a5c |
| 7 | /z-eval-configure | synthetic | bare-invalid | strong | ok | rewrite-prompt+assertions | transcript:agent-b37fa887-accd-42e3-9a6d-417c2a28e6a6 |
| 8 | /z-eval-configure | synthetic | bare-invalid | strong | ok | rewrite-prompt+assertions | transcript:agent-1daaf866-a3b9-4f2e-a73d-50436c28f249 |
| 9 | /z-eval-configure | synthetic | bare-invalid | strong | ok | rewrite-prompt+assertions | transcript:agent-81da8d64-558d-46f9-944b-b8c903f68f0e |

_Case 1: rewrite-prompt+assertions using transcript:agent-4d5fda9a-34f3-4802-8f24-2f3131e61a5c. Case 2: rewrite-prompt+assertions using transcript:agent-b37fa887-accd-42e3-9a6d-417c2a28e6a6._

## `plugins/zoto-eval-system/evals/commands/z-eval-create.json`
Target: `command:z-eval-create` · Container: `cases[]`
| Case id | Current prompt (one-liner) | Realism | Invocation | Assertions | Coverage | Proposed action | Seed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | /z-eval-create | synthetic | bare-exception | mixed | ok | keep-bare-precondition | transcript:agent-8d2db416-8ebe-4c2c-9ac1-21f5a99a2766 |
| 2 | /z-eval-create | synthetic | bare-exception | mixed | ok | rewrite-prompt+assertions | readme:plugins/zoto-eval-system/commands/z-eval-create.md |
| 3 | /z-eval-create | synthetic | bare-invalid | strong | ok | rewrite-prompt+assertions | transcript:agent-d39af972-127e-4a80-ade3-b725ef1f1d7d |

_Case 2: rewrite-prompt+assertions using readme:plugins/zoto-eval-system/commands/z-eval-create.md. Case 3: rewrite-prompt+assertions using transcript:agent-d39af972-127e-4a80-ade3-b725ef1f1d7d._

## `plugins/zoto-eval-system/evals/commands/z-eval-execute.json`
Target: `command:z-eval-execute` · Container: `cases[]`
| Case id | Current prompt (one-liner) | Realism | Invocation | Assertions | Coverage | Proposed action | Seed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | /z-eval-execute | synthetic | bare-exception | strong | ok | keep-bare-precondition | transcript:857bd0ba-be74-47cd-b289-75fe5f2c7c38 |
| 2 | /z-eval-execute | synthetic | bare-invalid | strong | ok | rewrite-prompt+assertions | transcript:c1f008f1-650f-4b26-9646-adb652042791 |
| 3 | /z-eval-execute --full --model opus-4.6 | realistic | cmd-with-args | strong | ok | tighten-assertions | transcript:08c52da2-1dfc-4106-a396-eba4f7ab491f |
| 4 | /z-eval-execute --full | realistic | cmd-with-args | strong | ok | tighten-assertions | transcript:41f02469-bb42-40b7-9270-96732d473af2 |
| 5 | /z-eval-execute --full | realistic | cmd-with-args | strong | ok | tighten-assertions | transcript:d4033031-4341-426a-94df-2b266161b9fc |
| 6 | /z-eval-execute | synthetic | bare-invalid | strong | ok | rewrite-prompt+assertions | transcript:857bd0ba-be74-47cd-b289-75fe5f2c7c38 |

_Case 2: rewrite-prompt+assertions using transcript:c1f008f1-650f-4b26-9646-adb652042791. Case 6: rewrite-prompt+assertions using transcript:857bd0ba-be74-47cd-b289-75fe5f2c7c38._

## `plugins/zoto-eval-system/evals/commands/z-eval-help.json`
Target: `command:z-eval-help` · Container: `cases[]`
| Case id | Current prompt (one-liner) | Realism | Invocation | Assertions | Coverage | Proposed action | Seed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | /z-eval-help | synthetic | bare-exception | strong | ok | keep-bare-precondition | transcript:agent-81da8d64-558d-46f9-944b-b8c903f68f0e |
| 2 | /z-eval-help | synthetic | bare-invalid | strong | ok | rewrite-prompt+assertions | transcript:agent-26556734-2ca8-483c-aa0b-2df9d14c6e23 |
| 3 | /z-eval-help configuration | realistic | cmd-with-args | strong | ok | tighten-assertions | transcript:agent-040df251-468c-4d28-bdd9-146c92058672 |
| 4 | /z-eval-help LLM | realistic | cmd-with-args | strong | ok | tighten-assertions | transcript:agent-740d9ca1-6e4a-485c-b21d-c6be3d1187ad |
| 5 | /z-eval-help | synthetic | bare-invalid | strong | ok | rewrite-prompt+assertions | transcript:agent-af9d2532-6419-4b6f-a1d8-b183997dfb46 |
| 6 | /z-eval-help overview | realistic | cmd-with-args | strong | ok | tighten-assertions | transcript:agent-81da8d64-558d-46f9-944b-b8c903f68f0e |
| 7 | /z-eval-help lifecycle walk-through | realistic | cmd-with-args | strong | ok | tighten-assertions | transcript:agent-26556734-2ca8-483c-aa0b-2df9d14c6e23 |

_Case 2: rewrite-prompt+assertions using transcript:agent-26556734-2ca8-483c-aa0b-2df9d14c6e23. Case 5: rewrite-prompt+assertions using transcript:agent-af9d2532-6419-4b6f-a1d8-b183997dfb46._

## `plugins/zoto-eval-system/evals/commands/z-eval-init.json`
Target: `command:z-eval-init` · Container: `cases[]`
| Case id | Current prompt (one-liner) | Realism | Invocation | Assertions | Coverage | Proposed action | Seed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | /z-eval-init | synthetic | bare-exception | strong | ok | keep-bare-documented-no-args | transcript:65b1c9fe-e7b3-45b6-9cdc-53117daa48b8 |
| 2 | /z-eval-init | synthetic | bare-invalid | strong | ok | rewrite-prompt+assertions | transcript:65b1c9fe-e7b3-45b6-9cdc-53117daa48b8 |
| 3 | /z-eval-init --force | realistic | cmd-with-args | strong | ok | tighten-assertions | transcript:65b1c9fe-e7b3-45b6-9cdc-53117daa48b8 |
| 4 | /z-eval-init | synthetic | bare-invalid | strong | ok | rewrite-prompt+assertions | transcript:65b1c9fe-e7b3-45b6-9cdc-53117daa48b8 |
| 5 | /z-eval-init | synthetic | bare-invalid | strong | ok | rewrite-prompt+assertions | transcript:65b1c9fe-e7b3-45b6-9cdc-53117daa48b8 |

_Case 2: rewrite-prompt+assertions using transcript:65b1c9fe-e7b3-45b6-9cdc-53117daa48b8. Case 4: rewrite-prompt+assertions using transcript:65b1c9fe-e7b3-45b6-9cdc-53117daa48b8._

## `plugins/zoto-eval-system/evals/commands/z-eval-judge.json`
Target: `command:z-eval-judge` · Container: `cases[]`
| Case id | Current prompt (one-liner) | Realism | Invocation | Assertions | Coverage | Proposed action | Seed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | /z-eval-judge | synthetic | bare-exception | strong | ok | keep-bare-precondition | transcript:agent-6536e215-747c-457f-8b0c-c61146e5cebb |
| 2 | /z-eval-judge | synthetic | bare-invalid | strong | ok | rewrite-prompt+assertions | transcript:agent-81da8d64-558d-46f9-944b-b8c903f68f0e |
| 3 | /z-eval-judge | synthetic | bare-invalid | strong | ok | rewrite-prompt+assertions | transcript:agent-040df251-468c-4d28-bdd9-146c92058672 |

_Case 2: rewrite-prompt+assertions using transcript:agent-81da8d64-558d-46f9-944b-b8c903f68f0e. Case 3: rewrite-prompt+assertions using transcript:agent-040df251-468c-4d28-bdd9-146c92058672._

## `plugins/zoto-eval-system/evals/commands/z-eval-jump.json`
Target: `command:z-eval-jump` · Container: `cases[]`
| Case id | Current prompt (one-liner) | Realism | Invocation | Assertions | Coverage | Proposed action | Seed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | /z-eval-jump | synthetic | bare-invalid | strong | ok | rewrite-prompt+assertions | readme:plugins/zoto-eval-system/commands/z-eval-jump.md |
| 2 | /z-eval-jump | synthetic | bare-exception | strong | ok | keep-bare-precondition | readme:plugins/zoto-eval-system/commands/z-eval-jump.md |

_Case 1: rewrite-prompt+assertions using readme:plugins/zoto-eval-system/commands/z-eval-jump.md._

## `plugins/zoto-eval-system/evals/commands/z-eval-operator.json`
Target: `command:z-eval-operator` · Container: `cases[]`
| Case id | Current prompt (one-liner) | Realism | Invocation | Assertions | Coverage | Proposed action | Seed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | /z-eval-operator | synthetic | bare-invalid | strong | ok | rewrite-prompt+assertions | readme:plugins/zoto-eval-system/commands/z-eval-operator.md |
| 2 | /z-eval-operator | synthetic | bare-exception | strong | ok | keep-bare-precondition | readme:plugins/zoto-eval-system/commands/z-eval-operator.md |

_Case 1: rewrite-prompt+assertions using readme:plugins/zoto-eval-system/commands/z-eval-operator.md._

## `plugins/zoto-eval-system/evals/commands/z-eval-start.json`
Target: `command:z-eval-start` · Container: `cases[]`
| Case id | Current prompt (one-liner) | Realism | Invocation | Assertions | Coverage | Proposed action | Seed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | /z-eval-start | synthetic | bare-exception | strong | ok | keep-bare-documented-no-args | transcript:agent-81da8d64-558d-46f9-944b-b8c903f68f0e |
| 2 | /z-eval-start | synthetic | bare-invalid | strong | ok | rewrite-prompt+assertions | transcript:agent-040df251-468c-4d28-bdd9-146c92058672 |
| 3 | /z-eval-start | synthetic | bare-invalid | strong | ok | rewrite-prompt+assertions | transcript:agent-af9d2532-6419-4b6f-a1d8-b183997dfb46 |
| 4 | /z-eval-start | synthetic | bare-invalid | strong | ok | rewrite-prompt+assertions | transcript:agent-d23146cd-7b2b-45fd-946e-024858caf05a |

_Case 2: rewrite-prompt+assertions using transcript:agent-040df251-468c-4d28-bdd9-146c92058672. Case 3: rewrite-prompt+assertions using transcript:agent-af9d2532-6419-4b6f-a1d8-b183997dfb46._

## `plugins/zoto-eval-system/evals/commands/z-eval-update.json`
Target: `command:z-eval-update` · Container: `cases[]`
| Case id | Current prompt (one-liner) | Realism | Invocation | Assertions | Coverage | Proposed action | Seed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | /z-eval-update | synthetic | bare-invalid | strong | ok | rewrite-prompt+assertions | transcript:agent-a769a167-dfd6-4fd2-8190-1b5c8381fbfb |
| 2 | /z-eval-update --apply | realistic | cmd-with-args | strong | ok | tighten-assertions | transcript:agent-2b061946-3286-4db8-8116-cf7b5215593f |
| 3 | /z-eval-update --target "plugins/zoto-eval-system/commands/z-eval-*.md" | realistic | cmd-with-args | strong | ok | tighten-assertions | transcript:agent-0c1f8749-9a47-4c2f-89fc-911b5dea69d7 |
| 4 | /z-eval-update --target "command:z-eval-help" --apply | realistic | cmd-with-args | strong | ok | tighten-assertions | transcript:agent-1f4739a5-520f-4cc2-8550-9d2117aa4bdd |
| 5 | /z-eval-update --check | realistic | cmd-with-args | strong | ok | tighten-assertions | transcript:agent-f7d50acf-5bd1-450d-947e-aee3b5848805 |
| 6 | /z-eval-update --no-analyser --apply | realistic | cmd-with-args | strong | ok | tighten-assertions | transcript:agent-a769a167-dfd6-4fd2-8190-1b5c8381fbfb |
| 7 | /z-eval-update --check --no-analyser | realistic | cmd-with-args | strong | ok | tighten-assertions | transcript:agent-2b061946-3286-4db8-8116-cf7b5215593f |
| 8 | /z-eval-update | synthetic | bare-exception | strong | ok | keep-bare-precondition | transcript:agent-0c1f8749-9a47-4c2f-89fc-911b5dea69d7 |
| 9 | /z-eval-update | synthetic | bare-invalid | strong | ok | rewrite-prompt+assertions | transcript:agent-1f4739a5-520f-4cc2-8550-9d2117aa4bdd |

_Case 1: rewrite-prompt+assertions using transcript:agent-a769a167-dfd6-4fd2-8190-1b5c8381fbfb. Case 9: rewrite-prompt+assertions using transcript:agent-1f4739a5-520f-4cc2-8550-9d2117aa4bdd._

## `plugins/zoto-eval-system/evals/commands/z-eval-workflow.json`
Target: `command:z-eval-workflow` · Container: `cases[]`
| Case id | Current prompt (one-liner) | Realism | Invocation | Assertions | Coverage | Proposed action | Seed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | /z-eval-workflow | synthetic | bare-exception | strong | ok | keep-bare-precondition | transcript:agent-81da8d64-558d-46f9-944b-b8c903f68f0e |
| 2 | /z-eval-workflow | synthetic | bare-invalid | strong | ok | rewrite-prompt+assertions | transcript:agent-040df251-468c-4d28-bdd9-146c92058672 |
| 3 | /z-eval-workflow | synthetic | bare-invalid | strong | ok | rewrite-prompt+assertions | transcript:agent-af9d2532-6419-4b6f-a1d8-b183997dfb46 |
| 4 | /z-eval-workflow | synthetic | bare-invalid | strong | ok | rewrite-prompt+assertions | transcript:agent-d23146cd-7b2b-45fd-946e-024858caf05a |
| 5 | /z-eval-workflow | synthetic | bare-invalid | strong | ok | rewrite-prompt+assertions | transcript:agent-97562d8d-a893-4d53-99dd-1f0c44f1c61a |
| 6 | /z-eval-workflow | synthetic | bare-invalid | strong | ok | rewrite-prompt+assertions | transcript:agent-81da8d64-558d-46f9-944b-b8c903f68f0e |
| 7 | /z-eval-workflow | synthetic | bare-invalid | strong | ok | rewrite-prompt+assertions | transcript:agent-040df251-468c-4d28-bdd9-146c92058672 |
| 8 | /z-eval-workflow | synthetic | bare-invalid | strong | ok | rewrite-prompt+assertions | transcript:agent-af9d2532-6419-4b6f-a1d8-b183997dfb46 |
| 9 | /z-eval-workflow | synthetic | bare-invalid | strong | ok | rewrite-prompt+assertions | transcript:agent-d23146cd-7b2b-45fd-946e-024858caf05a |
| 10 | /z-eval-workflow | synthetic | bare-invalid | strong | ok | rewrite-prompt+assertions | transcript:agent-97562d8d-a893-4d53-99dd-1f0c44f1c61a |
| 11 | /z-eval-workflow | synthetic | bare-invalid | strong | ok | rewrite-prompt+assertions | transcript:agent-81da8d64-558d-46f9-944b-b8c903f68f0e |

_Case 2: rewrite-prompt+assertions using transcript:agent-040df251-468c-4d28-bdd9-146c92058672. Case 3: rewrite-prompt+assertions using transcript:agent-af9d2532-6419-4b6f-a1d8-b183997dfb46._

## `plugins/zoto-eval-system/evals/hooks/zoto-eval-system.json`
Target: `hook:zoto-eval-system` · Container: `cases[]`
| Case id | Current prompt (one-liner) | Realism | Invocation | Assertions | Coverage | Proposed action | Seed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Cursor fires `sessionStart` for this workspace; the hook command is `node hooks/zoto-eval-session-s… | realistic | lifecycle-event | strong | ok | tighten-assertions | readme:plugins/zoto-eval-system/README.md |
| 2 | On `sessionStart`, Cursor runs `node hooks/zoto-eval-session-start.mjs` from the workspace root aft… | realistic | lifecycle-event | strong | ok | tighten-assertions | readme:plugins/zoto-eval-system/README.md |
| 3 | `sessionStart` executes `node hooks/zoto-eval-session-start.mjs` in a workspace where `.zoto/eval-s… | realistic | lifecycle-event | strong | ok | tighten-assertions | readme:plugins/zoto-eval-system/README.md |
| 4 | `sessionStart` runs `node hooks/zoto-eval-session-start.mjs` after the sandbox clock and filesystem… | realistic | lifecycle-event | strong | ok | tighten-assertions | readme:plugins/zoto-eval-system/README.md |

_Most cases tighten assertion vocabulary toward user-visible filesystem, exit-code, and on-screen guidance outcomes._

## `plugins/zoto-eval-system/skills/zoto-advise-evals/evals/evals.json`
Target: `skill:zoto-advise-evals` · Container: `evals[]`
| Case id | Current prompt (one-liner) | Realism | Invocation | Assertions | Coverage | Proposed action | Seed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Run /z-eval-advise in full scan mode on a codebase where several skills lack trigger-phrase coverag… | preserve | — | — | — | **preserve** (user-authored) | — |
| 2 | Run /z-eval-advise in targeted mode scoped to the skill zoto-help-evals. | preserve | — | — | — | **preserve** (user-authored) | — |
| 3 | Run /z-eval-advise when .zoto/eval-system/config.yml does not exist. | preserve | — | — | — | **preserve** (user-authored) | — |
| 4 | After /z-eval-advise has completed its scan and the user selects drill-down on all dimensions, veri… | preserve | — | — | — | **preserve** (user-authored) | — |

_Most cases tighten assertion vocabulary toward user-visible filesystem, exit-code, and on-screen guidance outcomes._

## `plugins/zoto-eval-system/skills/zoto-compare-evals/evals/evals.json`
Target: `skill:zoto-compare-evals` · Container: `mixed`
| Case id | Current prompt (one-liner) | Realism | Invocation | Assertions | Coverage | Proposed action | Seed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1@0 | /z-eval-compare run-a run-b where both runs have 10 cases and run-b used opus-4.6 vs run-a using co… | preserve | — | — | — | **preserve** (user-authored) | — |
| 2@1 | /z-eval-compare run-a where run-a is ambiguous (matches both evals/_runs/20260501_a and evals/_runs… | preserve | — | — | — | **preserve** (user-authored) | — |
| 1@2 | /z-eval-compare already narrowed this to runs 20260115090000 and 20260115090100 under the configure… | mixed | upstream-agent-message | strong | ok | rewrite-prompt | skill-usage:plugins/zoto-eval-system/skills/zoto-compare-evals/SKILL.md |
| 2@3 | The upstream compare command passed only the fragment 20260503 for an eval run id after syncing two… | mixed | upstream-agent-message | strong | ok | rewrite-prompt | skill-usage:plugins/zoto-eval-system/skills/zoto-compare-evals/SKILL.md |

_Case 1@2: rewrite-prompt using skill-usage:plugins/zoto-eval-system/skills/zoto-compare-evals/SKILL.md. Case 2@3: rewrite-prompt using skill-usage:plugins/zoto-eval-system/skills/zoto-compare-evals/SKILL.md._

## `plugins/zoto-eval-system/skills/zoto-configure-evals/evals/evals.json`
Target: `skill:zoto-configure-evals` · Container: `mixed`
| Case id | Current prompt (one-liner) | Realism | Invocation | Assertions | Coverage | Proposed action | Seed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1@0 | Set up the eval system config for a monorepo with skills under plugins/*/skills. Use composer-2 for… | preserve | — | — | — | **preserve** (user-authored) | — |
| 2@1 | Attempt to configure the eval system with preserveUserAuthoredCases set to false. | preserve | — | — | — | **preserve** (user-authored) | — |
| 1@2 | /z-eval-configure finished: overwrite if needed; evalsDir evals; skillsRoots [".cursor/skills","ski… | mixed | upstream-agent-message | strong | ok | rewrite-prompt | skill-usage:plugins/zoto-eval-system/skills/zoto-configure-evals/SKILL.md |
| 2@3 | /z-eval-configure returned answers but the hand-off missed llm.codeFramework while setting llm.stra… | mixed | upstream-agent-message | strong | ok | rewrite-prompt | skill-usage:plugins/zoto-eval-system/skills/zoto-configure-evals/SKILL.md |
| 3 | /z-eval-configure authorized overwriting config while moving static.framework from pytest to vitest… | mixed | upstream-agent-message | strong | ok | rewrite-prompt | skill-usage:plugins/zoto-eval-system/skills/zoto-configure-evals/SKILL.md |
| 4 | /z-eval-configure wants llm.strategy code with static.framework vitest, llm.codeFramework vitest, l… | mixed | upstream-agent-message | strong | ok | rewrite-prompt | skill-usage:plugins/zoto-eval-system/skills/zoto-configure-evals/SKILL.md |
| 5 | /z-eval-configure mistakenly forwarded update.preserveUserAuthoredCases false along with otherwise … | mixed | upstream-agent-message | strong | ok | rewrite-prompt | skill-usage:plugins/zoto-eval-system/skills/zoto-configure-evals/SKILL.md |
| 6 | /z-eval-configure now adds ignore ["plugins/legacy/**"] while shrinking discoveryTargets to ["skill… | mixed | upstream-agent-message | strong | ok | rewrite-prompt | skill-usage:plugins/zoto-eval-system/skills/zoto-configure-evals/SKILL.md |
| 7 | /z-eval-configure sets llm.strategy code but operator selected llm.codeFramework jest while leaving… | mixed | upstream-agent-message | strong | ok | rewrite-prompt | skill-usage:plugins/zoto-eval-system/skills/zoto-configure-evals/SKILL.md |

_Case 1@2: rewrite-prompt using skill-usage:plugins/zoto-eval-system/skills/zoto-configure-evals/SKILL.md. Case 2@3: rewrite-prompt using skill-usage:plugins/zoto-eval-system/skills/zoto-configure-evals/SKILL.md._

## `plugins/zoto-eval-system/skills/zoto-create-evals/evals/evals.json`
Target: `skill:zoto-create-evals` · Container: `mixed`
| Case id | Current prompt (one-liner) | Realism | Invocation | Assertions | Coverage | Proposed action | Seed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1@0 | Scaffold the eval system into a fresh pnpm monorepo with two skills under plugins/example-plugin/sk… | preserve | — | — | — | **preserve** (user-authored) | — |
| 2@1 | Run /z-eval-create in a repository that already has a user-authored case at skills/foo/evals/evals.… | preserve | — | — | — | **preserve** (user-authored) | — |
| 3@2 | Run /z-eval-create in a repository whose git working tree has no HEAD (brand new repo with no initi… | preserve | — | — | — | **preserve** (user-authored) | — |
| 1@3 | We already ran `/z-eval-create` and approved every discovered command, agent, and hook target plus … | mixed | upstream-agent-message | strong | ok | rewrite-prompt | skill-usage:plugins/zoto-eval-system/skills/zoto-create-evals/SKILL.md |
| 2@4 | Spin up the eval suite from `/z-eval-create` immediately—this workspace still lacks `.zoto/eval-sys… | mixed | upstream-agent-message | strong | ok | rewrite-prompt | skill-usage:plugins/zoto-eval-system/skills/zoto-create-evals/SKILL.md |
| 3@5 | Approved IDs include `command:upstream-docs` but its canonical Markdown sits under `upstream-vendor… | mixed | upstream-agent-message | strong | ok | rewrite-prompt | skill-usage:plugins/zoto-eval-system/skills/zoto-create-evals/SKILL.md |
| 4 | Approved checklist matches defaults—finish create-evals while respecting existing secrets guidance … | mixed | upstream-agent-message | strong | ok | rewrite-prompt | skill-usage:plugins/zoto-eval-system/skills/zoto-create-evals/SKILL.md |
| 5 | Operator toggled manual checklist generation—complete `/z-eval-create` after approvals. | mixed | upstream-agent-message | strong | ok | rewrite-prompt | skill-usage:plugins/zoto-eval-system/skills/zoto-create-evals/SKILL.md |

_Case 1@3: rewrite-prompt using skill-usage:plugins/zoto-eval-system/skills/zoto-create-evals/SKILL.md. Case 2@4: rewrite-prompt using skill-usage:plugins/zoto-eval-system/skills/zoto-create-evals/SKILL.md._

## `plugins/zoto-eval-system/skills/zoto-eval-tooling/evals/evals.json`
Target: `skill:zoto-eval-tooling` · Container: `evals[]`
| Case id | Current prompt (one-liner) | Realism | Invocation | Assertions | Coverage | Proposed action | Seed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | CI needs a manifest snapshot before we stamp anything: run `pnpm run eval:discover` and summarize h… | mixed | upstream-agent-message | strong | ok | rewrite-prompt | skill-usage:plugins/zoto-eval-system/skills/zoto-eval-tooling/SKILL.md |
| 2 | We edited `plugins/zoto-eval-system/skills/zoto-eval-tooling/SKILL.md`; follow the documented two-s… | mixed | upstream-agent-message | strong | ok | rewrite-prompt | skill-usage:plugins/zoto-eval-system/skills/zoto-eval-tooling/SKILL.md |
| 3 | Before we change `static.framework`, run `pnpm run eval:cleanup-stale` in its default dry-run mode … | mixed | upstream-agent-message | strong | ok | rewrite-prompt | skill-usage:plugins/zoto-eval-system/skills/zoto-eval-tooling/SKILL.md |
| 4 | We want `pnpm run eval:cleanup-stale -- --check` as a pre-merge drift gate: explain how stdout stay… | mixed | upstream-agent-message | strong | ok | rewrite-prompt | skill-usage:plugins/zoto-eval-system/skills/zoto-eval-tooling/SKILL.md |
| 5 | Dry-run stderr already emitted `runId` and `plan_hash`; outline how `pnpm run eval:cleanup-stale --… | mixed | upstream-agent-message | strong | ok | rewrite-prompt | skill-usage:plugins/zoto-eval-system/skills/zoto-eval-tooling/SKILL.md |
| 6 | Upstream agents and commands changed materially; orchestrate how we should use `pnpm run eval:updat… | realistic | upstream-agent-message | strong | ok | tighten-assertions | skill-usage:plugins/zoto-eval-system/skills/zoto-eval-tooling/SKILL.md |
| 7 | Lay out how our nightly harness should invoke `pnpm run eval`/`pnpm run eval:full` to populate `{ev… | mixed | upstream-agent-message | strong | ok | rewrite-prompt | skill-usage:plugins/zoto-eval-system/skills/zoto-eval-tooling/SKILL.md |
| 8 | A teammate prefers `pnpm exec tsx scripts/eval-update.ts ...` plus an explicit `--config` flag beca… | mixed | upstream-agent-message | strong | ok | rewrite-prompt | skill-usage:plugins/zoto-eval-system/skills/zoto-eval-tooling/SKILL.md |

_Case 1: rewrite-prompt using skill-usage:plugins/zoto-eval-system/skills/zoto-eval-tooling/SKILL.md. Case 2: rewrite-prompt using skill-usage:plugins/zoto-eval-system/skills/zoto-eval-tooling/SKILL.md._

## `plugins/zoto-eval-system/skills/zoto-execute-evals/evals/evals.json`
Target: `skill:zoto-execute-evals` · Container: `mixed`
| Case id | Current prompt (one-liner) | Realism | Invocation | Assertions | Coverage | Proposed action | Seed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1@0 | Run /z-eval-execute with no flags in a repo where the LLM API key is not set. | preserve | — | — | — | **preserve** (user-authored) | — |
| 2@1 | Run /z-eval-execute --full --model opus-4.6 with CURSOR_API_KEY set in the environment. | preserve | — | — | — | **preserve** (user-authored) | — |
| 3@2 | Run /z-eval-execute --full in a repo where CURSOR_API_KEY is missing. | preserve | — | — | — | **preserve** (user-authored) | — |
| 1@3 | The palette ran `/z-eval-execute` with no flags. You have the execute-evals skill loaded—run the st… | mixed | upstream-agent-message | strong | ok | rewrite-prompt | skill-usage:plugins/zoto-eval-system/skills/zoto-execute-evals/SKILL.md |
| 2@4 | `/z-eval-execute --full --model opus-4.6` was issued, CURSOR_API_KEY is already available to the ex… | mixed | upstream-agent-message | strong | ok | rewrite-prompt | skill-usage:plugins/zoto-eval-system/skills/zoto-execute-evals/SKILL.md |
| 3@5 | Run `/z-eval-execute --full`. Credential_resolution was not supplied ahead of time, CURSOR_API_KEY … | mixed | upstream-agent-message | strong | ok | rewrite-prompt | skill-usage:plugins/zoto-eval-system/skills/zoto-execute-evals/SKILL.md |
| 4 | Task envelope shows `/z-eval-execute --full` yet credential_resolution already selected static-only… | mixed | upstream-agent-message | strong | ok | rewrite-prompt | skill-usage:plugins/zoto-eval-system/skills/zoto-execute-evals/SKILL.md |
| 5 | `/z-eval-execute` ran without flags. Config at `.zoto/eval-system/config.yml` sets a non-default ev… | mixed | upstream-agent-message | strong | ok | rewrite-prompt | skill-usage:plugins/zoto-eval-system/skills/zoto-execute-evals/SKILL.md |
| 6 | `/z-eval-execute --full` is requested. process.env.CURSOR_API_KEY is unset, but the repo root `.env… | mixed | upstream-agent-message | strong | ok | rewrite-prompt | skill-usage:plugins/zoto-eval-system/skills/zoto-execute-evals/SKILL.md |
| 7 | `/z-eval-execute --model opus-4.6` executed without --full. With the execute-evals skill active, ru… | mixed | upstream-agent-message | strong | ok | rewrite-prompt | skill-usage:plugins/zoto-eval-system/skills/zoto-execute-evals/SKILL.md |

_Case 1@3: rewrite-prompt using skill-usage:plugins/zoto-eval-system/skills/zoto-execute-evals/SKILL.md. Case 2@4: rewrite-prompt using skill-usage:plugins/zoto-eval-system/skills/zoto-execute-evals/SKILL.md._

## `plugins/zoto-eval-system/skills/zoto-help-evals/evals/evals.json`
Target: `skill:zoto-help-evals` · Container: `mixed`
| Case id | Current prompt (one-liner) | Realism | Invocation | Assertions | Coverage | Proposed action | Seed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1@0 | How do I update evals when my code changes? | preserve | — | — | — | **preserve** (user-authored) | — |
| 2@1 | /z-eval-help | preserve | — | — | — | **preserve** (user-authored) | — |
| 3@2 | I just ran /z-eval-create. What does my LLM backend configuration actually look like and where do I… | preserve | — | — | — | **preserve** (user-authored) | — |
| 1@3 | Upstream task for zoto-help-evals after `/z-eval-help`: `help_context.selected_section` matches the… | realistic | upstream-agent-message | strong | ok | tighten-assertions | skill-usage:plugins/zoto-eval-system/skills/zoto-help-evals/SKILL.md |
| 2@4 | Upstream task for zoto-help-evals: the operator wants Eval System help but the payload lacks `help_… | realistic | upstream-agent-message | strong | ok | tighten-assertions | skill-usage:plugins/zoto-eval-system/skills/zoto-help-evals/SKILL.md |
| 3@5 | Upstream task for zoto-help-evals: `help_context.selected_section` targets the README Configuration… | realistic | upstream-agent-message | strong | ok | tighten-assertions | skill-usage:plugins/zoto-eval-system/skills/zoto-help-evals/SKILL.md |
| 4 | Upstream task for zoto-help-evals: `help_context.selected_section` matches Static backend; `user_qu… | realistic | upstream-agent-message | strong | ok | tighten-assertions | skill-usage:plugins/zoto-eval-system/skills/zoto-help-evals/SKILL.md |
| 5 | Upstream task for zoto-help-evals: `help_context.selected_section` targets the README LLM backend (… | realistic | upstream-agent-message | strong | ok | tighten-assertions | skill-usage:plugins/zoto-eval-system/skills/zoto-help-evals/SKILL.md |
| 6 | Upstream task for zoto-help-evals: `help_context.selected_section` matches Updating evals; `user_qu… | realistic | upstream-agent-message | strong | ok | tighten-assertions | skill-usage:plugins/zoto-eval-system/skills/zoto-help-evals/SKILL.md |
| 7 | Upstream task for zoto-help-evals: `help_context.selected_section` is Result schema; `user_question… | realistic | upstream-agent-message | strong | ok | tighten-assertions | skill-usage:plugins/zoto-eval-system/skills/zoto-help-evals/SKILL.md |
| 8 | Upstream task for zoto-help-evals: `help_context.selected_section` matches Run logs; `user_question… | realistic | upstream-agent-message | strong | ok | tighten-assertions | skill-usage:plugins/zoto-eval-system/skills/zoto-help-evals/SKILL.md |
| 9 | Upstream task for zoto-help-evals: `help_context.selected_section` is Comparing runs; `user_questio… | realistic | upstream-agent-message | strong | ok | tighten-assertions | skill-usage:plugins/zoto-eval-system/skills/zoto-help-evals/SKILL.md |
| 10 | Upstream task for zoto-help-evals: `help_context.selected_section` matches Judge & soft metrics; `u… | realistic | upstream-agent-message | strong | ok | tighten-assertions | skill-usage:plugins/zoto-eval-system/skills/zoto-help-evals/SKILL.md |
| 11 | Upstream task for zoto-help-evals: `help_context.selected_section` is CI integration; `user_questio… | realistic | upstream-agent-message | strong | ok | tighten-assertions | skill-usage:plugins/zoto-eval-system/skills/zoto-help-evals/SKILL.md |
| 12 | Upstream task for zoto-help-evals: `help_context.selected_section` is Troubleshooting, `follow_up` … | realistic | upstream-agent-message | strong | ok | tighten-assertions | skill-usage:plugins/zoto-eval-system/skills/zoto-help-evals/SKILL.md |
| 13 | User message routed via `rules/zoto-eval-system.mdc`: "I’m blocked setting up Zoto evals in this re… | mixed | upstream-agent-message | strong | ok | rewrite-prompt | skill-usage:plugins/zoto-eval-system/skills/zoto-help-evals/SKILL.md |

_Case 13: rewrite-prompt using skill-usage:plugins/zoto-eval-system/skills/zoto-help-evals/SKILL.md._

## `plugins/zoto-eval-system/skills/zoto-judge-evals/evals/evals.json`
Target: `skill:zoto-judge-evals` · Container: `mixed`
| Case id | Current prompt (one-liner) | Realism | Invocation | Assertions | Coverage | Proposed action | Seed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1@0 | Run /z-eval-judge on a llm.yml where one case has verbosity 3.8 and another has confidence 0.22. | preserve | — | — | — | **preserve** (user-authored) | — |
| 2@1 | Run /z-eval-judge on a llm.yml where brittle-case lists several `contains` graders whose `matched_t… | preserve | — | — | — | **preserve** (user-authored) | — |
| 3@2 | Run /z-eval-judge when no llm.yml exists. | preserve | — | — | — | **preserve** (user-authored) | — |
| 1@3 | Cursor just finished wiring the newest LLM eval batch. Pull up the adversarial judge evals guidance… | mixed | upstream-agent-message | strong | ok | rewrite-prompt | skill-usage:plugins/zoto-eval-system/skills/zoto-judge-evals/SKILL.md |
| 2@4 | I need the coverage critic on our eval harness, but this checkout has never written a timestamped f… | realistic | upstream-agent-message | strong | ok | tighten-assertions | skill-usage:plugins/zoto-eval-system/skills/zoto-judge-evals/SKILL.md |
| 3@5 | Load the adversarial evaluator skill, focus on run `20260201T090000Z`, and tell me whether our grad… | mixed | upstream-agent-message | strong | ok | rewrite-prompt | skill-usage:plugins/zoto-eval-system/skills/zoto-judge-evals/SKILL.md |
| 4 | The judge surfaced weak assertions on two skills — prepare the guarded hand-off exactly as document… | mixed | upstream-agent-message | strong | ok | rewrite-prompt | skill-usage:plugins/zoto-eval-system/skills/zoto-judge-evals/SKILL.md |
| 5 | /z-eval-judge is available now — treat that palette entry exactly like the sceptical evaluator skil… | mixed | upstream-agent-message | strong | ok | rewrite-prompt | skill-usage:plugins/zoto-eval-system/skills/zoto-judge-evals/SKILL.md |

_Case 1@3: rewrite-prompt using skill-usage:plugins/zoto-eval-system/skills/zoto-judge-evals/SKILL.md. Case 3@5: rewrite-prompt using skill-usage:plugins/zoto-eval-system/skills/zoto-judge-evals/SKILL.md._

## `plugins/zoto-eval-system/skills/zoto-update-evals/evals/evals.json`
Target: `skill:zoto-update-evals` · Container: `mixed`
| Case id | Current prompt (one-liner) | Realism | Invocation | Assertions | Coverage | Proposed action | Seed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1@0 | A skill's SKILL.md description was edited. Run /z-eval-update --apply and accept every proposed cha… | preserve | — | — | — | **preserve** (user-authored) | — |
| 2@1 | Run /z-eval-update --check on a repo where a covered target has been deleted. | preserve | — | — | — | **preserve** (user-authored) | — |
| 3@2 | Edit discoveryTargets in config.json to add 'lib', then run /z-eval-update --check. | preserve | — | — | — | **preserve** (user-authored) | — |
| 1@3 | We finished editing a SKILL.md under the configured skills root and want only a sanity pass before … | mixed | upstream-agent-message | strong | ok | rewrite-prompt | skill-usage:plugins/zoto-eval-system/skills/zoto-update-evals/SKILL.md |
| 2@4 | Onboarding checklist: `.zoto/eval-system/config.yml` exists but `.zoto/eval-system/manifest.yml` is… | mixed | upstream-agent-message | strong | ok | rewrite-prompt | skill-usage:plugins/zoto-eval-system/skills/zoto-update-evals/SKILL.md |
| 3@5 | We are wiring `/z-eval-update --check` into a headless CI job. Outline every prerequisite script it… | mixed | upstream-agent-message | strong | ok | rewrite-prompt | skill-usage:plugins/zoto-eval-system/skills/zoto-update-evals/SKILL.md |
| 4 | A covered primitive hash changed upstream. Explain the default `--apply` sequence after classificat… | mixed | upstream-agent-message | strong | ok | rewrite-prompt | skill-usage:plugins/zoto-eval-system/skills/zoto-update-evals/SKILL.md |
| 5 | Operators need a narrow refresh: `/z-eval-update --target 'skill:zoto-*' --apply`. Map how the glob… | mixed | upstream-agent-message | strong | ok | rewrite-prompt | skill-usage:plugins/zoto-eval-system/skills/zoto-update-evals/SKILL.md |
| 6 | `--no-analyser` plus `--apply` just landed in CI for speed. Explain where payloads load from on dis… | mixed | upstream-agent-message | strong | ok | rewrite-prompt | skill-usage:plugins/zoto-eval-system/skills/zoto-update-evals/SKILL.md |
| 7 | Teach QA how zoto-update-evals buckets manifest deltas (`added`, `removed`, `modified`, `unchanged`… | mixed | upstream-agent-message | strong | ok | rewrite-prompt | skill-usage:plugins/zoto-eval-system/skills/zoto-update-evals/SKILL.md |
| 8 | We ship mixed `evals.json` bundles and handwritten Vitest files. Summarize every runtime and compil… | mixed | upstream-agent-message | strong | ok | rewrite-prompt | skill-usage:plugins/zoto-eval-system/skills/zoto-update-evals/SKILL.md |
| 9 | Document every filesystem location zoto-update-evals examines for drift, including mirrored plugin … | mixed | upstream-agent-message | strong | ok | rewrite-prompt | skill-usage:plugins/zoto-eval-system/skills/zoto-update-evals/SKILL.md |

_Case 1@3: rewrite-prompt using skill-usage:plugins/zoto-eval-system/skills/zoto-update-evals/SKILL.md. Case 2@4: rewrite-prompt using skill-usage:plugins/zoto-eval-system/skills/zoto-update-evals/SKILL.md._

## `plugins/zoto-spec-system/evals/agents/zoto-spec-executor.json`
Target: `agent:zoto-spec-executor` · Container: `cases[]`
| Case id | Current prompt (one-liner) | Realism | Invocation | Assertions | Coverage | Proposed action | Seed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | I need zoto-spec-executor to drive /z-spec-execute on the current dated initiative: read .zoto/spec… | realistic | natural-delegation | strong | ok | tighten-assertions | transcript:agent-bdb3e54c-447c-491f-9936-eb89ce8474b9 |
| 2 | When the dated spec folder already has a status/ tree, walk me through how you shell out to spec-sp… | mixed | natural-delegation | strong | ok | tighten-assertions | transcript:agent-b5d5b3ac-54f4-49c3-bc14-fe551400b4ae |
| 3 | Suppose .zoto/spec-system/config.yml picks up a schema-breaking edit while spec-aggregator --watch … | mixed | natural-delegation | strong | ok | tighten-assertions | transcript:agent-e646ff3e-e2fd-4c4c-a662-d1b1f786e086 |
| 4 | If I cancel the /z-spec-execute session while the background aggregator child is still alive, spell… | mixed | natural-delegation | strong | ok | tighten-assertions | transcript:agent-ecb5516e-7726-4704-ab0d-130f69431fee |
| 5 | We inherited a dated folder under specs/ that never created status/. How does zoto-spec-executor be… | realistic | natural-delegation | strong | ok | tighten-assertions | transcript:agent-a0ded7d6-833e-4688-b6f4-a4d6e236b4fd |
| 6 | zoto-spec-judge returned Partial on subtask 04 with a non-empty structured fix_list. As the executo… | mixed | natural-delegation | strong | ok | tighten-assertions | transcript:agent-bdb3e54c-447c-491f-9936-eb89ce8474b9 |
| 7 | Assume extensions.memory.enabled is true and extensions.memory.plugin points at a memory plugin. Af… | mixed | natural-delegation | strong | ok | tighten-assertions | transcript:agent-b5d5b3ac-54f4-49c3-bc14-fe551400b4ae |
| 8 | After we finish this initiative, how should we treat the dated tree under the configured specs dire… | mixed | natural-delegation | strong | ok | tighten-assertions | transcript:agent-e646ff3e-e2fd-4c4c-a662-d1b1f786e086 |
| 9 | The index shows subtask 05 blocked on 03 and 04 while 01 and 02 can run together. How will you orde… | mixed | natural-delegation | strong | ok | tighten-assertions | transcript:agent-ecb5516e-7726-4704-ab0d-130f69431fee |

_Most cases tighten assertion vocabulary toward user-visible filesystem, exit-code, and on-screen guidance outcomes._

## `plugins/zoto-spec-system/evals/agents/zoto-spec-generator.json`
Target: `agent:zoto-spec-generator` · Container: `cases[]`
| Case id | Current prompt (one-liner) | Realism | Invocation | Assertions | Coverage | Proposed action | Seed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Break down the OAuth token refresh hardening effort into an executable engineering initiative with … | mixed | natural-delegation | strong | ok | tighten-assertions | transcript:agent-284b2cb1-8b62-4239-bb6b-67fd377b2cb9 |
| 2 | /z-spec-create migrating our background job runner to a queue-backed Postgres worker pool with idem… | mixed | slash-lead-invalid | strong | ok | tighten-assertions | transcript:agent-7d6e8947-9731-44a4-964f-a39c17cacf90 |
| 3 | Produce the structured initiative package for splitting monolithic payment webhook handling into mo… | mixed | natural-delegation | strong | ok | tighten-assertions | transcript:agent-e1f1c538-6a61-4ca6-9583-362b504a398a |
| 4 | Stand up the rate-limit telemetry dashboards initiative through our standard spec workflow so downs… | mixed | natural-delegation | strong | ok | tighten-assertions | transcript:agent-996dcf4e-5529-4b9e-bd1b-ced45c72eae5 |
| 5 | Produce the finest-grained feasible decomposition for rewriting our configuration loader while pres… | mixed | natural-delegation | strong | ok | tighten-assertions | transcript:agent-ec28bbf3-1186-44ee-9327-8e655dddd77e |
| 6 | The OAuth initiative package reads perfectly—mirror its narrative into `docs/architecture` as everl… | mixed | natural-delegation | strong | ok | tighten-assertions | transcript:agent-284b2cb1-8b62-4239-bb6b-67fd377b2cb9 |

_Most cases tighten assertion vocabulary toward user-visible filesystem, exit-code, and on-screen guidance outcomes._

## `plugins/zoto-spec-system/evals/agents/zoto-spec-judge.json`
Target: `agent:zoto-spec-judge` · Container: `cases[]`
| Case id | Current prompt (one-liner) | Realism | Invocation | Assertions | Coverage | Proposed action | Seed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | zoto-spec-executor invoked you after subtask 02 closed: read specs/active-feature/subtasks/subtask-… | mixed | natural-delegation | strong | ok | tighten-assertions | transcript:agent-56900f1a-915a-4830-a733-257c641beef0 |
| 2 | Executor handed you subtask 04: specs/active-feature/subtasks/subtask-04-rate-limit-20260507.md plu… | mixed | natural-delegation | strong | ok | tighten-assertions | transcript:agent-874ab8d6-5ae9-4bfa-a77c-6471c3831af5 |
| 3 | Run /z-spec-judge with no arguments after loading .zoto/spec-system/config.yml so specsDir resolves… | realistic | natural-delegation | strong | ok | tighten-assertions | transcript:agent-eb3d27f1-feff-4416-8b33-00cb57227efc |
| 4 | Run /z-spec-judge targeting specs/active-feature/spec-payment-hooks-20260507.md: load the spec inde… | realistic | natural-delegation | strong | ok | tighten-assertions | transcript:agent-6fc4f309-6aa5-4b64-9058-e53430c42aa2 |

_Most cases tighten assertion vocabulary toward user-visible filesystem, exit-code, and on-screen guidance outcomes._

## `plugins/zoto-spec-system/evals/commands/z-spec-create.json`
Target: `command:z-spec-create` · Container: `cases[]`
| Case id | Current prompt (one-liner) | Realism | Invocation | Assertions | Coverage | Proposed action | Seed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | /z-spec-create | synthetic | bare-exception | strong | ok | keep-bare-precondition | transcript:0e428ec3-2c3c-4cd8-89fc-8b14acb1c261 |
| 2 | /z-spec-create | synthetic | bare-exception | strong | ok | keep-bare-precondition | transcript:7e51635b-401a-4fe7-80a3-8c5c10d74c3a |
| 3 | /z-spec-create @workspace/docs/northstar-brief.md | realistic | cmd-with-args | strong | ok | keep-bare-precondition | transcript:82ae2f21-b636-429b-ac1e-0bed6686456c |
| 4 | /z-spec-create "Add resilient offline queueing to the ingestion worker" | realistic | cmd-with-args | strong | ok | keep-bare-precondition | transcript:0e428ec3-2c3c-4cd8-89fc-8b14acb1c261 |
| 5 | /z-spec-create | synthetic | bare-exception | strong | ok | keep-bare-precondition | transcript:7e51635b-401a-4fe7-80a3-8c5c10d74c3a |

_Most cases tighten assertion vocabulary toward user-visible filesystem, exit-code, and on-screen guidance outcomes._

## `plugins/zoto-spec-system/evals/commands/z-spec-execute.json`
Target: `command:z-spec-execute` · Container: `cases[]`
| Case id | Current prompt (one-liner) | Realism | Invocation | Assertions | Coverage | Proposed action | Seed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | /z-spec-execute | synthetic | bare-exception | strong | ok | keep-bare-precondition | transcript:ebd788fd-f22d-4002-bb4f-1717c45220fe |
| 2 | /z-spec-execute | synthetic | bare-invalid | strong | ok | rewrite-prompt+assertions | transcript:d3fc6d80-f283-4ea7-9f0e-0e10954a76a3 |
| 3 | /z-spec-execute specs/20260403-network-retries | realistic | cmd-with-args | strong | ok | tighten-assertions | transcript:d8910cae-c0b1-4dea-84d4-a120646e71d1 |
| 4 | /z-spec-execute specs/20260403-network-retries/spec-network-retries-20260403.md | realistic | cmd-with-args | strong | ok | tighten-assertions | transcript:698a74e2-bf03-4b30-a35a-d2335bf91db2 |
| 5 | /z-spec-execute --resume | realistic | cmd-with-args | strong | ok | tighten-assertions | transcript:ebd788fd-f22d-4002-bb4f-1717c45220fe |
| 6 | /z-spec-execute specs/20260403-network-retries | realistic | cmd-with-args | strong | ok | tighten-assertions | transcript:d3fc6d80-f283-4ea7-9f0e-0e10954a76a3 |
| 7 | /z-spec-execute specs/20260403-network-retries | realistic | cmd-with-args | strong | ok | tighten-assertions | transcript:d8910cae-c0b1-4dea-84d4-a120646e71d1 |
| 8 | /z-spec-execute specs/20260403-network-retries | realistic | cmd-with-args | strong | ok | tighten-assertions | transcript:698a74e2-bf03-4b30-a35a-d2335bf91db2 |
| 9 | /z-spec-execute specs/20260403-network-retries | realistic | cmd-with-args | strong | ok | tighten-assertions | transcript:ebd788fd-f22d-4002-bb4f-1717c45220fe |

_Case 2: rewrite-prompt+assertions using transcript:d3fc6d80-f283-4ea7-9f0e-0e10954a76a3._

## `plugins/zoto-spec-system/evals/commands/z-spec-init.json`
Target: `command:z-spec-init` · Container: `cases[]`
| Case id | Current prompt (one-liner) | Realism | Invocation | Assertions | Coverage | Proposed action | Seed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | /z-spec-init | synthetic | bare-invalid | strong | ok | rewrite-prompt+assertions | transcript:agent-3196a853-3b91-4ccb-9be4-81d15bb056de |
| 2 | /z-spec-init | synthetic | bare-invalid | strong | ok | rewrite-prompt+assertions | transcript:agent-3196a853-3b91-4ccb-9be4-81d15bb056de |
| 3 | /z-spec-init --force | realistic | cmd-with-args | strong | ok | tighten-assertions | transcript:agent-3196a853-3b91-4ccb-9be4-81d15bb056de |
| 4 | /z-spec-init | synthetic | bare-invalid | strong | ok | rewrite-prompt+assertions | transcript:agent-3196a853-3b91-4ccb-9be4-81d15bb056de |

_Case 1: rewrite-prompt+assertions using transcript:agent-3196a853-3b91-4ccb-9be4-81d15bb056de. Case 2: rewrite-prompt+assertions using transcript:agent-3196a853-3b91-4ccb-9be4-81d15bb056de._

## `plugins/zoto-spec-system/evals/commands/z-spec-judge.json`
Target: `command:z-spec-judge` · Container: `cases[]`
| Case id | Current prompt (one-liner) | Realism | Invocation | Assertions | Coverage | Proposed action | Seed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | /z-spec-judge | synthetic | bare-exception | strong | ok | keep-bare-precondition | transcript:dcf8cc2e-4fc0-4d67-8ae6-9b6d356f092e |
| 2 | /z-spec-judge | synthetic | bare-invalid | strong | ok | rewrite-prompt+assertions | transcript:dcf8cc2e-4fc0-4d67-8ae6-9b6d356f092e |
| 3 | /z-spec-judge specs/20260403-feature-name | realistic | cmd-with-args | strong | ok | tighten-assertions | transcript:dcf8cc2e-4fc0-4d67-8ae6-9b6d356f092e |
| 4 | /z-spec-judge specs/20260403-feature-name/spec-feature-name-20260403.md | realistic | cmd-with-args | strong | ok | tighten-assertions | transcript:dcf8cc2e-4fc0-4d67-8ae6-9b6d356f092e |
| 5 | /z-spec-judge specs/20260403-feature-name | realistic | cmd-with-args | strong | ok | tighten-assertions | transcript:dcf8cc2e-4fc0-4d67-8ae6-9b6d356f092e |

_Case 2: rewrite-prompt+assertions using transcript:dcf8cc2e-4fc0-4d67-8ae6-9b6d356f092e._

## `plugins/zoto-spec-system/evals/hooks/zoto-spec-system.json`
Target: `hook:zoto-spec-system` · Container: `cases[]`
| Case id | Current prompt (one-liner) | Realism | Invocation | Assertions | Coverage | Proposed action | Seed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | sessionStart lifecycle in Cursor: the workspace loads with zoto-spec-system enabled and Cursor runs… | realistic | lifecycle-event | strong | ok | tighten-assertions | readme:plugins/zoto-eval-system/README.md |
| 2 | stop lifecycle in Cursor: the operator ends the agent turn and Cursor runs `node hooks/zoto-onstop-… | mixed | lifecycle-event | strong | ok | tighten-assertions | readme:plugins/zoto-eval-system/README.md |

_Most cases tighten assertion vocabulary toward user-visible filesystem, exit-code, and on-screen guidance outcomes._

## `plugins/zoto-spec-system/skills/zoto-create-spec/evals/evals.json`
Target: `skill:zoto-create-spec` · Container: `mixed`
| Case id | Current prompt (one-liner) | Realism | Invocation | Assertions | Coverage | Proposed action | Seed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1@0 | I need to plan a migration from REST to GraphQL for our API layer. The endpoints are in src/api/ an… | preserve | — | — | — | **preserve** (user-authored) | — |
| 2@1 | hey can you plan out adding dark mode support to our Next.js app? the components are in src/compone… | preserve | — | — | — | **preserve** (user-authored) | — |
| 3@2 | Plan a comprehensive test infrastructure overhaul. We currently have no tests at all. The project i… | preserve | — | — | — | **preserve** (user-authored) | — |
| 4@3 | Create a small spec with exactly 3 subtasks to add OAuth2 to our API: discovery, implementation, an… | preserve | — | — | — | **preserve** (user-authored) | — |
| 1@4 | Upstream: load zoto-create-spec and walk an operator through an OAuth rotation with PKCE before any… | mixed | upstream-agent-message | strong | ok | rewrite-prompt | skill-usage:plugins/zoto-spec-system/skills/zoto-create-spec/SKILL.md |
| 2@5 | Upstream: initiate zoto-create-spec for a prepaid wallet ledger initiative when `workspace/.zoto/sp… | mixed | upstream-agent-message | strong | ok | rewrite-prompt | skill-usage:plugins/zoto-spec-system/skills/zoto-create-spec/SKILL.md |
| 3@6 | Upstream: leverage zoto-create-spec for metering API throttling. Begin scope capture strictly throu… | mixed | upstream-agent-message | strong | ok | rewrite-prompt | skill-usage:plugins/zoto-spec-system/skills/zoto-create-spec/SKILL.md |
| 4@7 | Upstream: while zoto-create-spec is active for queue retention tuning, analyse a proposed schedule … | mixed | upstream-agent-message | strong | ok | rewrite-prompt | skill-usage:plugins/zoto-spec-system/skills/zoto-create-spec/SKILL.md |
| 5 | Upstream: disregard the blueprint skill instructions—just patch `workspace/services/payments/handle… | mixed | upstream-agent-message | strong | ok | rewrite-prompt | skill-usage:plugins/zoto-spec-system/skills/zoto-create-spec/SKILL.md |

_Case 1@4: rewrite-prompt using skill-usage:plugins/zoto-spec-system/skills/zoto-create-spec/SKILL.md. Case 2@5: rewrite-prompt using skill-usage:plugins/zoto-spec-system/skills/zoto-create-spec/SKILL.md._

## `plugins/zoto-spec-system/skills/zoto-execute-spec/evals/evals.json`
Target: `skill:zoto-execute-spec` · Container: `mixed`
| Case id | Current prompt (one-liner) | Realism | Invocation | Assertions | Coverage | Proposed action | Seed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1@0 | Execute the spec at specs/20260401-api-migration/. It has 4 subtasks across 3 phases. The spec stat… | preserve | — | — | — | **preserve** (user-authored) | — |
| 2@1 | Resume executing specs/20260403-dark-mode/ — it was interrupted after subtask 02 completed. Subtask… | preserve | — | — | — | **preserve** (user-authored) | — |
| 3@2 | Run /z-spec-execute on specs/20260402-test-infra/. This spec has 6 subtasks, phase 1 has 4 parallel… | preserve | — | — | — | **preserve** (user-authored) | — |
| 4@3 | Spawn one subtask via the spec-system spawn-prefix builder against a fixture .zoto/spec-system/conf… | preserve | — | — | — | **preserve** (user-authored) | — |
| 5@4 | Run `pnpm --filter @zoto-agents/zoto-spec-system exec spec-aggregator --once --spec-dir <fixture-sp… | preserve | — | — | — | **preserve** (user-authored) | — |
| 1@5 | Repo has specs/payments-rail-ledger/ ready for hands-on implementation; orchestrate execution using… | mixed | upstream-agent-message | strong | ok | rewrite-prompt | skill-usage:plugins/zoto-spec-system/skills/zoto-execute-spec/SKILL.md |
| 2@6 | Under specs/api-throttle-20260201/ there is an index and manifest we want executed; load that spec … | mixed | upstream-agent-message | strong | ok | rewrite-prompt | skill-usage:plugins/zoto-spec-system/skills/zoto-execute-spec/SKILL.md |
| 3@7 | Manifest validation passed for specs/cache-warmup-jan03/; show me the execution summary and wait fo… | mixed | upstream-agent-message | strong | ok | rewrite-prompt | skill-usage:plugins/zoto-spec-system/skills/zoto-execute-spec/SKILL.md |
| 4@8 | Approved — run Phase 1 and Phase 2 subtasks for specs/ingest-pipeline-feb14/ under the manifest ord… | mixed | upstream-agent-message | strong | ok | rewrite-prompt | skill-usage:plugins/zoto-spec-system/skills/zoto-execute-spec/SKILL.md |
| 5@9 | For the active subtask under specs/search-index-mar07/status/, spell out how executors and workers … | mixed | upstream-agent-message | strong | ok | rewrite-prompt | skill-usage:plugins/zoto-spec-system/skills/zoto-execute-spec/SKILL.md |
| 6 | Explain how token budgets reach subagents, how live config reload interacts with `spec-aggregator -… | mixed | upstream-agent-message | strong | ok | rewrite-prompt | skill-usage:plugins/zoto-spec-system/skills/zoto-execute-spec/SKILL.md |
| 7 | We need a one-off dashboard rebuild and a CI validation pass for the same spec root — which `spec-a… | mixed | upstream-agent-message | strong | ok | rewrite-prompt | skill-usage:plugins/zoto-spec-system/skills/zoto-execute-spec/SKILL.md |
| 8 | First subtask for specs/webhook-hardening-apr22/ just finished its worker; run the mandatory judge … | mixed | upstream-agent-message | strong | ok | rewrite-prompt | skill-usage:plugins/zoto-spec-system/skills/zoto-execute-spec/SKILL.md |
| 9 | All phased subtasks for specs/idempotency-keys-may05/ passed adversarial review; close out final ve… | mixed | upstream-agent-message | strong | ok | rewrite-prompt | skill-usage:plugins/zoto-spec-system/skills/zoto-execute-spec/SKILL.md |
| 10 | Session dropped mid-run on specs/otel-tracing-jul11/ after subtask 02 verified; resume without redo… | mixed | upstream-agent-message | strong | ok | rewrite-prompt | skill-usage:plugins/zoto-spec-system/skills/zoto-execute-spec/SKILL.md |

_Case 1@5: rewrite-prompt using skill-usage:plugins/zoto-spec-system/skills/zoto-execute-spec/SKILL.md. Case 2@6: rewrite-prompt using skill-usage:plugins/zoto-spec-system/skills/zoto-execute-spec/SKILL.md._

## `plugins/zoto-spec-system/skills/zoto-judge-spec/evals/evals.json`
Target: `skill:zoto-judge-spec` · Container: `mixed`
| Case id | Current prompt (one-liner) | Realism | Invocation | Assertions | Coverage | Proposed action | Seed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1@0 | Run /z-spec-judge on the repository — no specific spec target. Assess the overall health of this co… | preserve | — | — | — | **preserve** (user-authored) | — |
| 2@1 | Assess the spec at specs/20260401-api-migration/ — it has a spec index and 5 subtask files. Tell me… | preserve | — | — | — | **preserve** (user-authored) | — |
| 3@2 | judge this spec — specs/20260402-auth-system/ — it's a draft and I want honest feedback before we r… | preserve | — | — | — | **preserve** (user-authored) | — |
| 1@3 | We have not singled out one initiative file. Load the zoto-judge-spec skill and run a full reposito… | mixed | upstream-agent-message | strong | ok | rewrite-prompt | skill-usage:plugins/zoto-spec-system/skills/zoto-judge-spec/SKILL.md |
| 2@4 | Load zoto-judge-spec and assess only the auth-login initiative whose spec lives at workspace/specs/… | mixed | upstream-agent-message | strong | ok | rewrite-prompt | skill-usage:plugins/zoto-spec-system/skills/zoto-judge-spec/SKILL.md |
| 3@5 | Using zoto-judge-spec, assess workspace/specs/auth-login end-to-end and produce the assessment mark… | mixed | upstream-agent-message | strong | ok | rewrite-prompt | skill-usage:plugins/zoto-spec-system/skills/zoto-judge-spec/SKILL.md |
| 4 | Follow zoto-judge-spec for the auth-login initiative at workspace/specs/auth-login and write the as… | mixed | upstream-agent-message | strong | ok | rewrite-prompt | skill-usage:plugins/zoto-spec-system/skills/zoto-judge-spec/SKILL.md |

_Case 1@3: rewrite-prompt using skill-usage:plugins/zoto-spec-system/skills/zoto-judge-spec/SKILL.md. Case 2@4: rewrite-prompt using skill-usage:plugins/zoto-spec-system/skills/zoto-judge-spec/SKILL.md._
