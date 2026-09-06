/**
 * Minimal ambient typing for `json-source-map` (ships no `.d.ts`). Only the
 * surface `engine/update.ts` uses is declared.
 */
declare module "json-source-map" {
  export interface JsonMapLocation {
    line: number;
    column: number;
    pos: number;
  }
  export interface JsonMapPointer {
    key?: JsonMapLocation;
    keyEnd?: JsonMapLocation;
    value: JsonMapLocation;
    valueEnd: JsonMapLocation;
  }
  export interface JsonMapParseResult<T = unknown> {
    data: T;
    pointers: Record<string, JsonMapPointer>;
  }
  export function parse<T = unknown>(
    source: string,
    reviver?: (key: string, value: unknown) => unknown,
    options?: { bigint?: boolean },
  ): JsonMapParseResult<T>;
  export function stringify(
    data: unknown,
    replacer?: unknown,
    space?: string | number,
  ): { json: string; pointers: Record<string, JsonMapPointer> };
  const jsonMap: { parse: typeof parse; stringify: typeof stringify };
  export default jsonMap;
}
