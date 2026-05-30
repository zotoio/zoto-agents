/**
 * Cross-platform discovery of Cursor processes.
 *
 * We deliberately avoid native modules so the CLI works out of the box on
 * macOS, Linux, and Windows (via PowerShell). The output of `ps`/`Get-Process`
 * is parsed into a normalised {@link RawProcess} array consumed by the
 * collector.
 */

import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

const CURSOR_BIN_MATCHERS = [
  /(^|\/)Cursor(\.app)?\//i,
  /(^|\/)Cursor( Helper.*)?(\.exe)?(\s|$)/i,
  /(^|\/)cursor-agent(\s|$)/i,
  /\bcursor\b.*(--agent|--cloud|electron)/i,
];

export interface RawProcess {
  pid: number;
  ppid: number;
  /** Elapsed time in seconds since process start. */
  etimeSec: number;
  /** Full command line. */
  command: string;
}

export interface ProcessRunner {
  (): Promise<string>;
}

/**
 * Run `ps` (or its equivalent on Windows) and return the raw stdout. Exposed
 * so tests can stub the runner with deterministic fixtures.
 */
export const defaultPsRunner: ProcessRunner = async () => {
  if (process.platform === "win32") {
    const cmd =
      "powershell -NoProfile -Command \"Get-CimInstance Win32_Process | " +
      "Select-Object ProcessId,ParentProcessId,CreationDate,CommandLine | " +
      "ConvertTo-Json -Compress\"";
    const { stdout } = await execAsync(cmd, { maxBuffer: 16 * 1024 * 1024 });
    return stdout;
  }
  const { stdout } = await execAsync(
    "ps -axww -o pid=,ppid=,etime=,command=",
    { maxBuffer: 16 * 1024 * 1024 },
  );
  return stdout;
};

/**
 * Parse Unix `etime` (e.g. "01:23", "1-02:03:04", "12345") into seconds.
 *
 * The CLI is hot-path enough that we hand-roll the parser instead of pulling
 * in a date-fns equivalent.
 */
export function parseEtime(value: string): number {
  const trimmed = value.trim();
  if (!trimmed) return 0;
  let days = 0;
  let rest = trimmed;
  const dashIdx = rest.indexOf("-");
  if (dashIdx >= 0) {
    days = Number.parseInt(rest.slice(0, dashIdx), 10) || 0;
    rest = rest.slice(dashIdx + 1);
  }
  const parts = rest.split(":").map((p) => Number.parseInt(p, 10) || 0);
  let h = 0;
  let m = 0;
  let s = 0;
  if (parts.length === 3) {
    [h, m, s] = parts as [number, number, number];
  } else if (parts.length === 2) {
    [m, s] = parts as [number, number];
  } else if (parts.length === 1) {
    [s] = parts as [number];
  }
  return days * 86_400 + h * 3_600 + m * 60 + s;
}

/**
 * Parse the unix `ps` output. Each input line is `PID PPID ETIME COMMAND`
 * separated by runs of whitespace; the command can itself contain spaces.
 */
export function parseUnixPs(stdout: string): RawProcess[] {
  const out: RawProcess[] = [];
  for (const line of stdout.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const match = trimmed.match(/^(\d+)\s+(\d+)\s+(\S+)\s+(.*)$/);
    if (!match) continue;
    const [, pid, ppid, etime, command] = match;
    out.push({
      pid: Number.parseInt(pid!, 10),
      ppid: Number.parseInt(ppid!, 10),
      etimeSec: parseEtime(etime!),
      command: command!,
    });
  }
  return out;
}

interface WindowsProcessRow {
  ProcessId: number;
  ParentProcessId: number;
  CreationDate: string;
  CommandLine: string | null;
}

/** Parse the JSON returned by the PowerShell fallback. */
export function parseWindowsPs(stdout: string): RawProcess[] {
  const trimmed = stdout.trim();
  if (!trimmed) return [];
  let rows: WindowsProcessRow[];
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    rows = Array.isArray(parsed)
      ? (parsed as WindowsProcessRow[])
      : [parsed as WindowsProcessRow];
  } catch {
    return [];
  }
  const now = Date.now();
  return rows
    .filter((r) => r && r.ProcessId)
    .map((r) => {
      const created = parseWindowsCimDate(r.CreationDate);
      return {
        pid: r.ProcessId,
        ppid: r.ParentProcessId ?? 0,
        etimeSec: created ? Math.max(0, Math.round((now - created) / 1000)) : 0,
        command: r.CommandLine ?? "",
      };
    });
};

/**
 * Convert a CIM-style date such as "20260516040501.123456+000" into a unix
 * timestamp in milliseconds. Returns null on parse failure.
 */
function parseWindowsCimDate(value: string | null | undefined): number | null {
  if (!value) return null;
  const m = value.match(
    /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})\.(\d{6})/,
  );
  if (!m) return null;
  const [, y, mo, d, h, mi, s, micro] = m;
  return Date.UTC(
    Number(y),
    Number(mo) - 1,
    Number(d),
    Number(h),
    Number(mi),
    Number(s),
    Math.floor(Number(micro) / 1000),
  );
}

export function isCursorProcess(command: string): boolean {
  return CURSOR_BIN_MATCHERS.some((re) => re.test(command));
}

/**
 * Run a process listing and return only Cursor-related processes.
 *
 * Errors are swallowed and reported as an empty list so the TUI can still
 * render; the collector wraps this and adds a diagnostic if needed.
 */
export async function discoverCursorProcesses(
  runner: ProcessRunner = defaultPsRunner,
): Promise<RawProcess[]> {
  let stdout: string;
  try {
    stdout = await runner();
  } catch {
    return [];
  }
  const rows = process.platform === "win32"
    ? parseWindowsPs(stdout)
    : parseUnixPs(stdout);
  return rows.filter((r) => isCursorProcess(r.command));
}
