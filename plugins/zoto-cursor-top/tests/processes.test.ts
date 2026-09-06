import { describe, expect, it } from "vitest";
import {
  discoverCursorProcesses,
  extractBinaryPath,
  isCursorProcess,
  parseEtime,
  parseUnixPs,
  parseWindowsPs,
} from "../src/discovery/processes.js";

const MAC_GPU_HELPER =
  "/Applications/Cursor.app/Contents/Frameworks/Cursor Helper (GPU).app/Contents/MacOS/Cursor Helper (GPU)";
const MAC_RENDERER_HELPER =
  "/Applications/Cursor.app/Contents/Frameworks/Cursor Helper.app/Contents/MacOS/Cursor Helper";

describe("extractBinaryPath", () => {
  it("returns the whole command when there are no arguments", () => {
    expect(extractBinaryPath("/usr/share/cursor/cursor")).toBe("/usr/share/cursor/cursor");
  });
  it("splits at the first flag for simple paths", () => {
    expect(extractBinaryPath("/usr/share/cursor/cursor --type=renderer --foo")).toBe(
      "/usr/share/cursor/cursor",
    );
    expect(extractBinaryPath("/usr/local/bin/cursor-agent --resume foo")).toBe(
      "/usr/local/bin/cursor-agent",
    );
  });
  it("keeps macOS bundle paths that contain spaces intact", () => {
    expect(extractBinaryPath(`${MAC_GPU_HELPER} --type=gpu-process --field-trial`)).toBe(
      MAC_GPU_HELPER,
    );
    expect(extractBinaryPath(`${MAC_RENDERER_HELPER} --type=renderer`)).toBe(
      MAC_RENDERER_HELPER,
    );
    expect(extractBinaryPath(MAC_RENDERER_HELPER)).toBe(MAC_RENDERER_HELPER);
  });
  it("keeps Windows paths with spaces intact when they end in .exe", () => {
    expect(
      extractBinaryPath("C:\\Program Files\\cursor\\Cursor.exe --type=utility --lang=en-US"),
    ).toBe("C:\\Program Files\\cursor\\Cursor.exe");
  });
  it("falls back to the first token for interpreter-style commands", () => {
    expect(extractBinaryPath("/usr/bin/node /opt/app/server.js --port 80")).toBe(
      "/usr/bin/node",
    );
    expect(extractBinaryPath("  /proc/self/exe --type=utility")).toBe("/proc/self/exe");
  });
});

describe("parseEtime", () => {
  it("parses pure seconds", () => {
    expect(parseEtime("42")).toBe(42);
  });
  it("parses MM:SS", () => {
    expect(parseEtime("01:30")).toBe(90);
  });
  it("parses HH:MM:SS", () => {
    expect(parseEtime("02:00:00")).toBe(7200);
  });
  it("parses D-HH:MM:SS", () => {
    expect(parseEtime("1-00:00:01")).toBe(86_401);
  });
  it("returns 0 on garbage", () => {
    expect(parseEtime("")).toBe(0);
  });
});

describe("parseUnixPs", () => {
  it("parses the standard four-column layout", () => {
    const sample = [
      "4231 1 14:07 /Applications/Cursor.app/Contents/MacOS/Cursor",
      "5612 1 07:07 /usr/local/bin/cursor-agent --resume foo",
      "6712 1 32:04 /exec-daemon/node /exec-daemon/index.js serve --port 26053",
      "9999 1 00:01 /usr/bin/bash some-other-thing",
    ].join("\n");
    const rows = parseUnixPs(sample);
    expect(rows).toHaveLength(4);
    expect(rows[0]!.pid).toBe(4231);
    expect(rows[0]!.etimeSec).toBe(14 * 60 + 7);
    expect(rows[1]!.command).toContain("cursor-agent");
  });
});

describe("isCursorProcess", () => {
  it("matches the Cursor.app binary", () => {
    expect(
      isCursorProcess("/Applications/Cursor.app/Contents/MacOS/Cursor"),
    ).toBe(true);
  });
  it("matches cursor-agent CLI", () => {
    expect(isCursorProcess("/usr/local/bin/cursor-agent --resume foo")).toBe(
      true,
    );
  });
  it("does not match unrelated processes", () => {
    expect(isCursorProcess("/usr/bin/python3 -m http.server")).toBe(false);
  });
  it("matches macOS helper binaries whose path contains spaces", () => {
    expect(isCursorProcess(`${MAC_GPU_HELPER} --type=gpu-process`)).toBe(true);
    expect(isCursorProcess(`${MAC_RENDERER_HELPER} --type=renderer`)).toBe(true);
  });
  it("matches Linux Electron children and /proc/self/exe workers", () => {
    expect(isCursorProcess("/usr/share/cursor/cursor --type=utility --lang=en-US")).toBe(true);
    expect(
      isCursorProcess(
        "/proc/self/exe --type=utility --user-data-dir=/home/u/.config/Cursor --lang=en-US",
      ),
    ).toBe(true);
  });
  it("does not match an unrelated process just because an argument mentions cursor", () => {
    expect(isCursorProcess("/usr/bin/python3 /opt/wrap.py --cursor-electron-mode")).toBe(false);
  });
});

describe("parseWindowsPs", () => {
  it("parses an array of CIM rows", () => {
    const json = JSON.stringify([
      {
        ProcessId: 1234,
        ParentProcessId: 1,
        CreationDate: "20260516040501.000000+000",
        CommandLine: "C:\\Cursor\\Cursor.exe",
      },
    ]);
    const rows = parseWindowsPs(json);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.pid).toBe(1234);
    expect(rows[0]!.command).toContain("Cursor.exe");
  });

  it("tolerates a single-object response", () => {
    const json = JSON.stringify({
      ProcessId: 99,
      ParentProcessId: 0,
      CreationDate: "20260516040501.000000+000",
      CommandLine: "cursor-agent --version",
    });
    expect(parseWindowsPs(json)).toHaveLength(1);
  });
});

describe("discoverCursorProcesses with injected runner", () => {
  it("filters out non-Cursor lines", async () => {
    const stdout = [
      "100 1 00:05 /usr/bin/sshd -D",
      "200 1 01:00 /Applications/Cursor.app/Contents/MacOS/Cursor",
      "201 200 00:30 /Applications/Cursor.app/Contents/Frameworks/Cursor Helper.app/Contents/MacOS/Cursor Helper",
      "300 1 00:10 /usr/local/bin/cursor-agent --resume xyz",
    ].join("\n");
    const rows = await discoverCursorProcesses(async () => stdout);
    const pids = rows.map((r) => r.pid).sort();
    expect(pids).toEqual([200, 201, 300]);
  });
});
