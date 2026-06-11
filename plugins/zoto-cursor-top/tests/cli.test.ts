import { afterEach, describe, expect, it, vi } from "vitest";
import { CLI_VERSION, parseArgs } from "../src/cli.js";

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

describe("parseArgs --theme / --density", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("defaults to theme 'default' and density 'comfortable'", () => {
    const opts = parseArgs([]);
    expect(opts.theme).toBe("default");
    expect(opts.density).toBe("comfortable");
  });

  it("accepts every built-in theme name", () => {
    for (const name of ["default", "mono", "high-contrast", "ocean"]) {
      expect(parseArgs(["--theme", name]).theme).toBe(name);
    }
  });

  it("warns on stderr and falls back to default for unknown themes", () => {
    const stderr = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);
    const opts = parseArgs(["--theme", "neon"]);
    expect(opts.theme).toBe("default");
    expect(opts.help).toBe(false);
    expect(stderr).toHaveBeenCalledTimes(1);
    expect(String(stderr.mock.calls[0]![0])).toContain('unknown theme "neon"');
  });

  it("accepts every density level", () => {
    for (const level of ["compact", "cozy", "comfortable"]) {
      expect(parseArgs(["--density", level]).density).toBe(level);
    }
  });

  it("warns on stderr and falls back to comfortable for unknown densities", () => {
    const stderr = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);
    const opts = parseArgs(["--density", "dense"]);
    expect(opts.density).toBe("comfortable");
    expect(opts.help).toBe(false);
    expect(stderr).toHaveBeenCalledTimes(1);
    expect(String(stderr.mock.calls[0]![0])).toContain('unknown density "dense"');
  });

  it("does not disturb neighbouring flags (value-consuming parse)", () => {
    const opts = parseArgs(["--theme", "ocean", "--density", "cozy", "--lines", "5"]);
    expect(opts.theme).toBe("ocean");
    expect(opts.density).toBe("cozy");
    expect(opts.logLines).toBe(5);
  });
});

describe("parseArgs --filter", () => {
  it("defaults filter to empty string", () => {
    expect(parseArgs([]).filter).toBe("");
  });

  it("captures a filter query value", () => {
    const opts = parseArgs(["--filter", "repo:app status:running"]);
    expect(opts.filter).toBe("repo:app status:running");
  });

  it("combines with --json without disturbing other flags", () => {
    const opts = parseArgs(["--demo", "--json", "--filter", "model:gpt"]);
    expect(opts.demo).toBe(true);
    expect(opts.json).toBe(true);
    expect(opts.filter).toBe("model:gpt");
  });
});

describe("parseArgs --bell", () => {
  it("defaults bell to false", () => {
    expect(parseArgs([]).bell).toBe(false);
  });

  it("enables bell with --bell", () => {
    expect(parseArgs(["--bell"]).bell).toBe(true);
  });
});

describe("parseArgs --detail-lines", () => {
  it("defaults detailLines to 25", () => {
    expect(parseArgs([]).detailLines).toBe(25);
  });

  it("accepts --detail-lines and enforces minimum 1", () => {
    expect(parseArgs(["--detail-lines", "50"]).detailLines).toBe(50);
    expect(parseArgs(["--detail-lines", "0"]).detailLines).toBe(25);
    expect(parseArgs(["--detail-lines", "-3"]).detailLines).toBe(1);
  });
});

describe("CLI_VERSION", () => {
  it("matches package semver for --version output", () => {
    expect(CLI_VERSION).toBe("0.2.0");
    expect(parseArgs(["--version"]).version).toBe(true);
  });
});
