# Vendored Jev client (pinned)

This directory is a **minimal, zero-dependency** copy of the Jev (Typesafe
System One) client used by the `jev` grader. It is pinned to one exact commit
of the public reference integration:

| Field | Value |
|-------|-------|
| Upstream repo | [`zotoio/jev-feature-demo`](https://github.com/zotoio/jev-feature-demo) |
| Pinned commit | `44403c0339ce665ff1c058e73c4c049e7332d441` (also in `pin.ts` and `evals/jev/jev.lock.json`) |
| License | MIT (per upstream `package.json`) |
| Wire format | `POST https://api.typesafe.ai/v1/systemone` (`@typesafe-ai/sdk` 0.6.0 shapes) |

## Provenance

| Local file | Derived from (at the pinned commit) | Changes |
|------------|-------------------------------------|---------|
| `client.ts` | `packages/jev-demo/lib/client/raw-fetch-client.ts`, `lib/constants.ts`, `lib/fixture-fetch.ts` | Wire types inlined (no `@typesafe-ai/sdk` import); transport split into `FixtureTransport` (never touches `fetch`) and `LiveTransport`; explicit opt-in live mode. |
| `gates.ts` | `packages/jev-demo/lib/confidence-gates.ts` | Subset: `noulConfidence`, `routeByConfidence`, `capGateOutcome`, score bands. Same semantics. |

## Why vendor instead of a dependency

- `jev-feature-demo` is a demo monorepo (`private: true`, not published to npm);
  its `@zotoio/jev-demo` package ships raw `.ts` and depends on
  `@typesafe-ai/sdk`. A git dependency would pull the whole demo + UI into
  every host repo that installs this plugin.
- The eval engine is consumed by host repos through `#eval-engine` without its
  own `node_modules`; a zero-dependency client keeps that working.
- Pinning a copy makes the grader reproducible: a jev `main` change cannot
  silently change eval verdicts. Bumps are conscious (update `pin.ts`,
  re-vendor, `pnpm eval:jev:lock`).
