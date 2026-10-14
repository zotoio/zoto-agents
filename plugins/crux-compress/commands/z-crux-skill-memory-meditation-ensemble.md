---
name: z-crux-skill-memory-meditation-ensemble
description: "Run the crux-skill-memory-meditation-ensemble skill. Combine several models' meditation results into a cross-model synthesis and a single set of user decisions."
---

# z-crux-skill-memory-meditation-ensemble

Shortcut for the `crux-skill-memory-meditation-ensemble` skill in this plugin.

The `crux-cursor-meditation-guide` agent normally loads this skill during `/crux-meditate`. Run it directly to inspect or reuse one step of a meditation.

## Usage

```
/z-crux-skill-memory-meditation-ensemble aggregate the model runs in .ai-ignored/meditations/latest
/z-crux-skill-memory-meditation-ensemble explain how ensemble decisions are combined
```

## Instructions

Load and follow the `crux-skill-memory-meditation-ensemble` skill (`skills/crux-skill-memory-meditation-ensemble/SKILL.md` in this plugin). Treat any text after the command as the user's request to that skill; with no text, start the skill from its first step. Follow the skill's steps and safety rules as written, and do not add behaviour the skill does not describe.

## Related

- Skill: `crux-skill-memory-meditation-ensemble`
