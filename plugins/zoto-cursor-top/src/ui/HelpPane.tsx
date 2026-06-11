import React from "react";
import { Box, Text } from "ink";
import {
  DIAGNOSTIC_HELP,
  INTERACTIVE_KEYBINDS,
  diagnosticExplanation,
} from "./help.js";
import type { Theme } from "./theme.js";

export interface HelpPaneProps {
  theme: Theme;
  /** Live diagnostic strings from the current snapshot (shown with `!`). */
  diagnostics: string[];
}

/**
 * Full-width help overlay toggled with `?`. Documents keyboard shortcuts
 * and the meaning of `!` diagnostic lines at the bottom of the TUI.
 */
export function HelpPane({
  theme,
  diagnostics,
}: HelpPaneProps): React.JSX.Element {
  return (
    <Box flexDirection="column" marginTop={1}>
      <Text dimColor={theme.dim} color={theme.header}>
        ── help ──  [?] or [Esc] close
      </Text>
      <Text bold color={theme.header}>
        Keyboard
      </Text>
      {INTERACTIVE_KEYBINDS.map(({ keys, description }) => (
        <Text key={keys}>
          <Text bold color={theme.accent}>
            {keys.padEnd(16)}
          </Text>
          <Text dimColor={theme.dim}>{description}</Text>
        </Text>
      ))}
      <Box marginTop={1}>
        <Text bold color={theme.header}>
          Diagnostic lines (!)
        </Text>
        <Text dimColor={theme.dim}>
          Informational notices from the collector — not errors. Press i to show
          or hide the live event strip and up to three diagnostic lines above
          the footer (hidden by default).
        </Text>
      </Box>
      {DIAGNOSTIC_HELP.map((entry) => (
        <Box key={entry.match} flexDirection="column" marginTop={1}>
          <Text color={theme.diagnostics.color} dimColor={theme.diagnostics.dim}>
            {entry.title}
          </Text>
          <Text wrap="wrap">{entry.body}</Text>
        </Box>
      ))}
      {diagnostics.length > 0 ? (
        <Box flexDirection="column" marginTop={1}>
          <Text bold color={theme.header}>
            Current tick
          </Text>
          {diagnostics.map((line, i) => {
            const explain = diagnosticExplanation(line);
            return (
              <Box key={`live-diag-${i}`} flexDirection="column" marginTop={1}>
                <Text color={theme.diagnostics.color} dimColor={theme.diagnostics.dim}>
                  ! {line}
                </Text>
                {explain ? (
                  <Text dimColor={theme.dim} wrap="wrap">
                    {explain.body}
                  </Text>
                ) : null}
              </Box>
            );
          })}
        </Box>
      ) : null}
    </Box>
  );
}
