# Critique rubric (score 1–10 each)

Look at the rendered PNG and the prompt side by side.

| Dimension | 10 means | Typical fixes when low |
|---|---|---|
| subject | Every named subject present and recognisable | add/reshape SDF or mask layers |
| composition | Placement, scale, horizon, framing match the prompt | move cx/cy, scale factors, canvas aspect |
| palette | Colours and lighting match the requested mood | channel vectors, gradients, tone curve in output |
| detail | Texture density appropriate; no flat or noisy regions | fBm octaves, simulation steps, hash density |
| edges | Silhouettes clean where intended, soft where intended | softmask sharpness k |
| artifacts | No banding, seams, wrap-around ghosts, NaN black holes | boundary mode, smoothstep, clamps |

Write `critique.json`:

```json
{"round": 2, "scores": {"subject": 6, "composition": 8, "palette": 7, "detail": 5, "edges": 8, "artifacts": 9},
 "issues": [{"where": "left third", "issue": "trees too uniform", "fix": "jitter heights with cos(5 s^2)"}],
 "keep": ["sky gradient", "ground texture"]}
```
