import { describe, expect, it } from "vitest";
import { sanitizeDisplayText } from "../src/discovery/sanitize.js";

const hasTerminalControl = (value: string): boolean =>
  [...value].some((ch) => {
    const code = ch.charCodeAt(0);
    return code < 0x20 || (code >= 0x7F && code <= 0x9F);
  });

describe("sanitizeDisplayText", () => {
  it("strips CSI sequences", () => {
    expect(sanitizeDisplayText("\x1B[2J\x1B[H\x1B[31mred\x1B[0m")).toBe("red");
  });

  it("strips OSC window titles and hyperlinks", () => {
    const input = "\x1B]0;owned\x07safe \x1B]8;;https://evil.example\x1B\\click\x1B]8;;\x1B\\";
    expect(sanitizeDisplayText(input)).toBe("safe click");
  });

  it("strips OSC clipboard writes", () => {
    expect(sanitizeDisplayText("copy \x1B]52;c;c2VjcmV0\x07done")).toBe("copy done");
  });

  it("strips DCS string controls including sixel payloads", () => {
    expect(sanitizeDisplayText("before \x1BPq~~~~\x1B\\ after")).toBe("before after");
  });

  it("strips raw 8-bit C1 CSI and OSC forms", () => {
    const input = "\u009B31mred\u009B0m \u009D0;owned\u009Ctitle";
    expect(sanitizeDisplayText(input)).toBe("red title");
  });

  it("strips raw 8-bit DCS/SOS/PM/APC string controls", () => {
    expect(sanitizeDisplayText("a\u0090payload\u009Cb\u0098hidden\u009Cc\u009Ehide\u009Cd\u009Fmask\u009Ce")).toBe("abcde");
  });

  it("strips unterminated OSC and string controls through end of input", () => {
    expect(sanitizeDisplayText("visible\x1B]8;;https://evil.example")).toBe("visible");
    expect(sanitizeDisplayText("visible\x1BPunterminated")).toBe("visible");
  });

  it("strips other two-byte ESC controls and dangling ESC bytes", () => {
    expect(sanitizeDisplayText("a\x1B7b\x1B")).toBe("ab");
  });

  it("turns residual controls into collapsed spaces", () => {
    expect(sanitizeDisplayText("one\ttwo\n\nthree\u0085four")).toBe("one two three four");
  });

  it("returns no terminal controls for mixed adversarial payloads", () => {
    const sanitized = sanitizeDisplayText(
      "\x1B]0;owned\x07\x1B[2Jhello\u009B6n\x1B]52;c;AAAA\x07world\x1B\\",
    );
    expect(sanitized).toBe("helloworld");
    expect(hasTerminalControl(sanitized)).toBe(false);
  });
});
