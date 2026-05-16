import { describe, expect, it } from "vitest";
import {
  formatDuration,
  formatStart,
  kindBadge,
  statusColor,
  truncate,
} from "../src/ui/format.js";

describe("formatDuration", () => {
  it("formats seconds", () => {
    expect(formatDuration(5_000)).toBe("5s");
  });
  it("formats minutes + seconds", () => {
    expect(formatDuration(125_000)).toBe("2m05s");
  });
  it("formats hours + minutes", () => {
    expect(formatDuration(3_900_000)).toBe("1h05m");
  });
});

describe("formatStart", () => {
  it("includes both wall time and elapsed", () => {
    const start = new Date("2026-05-16T03:45:30Z").getTime();
    const now = start + 5_000;
    const out = formatStart(start, now);
    expect(out).toMatch(/\(5s\)$/);
    expect(out).toMatch(/^\d{2}:\d{2}:\d{2}/);
  });
});

describe("statusColor", () => {
  it("colours running green and error red", () => {
    expect(statusColor("running")).toBe("green");
    expect(statusColor("error")).toBe("red");
  });
});

describe("kindBadge", () => {
  it("collapses known kinds to 3-letter badges", () => {
    expect(kindBadge("ide")).toBe("IDE");
    expect(kindBadge("cli")).toBe("CLI");
    expect(kindBadge("cloud")).toBe("CLD");
    expect(kindBadge("subagent")).toBe("SUB");
  });
});

describe("truncate", () => {
  it("leaves short strings alone", () => {
    expect(truncate("abc", 10)).toBe("abc");
  });
  it("adds an ellipsis when over the limit", () => {
    expect(truncate("abcdefghij", 5)).toBe("abcd…");
  });
});
