---
name: zoto-eval-help
description: Section-routed help for the Eval System plugin. Loads README.md and returns the requested section verbatim via askQuestion-driven navigation.
---

# zoto-eval-help

Canonical help command. The skill loads this plugin's `README.md` and returns the section matching the user's topic, so every how-to answer is in lockstep with shipped docs.

## Usage

```
/zoto-eval-help                 # numbered askQuestion list of sections
/zoto-eval-help <topic>         # e.g. /zoto-eval-help updating
```

## Instructions

Use the `zoto-help-evals` skill directly — no intermediate agent is required. The skill loads `README.md`, parses sections, selects a section via `askQuestion` if needed, and prints it verbatim.

### What happens

1. Load `README.md`.
2. If a topic is supplied, match it case-insensitively to section headers. Use `askQuestion` if multiple match.
3. Otherwise, `askQuestion` with a numbered list of all sections.
4. Print the chosen section verbatim.
5. Offer related sections via `askQuestion`.

## Related

- `zoto-help-evals` skill — the documented workflow.
- `rules/zoto-eval-system.mdc` — the routing rule that invokes this skill for help-intent.
