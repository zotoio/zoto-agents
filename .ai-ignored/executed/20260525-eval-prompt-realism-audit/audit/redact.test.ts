import { describe, expect, it } from "vitest";
import { redact, redactPath, redactThirdPartyNames } from "./redact.ts";

describe("redactPath", () => {
  it("normalises Unix home paths", () => {
    expect(redactPath("/home/andrewv/git/cursor/zoto-agents/foo")).toBe(
      "~/git/cursor/zoto-agents/foo",
    );
  });

  it("normalises macOS home paths", () => {
    expect(redactPath("/Users/jane/projects/app")).toBe("~/projects/app");
  });
});

describe("redact", () => {
  it("rule 1+2: home path then repo-relative", () => {
    expect(redact("/home/andrewv/git/cursor/zoto-agents/plugins/zoto-eval-system")).toBe(
      "plugins/zoto-eval-system",
    );
  });

  it("rule 2: repo-relative from tilde path", () => {
    expect(redact("~/git/cursor/zoto-agents/plugins/foo")).toBe("plugins/foo");
  });

  it("rule 3: email addresses", () => {
    expect(redact("Email me at andrew@example.com")).toBe("Email me at <email>");
    expect(redact("Email me at andrew@example.com with token gh_pat_AAAAA")).toBe(
      "Email me at <email> with token <token>",
    );
  });

  it("rule 4: generic API tokens", () => {
    expect(redact("sk-abcdefghijklmnopqrstuvwxyz")).toBe("<token>");
    expect(redact("ghp_1234567890123456789012345678901234")).toBe("<token>");
  });

  it("rule 5: CURSOR_API_KEY", () => {
    expect(redact("CURSOR_API_KEY=ck_live_abc123")).toBe("CURSOR_API_KEY=<redacted>");
    expect(redact("export CURSOR_API_KEY: sk-secret-value")).toBe(
      "export CURSOR_API_KEY=<redacted>",
    );
  });

  it("rule 6: env lines with long values", () => {
    expect(redact("DATABASE_URL=postgres://user:secretpass@host/db")).toBe(
      "DATABASE_URL=<redacted>",
    );
    expect(redact("API_KEY=your-key-here")).toBe("API_KEY=your-key-here");
    expect(redact("SHORT=abc")).toBe("SHORT=abc");
  });

  it("rule 7: operator names", () => {
    expect(redact("paths owned by andrewv here")).toBe("paths owned by <operator> here");
  });

  it("rule 8: UUIDs except target_id prefixes", () => {
    const uuid = "550e8400-e29b-41d4-a716-446655440000";
    expect(redact(`run id ${uuid}`)).toBe("run id <uuid>");
    expect(redact(`target skill:${uuid}`)).toBe(`target skill:${uuid}`);
    expect(redact(`target command:${uuid}`)).toBe(`target command:${uuid}`);
  });

  it("rule 9: third-party names no-op when lists empty", () => {
    expect(redactThirdPartyNames("Acme Corp billing")).toBe("Acme Corp billing");
  });

  it("never throws on empty or null-ish input", () => {
    expect(redact("")).toBe("");
    expect(redact(undefined as unknown as string)).toBe("");
    expect(redact(null as unknown as string)).toBe("");
    expect(redactPath("")).toBe("");
  });
});
