/**
 * Jev dependency pin (option a: PIN — vendored, never tracks jev main).
 *
 * The files in this directory are a minimal, dependency-free copy of the
 * public reference integration `zotoio/jev-feature-demo`, taken from ONE
 * exact commit. Bumping the pin is a conscious change: re-vendor from the new
 * commit, update `commit` below, re-run `pnpm eval:jev:lock` and review the
 * diff. See `VENDOR.md` for the file-by-file provenance.
 */
export const JEV_PIN = {
  repo: "zotoio/jev-feature-demo",
  commit: "44403c0339ce665ff1c058e73c4c049e7332d441",
  /** Upstream files this vendored copy is derived from (paths at `commit`). */
  vendoredFrom: [
    "packages/jev-demo/lib/client/raw-fetch-client.ts",
    "packages/jev-demo/lib/confidence-gates.ts",
    "packages/jev-demo/lib/constants.ts",
    "packages/jev-demo/lib/fixture-fetch.ts",
  ],
  /** Wire format the vendored client speaks (`POST /v1/systemone`). */
  wire: "@typesafe-ai/sdk@0.6.0 SystemOne wire format",
  license: "MIT",
} as const;

export type JevPin = typeof JEV_PIN;
