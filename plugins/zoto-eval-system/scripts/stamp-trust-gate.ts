/**
 * Stamp-trust gate — refuses green when the unified LLM harness is incomplete
 * or when Vitest's `#eval-engine` alias resolves away from the engine that
 * produced the stamp.
 */
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  EVAL_ENGINE_ALIAS_DRIFT,
  EVAL_STAMP_TRUNCATED,
  StampTrustError,
} from "./stamp-trust-signals.js";

export {
  EVAL_ENGINE_ALIAS_DRIFT,
  EVAL_STAMP_TRUNCATED,
  StampTrustError,
} from "./stamp-trust-signals.js";

const PLUGIN_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TEMPLATE_ROOT = join(PLUGIN_ROOT, "templates", "llm", "unified-harness");

export interface StampManifest {
  schema_version: 1;
  stamped_at: string;
  plugin_version: string;
  engine_root: string;
  harness_checksums: Record<string, string>;
}

export interface AssertStampTrustOptions {
  evalsDir: string;
  templateRoot?: string;
  resolveEvalEngineRoot?: () => string;
}

function destRelFromTemplateRel(templateRel: string): string {
  if (templateRel.endsWith(".tmpl")) {
    return templateRel.slice(0, -".tmpl".length);
  }
  return templateRel;
}

function sha256(content: string): string {
  return createHash("sha256").update(content, "utf-8").digest("hex");
}

function readPackageVersion(pluginRoot: string): string {
  const pkgPath = join(pluginRoot, "package.json");
  if (!existsSync(pkgPath)) return "0.0.0";
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as { version?: unknown };
    return typeof pkg.version === "string" ? pkg.version : "0.0.0";
  } catch {
    return "0.0.0";
  }
}

function walkTemplateFiles(
  current: string,
  base: string,
  visit: (absPath: string, relFromBase: string) => void,
): void {
  for (const entry of readdirSync(current, { withFileTypes: true })) {
    const abs = join(current, entry.name);
    const rel = relative(base, abs).split("\\").join("/");
    if (entry.isDirectory()) {
      walkTemplateFiles(abs, base, visit);
      continue;
    }
    visit(abs, rel);
  }
}

export function expectedHarnessFiles(templateRoot: string = TEMPLATE_ROOT): string[] {
  const files: string[] = [];
  if (!existsSync(templateRoot)) return files;
  walkTemplateFiles(templateRoot, templateRoot, (_abs, templateRel) => {
    files.push(destRelFromTemplateRel(templateRel));
  });
  return files.sort();
}

export function buildHarnessChecksums(
  evalsDir: string,
  templateRoot: string = TEMPLATE_ROOT,
): Record<string, string> {
  const checksums: Record<string, string> = {};
  for (const rel of expectedHarnessFiles(templateRoot)) {
    const abs = join(evalsDir, rel);
    if (!existsSync(abs)) continue;
    checksums[rel] = sha256(readFileSync(abs, "utf-8"));
  }
  return checksums;
}

export function buildStampManifest(args: {
  pluginRoot: string;
  evalsDir: string;
  templateRoot?: string;
  stampedAt?: string;
}): StampManifest {
  const templateRoot = args.templateRoot ?? TEMPLATE_ROOT;
  const engineRoot = realpathSync(join(args.pluginRoot, "engine"));
  return {
    schema_version: 1,
    stamped_at: args.stampedAt ?? new Date().toISOString(),
    plugin_version: readPackageVersion(args.pluginRoot),
    engine_root: engineRoot,
    harness_checksums: buildHarnessChecksums(args.evalsDir, templateRoot),
  };
}

export function readStampManifest(evalsDir: string): StampManifest | null {
  const manifestPath = join(evalsDir, "_zoto", "stamp-manifest.json");
  if (!existsSync(manifestPath)) return null;
  try {
    return JSON.parse(readFileSync(manifestPath, "utf-8")) as StampManifest;
  } catch {
    return null;
  }
}

export function writeStampManifestSync(
  evalsDir: string,
  manifest: StampManifest,
): string {
  const manifestPath = join(evalsDir, "_zoto", "stamp-manifest.json");
  mkdirSync(dirname(manifestPath), { recursive: true });
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf-8");
  return manifestPath;
}

function checkHarnessAgainstManifest(
  evalsDir: string,
  manifest: StampManifest,
): StampTrustError | null {
  const problems: string[] = [];
  for (const [rel, expectedHash] of Object.entries(manifest.harness_checksums)) {
    const absDest = join(evalsDir, rel);
    if (!existsSync(absDest)) {
      problems.push(`missing ${rel}`);
      continue;
    }
    const actual = readFileSync(absDest, "utf-8");
    const actualHash = sha256(actual);
    if (actualHash !== expectedHash) {
      problems.push(
        actual.length < 80 ? `truncated ${rel}` : `drifted ${rel}`,
      );
    }
  }
  if (problems.length === 0) return null;
  return new StampTrustError(
    EVAL_STAMP_TRUNCATED,
    `${EVAL_STAMP_TRUNCATED}: incomplete stamped harness (${problems.join(", ")})`,
  );
}

export function checkHarnessCompleteness(
  evalsDir: string,
  templateRoot: string = TEMPLATE_ROOT,
  manifest?: StampManifest | null,
): StampTrustError | null {
  const recorded = manifest ?? readStampManifest(evalsDir);
  if (recorded?.harness_checksums) {
    return checkHarnessAgainstManifest(evalsDir, recorded);
  }

  if (!existsSync(templateRoot)) {
    return new StampTrustError(
      EVAL_STAMP_TRUNCATED,
      `${EVAL_STAMP_TRUNCATED}: unified harness templates missing at ${templateRoot}`,
    );
  }

  const problems: string[] = [];
  walkTemplateFiles(templateRoot, templateRoot, (absTemplate, templateRel) => {
    const destRel = destRelFromTemplateRel(templateRel);
    const absDest = join(evalsDir, destRel);
    const expected = readFileSync(absTemplate, "utf-8");

    if (!existsSync(absDest)) {
      problems.push(`missing ${destRel}`);
      return;
    }

    const actual = readFileSync(absDest, "utf-8");
    if (actual !== expected) {
      if (expected.startsWith(actual) && actual.length < expected.length) {
        problems.push(`truncated ${destRel}`);
      } else {
        problems.push(`drifted ${destRel}`);
      }
    }
  });

  if (problems.length === 0) return null;
  return new StampTrustError(
    EVAL_STAMP_TRUNCATED,
    `${EVAL_STAMP_TRUNCATED}: incomplete stamped harness (${problems.join(", ")})`,
  );
}

export function checkEngineAliasAlignment(
  recordedEngineRoot: string,
  resolvedEngineRoot: string,
  recordedPluginVersion?: string,
  resolvedPluginVersion?: string,
): StampTrustError | null {
  let recorded = recordedEngineRoot;
  let resolved = resolvedEngineRoot;
  try {
    recorded = realpathSync(recordedEngineRoot);
  } catch {
    /* keep literal path when target was removed */
  }
  try {
    resolved = realpathSync(resolvedEngineRoot);
  } catch {
    /* keep literal path for error detail */
  }

  if (recorded !== resolved) {
    return new StampTrustError(
      EVAL_ENGINE_ALIAS_DRIFT,
      `${EVAL_ENGINE_ALIAS_DRIFT}: #eval-engine resolves to ${resolved} but stamp recorded ${recorded}`,
    );
  }

  if (
    recordedPluginVersion &&
    resolvedPluginVersion &&
    recordedPluginVersion !== resolvedPluginVersion
  ) {
    return new StampTrustError(
      EVAL_ENGINE_ALIAS_DRIFT,
      `${EVAL_ENGINE_ALIAS_DRIFT}: plugin version ${resolvedPluginVersion} differs from stamped ${recordedPluginVersion}`,
    );
  }

  return null;
}

export function assertStampTrust(opts: AssertStampTrustOptions): void {
  const templateRoot = opts.templateRoot ?? TEMPLATE_ROOT;
  const manifest = readStampManifest(opts.evalsDir);
  if (!manifest) {
    throw new StampTrustError(
      EVAL_STAMP_TRUNCATED,
      `${EVAL_STAMP_TRUNCATED}: missing evals/_zoto/stamp-manifest.json`,
    );
  }

  const truncated = checkHarnessCompleteness(
    opts.evalsDir,
    templateRoot,
    manifest,
  );
  if (truncated) throw truncated;

  const resolveEngineRoot =
    opts.resolveEvalEngineRoot ??
    (() => {
      const pluginRootPath = join(opts.evalsDir, "_zoto", "plugin-root.ts");
      if (!existsSync(pluginRootPath)) {
        throw new StampTrustError(
          EVAL_STAMP_TRUNCATED,
          `${EVAL_STAMP_TRUNCATED}: missing evals/_zoto/plugin-root.ts`,
        );
      }
      // Dynamic import would be async; callers in setup pass resolveEvalEngineRoot.
      throw new Error(
        "assertStampTrust requires resolveEvalEngineRoot when not called from stamped setup",
      );
    });

  const resolvedEngineRoot = resolveEngineRoot();
  const pluginRoot = dirname(resolvedEngineRoot);
  const resolvedVersion = readPackageVersion(pluginRoot);
  const drift = checkEngineAliasAlignment(
    manifest.engine_root,
    resolvedEngineRoot,
    manifest.plugin_version,
    resolvedVersion,
  );
  if (drift) throw drift;
}
