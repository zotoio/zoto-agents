import React, { useEffect, useMemo, useState } from "react";
import { Box, Text, useApp, useInput } from "ink";
import type { AgentSnapshot } from "../types.js";
import { Tree, flattenVisible } from "./Tree.js";

export interface AppProps {
  /** Returns the next snapshot to render. */
  load: () => Promise<AgentSnapshot>;
  /** Initial snapshot to avoid a blank first frame. */
  initial: AgentSnapshot;
  /** Refresh interval in milliseconds. */
  intervalMs: number;
}

/**
 * Root TUI. Holds the active snapshot, expansion set, selection, and refresh
 * timer; delegates display to {@link Tree}.
 */
export function App({ load, initial, intervalMs }: AppProps): React.JSX.Element {
  const { exit } = useApp();
  const [snapshot, setSnapshot] = useState<AgentSnapshot>(initial);
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(initial.roots),
  );
  const [selectedId, setSelectedId] = useState<string | null>(
    initial.roots[0] ?? null,
  );
  const [now, setNow] = useState<number>(Date.now());

  const visible = useMemo(
    () => flattenVisible(snapshot, expanded),
    [snapshot, expanded],
  );

  useEffect(() => {
    let cancelled = false;
    const tick = async (): Promise<void> => {
      try {
        const next = await load();
        if (!cancelled) {
          setSnapshot(next);
          setNow(Date.now());
        }
      } catch {
        /* swallow; we keep the prior snapshot rather than crash the UI */
      }
    };
    const timer = setInterval(tick, intervalMs);
    const clock = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      cancelled = true;
      clearInterval(timer);
      clearInterval(clock);
    };
  }, [load, intervalMs]);

  useInput((input, key) => {
    if (input === "q" || (key.ctrl && input === "c")) {
      exit();
      return;
    }
    if (key.upArrow || input === "k") {
      moveSelection(-1);
      return;
    }
    if (key.downArrow || input === "j") {
      moveSelection(1);
      return;
    }
    if (key.rightArrow || key.return || input === "l") {
      if (selectedId) toggleExpand(selectedId, true);
      return;
    }
    if (key.leftArrow || input === "h") {
      if (selectedId) toggleExpand(selectedId, false);
      return;
    }
    if (input === "r") {
      void load().then((next) => {
        setSnapshot(next);
        setNow(Date.now());
      });
      return;
    }
    if (input === "e") {
      setExpanded(new Set(Object.keys(snapshot.nodes)));
      return;
    }
    if (input === "c") {
      setExpanded(new Set());
      return;
    }
  });

  const moveSelection = (delta: number): void => {
    if (visible.length === 0) return;
    const idx = visible.findIndex((v) => v.id === selectedId);
    const nextIdx = clamp((idx < 0 ? 0 : idx + delta), 0, visible.length - 1);
    setSelectedId(visible[nextIdx]!.id);
  };

  const toggleExpand = (id: string, expand: boolean): void => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (expand) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const totals = useMemo(() => summarise(snapshot), [snapshot]);
  const hasDiagnostics = snapshot.diagnostics.length > 0;

  return (
    <Box flexDirection="column">
      <Box justifyContent="space-between">
        <Text bold color="cyan">
          cursor-top
        </Text>
        <Text dimColor>
          {`${totals.processes} processes · ${totals.roots} roots · ${totals.subs} subagents · refresh ${intervalMs}ms`}
        </Text>
      </Box>
      <Box>
        <Text bold color="white">
          {headerRow()}
        </Text>
      </Box>
      <Tree
        snapshot={snapshot}
        expanded={expanded}
        selectedId={selectedId}
        now={now}
      />
      {hasDiagnostics ? (
        <Box flexDirection="column" marginTop={1}>
          {snapshot.diagnostics.slice(0, 3).map((d, i) => (
            <Text key={`diag-${i}`} dimColor>
              ! {d}
            </Text>
          ))}
        </Box>
      ) : null}
      <Box marginTop={1}>
        <Text dimColor>
          [↑/↓] move  [→/enter] expand  [←] collapse  [e]xpand all  [c]ollapse all  [r]efresh  [q]uit
        </Text>
      </Box>
    </Box>
  );
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function headerRow(): string {
  return [
    "TYPE".padEnd(5),
    "   PID",
    " AGENT".padEnd(40),
    " MODEL".padEnd(18),
    " REPO".padEnd(24),
    " START (elapsed)",
    " STATUS",
  ].join(" ");
}

interface Totals {
  processes: number;
  roots: number;
  subs: number;
}

function summarise(snapshot: AgentSnapshot): Totals {
  const ids = Object.keys(snapshot.nodes);
  const processes = ids.filter((id) => snapshot.nodes[id]!.pid != null).length;
  const subs = ids.length - snapshot.roots.length;
  return { processes, roots: snapshot.roots.length, subs };
}
