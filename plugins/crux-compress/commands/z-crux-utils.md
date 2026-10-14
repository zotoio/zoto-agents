---
name: z-crux-utils
description: "Run the crux-utils skill. Estimate tokens, compare source and CRUX sizes, and compute checksums for CRUX compression."
---

# z-crux-utils

Shortcut for the `crux-utils` skill in this plugin.

## Usage

```
/z-crux-utils token count for .cursor/rules/api.md
/z-crux-utils checksum of .cursor/rules/api.md
```

## Instructions

Load and follow the `crux-utils` skill (`skills/crux-utils/SKILL.md` in this plugin). Treat any text after the command as the user's request to that skill; with no text, start the skill from its first step. Follow the skill's steps and safety rules as written, and do not add behaviour the skill does not describe.

## Related

- Skill: `crux-utils`
