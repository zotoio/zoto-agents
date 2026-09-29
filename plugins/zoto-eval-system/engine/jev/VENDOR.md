# Vendored Jev client (pinned)

This directory is a **minimal, zero-dependency** copy of the Jev (Typesafe
System One) client used by the `jev` grader. It is pinned to one exact commit
of the public reference integration:

| Field | Value |
|-------|-------|
| Upstream repo | [`zotoio/jev-feature-demo`](https://github.com/zotoio/jev-feature-demo) |
| Pinned commit | `44403c0339ce665ff1c058e73c4c049e7332d441` (also in `pin.ts` and `evals/jev/jev.lock.json`) |
| Content pin | `vendor_sha256` in `evals/jev/jev.lock.json` hashes every file under `engine/jev/`, and every result record carries it. Editing any file here without `pnpm eval:jev:lock` counts as drift: `check-lock` fails and every case comes back inconclusive. |
| Grader pin | `grader_sha256` in the lock (and on every record) hashes `engine/graders/jev.ts`, which holds the pass guards (evidence regexes and the leading-phrase check). An edit there without a re-lock is drift in the same way. |
| License | MIT (per upstream `package.json`) |
| Wire format | `POST https://api.typesafe.ai/v1/systemone` (`@typesafe-ai/sdk` 0.6.0 shapes) |

## Provenance

| Local file | Derived from (at the pinned commit) | Changes |
|------------|-------------------------------------|---------|
| `client.ts` | `packages/jev-demo/lib/client/raw-fetch-client.ts`, `lib/constants.ts`, `lib/fixture-fetch.ts` | Wire types inlined (no `@typesafe-ai/sdk` import); transport split into `FixtureTransport` (never touches `fetch`) and `LiveTransport`; explicit opt-in live mode. |
| `gates.ts` | `packages/jev-demo/lib/confidence-gates.ts` | Subset, plus one deliberate behaviour change (see Divergences). |

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

## Divergences from upstream (checked by diff against `44403c0`)

### `gates.ts` vs `lib/confidence-gates.ts`

| # | Divergence | Why | Pinned by |
|---|------------|-----|-----------|
| G1 | **`routeByConfidence` returns `abstain` for non-finite confidence** (`if (!Number.isFinite(confidence)) return "abstain"`). Upstream returns `act` for `+Infinity` because `Infinity >= 0.85` is true. For `NaN` and `-Infinity` both versions already return `abstain`, since every comparison is false. | A malformed or overflowing confidence must never promote. Treating it as `abstain` makes the grader verdict inconclusive. | `tests/jev-gates-divergence.test.ts`: Infinity or NaN confidence gives inconclusive, never pass. Removing the check turns the Infinity rows red. |
| G2 | `decideFromNoul`, `decideFromChoice`, `decideFromScore` and the `Decision` type are not vendored. `routeScore(score, confidence, thresholds, bands)` replaces `decideFromScore`'s outcome logic: the same loop and the same `capGateOutcome` capping, but it returns only the outcome and takes bands as an explicit argument. | The grader builds its own proposal record (`JevProposal`). | `tests/jev-grader.test.ts` (score band cap) |
| G3 | `decideFromNoulWithRequiredFacts`, `promoteChoiceWithSmoke`, `mayAct`, `formatUsage`, `logResolvedModel` and the `BLAST_RADIUS_*` constants are not vendored. | Not used by the grader. Its promotion guards live in `graders/jev.ts`. | n/a |
| G4 | `capGateOutcome` adds a TypeScript non-null assertion (`]!`). | Type-level only; no runtime change. | n/a |
| G5 | Thresholds (`0.85 / 0.6 / 0.4`), `noulConfidence = max(p, 1-p)` and the band semantics are unchanged. | n/a | n/a |

### `client.ts` vs `lib/client/raw-fetch-client.ts`, `lib/constants.ts`, `lib/fixture-fetch.ts`

| # | Divergence | Why |
|---|------------|-----|
| C1 | Wire types are inlined, a subset of `@typesafe-ai/sdk@0.6.0`, instead of `import type … from "@typesafe-ai/sdk"`. `ScoreAnswer.legend` and `probabilities` are optional here. | No dependencies. The grader reads only `score` and `confidence`. |
| C2 | The API key is required when a `LiveTransport` is **constructed** and is never read from env inside the transport. `createLiveTransportFromEnv` is the only env reader. Upstream resolves `apiKey ?? TYPESAFE_API_KEY` lazily on each call and throws a plain `Error`. | Live mode fails fast with `JevConfigError`, and no code path picks a key up implicitly. |
| C3 | **Mode resolution is new.** Fixture is the default, and live requires `ZOTO_EVAL_JEV_MODE=live`. Upstream's `createDemoClient` switches to live whenever `TYPESAFE_API_KEY` is set. | This deliberately follows the rule in upstream's UI README ("presence of … `TYPESAFE_API_KEY` does not auto-enable live mode"), not `createDemoClient`. |
| C4 | `FixtureTransport` replaces `createFixtureFetch`. Upstream mocks `fetch`, matches routes by HTTP method and path (returning a 404 JSON body when nothing matches), and builds a `Response` with an `x-typesafe-request-id` header. Here `FixtureTransport` **ignores method and path entirely**: it takes no URL, returns its one recorded response directly for any call, and never references `fetch`. Which fixture answers which question is decided by the grader (the case's `fixture` plus a template-id match check), not by routing. | Guarantees zero network in fixture mode (`tests/jev-no-network.test.ts`). |
| C5 | The default model is `JEV_PINNED` (`jev-1.13.0`) on `JevClient`. Upstream's raw client defaults to `JEV_LATEST`. | The gates are calibrated against a pinned model (upstream README: "Pin `jev-1.13.0` in production gates"). |
| C6 | A non-JSON response body is kept as text rather than throwing `SyntaxError` from `JSON.parse`. | An HTML 5xx page becomes a `JevHttpError` (inconclusive), not an unexpected crash. |
| C7 | `RawTypeSafeHttpError` is renamed `JevHttpError`, with the same fields (`status`, `message`, `body`) and the same `detail` extraction. | Naming. |
| C8 | `listModels` / `GET /v1/models` and `MODELS_PATH` are dropped. | Unused. |
| C9 | Added: an empty-`questions` check (the SDK throws for this, the raw client did not) and the `onCall` observer, which tests use to count Jev consultations. | Safety and testability. |
| C10 | Identical to upstream: `TYPESAFE_API_BASE`, `JEV_LATEST`, `JEV_PINNED`, `SYSTEMONE_PATH`, the headers (`Authorization: Bearer`, `Content-Type`, `Accept`), trailing-slash stripping of the base URL, and no retries. | n/a |
| C11 | `TYPESAFE_BASE_URL`: upstream reads it in the constructor, both in `JevClient` (via `createTypeSafeClient`) and in `RawTypeSafeClient`, as `config.baseURL ?? readEnv("TYPESAFE_BASE_URL") ?? TYPESAFE_API_BASE`, without trimming (only an empty string counts as unset). Here neither `JevClient` nor `LiveTransport` reads env. Only `createLiveTransportFromEnv` reads `TYPESAFE_BASE_URL`, and it **trims whitespace** (`TYPESAFE_BASE_URL?.trim() \|\| undefined`), so a whitespace-only value falls back to `https://api.typesafe.ai`. | One env reader (see C2). Trailing-slash stripping is unchanged (C10). |
