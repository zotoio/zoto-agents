/**
 * Stable fail-signal codes for the stamp-trust Vitest gate.
 * UX copy should key off these exact strings.
 */
export const EVAL_STAMP_TRUNCATED = "eval_stamp_truncated";
export const EVAL_ENGINE_ALIAS_DRIFT = "eval_engine_alias_drift";

export type StampTrustSignal =
  | typeof EVAL_STAMP_TRUNCATED
  | typeof EVAL_ENGINE_ALIAS_DRIFT;

export class StampTrustError extends Error {
  readonly signal: StampTrustSignal;

  constructor(signal: StampTrustSignal, message: string) {
    super(message);
    this.name = "StampTrustError";
    this.signal = signal;
  }
}
