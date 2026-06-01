/**
 * Unit tests for `vitest-json-loader.ts` — covers the Vite plugin's
 * `resolveId` / `load` hooks plus the shared `isNonSkillEvalJsonPath`
 * helper. Defers end-to-end Vitest discovery validation to subtask 06.
 *
 * Spec: `specs/20260527-evals-json-first-migration/spec-evals-json-first-migration-20260527.md`
 * Subtask: `subtask-02-evals-json-first-migration-vitest-json-loader-20260527.md`
 */
import { promises as fs, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  PLUGIN_NAME,
  VIRTUAL_PREFIX,
  VIRTUAL_SUFFIX,
  buildVirtualEvalJsonId,
  evalJsonLoader,
  isNonSkillEvalJsonPath,
  isSkillEvalJsonPath,
  renderEvalModule,
  unwrapVirtualEvalJsonId,
} from "./vitest-json-loader.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE_DIR = resolve(__dirname, "./__fixtures__");
const FIXTURE_PATH = join(FIXTURE_DIR, "sample-eval.json");

/* ---------------------------------------------------------------------- */
/* Helpers                                                                 */
/* ---------------------------------------------------------------------- */

type ResolveIdHook = NonNullable<ReturnType<typeof evalJsonLoader>["resolveId"]>;
type LoadHook = NonNullable<ReturnType<typeof evalJsonLoader>["load"]>;

type AnyHookFn = (this: unknown, ...args: unknown[]) => unknown;

function unwrapHook(hook: unknown): AnyHookFn {
  if (typeof hook === "function") return hook as AnyHookFn;
  if (hook && typeof hook === "object" && "handler" in hook) {
    return (hook as { handler: unknown }).handler as AnyHookFn;
  }
  throw new Error("expected plugin hook to be a function or { handler }");
}

function callResolve(
  plugin: ReturnType<typeof evalJsonLoader>,
  source: string,
  importer?: string,
): unknown {
  /* Vite plugin hooks may be a function OR an object with `handler`. Our
   * factory always returns a function form, so call it directly. We
   * route through an `unknown`-typed unwrap to avoid Vite 4.x's deeply
   * nested `ObjectHook` type checks tripping `tsc --noEmit`. */
  const fn = unwrapHook(plugin.resolveId);
  return fn.call(null, source, importer);
}

function callLoad(
  plugin: ReturnType<typeof evalJsonLoader>,
  id: string,
): Promise<unknown> {
  const fn = unwrapHook(plugin.load);
  return Promise.resolve(fn.call(null, id));
}

function unwrapCode(result: unknown): string {
  if (result == null) throw new Error("expected load result, got null/undefined");
  if (typeof result === "string") return result;
  if (typeof result === "object" && result !== null && "code" in result) {
    const code = (result as { code: unknown }).code;
    if (typeof code === "string") return code;
  }
  throw new Error(`unexpected load result shape: ${JSON.stringify(result)}`);
}

/* ---------------------------------------------------------------------- */
/* isNonSkillEvalJsonPath                                                  */
/* ---------------------------------------------------------------------- */

describe("isNonSkillEvalJsonPath", () => {
  it("accepts a non-skill command eval JSON path", () => {
    expect(
      isNonSkillEvalJsonPath(
        "/repo/plugins/zoto-eval-system/commands/evals/zoto-eval-create.json",
      ),
    ).toBe(true);
  });

  it("accepts a non-skill agent eval JSON path", () => {
    expect(
      isNonSkillEvalJsonPath(
        "/repo/.cursor/agents/evals/zoto-eval-architect.json",
      ),
    ).toBe(true);
  });

  it("accepts a non-skill hooks.json path", () => {
    expect(
      isNonSkillEvalJsonPath(
        "/repo/plugins/zoto-eval-system/hooks/evals/hooks.json",
      ),
    ).toBe(true);
  });

  it("rejects a skill evals.json path", () => {
    expect(
      isNonSkillEvalJsonPath(
        "/repo/plugins/zoto-eval-system/skills/zoto-help-evals/evals/evals.json",
      ),
    ).toBe(false);
  });

  it("classifies .cursor/skills evals.json as a skill eval path", () => {
    expect(
      isSkillEvalJsonPath(
        "/repo/.cursor/skills/zoto-create-plugin/evals/evals.json",
      ),
    ).toBe(true);
  });

  it("rejects a non-JSON path", () => {
    expect(
      isNonSkillEvalJsonPath(
        "/repo/plugins/zoto-foo/commands/evals/something.ts",
      ),
    ).toBe(false);
  });

  it("rejects a JSON outside of an evals/ directory", () => {
    expect(
      isNonSkillEvalJsonPath("/repo/plugins/zoto-foo/manifest.yml.json"),
    ).toBe(false);
  });

  it("rejects empty / non-string input", () => {
    expect(isNonSkillEvalJsonPath("")).toBe(false);
    expect(isNonSkillEvalJsonPath(null as unknown as string)).toBe(false);
    expect(isNonSkillEvalJsonPath(undefined as unknown as string)).toBe(false);
  });

  it("normalises Windows-style backslashes", () => {
    /* The helper normalises backslashes internally so paths classify
     * correctly even on POSIX hosts. We pass a backslash-style absolute
     * path verbatim so the test runs the same code path regardless of
     * the host OS. */
    const winPath = "C:\\repo\\plugins\\foo\\commands\\evals\\sample.json";
    // Sanity: confirm we're using backslashes regardless of host sep.
    expect(winPath.includes("\\")).toBe(sep === "\\" || true);
    expect(isNonSkillEvalJsonPath(winPath)).toBe(true);
  });
});

/* ---------------------------------------------------------------------- */
/* resolveId                                                                */
/* ---------------------------------------------------------------------- */

describe("evalJsonLoader resolveId", () => {
  const plugin = evalJsonLoader();

  it("returns the virtual ID for a non-skill eval JSON (absolute source)", () => {
    const abs = "/abs/repo/plugins/zoto-foo/commands/evals/sample.json";
    const result = callResolve(plugin, abs);
    expect(result).toBe(buildVirtualEvalJsonId(abs));
    /* Defence-in-depth: the synthesised id must NOT end in `.json`
     * (Vite's built-in `vite:json` plugin would otherwise intercept). */
    expect(typeof result === "string" && result.endsWith(VIRTUAL_SUFFIX)).toBe(
      true,
    );
  });

  it("returns the virtual ID via relative path + importer", () => {
    const importer = "/abs/repo/plugins/zoto-foo/commands/evals/index.ts";
    const result = callResolve(plugin, "./sample.json", importer);
    expect(result).toBe(
      buildVirtualEvalJsonId(
        "/abs/repo/plugins/zoto-foo/commands/evals/sample.json",
      ),
    );
  });

  it("returns the virtual ID for a skill evals.json (skipped pytest suite)", () => {
    const abs =
      "/abs/repo/.cursor/skills/zoto-create-plugin/evals/evals.json";
    const result = callResolve(plugin, abs);
    expect(result).toBe(buildVirtualEvalJsonId(abs));
  });

  it("returns null for a non-JSON source", () => {
    const result = callResolve(
      plugin,
      "/abs/repo/plugins/zoto-foo/commands/evals/sample.test.ts",
    );
    expect(result).toBeNull();
  });

  it("returns null for a JSON file outside of an evals/ directory", () => {
    const result = callResolve(
      plugin,
      "/abs/repo/plugins/zoto-foo/package.json",
    );
    expect(result).toBeNull();
  });

  it("returns null when the importer is itself a virtual id", () => {
    const result = callResolve(
      plugin,
      "./sample.json",
      `${VIRTUAL_PREFIX}/abs/repo/plugins/foo/commands/evals/other.json`,
    );
    expect(result).toBeNull();
  });

  it("returns null when the source is itself a virtual id", () => {
    /* Defence-in-depth: re-entrant resolution should not double-wrap a
     * virtual id. */
    const result = callResolve(
      plugin,
      `${VIRTUAL_PREFIX}/abs/repo/plugins/foo/commands/evals/sample.json`,
    );
    expect(result).toBeNull();
  });
});

/* ---------------------------------------------------------------------- */
/* load                                                                     */
/* ---------------------------------------------------------------------- */

describe("evalJsonLoader load", () => {
  const plugin = evalJsonLoader();

  it("returns null for a non-virtual id", async () => {
    const result = await callLoad(
      plugin,
      "/abs/repo/plugins/foo/commands/evals/sample.json",
    );
    expect(result).toBeNull();
  });

  it("synthesises a skipped suite for skill evals.json", async () => {
    const abs =
      "/abs/repo/.cursor/skills/zoto-create-plugin/evals/evals.json";
    const virtualId = buildVirtualEvalJsonId(abs);
    const result = await callLoad(plugin, virtualId);
    const code = unwrapCode(result);
    expect(code).toContain("it.skip");
    expect(code).toContain("pytest static backend");
    expect(code).not.toContain("defineLlmEval");
  });

  it("synthesises a module containing defineLlmEval + targetId for the fixture", async () => {
    const virtualId = `${VIRTUAL_PREFIX}${FIXTURE_PATH}`;
    const result = await callLoad(plugin, virtualId);
    const code = unwrapCode(result);

    expect(code).toContain('import { describe, it, afterAll, expect } from "vitest"');
    expect(code).toContain("defineLlmEval");
    expect(code).toContain(`const TARGET_ID = "command:sample"`);
    expect(code).toContain(`targetId: TARGET_ID`);
    expect(code).toContain(`cases: CASES`);
    expect(code).toContain(`__sourcePath: SOURCE_PATH`);
    expect(code).toContain(`  describe,`);
    expect(code).toContain(`  it,`);
    expect(code).toContain(`  afterAll,`);
    expect(code).toContain(`  expect,`);

    /* SOURCE_PATH must be embedded as a `file://` URL pointing at the
     * JSON file so the runner dispatcher can pass it directly to
     * `new URL(runner, base)`. */
    const expectedSourceUrl = pathToFileURL(FIXTURE_PATH).href;
    expect(code).toContain(`const SOURCE_PATH = ${JSON.stringify(expectedSourceUrl)}`);

    /* Source-map / debugging hints. */
    expect(code.startsWith(`// @sourceFile: ${FIXTURE_PATH}`)).toBe(true);
    expect(code).toContain(`//# sourceURL=${expectedSourceUrl}`);

    /* Optional metadata fields appear when present in the JSON. */
    expect(code).toContain(`const MODEL_ID = "composer-2.5"`);
    expect(code).toContain(`const JUDGE_MODEL = "claude-opus-4-8[]"`);
    expect(code).toContain(`const CASE_TIMEOUT_MS = 60000`);
  });

  it("embeds both declarative and runner cases verbatim from the fixture", async () => {
    const virtualId = `${VIRTUAL_PREFIX}${FIXTURE_PATH}`;
    const result = await callLoad(plugin, virtualId);
    const code = unwrapCode(result);

    /* Declarative case fields */
    expect(code).toContain(`"id": "declarative-greeting"`);
    expect(code).toContain("Reply with the literal text 'hello sample'.");
    /* Runner case fields */
    expect(code).toContain(`"id": "runner-noop"`);
    expect(code).toContain(`"runner": "./sample-runner.test.ts"`);
    expect(code).toContain(`"expected": "noop"`);
    /* `_meta.generated` markers should survive the round-trip. */
    expect(code).toContain(`"generated": true`);
  });

  it("produces deterministic output on repeated loads", async () => {
    const virtualId = `${VIRTUAL_PREFIX}${FIXTURE_PATH}`;
    const a = unwrapCode(await callLoad(plugin, virtualId));
    const b = unwrapCode(await callLoad(plugin, virtualId));
    expect(a).toBe(b);
  });

  it("imports defineLlmEval from the default sibling harness path (.js extension)", async () => {
    const virtualId = `${VIRTUAL_PREFIX}${FIXTURE_PATH}`;
    const result = await callLoad(plugin, virtualId);
    const code = unwrapCode(result);
    /* Default harness path is the sibling `./run-llm-suite.js`
     * (NodeNext-style `.js` specifier — Vite/Vitest resolves it to
     * `run-llm-suite.ts` at runtime). */
    expect(code).toMatch(
      /import \{ defineLlmEval \} from ".*\/evals\/llm\/_shared\/run-llm-suite\.js";/,
    );
  });
});

/* ---------------------------------------------------------------------- */
/* load — error + defence-in-depth paths                                   */
/* ---------------------------------------------------------------------- */

describe("evalJsonLoader load (error paths)", () => {
  let tmpRoot: string;

  beforeAll(() => {
    tmpRoot = mkdtempSync(join(tmpdir(), "zoto-eval-json-loader-"));
  });

  afterAll(() => {
    rmSync(tmpRoot, { recursive: true, force: true });
  });

  async function writeJson(
    relPath: string,
    body: string,
  ): Promise<string> {
    const absPath = join(tmpRoot, relPath);
    await fs.mkdir(dirname(absPath), { recursive: true });
    await fs.writeFile(absPath, body, "utf8");
    return absPath;
  }

  it("throws with the absolute path for malformed JSON", async () => {
    const abs = await writeJson(
      "plugins/foo/commands/evals/broken.json",
      "{not valid json",
    );
    const plugin = evalJsonLoader();
    await expect(
      callLoad(plugin, `${VIRTUAL_PREFIX}${abs}`),
    ).rejects.toThrow(/failed to parse JSON eval file/);
    await expect(
      callLoad(plugin, `${VIRTUAL_PREFIX}${abs}`),
    ).rejects.toThrow(abs);
  });

  it("throws with the absolute path when the file is missing", async () => {
    const abs = join(tmpRoot, "plugins/foo/commands/evals/missing.json");
    const plugin = evalJsonLoader();
    await expect(
      callLoad(plugin, `${VIRTUAL_PREFIX}${abs}`),
    ).rejects.toThrow(/failed to read JSON eval file/);
  });

  it("throws when target_id is missing", async () => {
    const abs = await writeJson(
      "plugins/foo/commands/evals/no-target.json",
      JSON.stringify({ cases: [{ id: "x", prompt: "p", assertions: ["a"] }] }),
    );
    const plugin = evalJsonLoader();
    await expect(
      callLoad(plugin, `${VIRTUAL_PREFIX}${abs}`),
    ).rejects.toThrow(/is missing required string field 'target_id'/);
  });

  it("throws when the top-level value is not an object", async () => {
    const abs = await writeJson(
      "plugins/foo/commands/evals/array.json",
      "[1,2,3]",
    );
    const plugin = evalJsonLoader();
    await expect(
      callLoad(plugin, `${VIRTUAL_PREFIX}${abs}`),
    ).rejects.toThrow(/must be an object \(got array\)/);
  });

  it("throws when cases is empty", async () => {
    const abs = await writeJson(
      "plugins/foo/commands/evals/no-cases.json",
      JSON.stringify({ target_id: "command:foo", cases: [] }),
    );
    const plugin = evalJsonLoader();
    await expect(
      callLoad(plugin, `${VIRTUAL_PREFIX}${abs}`),
    ).rejects.toThrow(/has no 'cases'/);
  });

  it("returns null and warns when skill_name is present (defence-in-depth)", async () => {
    /* Stage the file at a path that would otherwise pass path-based
     * classification (parent is `evals/`, name is not `evals.json`),
     * so we are genuinely exercising the in-loader `skill_name` guard. */
    const abs = await writeJson(
      "plugins/foo/commands/evals/skill-leak.json",
      JSON.stringify({ skill_name: "leaked", evals: [] }),
    );
    const warnings: string[] = [];
    const plugin = evalJsonLoader({
      logger: { warn: (msg) => warnings.push(msg) },
    });

    const result = await callLoad(plugin, `${VIRTUAL_PREFIX}${abs}`);
    expect(result).toBeNull();
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain(abs);
    expect(warnings[0]).toContain("skill_name");
    expect(warnings[0]).toContain(PLUGIN_NAME);
  });
});

/* ---------------------------------------------------------------------- */
/* renderEvalModule — direct unit tests for the synthesiser                */
/* ---------------------------------------------------------------------- */

describe("renderEvalModule", () => {
  const sampleParsed = {
    target_id: "command:sample",
    cases: [
      { id: "c1", prompt: "p", assertions: ["a"] },
      { id: "c2", runner: "./r.test.ts", parameters: { foo: 1 } },
    ],
  };

  it("emits a JSON-stable serialisation of cases (re-runs are byte-identical)", () => {
    const args = {
      harnessModulePath: "/abs/path/to/run-llm-suite.js",
    };
    const a = renderEvalModule("/abs/path/to/sample.json", sampleParsed, args);
    const b = renderEvalModule("/abs/path/to/sample.json", sampleParsed, args);
    expect(a).toBe(b);
    expect(a).toContain(`import { defineLlmEval } from "/abs/path/to/run-llm-suite.js"`);
  });

  it("honours injected harnessModulePath", () => {
    const code = renderEvalModule("/abs/path/to/sample.json", sampleParsed, {
      harnessModulePath: "/custom/path/harness.js",
    });
    expect(code).toContain(`import { defineLlmEval } from "/custom/path/harness.js"`);
  });

  it("omits optional model/judge/timeout fields when undefined", () => {
    const code = renderEvalModule(
      "/abs/path/to/sample.json",
      {
        target_id: "command:minimal",
        cases: [{ id: "c1", prompt: "p", assertions: ["a"] }],
      },
      { harnessModulePath: "/abs/path/to/run-llm-suite.js" },
    );
    expect(code).not.toContain("MODEL_ID");
    expect(code).not.toContain("JUDGE_MODEL");
    expect(code).not.toContain("CASE_TIMEOUT_MS");
  });

  it("emits optional model/judge/timeout fields when present", () => {
    const code = renderEvalModule(
      "/abs/path/to/sample.json",
      {
        target_id: "command:full",
        cases: [{ id: "c1", prompt: "p", assertions: ["a"] }],
        model_id: "composer-2.5",
        judge_model: "claude-opus-4-8[]",
        case_timeout_ms: 60000,
      },
      { harnessModulePath: "/abs/path/to/run-llm-suite.js" },
    );
    expect(code).toContain(`const MODEL_ID = "composer-2.5"`);
    expect(code).toContain(`const JUDGE_MODEL = "claude-opus-4-8[]"`);
    expect(code).toContain(`const CASE_TIMEOUT_MS = 60000`);
    expect(code).toContain(`  modelId: MODEL_ID,`);
    expect(code).toContain(`  judgeModel: JUDGE_MODEL,`);
    expect(code).toContain(`  caseTimeoutMs: CASE_TIMEOUT_MS,`);
  });

  it("falls back to `_meta` mirrors for model_id / judge_model / case_timeout_ms", () => {
    const code = renderEvalModule(
      "/abs/path/to/sample.json",
      {
        target_id: "command:meta-mirror",
        cases: [{ id: "c1", prompt: "p", assertions: ["a"] }],
        _meta: {
          model_id: "composer-2.5",
          judge_model: "claude-opus-4-8[]",
          case_timeout_ms: 120000,
        },
      },
      { harnessModulePath: "/abs/path/to/run-llm-suite.js" },
    );
    expect(code).toContain(`const MODEL_ID = "composer-2.5"`);
    expect(code).toContain(`const JUDGE_MODEL = "claude-opus-4-8[]"`);
    expect(code).toContain(`const CASE_TIMEOUT_MS = 120000`);
  });

  it("uses the file:// URL form for the `//# sourceURL` pragma + SOURCE_PATH", () => {
    const code = renderEvalModule("/abs/path/to/sample.json", sampleParsed, {
      harnessModulePath: "/abs/path/to/run-llm-suite.js",
    });
    const url = pathToFileURL("/abs/path/to/sample.json").href;
    expect(code).toContain(`//# sourceURL=${url}`);
    expect(code).toContain(`const SOURCE_PATH = ${JSON.stringify(url)}`);
  });
});
