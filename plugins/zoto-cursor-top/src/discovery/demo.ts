/**
 * Deterministic fixture snapshot used by `--demo` mode.
 *
 * The fixture is regenerated on each tick so log lines visibly scroll - this
 * gives screenshots / screen recordings something to demonstrate without
 * requiring a real Cursor process.
 */

import type { AgentNode, AgentSnapshot } from "../types.js";

const ROOTS: Array<Omit<AgentNode, "recentLogs">> = [
  {
    id: "ide-1",
    parentId: null,
    kind: "ide",
    pid: 4231,
    label: "Cursor IDE",
    title: "Refactor authentication flow",
    model: "claude-opus-4.7",
    repo: "/Users/dev/work/app",
    startedAt: Date.now() - 1000 * 60 * 14,
    status: "running",
    logSource: null,
    children: ["ide-1-sub-explore", "ide-1-sub-impl"],
  },
  {
    id: "cli-1",
    parentId: null,
    kind: "cli",
    pid: 5612,
    label: "cursor-agent CLI",
    title: "rewrite util/parser.ts",
    model: "gpt-5",
    repo: "/Users/dev/work/util",
    startedAt: Date.now() - 1000 * 60 * 7,
    status: "waiting",
    logSource: null,
    children: [],
  },
  {
    id: "cloud-1",
    parentId: null,
    kind: "cloud",
    pid: 6712,
    label: "Cloud Agent VM",
    title: "Design plugin live-updating htop CLI",
    model: "claude-sonnet-4.5",
    repo: "/workspace",
    startedAt: Date.now() - 1000 * 60 * 32,
    status: "running",
    logSource: null,
    children: ["cloud-1-sub-explore", "cloud-1-sub-impl", "cloud-1-sub-debug"],
  },
];

const SUBS: Array<Omit<AgentNode, "recentLogs">> = [
  {
    id: "ide-1-sub-explore",
    parentId: "ide-1",
    kind: "subagent",
    pid: null,
    label: "Task(explore)",
    title: "Locate every callsite of legacy auth helpers",
    model: "claude-opus-4.7",
    repo: "/Users/dev/work/app",
    startedAt: Date.now() - 1000 * 60 * 12,
    status: "running",
    logSource: null,
  },
  {
    id: "ide-1-sub-impl",
    parentId: "ide-1",
    kind: "subagent",
    pid: null,
    label: "Task(generalPurpose)",
    title: "Implement new token refresh middleware",
    model: "claude-opus-4.7",
    repo: "/Users/dev/work/app",
    startedAt: Date.now() - 1000 * 60 * 9,
    status: "running",
    logSource: null,
  },
  {
    id: "cloud-1-sub-explore",
    parentId: "cloud-1",
    kind: "subagent",
    pid: null,
    label: "Task(explore)",
    title: "Survey existing plugin scaffolding conventions",
    model: "claude-sonnet-4.5",
    repo: "/workspace",
    startedAt: Date.now() - 1000 * 60 * 30,
    status: "done",
    logSource: null,
  },
  {
    id: "cloud-1-sub-impl",
    parentId: "cloud-1",
    kind: "subagent",
    pid: null,
    label: "Task(generalPurpose)",
    title: "Scaffold htop-style TUI and wire discovery layer",
    model: "claude-sonnet-4.5",
    repo: "/workspace",
    startedAt: Date.now() - 1000 * 60 * 22,
    status: "running",
    logSource: null,
  },
  {
    id: "cloud-1-sub-debug",
    parentId: "cloud-1",
    kind: "subagent",
    pid: null,
    label: "Task(debug)",
    title: "Investigate flaky ink-testing-library render",
    model: "claude-sonnet-4.5",
    repo: "/workspace",
    startedAt: Date.now() - 1000 * 60 * 4,
    status: "waiting",
    logSource: null,
  },
];

const LOG_POOL: Record<string, string[]> = {
  "ide-1": [
    "[ide] indexing 1,284 files under src/...",
    "[ide] candidate auth callsites: 27",
    "[ide] tool: edit src/server/auth.ts",
    "[ide] tool: run pnpm test --filter auth",
    "[ide] waiting for user confirmation on diff",
  ],
  "ide-1-sub-explore": [
    "[explore] grep 'legacyLogin' -> 12 matches",
    "[explore] grep 'verifySession' -> 8 matches",
    "[explore] reading src/server/legacy/login.ts",
    "[explore] summarising findings for parent agent",
  ],
  "ide-1-sub-impl": [
    "[impl] writing src/server/middleware/token-refresh.ts",
    "[impl] running prettier on 3 files",
    "[impl] vitest auth.test.ts ... 14 passed",
    "[impl] returning patch to parent agent",
  ],
  "cli-1": [
    "[cli] applied diff to util/parser.ts",
    "[cli] running yarn build ...",
    "[cli] build succeeded in 4.2s",
    "[cli] awaiting follow-up prompt",
  ],
  "cloud-1": [
    "[cloud] tool: read plugins/zoto-spec-system/package.json",
    "[cloud] tool: glob 'plugins/**/.cursor-plugin/plugin.json'",
    "[cloud] spawning subagent: explore",
    "[cloud] spawning subagent: generalPurpose",
    "[cloud] tool: write plugins/zoto-cursor-top/src/cli.ts",
  ],
  "cloud-1-sub-explore": [
    "[explore] listed 2 plugins in plugins/",
    "[explore] read 1,872 lines across 14 files",
    "[explore] returned conventions summary",
  ],
  "cloud-1-sub-impl": [
    "[impl] tsup build dist/cli.js ... 142kb",
    "[impl] writing tests/discovery/processes.test.ts",
    "[impl] vitest 18/18 passed",
    "[impl] pnpm validate ... PASS",
  ],
  "cloud-1-sub-debug": [
    "[debug] hypothesis: stale ink render after resize",
    "[debug] instrumented App.tsx with effect log",
    "[debug] awaiting reproduction",
  ],
};

let tick = 0;

export function demoSnapshot(linesPerAgent = 3): AgentSnapshot {
  tick += 1;
  const nodes: Record<string, AgentNode> = {};
  const all = [...ROOTS, ...SUBS];
  for (const base of all) {
    const pool = LOG_POOL[base.id] ?? [];
    const recentLogs = rotate(pool, tick, linesPerAgent);
    nodes[base.id] = { ...base, children: [...(base.children ?? [])], recentLogs };
  }
  return {
    capturedAt: Date.now(),
    nodes,
    roots: ROOTS.map((r) => r.id),
    diagnostics: ["demo mode: synthetic data, no real Cursor processes are being read"],
  };
}

function rotate(pool: string[], offset: number, n: number): string[] {
  if (pool.length === 0) return [];
  const out: string[] = [];
  for (let i = 0; i < Math.min(n, pool.length); i += 1) {
    out.push(pool[(offset + i) % pool.length]!);
  }
  return out;
}
