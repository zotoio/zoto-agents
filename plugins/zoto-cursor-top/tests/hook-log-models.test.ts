import { describe, expect, it } from "vitest";
import { parseHookLogModels } from "../src/discovery/hook-log-models.js";

describe("parseHookLogModels", () => {
  it("extracts conversation_id and session_id aliases", () => {
    const sample = `
INPUT:
{
  "conversation_id": "361e498f-9da7-4bc0-b190-3e7b67539239",
  "generation_id": "ec04a46f-85b1-4701-bd01-17000987ceaa",
  "model": "composer-2.5",
  "session_id": "361e498f-9da7-4bc0-b190-3e7b67539239"
}
`;
    const out = parseHookLogModels(sample);
    expect(out.get("361e498f-9da7-4bc0-b190-3e7b67539239")).toBe("composer-2.5");
  });

  it("ignores placeholder model values", () => {
    const sample = `"conversation_id": "abc-123", "model": "default"`;
    expect(parseHookLogModels(sample).size).toBe(0);
  });

  it("keeps the latest mapping when duplicates appear", () => {
    const sample = [
      `"conversation_id": "chat-1", "model": "gpt-5"`,
      `"conversation_id": "chat-1", "model": "claude-opus-4-7"`,
    ].join("\n");
    expect(parseHookLogModels(sample).get("chat-1")).toBe("claude-opus-4-7");
  });
});
