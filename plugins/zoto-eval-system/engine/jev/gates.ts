/**
 * Confidence gates — vendored subset of `packages/jev-demo/lib/confidence-gates.ts`
 * from `zotoio/jev-feature-demo` at the commit in `pin.ts`.
 *
 * Application-owned routing: Jev never decides. `act` is the only outcome that
 * lets grader code even consider promoting a proposal.
 */
export type GateOutcome = "act" | "ask_human" | "deny" | "abstain";

export interface GateThresholds {
  /** Minimum confidence to act automatically. */
  act: number;
  /** Minimum confidence to escalate to a human (below act). */
  askHuman: number;
  /** Minimum confidence before hard deny (below askHuman). */
  deny: number;
}

export const DEFAULT_THRESHOLDS: GateThresholds = { act: 0.85, askHuman: 0.6, deny: 0.4 };

/** Noul confidence derived from probability: max(p, 1-p). */
export function noulConfidence(noul: number): number {
  return Math.max(noul, 1 - noul);
}

export function routeByConfidence(
  confidence: number,
  thresholds: GateThresholds = DEFAULT_THRESHOLDS,
): GateOutcome {
  if (!Number.isFinite(confidence)) return "abstain";
  if (confidence >= thresholds.act) return "act";
  if (confidence >= thresholds.askHuman) return "ask_human";
  if (confidence >= thresholds.deny) return "deny";
  return "abstain";
}

const GATE_OUTCOME_ORDER: GateOutcome[] = ["abstain", "deny", "ask_human", "act"];

/** Cap a gate outcome so it does not exceed `maxAllowed`. */
export function capGateOutcome(current: GateOutcome, maxAllowed: GateOutcome): GateOutcome {
  const currentIdx = GATE_OUTCOME_ORDER.indexOf(current);
  const maxIdx = GATE_OUTCOME_ORDER.indexOf(maxAllowed);
  return GATE_OUTCOME_ORDER[Math.min(currentIdx, maxIdx)]!;
}

export interface ScoreBandPolicy {
  band: { min: number; max: number };
  maxOutcome: GateOutcome;
}

/** Route a Score answer: confidence first, then cap by any matching score band. */
export function routeScore(
  score: number,
  confidence: number,
  thresholds: GateThresholds = DEFAULT_THRESHOLDS,
  bands: readonly ScoreBandPolicy[] = [],
): GateOutcome {
  let outcome = routeByConfidence(confidence, thresholds);
  for (const policy of bands) {
    if (score >= policy.band.min && score <= policy.band.max) {
      outcome = capGateOutcome(outcome, policy.maxOutcome);
    }
  }
  return outcome;
}
