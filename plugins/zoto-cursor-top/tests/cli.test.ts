import { describe, expect, it } from "vitest";
import { parseArgs } from "../src/cli.js";

describe("parseArgs CLI defaults", () => {
  it("defaults --cursor-only, --with-logs, --active-only to true", () => {
    const opts = parseArgs([]);
    expect(opts.cursorOnly).toBe(true);
    expect(opts.withLogs).toBe(true);
    expect(opts.activeOnly).toBe(true);
  });

  it("--no-* flags individually disable each filter", () => {
    const opts = parseArgs([
      "--no-cursor-only",
      "--no-with-logs",
      "--no-active-only",
    ]);
    expect(opts.cursorOnly).toBe(false);
    expect(opts.withLogs).toBe(false);
    expect(opts.activeOnly).toBe(false);
  });

  it("last flag wins when --foo and --no-foo are both passed", () => {
    // `--with-logs` then `--no-with-logs` → disabled. This matches the
    // generic switch parsing semantics and mirrors how shell aliases
    // commonly append overrides.
    const opts = parseArgs(["--with-logs", "--no-with-logs"]);
    expect(opts.withLogs).toBe(false);
  });
});
