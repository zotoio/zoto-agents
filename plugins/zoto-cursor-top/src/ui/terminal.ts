/** Erase the visible screen and move the cursor to (1,1). Safe on alternate buffer. */
export const CLEAR_SCREEN_HOME = "\u001b[2J\u001b[H";

export function clearActiveScreen(stream: NodeJS.WriteStream): void {
  if (stream.isTTY) {
    stream.write(CLEAR_SCREEN_HOME);
  }
}
