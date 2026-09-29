# Jev-graded evals (`evals/jev/`)

Evals graded by **Typesafe Jev (System One)** through the `jev` grader in
[`plugins/zoto-eval-system/engine/graders/jev.ts`](../../plugins/zoto-eval-system/engine/graders/jev.ts).

**Jev proposes, grader code decides.** Jev answers a locked Noul / Choice /
Score question about `{ rubric, reply }`. Grader code routes the confidence
through gates and only promotes a "pass" when every code-owned guard holds:

| Gate (from Jev confidence) | Verdict |
|----------------------------|---------|
| `act`, pass proposal, all guards hold | `pass` |
| `act`, pass proposal, any guard refuses (missing evidence, leading phrase) | `fail` |
| `act`, fail proposal | `fail` |
| `deny` | `fail` |
| `ask_human` / `abstain`, or an `unsure` / mid-band proposal | `inconclusive`: never a pass |

Verdicts are a closed union `{kind:"pass"} | {kind:"fail";reason} | {kind:"inconclusive";reason}`.
The run summary prints **pass / fail / inconclusive** as three counts. Any fail
or inconclusive result exits non-zero.

## Layout

| Path | What |
|------|------|
| `templates/<id>.v<n>.json` | Versioned question templates. They hold the question wording, locked Choice options, Score band anchors and gate thresholds. Cases cannot override them. |
| `fixtures/**.json` | Recorded `/v1/systemone` responses (`{ template, note, response }`), in the same wire format as jev-feature-demo. |
| `cases/*.json` | The Jev eval suite (`{ "cases": [{ id, reply, grader }] }`). It is expected to be green. |
| `adversarial/cases.json` | Refusal rows used by the plugin tests: a confident pass that gets refused, a leading question, mid-confidence and score-band cases. |
| `jev.lock.json` | Pinned jev commit, fixture-set hash and per-template hashes. |

## Run

```bash
pnpm eval:jev                      # fixture mode (default): no key, zero network
pnpm eval:jev:check-lock           # verify lock (fixtures/templates/pin unchanged)
pnpm eval:jev:lock                 # conscious re-lock after editing fixtures/templates

# Optional live mode (opt-in only; a key alone never switches modes)
ZOTO_EVAL_JEV_MODE=live TYPESAFE_API_KEY=sk-... pnpm eval:jev
# optional: ZOTO_EVAL_JEV_MODEL (default jev-1.13.0, pinned), TYPESAFE_BASE_URL
```

The stamp-trust gate runs before any Jev-graded case, both in `pnpm eval:jev`
and in the Vitest scenario `evals/scenarios/jev-graded.test.ts`. Results go
to `evals/_runs/jev/` (gitignored). Every result records `jev_mode`,
`jev_commit`, `fixture_set_sha256` and `template_sha256`.

Never commit API keys: keep `TYPESAFE_API_KEY` in your shell or in a
gitignored `.env`.

## Using `jev` in JSON evals

`jev` is a declarative grader kind that sits alongside `contains`, `regex`,
`tool-called` and `llm-judge`:

```json
{ "type": "jev", "template": "evidence-verdict@1",
  "rubric": "Names the failing eval file and gives a re-run command.",
  "fixture": "evidence-verdict/pass-high-confidence.json",
  "evidence": { "mustMatch": ["evals/[\\w./-]+\\.json", "pnpm (exec vitest|eval)"] } }
```

The shared LLM harness reports only pass, fail or warn, and treats warn as
green. For that reason `inconclusive` is reported there as `fail`, with an
`INCONCLUSIVE` detail. The three-way split is in `pnpm eval:jev`.

## Changing things

- **New wording:** add `templates/<id>.v<n+1>.json` rather than editing a
  locked template. Then run `pnpm eval:jev:lock` and review the diff.
- **New or updated fixture:** edit it, run `pnpm eval:jev:lock`, and review.
  If a fixture changes without a re-lock, the lock test fails and every case
  comes back inconclusive.
- **Jev pin bump:** re-vendor from the new commit (see
  `plugins/zoto-eval-system/engine/jev/VENDOR.md`), update `pin.ts`, then
  re-lock.
