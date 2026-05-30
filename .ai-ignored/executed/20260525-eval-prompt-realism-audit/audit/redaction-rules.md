# Eval Prompt Redaction Rules

Transcript-sourced prompts MUST pass through these rules (in order) before landing in eval JSON. Implementation: `redact.ts`.

**Canonical path form after full `redact()`:** repo-relative paths under `zoto-agents/` (everything through `zoto-agents/` is stripped). Use `redactPath()` when you only need home-directory normalisation (`~/…`).

---

## 1. Absolute home paths

**Regex:** `/(?:\/home|\/Users)\/[^/\s\\]+(?:\/|\\)?/g` and `/C:\\Users\\[^\\\s]+\\?/gi`

**Rationale:** Transcripts embed the operator's home directory; normalising to `~/` keeps structure without leaking usernames.

**Example:** `/home/andrewv/git/cursor/zoto-agents/foo` → `~/git/cursor/zoto-agents/foo`

---

## 2. Repo-relative normalisation

**Regex:** literal substring `zoto-agents/` — strip the prefix through and including that segment.

**Rationale:** Eval prompts should reference repo paths portably; absolute or `~/git/cursor/zoto-agents/…` forms collapse to `plugins/…`, `specs/…`, etc.

**Example:** `~/git/cursor/zoto-agents/plugins/foo` → `plugins/foo`

---

## 3. Email addresses

**Regex:** `/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g`

**Rationale:** Personal email addresses appear in support-style transcript turns.

**Example:** `Email me at andrew@example.com` → `Email me at <email>`

---

## 4. Generic API tokens

**Regex (each applied globally):**

| Pattern | Prefix |
|---------|--------|
| `/sk-[A-Za-z0-9_-]{16,}/g` | OpenAI / generic |
| `/ghp_[A-Za-z0-9]{30,}/g` | GitHub PAT |
| `/gh_pat_[A-Za-z0-9_]{5,}/g` | GitHub fine-grained PAT |
| `/ghs_[A-Za-z0-9]{20,}/g` | GitHub App |
| `/xox[baprs]-[A-Za-z0-9-]{10,}/g` | Slack |
| `/AKIA[0-9A-Z]{16}/g` | AWS access key |

**Rationale:** Users paste secrets into chat; prefix coverage catches the common Cursor-adjacent leaks.

**Example:** `token gh_pat_AAAAA` → `token <token>`

---

## 5. CURSOR_API_KEY values

**Regex:** `/CURSOR_API_KEY(=|:)\s*\S+/g` → replace value with `<redacted>`, preserve key name.

**Rationale:** Cursor API keys are high-value secrets often copied into `.env` snippets in transcripts.

**Example:** `CURSOR_API_KEY=ck_live_abc123` → `CURSOR_API_KEY=<redacted>`

---

## 6. Generic env-value redaction

**Regex:** `/^([A-Z_][A-Z0-9_]*)=(.*)$/gm` — when value length > 8 and value is not already a placeholder (`<…>`, `your-…-here`, `xxx…`), replace value with `<redacted>`.

**Rationale:** `.env`-style lines leak long secrets beyond named key patterns.

**Example:** `DATABASE_URL=postgres://user:secretpass@host/db` → `DATABASE_URL=<redacted>`

**Skip example:** `API_KEY=your-key-here` → unchanged

---

## 7. Operator name normalisation

**Regex:** `/\bandrewv\b/gi` (from configurable `OPERATOR_NAMES`)

**Rationale:** The transcript directory path embeds the operator username; standalone tokens leak identity.

**Example:** `paths under /home/andrewv/.cursor` → after prior rules, `andrewv` in prose → `<operator>`

---

## 8. Machine identifiers (UUIDs)

**Regex:** `/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi`

**Rationale:** Session and artefact UUIDs are machine-specific noise in eval fixtures.

**Preserve:** UUIDs immediately preceded by `skill:`, `command:`, `agent:`, `hook:`, or `rule:` (eval `target_id` values).

**Example:** `run id 550e8400-e29b-41d4-a716-446655440000` → `run id <uuid>`

**Preserve example:** `target skill:550e8400-e29b-41d4-a716-446655440000` → unchanged

---

## 9. Third-party customer / company names

**Function:** `redactThirdPartyNames(text, { allowlist })` with `CUSTOMER_NAME_ALLOWLIST` (initially empty) and `CUSTOMER_NAMES_TO_REDACT` (initially empty).

**Rationale:** Future audits can extend named-entity redaction without rewriting the core helper.

**Example (when names configured):** `Acme Corp billing` → `<customer>` (no-op until lists are populated)
