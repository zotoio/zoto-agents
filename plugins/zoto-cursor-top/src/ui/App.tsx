import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box, Text, useApp, useInput, useStdout } from "ink";
import {
  appendEvents,
  diffSnapshots,
  emitBell,
  formatEventLine,
  mergeChangedAt,
  pruneChangedAt,
  recentEventsForStrip,
  shouldRingBell,
  type AgentEvent,
} from "../events.js";
import { filterSnapshot } from "../filter.js";
import type { AgentNode, AgentSnapshot, FsLike } from "../types.js";
import { Tree, flattenVisible } from "./Tree.js";
import { DetailPane, DetailPaneGone } from "./DetailPane.js";
import { EmptyState } from "./EmptyState.js";
import {
  groupByCategory,
  categoryCounts,
  defaultCategoryExpansion,
  isCategoryId,
  type CategoryId,
} from "./categories.js";
import {
  computeDetailPaneHeight,
  loadDetailTail,
  type DetailTailCacheEntry,
} from "./detail-tail.js";
import {
  computeRowColumnLayout,
  DEFAULT_LOG_SCROLL_ORDER,
  DEFAULT_TERMINAL_COLUMNS,
  formatStartForNode,
  headerRow,
  type LogScrollOrder,
} from "./format.js";
import { HelpPane } from "./HelpPane.js";
import {
  DEFAULT_DENSITY,
  nextDensity,
  nextThemeName,
  resolveTheme,
  themeAppTitle,
  THEME_NAMES,
  type Density,
} from "./theme.js";
import { clearActiveScreen } from "./terminal.js";
import {
  DEFAULT_TERMINAL_ROWS,
  computeChromeLines,
  computeRowHeights,
  computeViewportBodyRows,
  followSelectionRowOffset,
  resolveTreeWindow,
} from "./viewport.js";
import {
  saveCursorTopPrefs,
  type CursorTopPrefs,
} from "../prefs.js";

export interface AppProps {
  /** Returns the next snapshot to render. */
  load: () => Promise<AgentSnapshot>;
  /** Initial snapshot to avoid a blank first frame. */
  initial: AgentSnapshot;
  /** Refresh interval in milliseconds. */
  intervalMs: number;
  /** Initial colour theme name (default `"default"`; `NO_COLOR` forces mono). */
  themeName?: string;
  /** Initial layout density (default `"comfortable"` — today's full layout). */
  density?: Density;
  /** Pre-seeded filter query from `--filter` (interactive mode). */
  initialFilter?: string;
  /** Restore the lifecycle / diagnostics strip from saved prefs. */
  initialInfoStripOpen?: boolean;
  /** Initial log tail order (default oldest-first). */
  initialLogOrder?: LogScrollOrder;
  /** Initial active-only filter (default true — hide finished agents). */
  initialActiveOnly?: boolean;
  /** Called when the user toggles active-only (`a`) so the collector can re-filter. */
  onActiveOnlyChange?: (activeOnly: boolean) => void;
  /** Persist theme / density / info-strip toggles to `~/.zoto/cursor-top.json`. */
  persistPrefs?: boolean;
  /** Override home directory for prefs I/O (tests). */
  prefsHomeDir?: string;
  /** Ring terminal bell on finished / failed events (default off). */
  bell?: boolean;
  /** Injectable BEL writer (tests). */
  bellWriter?: (data: string) => void;
  /** Deep log tail line count for the detail pane (default 25). */
  detailLines?: number;
  /** Injectable fs for detail-pane tail reads (tests). */
  detailFs?: FsLike;
  /** Override terminal row count for viewport windowing (tests). */
  terminalRows?: number;
  /** Override terminal column count for table layout (tests). */
  terminalColumns?: number;
  /** When true, skip the empty-state animation (demo always has data). */
  demo?: boolean;
}

/**
 * Root TUI. Holds the active snapshot, expansion set, selection, theme,
 * density, and refresh timer; delegates display to {@link Tree}.
 */
export function App({
  load,
  initial,
  intervalMs,
  themeName = "default",
  density: initialDensity = DEFAULT_DENSITY,
  initialFilter = "",
  initialInfoStripOpen = false,
  initialLogOrder = DEFAULT_LOG_SCROLL_ORDER,
  initialActiveOnly = true,
  onActiveOnlyChange,
  persistPrefs = false,
  prefsHomeDir,
  bell = false,
  bellWriter,
  detailLines = 25,
  detailFs,
  terminalRows: terminalRowsOverride,
  terminalColumns: terminalColumnsOverride,
  demo = false,
}: AppProps): React.JSX.Element {
  const { exit } = useApp();
  const { stdout } = useStdout();

  useEffect(() => {
    if (stdout) clearActiveScreen(stdout);
  }, [stdout]);

  const [snapshot, setSnapshot] = useState<AgentSnapshot>(initial);
  const [expanded, setExpanded] = useState<Set<string>>(
    () => {
      const catDefaults = defaultCategoryExpansion();
      const s = new Set(initial.roots);
      for (const id of catDefaults) s.add(id);
      return s;
    },
  );
  const [selectedId, setSelectedId] = useState<string | null>(
    initial.roots[0] ?? null,
  );
  const [now, setNow] = useState<number>(Date.now());
  const [paused, setPaused] = useState<boolean>(false);
  const [activeThemeName, setActiveThemeName] = useState<string>(themeName);
  const [density, setDensity] = useState<Density>(initialDensity);
  const [filterEditing, setFilterEditing] = useState<boolean>(false);
  const [filterDraft, setFilterDraft] = useState<string>(initialFilter);
  const [filterCommitted, setFilterCommitted] =
    useState<string>(initialFilter);
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [changedAt, setChangedAt] = useState<Record<string, number>>({});
  const [detailOpen, setDetailOpen] = useState<boolean>(false);
  const [helpOpen, setHelpOpen] = useState<boolean>(false);
  /** Lifecycle events + `!` diagnostics between tree and footer (default off). */
  const [infoStripOpen, setInfoStripOpen] = useState<boolean>(initialInfoStripOpen);
  const [logOrder, setLogOrder] = useState<LogScrollOrder>(initialLogOrder);
  const [activeOnly, setActiveOnly] = useState<boolean>(initialActiveOnly);
  const [activeDetailLines, setActiveDetailLines] = useState<number>(detailLines);
  const [detailTail, setDetailTail] = useState<string[]>([]);
  const [detailTailLoading, setDetailTailLoading] = useState<boolean>(false);
  const [detailTailPlaceholder, setDetailTailPlaceholder] = useState<string>("");
  const [detailNodeGone, setDetailNodeGone] = useState<boolean>(false);
  const [scrollRowOffset, setScrollRowOffset] = useState<number>(0);
  const detailCacheRef = useRef<Map<string, DetailTailCacheEntry>>(new Map());
  const detailLoadGenRef = useRef<number>(0);
  const snapshotRef = useRef<AgentSnapshot>(initial);

  useEffect(() => {
    if (!persistPrefs) return;
    const prefs: CursorTopPrefs = { density };
    if ((THEME_NAMES as readonly string[]).includes(activeThemeName)) {
      prefs.theme = activeThemeName as CursorTopPrefs["theme"];
    }
    if (infoStripOpen) prefs.infoStripOpen = true;
    if (logOrder !== DEFAULT_LOG_SCROLL_ORDER) prefs.logOrder = logOrder;
    if (!activeOnly) prefs.activeOnly = false;
    saveCursorTopPrefs(prefs, prefsHomeDir);
  }, [
    activeOnly,
    activeThemeName,
    density,
    infoStripOpen,
    logOrder,
    persistPrefs,
    prefsHomeDir,
  ]);

  const applySnapshot = useCallback(
    (next: AgentSnapshot, at: number): void => {
      const prev = snapshotRef.current;
      const incoming = diffSnapshots(prev, next, at);
      snapshotRef.current = next;
      setSnapshot(next);
      if (incoming.length > 0) {
        setEvents((buf) => appendEvents(buf, incoming));
        setChangedAt((map) => pruneChangedAt(mergeChangedAt(map, incoming, at), at));
        if (bell && shouldRingBell(incoming)) {
          emitBell(bellWriter);
        }
      }
      setNow(at);
    },
    [bell, bellWriter],
  );
  // Re-resolving on every name change keeps NO_COLOR authoritative: with
  // NO_COLOR set, cycling through names still lands on mono every time.
  const theme = useMemo(() => resolveTheme(activeThemeName), [activeThemeName]);

  const filterResult = useMemo(
    () => filterSnapshot(snapshot, filterCommitted),
    [snapshot, filterCommitted],
  );
  const categorisedSnapshot = useMemo(
    () => groupByCategory(filterResult.snapshot),
    [filterResult.snapshot],
  );
  const displaySnapshot = categorisedSnapshot;
  const filterActive = filterCommitted.trim().length > 0;

  const visible = useMemo(
    () => flattenVisible(displaySnapshot, expanded),
    [displaySnapshot, expanded],
  );

  const stripEvents = useMemo(() => recentEventsForStrip(events), [events]);

  const terminalRows = terminalRowsOverride ?? stdout?.rows ?? DEFAULT_TERMINAL_ROWS;
  const terminalColumns =
    terminalColumnsOverride ?? stdout?.columns ?? DEFAULT_TERMINAL_COLUMNS;

  const quantisedNow = Math.floor(now / 1000) * 1000;

  const rowColumnLayout = useMemo(() => {
    const rows = visible
      .map(({ id, depth }) => {
        const node = displaySnapshot.nodes[id];
        if (!node) return null;
        return {
          node,
          depth,
          startColumn: formatStartForNode(node, quantisedNow),
          nodes: displaySnapshot.nodes,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row != null);
    return computeRowColumnLayout(terminalColumns, rows, theme);
  }, [visible, displaySnapshot, quantisedNow, terminalColumns, theme]);

  const hasDiagnostics = displaySnapshot.diagnostics.length > 0;

  const effectiveDetailLines = detailOpen ? activeDetailLines : detailLines;

  const detailMaxLogLines = useMemo(() => {
    const rows = terminalRows;
    const diagLines =
      infoStripOpen && hasDiagnostics
        ? Math.min(3, displaySnapshot.diagnostics.length)
        : 0;
    const reserved =
      6 +
      computeDetailPaneHeight(effectiveDetailLines) +
      (filterEditing ? 2 : 1) +
      (infoStripOpen && stripEvents.length > 0 ? stripEvents.length + 1 : 0) +
      (diagLines > 0 ? diagLines + 1 : 0);
    const available = Math.max(1, rows - reserved);
    return Math.min(effectiveDetailLines, available);
  }, [
    terminalRows,
    effectiveDetailLines,
    filterEditing,
    infoStripOpen,
    stripEvents.length,
    hasDiagnostics,
    displaySnapshot.diagnostics.length,
  ]);

  useEffect(() => {
    const vis = flattenVisible(displaySnapshot, expanded);
    if (vis.length === 0) {
      setSelectedId(null);
      if (detailOpen) {
        setDetailNodeGone(true);
        setDetailTail([]);
        setDetailTailLoading(false);
      }
      return;
    }
    setSelectedId((prev) => {
      if (prev && vis.some((v) => v.id === prev)) {
        setDetailNodeGone(false);
        return prev;
      }
      if (detailOpen && prev) {
        setDetailOpen(false);
        setDetailNodeGone(false);
        setDetailTail([]);
        setDetailTailLoading(false);
      }
      return vis[0]!.id;
    });
  }, [displaySnapshot, expanded, filterCommitted, detailOpen]);

  const selectedNode: AgentNode | null = useMemo(() => {
    if (!selectedId) return null;
    return displaySnapshot.nodes[selectedId] ?? null;
  }, [displaySnapshot, selectedId]);

  useEffect(() => {
    if (!detailOpen) {
      detailLoadGenRef.current += 1;
      setDetailTail([]);
      setDetailTailLoading(false);
      setDetailTailPlaceholder("");
      setDetailNodeGone(false);
      return;
    }
    if (!selectedNode) {
      setDetailNodeGone(true);
      setDetailTail([]);
      setDetailTailLoading(false);
      return;
    }
    setDetailNodeGone(false);
    const gen = ++detailLoadGenRef.current;
    setDetailTailLoading(true);
    setDetailTail([]);
    void loadDetailTail(
      selectedNode,
      effectiveDetailLines,
      detailCacheRef.current,
      detailFs,
    ).then((result) => {
      if (detailLoadGenRef.current !== gen) return;
      setDetailTail(result.lines);
      setDetailTailPlaceholder(result.placeholder);
      setDetailTailLoading(false);
    });
  }, [
    detailOpen,
    selectedNode,
    selectedId,
    effectiveDetailLines,
    detailFs,
    snapshot.capturedAt,
  ]);

  useEffect(() => {
    setActiveDetailLines(detailLines);
  }, [detailLines]);

  const selectedIdx = useMemo(() => {
    if (!selectedId) return -1;
    return visible.findIndex((v) => v.id === selectedId);
  }, [visible, selectedId]);

  const chromeOpts = useMemo(
    () => ({
      eventStripLines: infoStripOpen ? stripEvents.length : 0,
      diagnosticsLines:
        infoStripOpen && hasDiagnostics
          ? Math.min(3, displaySnapshot.diagnostics.length)
          : 0,
      detailOpen:
        detailOpen && (Boolean(selectedNode) || detailNodeGone),
      detailLines:
        detailOpen && selectedNode && !detailNodeGone
          ? detailMaxLogLines
          : detailOpen && detailNodeGone
            ? 1
            : effectiveDetailLines,
      filterEditing,
    }),
    [
      infoStripOpen,
      stripEvents.length,
      hasDiagnostics,
      displaySnapshot.diagnostics.length,
      detailOpen,
      selectedNode,
      detailNodeGone,
      detailMaxLogLines,
      effectiveDetailLines,
      filterEditing,
    ],
  );

  useEffect(() => {
    const heights = computeRowHeights(visible, displaySnapshot, density);
    const chromeLines = computeChromeLines(chromeOpts);
    const bodyRows = computeViewportBodyRows(terminalRows, chromeLines, true);
    setScrollRowOffset((prev) =>
      followSelectionRowOffset(heights, selectedIdx, prev, bodyRows),
    );
  }, [
    visible,
    displaySnapshot,
    density,
    selectedIdx,
    terminalRows,
    chromeOpts,
  ]);

  const treeWindow = useMemo(
    () =>
      resolveTreeWindow({
        flat: visible,
        snapshot: displaySnapshot,
        density,
        selectedIdx,
        scrollRowOffset,
        terminalRows,
        chrome: chromeOpts,
      }),
    [
      visible,
      displaySnapshot,
      density,
      selectedIdx,
      scrollRowOffset,
      terminalRows,
      chromeOpts,
    ],
  );

  useEffect(() => {
    setChangedAt((map) => pruneChangedAt(map, now));
  }, [now]);

  useEffect(() => {
    const clock = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(clock);
  }, []);

  useEffect(() => {
    // When paused, the data-fetch timer is skipped. Manual refresh ("r")
    // still works because it bypasses this effect entirely. The wall-clock
    // timer above keeps elapsed seconds ticking for running agents.
    if (paused) return;
    let cancelled = false;
    const tick = async (): Promise<void> => {
      try {
        const next = await load();
        if (!cancelled) {
          applySnapshot(next, Date.now());
        }
      } catch {
        /* swallow; we keep the prior snapshot rather than crash the UI */
      }
    };
    const timer = setInterval(tick, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [load, intervalMs, paused, applySnapshot]);

  useInput((input, key) => {
    if (helpOpen) {
      if (key.escape || input === "?") {
        setHelpOpen(false);
        return;
      }
      return;
    }

    if (filterEditing) {
      if (key.escape) {
        setFilterDraft("");
        setFilterCommitted("");
        setFilterEditing(false);
        return;
      }
      if (key.return) {
        setFilterCommitted(filterDraft);
        setFilterEditing(false);
        return;
      }
      if (key.backspace || key.delete) {
        setFilterDraft((prev) => prev.slice(0, -1));
        return;
      }
      if (key.ctrl && input === "c") {
        exit();
        return;
      }
      const printable = input
        .split("")
        .filter((ch) => ch >= " " && ch <= "~")
        .join("");
      if (
        printable &&
        !key.return &&
        !key.escape &&
        !key.upArrow &&
        !key.downArrow &&
        !key.leftArrow &&
        !key.rightArrow
      ) {
        setFilterDraft((prev) => prev + printable);
      }
      return;
    }

    if (input === "/") {
      setFilterEditing(true);
      setFilterDraft(filterCommitted);
      return;
    }

    if (key.escape && detailOpen) {
      setDetailOpen(false);
      return;
    }

    if (input === "?") {
      setHelpOpen(true);
      setDetailOpen(false);
      return;
    }

    if (input === "d") {
      setDetailOpen((prev) => {
        const next = !prev;
        if (next) {
          setActiveDetailLines(detailLines);
          setHelpOpen(false);
        }
        return next;
      });
      return;
    }

    if (detailOpen && /^[0-9]$/.test(input)) {
      const digit = Number.parseInt(input, 10);
      setActiveDetailLines(digit === 0 ? 100 : digit * 10);
      return;
    }

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
      // Manual refresh — runs even when paused so the user can take a
      // single-shot snapshot without resuming the auto-refresh loop.
      void load().then((next) => {
        applySnapshot(next, Date.now());
      });
      return;
    }
    if (input === "p" || input === " ") {
      setPaused((prev) => !prev);
      return;
    }
    if (input === "e") {
      setExpanded(new Set(Object.keys(displaySnapshot.nodes)));
      return;
    }
    if (input === "c") {
      setExpanded(defaultCategoryExpansion());
      return;
    }
    // "t" / "y" cycle theme / density. "d" + Esc reserved for detail pane.
    if (input === "t") {
      setActiveThemeName((prev) => nextThemeName(prev));
      return;
    }
    if (input === "y") {
      setDensity((prev) => nextDensity(prev));
      return;
    }
    if (input === "i") {
      setInfoStripOpen((prev) => !prev);
      return;
    }
    if (input === "o") {
      setLogOrder((prev) =>
        prev === "oldest-first" ? "newest-first" : "oldest-first",
      );
      return;
    }
    if (input === "a") {
      const next = !activeOnly;
      setActiveOnly(next);
      onActiveOnlyChange?.(next);
      void load().then((nextSnap) => {
        applySnapshot(nextSnap, Date.now());
      });
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
  const catCounts = useMemo(() => categoryCounts(snapshot), [snapshot]);

  // Surface theme/density in the status line only when they deviate from
  // the defaults, so the default frame stays exactly as it always was.
  const themeSuffix = theme.name !== "default" ? ` · theme ${theme.name}` : "";
  const densitySuffix = density !== DEFAULT_DENSITY ? ` · density ${density}` : "";

  const infoSuffix = infoStripOpen ? " · info on" : "";
  const logOrderSuffix =
    logOrder !== DEFAULT_LOG_SCROLL_ORDER ? " · logs newest" : "";
  const activeOnlySuffix = activeOnly ? "" : " · all agents";

  return (
    <Box flexDirection="column" height={terminalRows}>
      <Box justifyContent="space-between">
        <Box>
          <Text bold color={theme.header}>
            {themeAppTitle(theme)}
          </Text>
          {paused ? (
            <Text bold color={theme.accent}>
              {"  ⏸ PAUSED"}
            </Text>
          ) : null}
          {filterActive ? (
            <Text bold color={theme.accent}>
              {`  filter: ${filterCommitted} · ${filterResult.matched}/${filterResult.total}`}
            </Text>
          ) : null}
        </Box>
        <Text dimColor={theme.dim}>
          {`${catCounts["cat:ide"]} IDE · ${catCounts["cat:cli"]} CLI · ${catCounts["cat:cloud"]} Cloud · ${totals.subs} subagents · refresh ${paused ? "paused" : `${intervalMs}ms`}${themeSuffix}${densitySuffix}${infoSuffix}${logOrderSuffix}${activeOnlySuffix}`}
        </Text>
      </Box>
      <Box>
        <Text bold={theme.badge.bold} color={theme.badge.color}>
          {headerRow(rowColumnLayout, theme)}
        </Text>
      </Box>
      <Box flexDirection="column" flexGrow={1}>
        {helpOpen ? (
          <HelpPane theme={theme} diagnostics={displaySnapshot.diagnostics} />
        ) : visible.length === 0 && !demo ? (
          <EmptyState
            theme={theme}
            terminalColumns={terminalColumns}
            terminalRows={terminalRows}
          />
        ) : (
          <Tree
            snapshot={displaySnapshot}
            expanded={expanded}
            selectedId={selectedId}
            now={now}
            theme={theme}
            density={density}
            changedAt={changedAt}
            layout={rowColumnLayout}
            logOrder={logOrder}
            terminalColumns={terminalColumns}
            flat={visible}
            window={treeWindow}
          />
        )}
      </Box>
      <Box flexDirection="column">
        {infoStripOpen && stripEvents.length > 0 ? (
          <Box flexDirection="column" marginTop={1}>
            {stripEvents.map((ev) => (
              <Text key={`${ev.id}-${ev.at}-${ev.kind}`} color={theme.accent}>
                {formatEventLine(ev, now)}
              </Text>
            ))}
          </Box>
        ) : null}
        {infoStripOpen && hasDiagnostics && !helpOpen ? (
          <Box flexDirection="column" marginTop={1}>
            {displaySnapshot.diagnostics.slice(0, 3).map((d, i) => (
              <Text
                key={`diag-${i}`}
                dimColor={theme.diagnostics.dim}
                color={theme.diagnostics.color}
              >
                ! {d}
              </Text>
            ))}
          </Box>
        ) : null}
        {detailOpen && selectedNode && !detailNodeGone ? (
          <DetailPane
            node={selectedNode}
            now={now}
            theme={theme}
            tailLines={detailTail}
            tailLoading={detailTailLoading}
            tailPlaceholder={detailTailPlaceholder}
            maxLogLines={detailMaxLogLines}
            activeDetailLines={activeDetailLines}
            logOrder={logOrder}
          />
        ) : detailOpen && detailNodeGone ? (
          <DetailPaneGone theme={theme} />
        ) : null}
        {filterEditing ? (
          <Box marginTop={1}>
            <Text bold color={theme.header}>
              /filter:{" "}
            </Text>
            <Text color={theme.accent}>{filterDraft}</Text>
            <Text bold color={theme.header}>
              █
            </Text>
            <Text dimColor={theme.dim}>  [Enter] apply  [Esc] clear</Text>
          </Box>
        ) : helpOpen ? (
          <Box marginTop={1}>
            <Text dimColor={theme.dim}>[Esc] or [?] close help</Text>
          </Box>
        ) : (
          <Box marginTop={1}>
            <Text dimColor={theme.dim}>
              [↑/↓] move  [→/enter] expand  [←] collapse  [e]xpand all  [c]ollapse all  [r]efresh  [p]ause  [/] filter  [d] detail{detailOpen ? "  [0-9] lines" : ""}  [i] info  [a] active  [o] log order  [?] help  [t]heme  [y] density  [q]uit
            </Text>
          </Box>
        )}
      </Box>
    </Box>
  );
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
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
