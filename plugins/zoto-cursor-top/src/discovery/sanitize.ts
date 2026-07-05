const OSC_PATTERN = /(?:\x1B\]|\u009D)[\s\S]*?(?:\x07|\x1B\\|\u009C|$)/g;
const STRING_PATTERN = /(?:\x1B[P_X^]|\u0090|\u0098|\u009E|\u009F)[\s\S]*?(?:\x1B\\|\u009C|$)/g;
const CSI_PATTERN = /(?:\x1B\[|\u009B)[0-?]*[ -/]*(?:[@-~]|$)/g;
const ESC_PATTERN = /\x1B(?:[ -/]*[@-~]|[\s\S])?/g;
const CONTROL_PATTERN = /[\x00-\x1F\x7F-\x9F]/g;
const WHITESPACE_PATTERN = /\s+/g;

/**
 * Neutralise terminal control sequences before remote data reaches display
 * fields that may be rendered by the local TUI or plain-text CLI output.
 */
export function sanitizeDisplayText(input: string): string {
  return input
    .replace(OSC_PATTERN, "")
    .replace(STRING_PATTERN, "")
    .replace(CSI_PATTERN, "")
    .replace(ESC_PATTERN, "")
    .replace(CONTROL_PATTERN, " ")
    .replace(WHITESPACE_PATTERN, " ")
    .trim();
}
