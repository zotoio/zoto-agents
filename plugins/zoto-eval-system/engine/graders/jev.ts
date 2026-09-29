/**
 * `jev` grader — Jev (Typesafe System One) proposes, grader code decides.
 *
 * Flow per case:
 *   1. Refuse to run on lock drift (pin / fixture set / template hashes).
 *   2. Ask Jev the template's locked question about `{ rubric, reply }`
 *      (fixture transport by default; live only with ZOTO_EVAL_JEV_MODE=live).
 *   3. Route Jev's confidence through code-owned gates.
 *        ask_human | abstain → inconclusive (never pass)
 *        deny                → fail
 *        act                 → read the proposal
 *   4. A "pass" proposal is only promoted when every code-owned guard holds
 *      (case evidence regexes + template leading-phrase guard). Jev saying
 *      "pass" with high confidence is never sufficient on its own.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";

import {
  FixtureTransport,
  JevClient,
  JevConfigError,
  JevHttpError,
  createLiveTransportFromEnv,
  resolveJevMode,
  type Answer,
  type JevEnv,
  type JevMode,
  type JevTransport,
  type SystemOneResult,
} from "../jev/client.js";
import { noulConfidence, routeByConfidence, routeScore, type GateOutcome } from "../jev/gates.js";
import { JEV_PIN } from "../jev/pin.js";
import {
  buildQuestion,
  hashFixtureSet,
  hashGraderCode,
  hashVendoredCode,
  loadFixture,
  loadTemplate,
  templateFileHash,
  thresholdsOf,
  verifyLock,
  type JevTemplate,
  type LoadedTemplate,
  type LockCheck,
  type ProposedOutcome,
} from "../jev/template.js";
import { assertNever, describeVerdict, toLegacyVerdict, type JevVerdict } from "../jev/verdict.js";
import type { GraderReport } from "./common.js";

export interface JevEvidenceGuard {
  /** Every pattern must match the reply before a pass can be promoted. */
  mustMatch?: string[];
  /** No pattern may match the reply. */
  mustNotMatch?: string[];
  /** RegExp flags (default "i"). */
  flags?: string;
}

export interface JevGraderConfig {
  type: "jev";
  /** Versioned template ref, e.g. "evidence-verdict@1". */
  template: string;
  /** Case rubric (sent to Jev as state; the question wording stays locked). */
  rubric: string;
  /** Fixture file under `<jevDir>/fixtures/` used in fixture mode. */
  fixture?: string;
  /** Code-owned promotion guards. */
  evidence?: JevEvidenceGuard;
}

export interface JevProvenance {
  jev_mode: JevMode;
  jev_commit: string;
  /** Hash of every file under engine/jev/ at grading time. */
  vendor_sha256: string;
  /** Hash of this file (engine/graders/jev.ts: the pass guards) at grading time. */
  grader_sha256: string;
  fixture_set_sha256: string;
  template: string;
  template_sha256: string | null;
  fixture: string | null;
  model: string | null;
}

export interface JevProposal {
  answer: Answer;
  confidence: number;
  gate: GateOutcome;
  proposed: ProposedOutcome;
}

export interface JevGradeRecord {
  verdict: JevVerdict;
  proposal: JevProposal | null;
  provenance: JevProvenance;
}

export interface JevGraderContext {
  jevDir: string;
  mode: JevMode;
  lock: LockCheck;
  fixtureSetSha256: string;
  vendorSha256: string;
  graderSha256: string;
  /** Observer: called once per Jev consultation (fixture or live), before the transport runs. */
  onJevCall?: (info: { mode: JevMode; template: string }) => void;
  /** Only present in live mode. */
  liveTransport?: JevTransport;
  model?: string;
}

/** Keys a case may NOT set — wording, options and anchors live in the template. */
const LOCKED_KEYS = ["instructions", "question", "options", "anchors", "criteria", "thresholds"] as const;

/** Resolve `<repoRoot>/evals/jev` (the host's Jev templates, fixtures and lock). */
export function defaultJevDir(repoRoot: string): string {
  return join(repoRoot, "evals", "jev");
}

export function createJevGraderContext(opts: {
  jevDir: string;
  env?: JevEnv;
  fetchImpl?: typeof fetch;
  onJevCall?: JevGraderContext["onJevCall"];
}): JevGraderContext {
  const env = opts.env ?? (process.env as JevEnv);
  const mode = resolveJevMode(env);
  const ctx: JevGraderContext = {
    jevDir: opts.jevDir,
    mode,
    lock: existsSync(opts.jevDir)
      ? verifyLock(opts.jevDir)
      : { kind: "drift", problems: [`jev dir not found: ${opts.jevDir}`], computed: null },
    fixtureSetSha256: existsSync(opts.jevDir) ? hashFixtureSet(opts.jevDir) : "",
    vendorSha256: hashVendoredCode(),
    graderSha256: hashGraderCode(),
    onJevCall: opts.onJevCall,
    model: env.ZOTO_EVAL_JEV_MODEL?.trim() || undefined,
  };
  if (mode === "live") ctx.liveTransport = createLiveTransportFromEnv(env, opts.fetchImpl);
  return ctx;
}

function inconclusive(reason: string): JevVerdict {
  return { kind: "inconclusive", reason };
}

/** Read Jev's answer into (confidence, gate, proposed) — no verdict yet. */
export function readProposal(template: JevTemplate, answer: Answer): JevProposal | JevVerdict {
  const thresholds = thresholdsOf(template);
  switch (template.kind) {
    case "choice": {
      if (answer.type !== "choice") return inconclusive(`expected choice answer, got ${answer.type}`);
      const proposed = template.outcome_map[answer.choice];
      if (proposed === undefined) {
        return inconclusive(`choice "${answer.choice}" is outside the locked options`);
      }
      const gate = routeByConfidence(answer.confidence, thresholds);
      return { answer, confidence: answer.confidence, gate, proposed };
    }
    case "noul": {
      if (answer.type !== "noul") return inconclusive(`expected noul answer, got ${answer.type}`);
      const confidence = noulConfidence(answer.noul);
      const yes = answer.noul >= 0.5;
      const passes = template.pass_when === "yes" ? yes : !yes;
      return {
        answer,
        confidence,
        gate: routeByConfidence(confidence, thresholds),
        proposed: passes ? "pass" : "fail",
      };
    }
    case "score": {
      if (answer.type !== "score") return inconclusive(`expected score answer, got ${answer.type}`);
      const proposed: ProposedOutcome =
        answer.score <= template.pass_max_score
          ? "pass"
          : answer.score >= template.fail_min_score
            ? "fail"
            : "inconclusive";
      return {
        answer,
        confidence: answer.confidence,
        gate: routeScore(answer.score, answer.confidence, thresholds, template.bands ?? []),
        proposed,
      };
    }
    default:
      return assertNever(template, "JevTemplate");
  }
}

/** Code-owned guards that must all hold before a Jev pass proposal is promoted. */
export function promotionRefusals(
  template: JevTemplate,
  config: JevGraderConfig,
  reply: string,
): string[] {
  const refusals: string[] = [];
  const flags = config.evidence?.flags ?? "i";
  for (const p of config.evidence?.mustMatch ?? []) {
    if (!new RegExp(p, flags).test(reply)) refusals.push(`missing required evidence /${p}/`);
  }
  for (const p of config.evidence?.mustNotMatch ?? []) {
    if (new RegExp(p, flags).test(reply)) refusals.push(`forbidden content /${p}/`);
  }
  const lower = reply.toLowerCase();
  for (const phrase of template.leading_phrases ?? []) {
    if (lower.includes(phrase.toLowerCase())) refusals.push(`leading phrase "${phrase}" in graded reply`);
  }
  return refusals;
}

/** The decision: gate + proposal + guards → verdict. Jev never decides alone. */
export function decide(
  template: JevTemplate,
  config: JevGraderConfig,
  reply: string,
  proposal: JevProposal,
): JevVerdict {
  const conf = proposal.confidence.toFixed(2);
  switch (proposal.gate) {
    case "ask_human":
    case "abstain":
      return inconclusive(`gate=${proposal.gate} (confidence ${conf})`);
    case "deny":
      return { kind: "fail", reason: `gate=deny (confidence ${conf})` };
    case "act":
      break;
    default:
      return assertNever(proposal.gate, "GateOutcome");
  }
  switch (proposal.proposed) {
    case "inconclusive":
      return inconclusive(`Jev proposed an inconclusive outcome (confidence ${conf})`);
    case "fail":
      return { kind: "fail", reason: `Jev proposed fail (confidence ${conf})` };
    case "pass": {
      const refusals = promotionRefusals(template, config, reply);
      if (refusals.length > 0) {
        return { kind: "fail", reason: `promotion refused: ${refusals.join("; ")}` };
      }
      return { kind: "pass" };
    }
    default:
      return assertNever(proposal.proposed, "ProposedOutcome");
  }
}

export async function gradeWithJev(
  config: JevGraderConfig,
  reply: string,
  ctx: JevGraderContext,
): Promise<JevGradeRecord> {
  const provenance: JevProvenance = {
    jev_mode: ctx.mode,
    jev_commit: JEV_PIN.commit,
    vendor_sha256: ctx.vendorSha256,
    grader_sha256: ctx.graderSha256,
    fixture_set_sha256: ctx.fixtureSetSha256,
    template: config.template,
    /* Hash of the template file actually found on disk (also on drift / load errors). */
    template_sha256: templateFileHash(ctx.jevDir, config.template),
    fixture: ctx.mode === "fixture" ? (config.fixture ?? null) : null,
    model: null,
  };
  const done = (verdict: JevVerdict, proposal: JevProposal | null = null): JevGradeRecord => ({
    verdict,
    proposal,
    provenance,
  });

  if (ctx.lock.kind === "drift") return done(inconclusive(`lock drift: ${ctx.lock.problems.join("; ")}`));

  const overridden = LOCKED_KEYS.filter((k) => k in (config as unknown as Record<string, unknown>));
  if (overridden.length > 0) {
    return done(inconclusive(`case may not override locked template fields: ${overridden.join(", ")}`));
  }

  let loaded: LoadedTemplate;
  try {
    loaded = loadTemplate(ctx.jevDir, config.template);
  } catch (err) {
    return done(inconclusive(`template: ${(err as Error).message}`));
  }
  provenance.template_sha256 = loaded.sha256;
  const template = loaded.template;

  let transport: JevTransport;
  if (ctx.mode === "fixture") {
    if (!config.fixture) return done(inconclusive("fixture mode requires a `fixture` on the grader"));
    try {
      const fx = loadFixture(ctx.jevDir, config.fixture);
      if (fx.template !== config.template) {
        return done(inconclusive(`fixture answers ${fx.template}, case uses ${config.template}`));
      }
      transport = new FixtureTransport(fx.response);
    } catch (err) {
      return done(inconclusive(`fixture: ${(err as Error).message}`));
    }
  } else {
    if (!ctx.liveTransport) return done(inconclusive("live mode without a live transport"));
    transport = ctx.liveTransport;
  }

  const client = new JevClient({
    transport,
    model: ctx.model,
    onCall: () => ctx.onJevCall?.({ mode: transport.mode, template: config.template }),
  });
  let result: SystemOneResult;
  try {
    result = await client.systemOne({
      state: { rubric: config.rubric, reply },
      questions: { [template.question_key]: buildQuestion(template) },
    });
  } catch (err) {
    if (err instanceof JevHttpError) return done(inconclusive(`jev http ${err.status}: ${err.message}`));
    if (err instanceof JevConfigError) return done(inconclusive(`jev config: ${err.message}`));
    return done(inconclusive(`jev error: ${(err as Error).message}`));
  }
  provenance.model = typeof result?.model === "string" ? result.model : null;

  const answer = result?.answers?.[template.question_key];
  if (!answer) return done(inconclusive(`no answer for "${template.question_key}"`));

  const read = readProposal(template, answer);
  if ("kind" in read) return done(read);
  return done(decide(template, config, reply, read), read);
}

/** Adapt to the shared harness `GraderReport` (inconclusive → fail there; never pass). */
export function jevToGraderReport(record: JevGradeRecord): GraderReport {
  const p = record.provenance;
  return {
    grader: "jev",
    verdict: toLegacyVerdict(record.verdict),
    detail: `${describeVerdict(record.verdict)} [jev_mode=${p.jev_mode} jev_commit=${p.jev_commit.slice(0, 12)} vendor_sha256=${p.vendor_sha256.slice(0, 12)} grader_sha256=${p.grader_sha256.slice(0, 12)} template=${p.template} template_sha256=${(p.template_sha256 ?? "-").slice(0, 12)} fixture_set_sha256=${p.fixture_set_sha256.slice(0, 12)}]`,
  };
}
