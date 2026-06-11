import { describe, expect, it, vi } from "vitest";
import { CLEAR_SCREEN_HOME, clearActiveScreen } from "../src/ui/terminal.js";

describe("clearActiveScreen", () => {
  it("writes home+clear only on a TTY", () => {
    const write = vi.fn();
    clearActiveScreen({ isTTY: true, write } as NodeJS.WriteStream);
    expect(write).toHaveBeenCalledWith(CLEAR_SCREEN_HOME);

    write.mockClear();
    clearActiveScreen({ isTTY: false, write } as NodeJS.WriteStream);
    expect(write).not.toHaveBeenCalled();
  });
});
