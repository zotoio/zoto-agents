/**
 * Eval classify-and-stamp helpers for `/zoto-create-plugin` Step 6e.
 *
 * Calls the analyser (or a fallback payload), then emits a single
 * co-located LLM eval test file per non-skill primitive via `stampTarget`.
 * Skills retain their existing `evals.json`; the fallback payload is
 * tagged with `_meta.classification_source: "fallback-default"` so an
 * operator can re-classify later with `/z-eval-update --with-analyser`.
 */
import { readFileSync } from "node:fs";
import { relative, resolve } from "node:path";

import type { AnalyserPayload, PrimitiveKind } from "#eval-engine/analyser-payload.js";
import {
  ANALYSER_VERSION,
  computeAnalyserCacheKey,
  normaliseContent,
  resolveAnalyserTarget,
  type ResolvedTarget,
} from "#eval-analyse";
import {
  stampTarget,
  type StampTargetOptions,
  type StampTargetResult,
} from "#eval-stamp";

export type ClassificationSource = "analyser" | "fallback-default";

export interface ClassifyAndStampOptions {
  hostRepoRoot: string;
  /** Repo-relative or absolute path to the component source file. */
  componentSourcePath: string;
  apply?: boolean;
  bypassGuard?: boolean;
  dryRun?: boolean;
  /**
   * Inject analyser behaviour (tests stub this). Return `null` to exercise the
   * fallback path (`_meta.classification_source: "fallback-default"`).
   */
  runAnalyserFn?: (componentSourcePath: string) => Promise<AnalyserPayload | null>;
}

export interface ClassifyAndStampResult extends StampTargetResult {
  classification_source: ClassificationSource;
  operator_note?: string;
}

export const FALLBACK_OPERATOR_NOTE =
  'Stamped eval with classification_source: "fallback-default". Run `pnpm run eval:update --with-analyser` to re-classify when CURSOR_API_KEY is available.';

function repoRel(hostRepoRoot: string, absPath: string): string {
  return relative(hostRepoRoot, absPath).replace(/\\/g, "/");
}

/** Normalise absolute or relative paths to repo-relative form for the analyser. */
function normalizeComponentPath(
  hostRepoRoot: string,
  componentSourcePath: string,
): string {
  const absHost = resolve(hostRepoRoot);
  const absComponent = resolve(hostRepoRoot, componentSourcePath);
  if (absComponent.startsWith(`${absHost}/`) || absComponent === absHost) {
    return repoRel(absHost, absComponent);
  }
  return componentSourcePath.replace(/^\.\//, "");
}

function buildFallbackAnalyserPayload(
  resolved: ResolvedTarget,
  hostRepoRoot: string,
): AnalyserPayload {
  const raw = readFileSync(resolved.sourcePath, "utf-8");
  const sourceHash = computeAnalyserCacheKey({
    normalisedSource: normaliseContent(raw),
    analyserVersion: ANALYSER_VERSION,
    modelId: "composer-2.5",
  });
  const sourceRel = repoRel(hostRepoRoot, resolved.sourcePath);
  const invoke =
    resolved.kind === "command"
      ? `/${resolved.name} --help`
      : resolved.kind === "skill"
        ? `Use the ${resolved.name} skill for a basic task.`
        : `${resolved.targetId} smoke invocation`;

  return {
    schema_version: 1,
    analyser_version: ANALYSER_VERSION,
    model_id: "composer-2.5",
    target_id: resolved.targetId,
    kind: resolved.kind as PrimitiveKind,
    source_path: sourceRel,
    source_hash: sourceHash,
    summary:
      "Fallback classification — analyser unavailable; re-run eval:update --with-analyser.",
    cases: [
      {
        scenario: "scaffold happy path",
        prompt: invoke,
        assertions: ["responds without error"],
      },
      {
        scenario: "scaffold minimal input",
        prompt: `${invoke} with minimal context`,
        assertions: ["handles minimal input"],
      },
    ],
  };
}

async function resolveAnalyserPayload(
  componentSourcePath: string,
  hostRepoRoot: string,
  runAnalyserFn?: ClassifyAndStampOptions["runAnalyserFn"],
): Promise<{ payload: AnalyserPayload; classification_source: ClassificationSource }> {
  const normalizedPath = normalizeComponentPath(hostRepoRoot, componentSourcePath);
  const resolved = resolveAnalyserTarget(normalizedPath, hostRepoRoot);
  if (!resolved) {
    throw new Error(`cannot resolve plugin component: ${componentSourcePath}`);
  }

  if (runAnalyserFn) {
    const payload = await runAnalyserFn(normalizedPath);
    if (payload) {
      return { payload, classification_source: "analyser" };
    }
    return {
      payload: buildFallbackAnalyserPayload(resolved, hostRepoRoot),
      classification_source: "fallback-default",
    };
  }

  if (!process.env.CURSOR_API_KEY?.trim()) {
    return {
      payload: buildFallbackAnalyserPayload(resolved, hostRepoRoot),
      classification_source: "fallback-default",
    };
  }

  try {
    const mod = await import("#eval-analyse");
    const result = await mod.runAnalyser(
      { target: normalizedPath },
      { repoRoot: hostRepoRoot },
    );
    return { payload: result.payload, classification_source: "analyser" };
  } catch {
    return {
      payload: buildFallbackAnalyserPayload(resolved, hostRepoRoot),
      classification_source: "fallback-default",
    };
  }
}

/**
 * Classify one newly scaffolded plugin component and stamp its eval.
 * Skips rules (not part of the eval discovery surface) and skills (their
 * existing `evals.json` is retained verbatim).
 */
export async function classifyAndStampPluginComponent(
  opts: ClassifyAndStampOptions,
): Promise<ClassifyAndStampResult | { skipped: true; reason: string }> {
  const hostRepoRoot = resolve(opts.hostRepoRoot);
  const normalizedPath = normalizeComponentPath(
    hostRepoRoot,
    opts.componentSourcePath,
  );
  const resolved = resolveAnalyserTarget(normalizedPath, hostRepoRoot);
  if (!resolved) {
    throw new Error(`cannot resolve plugin component: ${normalizedPath}`);
  }
  if (resolved.kind === "rule") {
    return { skipped: true, reason: "rules are not eval-stamped during plugin creation" };
  }

  const { payload, classification_source } = await resolveAnalyserPayload(
    normalizedPath,
    hostRepoRoot,
    opts.runAnalyserFn,
  );

  const stampOpts: StampTargetOptions = {
    bypassGuard: opts.bypassGuard ?? true,
    dryRun: opts.dryRun,
    sourcePath: resolved.sourcePath,
  };

  const result = await stampTarget(
    hostRepoRoot,
    resolved.targetId,
    payload,
    stampOpts,
  );

  return {
    ...result,
    classification_source,
    ...(classification_source === "fallback-default"
      ? { operator_note: FALLBACK_OPERATOR_NOTE }
      : {}),
  };
}

/** Stamp eval backends for every eval-eligible component path. */
export async function classifyAndStampPluginComponents(
  hostRepoRoot: string,
  componentSourcePaths: string[],
  opts: Omit<ClassifyAndStampOptions, "hostRepoRoot" | "componentSourcePath"> = {},
): Promise<Array<ClassifyAndStampResult | { skipped: true; reason: string }>> {
  const results: Array<
    ClassifyAndStampResult | { skipped: true; reason: string }
  > = [];
  for (const componentSourcePath of componentSourcePaths) {
    results.push(
      await classifyAndStampPluginComponent({
        hostRepoRoot,
        componentSourcePath,
        ...opts,
      }),
    );
  }
  return results;
}
