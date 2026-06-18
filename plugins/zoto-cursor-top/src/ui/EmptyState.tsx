import React, { useEffect, useState } from "react";
import { Box, Text } from "ink";
import type { Theme } from "./theme.js";

export interface EmptyStateProps {
  theme: Theme;
  terminalColumns: number;
  terminalRows: number;
}

interface AsciiArt {
  name: string;
  frames: string[][];
  width: number;
  speed: number;
}

const TUMBLEWEED: AsciiArt = {
  name: "tumbleweed",
  frames: [
    [
      "  _  ",
      " / \\ ",
      "( @ )",
      " \\_/ ",
    ],
    [
      "     ",
      " /@\\ ",
      "( _ )",
      " \\@/ ",
    ],
    [
      "  _  ",
      " /@\\ ",
      "(@_@)",
      " \\_/ ",
    ],
    [
      "     ",
      " /_\\ ",
      "( @ )",
      " \\@/ ",
    ],
  ],
  width: 5,
  speed: 150,
};

const PAPER_PLANE: AsciiArt = {
  name: "paper plane",
  frames: [
    [
      "     ",
      "  __>",
      " /  /",
      "/--/ ",
    ],
    [
      "  . .",
      "  __>",
      " /  /",
      "/--/ ",
    ],
    [
      "     ",
      " .__>",
      " /  /",
      "/--/ ",
    ],
    [
      " . . ",
      "  __>",
      " /  /",
      "/--/ ",
    ],
  ],
  width: 5,
  speed: 120,
};

const CURSOR_LOGO: AsciiArt = {
  name: "cursor",
  frames: [
    [
      " ___  ",
      "|   | ",
      "|   | ",
      "|___| ",
      "  |   ",
    ],
    [
      " ___  ",
      "| _ | ",
      "||_|| ",
      "|___| ",
      "  |   ",
    ],
    [
      " ___  ",
      "|   | ",
      "| > | ",
      "|___| ",
      "  |   ",
    ],
    [
      " ___  ",
      "| _ | ",
      "|   | ",
      "|___| ",
      "  |   ",
    ],
  ],
  width: 6,
  speed: 200,
};

const PRINCESS_PEACH: AsciiArt = {
  name: "princess peach",
  frames: [
    [
      " \\|/ ",
      " (@) ",
      "/| |\\ ",
      " | | ",
      " / \\ ",
    ],
    [
      " \\|/ ",
      " (@) ",
      " |\\| ",
      " | | ",
      " / \\ ",
    ],
    [
      " \\|/ ",
      " (@) ",
      " |/| ",
      " | | ",
      " / \\ ",
    ],
    [
      " \\|/ ",
      " (@) ",
      "/| |\\ ",
      " | | ",
      " d b ",
    ],
  ],
  width: 6,
  speed: 180,
};

const TERMINATOR: AsciiArt = {
  name: "terminator",
  frames: [
    [
      " [@@] ",
      " /||\\ ",
      "  ||  ",
      " /  \\ ",
    ],
    [
      " [o@] ",
      " /||\\ ",
      "  ||  ",
      " /  \\ ",
    ],
    [
      " [@o] ",
      "  ||/ ",
      "  ||  ",
      " /  \\ ",
    ],
    [
      " [@@] ",
      " \\||  ",
      "  ||  ",
      " /  \\ ",
    ],
  ],
  width: 6,
  speed: 200,
};

const SLINKY: AsciiArt = {
  name: "slinky",
  frames: [
    [
      "  ___  ",
      " /   \\ ",
      "|     |",
      " \\___/ ",
    ],
    [
      "  ____ ",
      " /    \\",
      "|      )",
      " \\____/",
    ],
    [
      " _____ ",
      "/     \\",
      "\\     /",
      " \\___/ ",
    ],
    [
      " ____  ",
      "/    \\ ",
      "(      |",
      "\\____/ ",
    ],
  ],
  width: 7,
  speed: 200,
};

const ALL_ARTS: AsciiArt[] = [
  TUMBLEWEED,
  PAPER_PLANE,
  CURSOR_LOGO,
  PRINCESS_PEACH,
  TERMINATOR,
  SLINKY,
];

export function EmptyState({
  theme,
  terminalColumns,
  terminalRows,
}: EmptyStateProps): React.JSX.Element {
  const [artIdx, setArtIdx] = useState(() =>
    Math.floor(Math.random() * ALL_ARTS.length),
  );
  const [frameIdx, setFrameIdx] = useState(0);
  const [posX, setPosX] = useState(0);
  const [showArt, setShowArt] = useState(false);
  const [countdown, setCountdown] = useState(() =>
    Math.floor(Math.random() * 5) + 3,
  );

  const art = ALL_ARTS[artIdx % ALL_ARTS.length]!;
  const travelWidth = Math.max(20, terminalColumns);

  useEffect(() => {
    if (showArt) return;
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setShowArt(true);
          setPosX(0);
          setFrameIdx(0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [showArt]);

  useEffect(() => {
    if (!showArt) return;
    const timer = setInterval(() => {
      setPosX((prev) => {
        const next = prev + 1;
        if (next > travelWidth) {
          setShowArt(false);
          setArtIdx((i) => (i + 1) % ALL_ARTS.length);
          setCountdown(Math.floor(Math.random() * 6) + 4);
          return 0;
        }
        return next;
      });
      setFrameIdx((prev) => (prev + 1) % art.frames.length);
    }, art.speed);
    return () => clearInterval(timer);
  }, [showArt, travelWidth, art]);

  const availableRows = Math.max(4, terminalRows - 8);
  const artHeight = art.frames[0]?.length ?? 0;
  const centerY = Math.max(0, Math.floor((availableRows - artHeight - 3) / 2));

  const message = "No active agents";
  const hint = "Press i for diagnostics · --demo for a preview";

  return (
    <Box flexDirection="column" flexGrow={1}>
      {Array.from({ length: Math.min(centerY, 4) }).map((_, i) => (
        <Text key={`sp-${i}`}> </Text>
      ))}
      <Box justifyContent="center">
        <Text dimColor={theme.dim} color={theme.header}>
          {message}
        </Text>
      </Box>
      <Box justifyContent="center">
        <Text dimColor={theme.dim}>{hint}</Text>
      </Box>
      {showArt ? (
        <Box flexDirection="column" marginTop={1}>
          {art.frames[frameIdx]!.map((line, i) => (
            <Text key={`art-${i}`} dimColor={theme.dim} color={theme.accent}>
              {" ".repeat(Math.max(0, posX)) + line}
            </Text>
          ))}
        </Box>
      ) : (
        <Box marginTop={1} justifyContent="center">
          <Text dimColor={theme.dim}>{"~".repeat(Math.min(20, terminalColumns - 4))}</Text>
        </Box>
      )}
    </Box>
  );
}
