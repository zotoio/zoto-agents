import { describe, expect, it } from "vitest";
import {
  coalesceModelSlug,
  isPlaceholderModelSlug,
} from "../src/discovery/model-slug.js";

describe("isPlaceholderModelSlug", () => {
  it("treats default and auto as placeholders", () => {
    expect(isPlaceholderModelSlug("default")).toBe(true);
    expect(isPlaceholderModelSlug("AUTO")).toBe(true);
    expect(isPlaceholderModelSlug(null)).toBe(true);
  });

  it("accepts concrete slugs", () => {
    expect(isPlaceholderModelSlug("composer-2.5-fast")).toBe(false);
  });
});

describe("coalesceModelSlug", () => {
  it("prefers a resolved slug over a placeholder", () => {
    expect(coalesceModelSlug("default", "composer-2.5")).toBe("composer-2.5");
    expect(coalesceModelSlug("claude-opus-4-7", "composer-2.5")).toBe(
      "claude-opus-4-7",
    );
  });
});
