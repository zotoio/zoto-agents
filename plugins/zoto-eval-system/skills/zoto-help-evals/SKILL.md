---
name: zoto-help-evals
description: Project-tailored help for the Eval System plugin. Loads plugins/zoto-eval-system/README.md as the source of truth, inspects current project state (.zoto/eval-system/config.yml, manifest.yml, .env*, evals/_runs/, package.json scripts), and composes an answer that is grounded in the chosen README section, tailored to the host repo's actual configuration and artefacts, and cited with `start:end:path` code references back to the README. Pre-collected `help_context` arrives from the /z-eval-help command (command-owned askQuestion). The skill itself never calls askQuestion — missing context is returned as `needs_user_input`.
---

# Help Evals

Canonical help for the Eval System plugin. The README is the source of truth; this skill grounds every answer in it, **and** tailors the answer to the host project so users see their actual `evalsDir`, framework, model, manifest targets, and run history — not generic defaults.

## Configuration

No repo-level config required. The skill uses:

- `plugins/zoto-eval-system/README.md` (or the installed path at `~/.cursor/plugins/zoto-eval-system/README.md`) as the documentation source of truth.
- The host repo's eval-system state files for tailoring (read-only): `.zoto/eval-system/config.yml`, `.zoto/eval-system/manifest.yml`, `.zoto/eval-system/manifest.history.yml`, `.env.example`, `.env`, `package.json` (the `eval*` scripts), and the latest `evals/_runs/<run-id>/` if any.

## When to Use

- `/z-eval-help` invoked (after the command resolved which section to answer for).
- The routing rule `rules/zoto-eval-system.mdc` detects help-intent in the user's message and hands off here before the agent answers from inferred knowledge.

## Workflow

### Step 1: Load the README

Read the README from the plugin path. Parse `##` section headers. The list of sections is the menu the command uses; the chosen section is the **answer's anchor** — every claim in the response must trace back to it (or to a clearly-cited adjacent section).

### Step 2: Section selection (command-pre-collected)

The **`/z-eval-help` command** runs `askQuestion` **before** invoking this skill when:

- No `<topic>` was given → numbered section picker.
- Multiple headers match `<topic>` → disambiguation picker.
- Follow-up navigation (related sections) → optional second prompt + resume.

The Task prompt (or skill input) MUST include `help_context`:

- `selected_section`: exact `##` header title or slug to anchor the answer on. Must match a README section verbatim — e.g. `Strategy bridge`, `Configuration`, `LLM backend (@cursor/sdk)`.
- `follow_up`: optional enum (`related`, `quick_start`, `done`) if the command already collected the next navigation step.
- `user_question`: optional free-form follow-up the user typed instead of picking an option.

If `selected_section` is missing **and** cannot be inferred safely, return `needs_user_input` with candidate sections — **never** call `askQuestion`.

### Step 3: Load project signals (mandatory before composing the answer)

Read whichever of these are relevant to the chosen section. Skip files that don't exist; never fabricate values. When a signal is unread, the answer must not assert anything about it.

| Section anchor | Signals to read |
|---|---|
| Overview, Quick start | `.zoto/eval-system/config.yml` (presence), `.zoto/eval-system/manifest.yml` (presence), `package.json` (`scripts.eval*`) |
| Configuration | `.zoto/eval-system/config.yml` (full), `templates/schema/config.schema.json` for field reference |
| Static backend | `config.json` → `static.framework`, host repo's `evalsDir` contents |
| LLM backend (`@cursor/sdk`) | `config.json` → `llm.*`, `.env.example`, `.env` (presence only — never read secret values), `package.json` devDeps for `@cursor/sdk`, `dotenv` |
| Interaction branch (unified LLM eval harness) | `manifest.yml` → per-target `eval_files[]` (one co-located `<kind>/evals/<name>.test.ts` per target); presence of `evals/llm/_shared/run-llm-suite.ts` (the unified LLM eval harness exporting `defineLlmEval`) and `evals/llm/_shared/askquestion-bridge.ts`; cached analyser payloads under `.zoto/eval-system/cache/analyser/` for `requiresInteraction` (drives scripted-answer vs single-prompt at runtime); latest `report.yml` per-case `backend:` |
| Updating evals | `manifest.yml` → `discovery_config`, `targets[]`; `manifest.history.yml` (last entry) |
| Result schema | latest `evals/_runs/<run-id>/report.yml` and per-backend `static.yml` / `llm.yml` if any |
| Run logs | `evals/_runs/` directory listing; latest `<run-id>/logs/` |
| Comparing runs | last 2 entries under `evals/_runs/` |
| Judge & soft metrics | `config.json` → `judgeModel`, latest `llm.yml` |
| CI integration | `.github/workflows/*.yml` if present, host `package.json` scripts |
| Troubleshooting | whichever signals match the symptom in `user_question` |

If a signal disagrees with the README (e.g. host uses `vitest` static framework but the README's pytest example is the only one), prefer the **project signal for facts about the host repo** and the **README for facts about the plugin's contract**, and call out the mismatch explicitly.

### Step 4: Compose a tailored, cited answer

The answer paraphrases freely **and** is grounded in the README. Three rules are non-negotiable:

1. **Anchor on the chosen section.** Every claim about plugin behaviour must trace to lines in the README. Adjacent sections may be cited if they're directly relevant to the user's question.
2. **Tailor with project signals.** Replace generic placeholders with values read from the host repo. Examples:
   - "your `evalsDir` is `evals/`" — only after reading `config.json`.
   - "you currently have N targets in the manifest" — only after reading `manifest.yml`.
   - "your latest run is `<run-id>`" — only after listing `evals/_runs/`.
   When a value cannot be read (file absent), say so and link to the command that creates it (e.g. "no `manifest.yml` yet — run `/z-eval-create`").
3. **Cite every quoted block with the code-reference syntax**, using line numbers from the README:

   ```startLine:endLine:plugins/zoto-eval-system/README.md
   ...the exact lines from README...
   ```

   Inline references to other files (e.g. the user's `config.json`) use the same `start:end:path` syntax. Filenames in prose are wrapped in backticks. Never invent line numbers — re-read the file if unsure.

#### Answer skeleton

```
<one-paragraph orientation, in your own words, anchored on the chosen section>

<key points as a short list — paraphrased, each followed by an inline citation
  to the README lines that back the claim>

<project-tailored observations from Step 3, e.g.
  "Your config has `static.framework: vitest`, so the pytest section above
   doesn't apply — see the vitest backend stanza instead." >

<README quote block(s), each in the start:end:plugins/zoto-eval-system/README.md
  code-reference format, kept short and on-topic>

<next-step suggestion: which command to run, or which other section to read>
```

### Step 5: Follow-up navigation

If `follow_up` is absent but the user clearly needs another section, return `needs_user_input` with section options so the command can `askQuestion` and resume. Do not chain to a second section silently.

## Citation format — required

- **README quote**: code reference with line numbers. Paths are relative to repo root (`plugins/zoto-eval-system/README.md`). Do not add a language tag.

  ```34:52:plugins/zoto-eval-system/README.md
  ## Quick start
  ...
  ```

- **Project file quote** (e.g. user's `config.json`): same `start:end:path` syntax.
- **Inline reference in prose**: backticked file path, e.g. `plugins/zoto-eval-system/README.md` — used when no quoted block is needed.

Anti-patterns (will fail the skill's evals):

- Pasting the entire README section without paraphrase or project tailoring.
- Asserting project-specific facts ("your `evalsDir` is `evals`") without reading the file first.
- Paraphrasing the README without any citation back to it.
- Inventing line numbers.

## What NOT to Do

- Do not answer from inferred knowledge. The README is the contract; project files are the host state.
- Do not rewrite the README. Edits go through plugin authors committing directly.
- Do not call `askQuestion` from this skill. Use `needs_user_input` so the command can prompt and resume.
- Do not read or echo secret values from `.env` — only check whether the file exists.
- Do not invent project values when a file is absent. Say "no `manifest.yml` yet" and point at the command that would create it.
