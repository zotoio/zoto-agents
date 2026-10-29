# Accepted dependency risks (Snyk) — 2026-10-29

Remaining Snyk Open Source issues after the 2026-10-29 remediation have **no fixed version**
published. All are dev/test-time only (Jest toolchain in `plugins/zoto-eval-system`), never shipped
to users at runtime.

| Package | Version | Snyk ID | Severity | Path | Notes |
|---|---|---|---|---|---|
| picomatch | 2.3.2, 4.0.4 | SNYK-JS-PICOMATCH-21248802 (ReDoS) | high | jest@30 > @jest/core | Glob patterns come from repo config, not untrusted input. |
| deepmerge | 4.3.1 | SNYK-JS-DEEPMERGE-19964053 (prototype pollution) | medium | jest@30 > @jest/core | Merges Jest config objects only. |
| inflight | 1.0.6 | SNYK-JS-INFLIGHT-6095116 (resource leak) | medium | jest@30 > @jest/core (glob@7) | Deprecated, no fix; short-lived test processes. |

Fixed in this pass: undici/tar/sqlite3/@connectrpc chain removed by `@cursor/sdk` ^1.2.0; pnpm
overrides for esbuild, fast-uri, brace-expansion, js-yaml, browserslist, ip-address, ws,
@babel/core, zod.
