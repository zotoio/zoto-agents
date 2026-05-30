import { execFileSync } from "node:child_process";
import { copyFileSync, mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import YAML from "yaml";

const PLUGIN_ROOT = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const TSX_CLI = join(PLUGIN_ROOT, "node_modules", ".bin", "tsx");
const ROUNDTRIP_SCRIPT = join(PLUGIN_ROOT, "scripts", "spec-status-roundtrip.ts");
const FIXTURE_YML = join(PLUGIN_ROOT, "tests/integration/fixtures/status-pair-roundtrip.fixture.yml");

const tmpDirs: string[] = [];

afterEach(() => {
  for (const d of tmpDirs.splice(0)) {
    try {
      rmSync(d, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
});

function tempDir(): string {
  const d = mkdtempSync(join(tmpdir(), "zoto-spec-rt-"));
  tmpDirs.push(d);
  return d;
}

function runRoundtripCli(args: string[]): { code: number; stderr: string; stdout: string } {
  try {
    const stdout = execFileSync(TSX_CLI, [ROUNDTRIP_SCRIPT, ...args], {
      cwd: PLUGIN_ROOT,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { code: 0, stderr: "", stdout };
  } catch (e: unknown) {
    const err = e as { status?: number; stderr?: Buffer | string; stdout?: Buffer | string };
    return {
      code: typeof err.status === "number" ? err.status : 1,
      stderr: typeof err.stderr === "string" ? err.stderr : (err.stderr?.toString("utf-8") ?? ""),
      stdout: typeof err.stdout === "string" ? err.stdout : (err.stdout?.toString("utf-8") ?? ""),
    };
  }
}

/** Recursive deterministic equality: sorted keys + trimmed block notes (MD round-trip strips trailing newline). */
function stableYamlComparable(raw: string): unknown {
  const parsed = YAML.parse(raw) as unknown;
  return normalizeKeys(parsed);
}

function normalizeKeys(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(normalizeKeys);
  if (v !== null && typeof v === "object") {
    const o = v as Record<string, unknown>;
    const sortedKeys = Object.keys(o).sort();
    const out: Record<string, unknown> = {};
    for (const k of sortedKeys) {
      let inner = o[k];
      if (k === "notes" && typeof inner === "string") inner = inner.replace(/\s+$/, "");
      out[k] = normalizeKeys(inner);
    }
    return out;
  }
  return v;
}

describe("status pair YAML ↔ Markdown round-trip (integration CLI)", { timeout: 15_000 }, () => {
  it("md-from-yml → yml-from-md preserves checklist ticks, artifacts, and errors", () => {
    const work = tempDir();
    const inYml = join(work, "in.status.yml");
    const mdPath = join(work, "paired.status.md");
    const backYml = join(work, "back.status.yml");
    copyFileSync(FIXTURE_YML, inYml);

    expect(runRoundtripCli(["md-from-yml", "--in", inYml, "--out", mdPath]).code).toBe(0);
    expect(runRoundtripCli(["yml-from-md", "--in", mdPath, "--out", backYml]).code).toBe(0);

    const a = stableYamlComparable(readFileSync(inYml, "utf-8"));
    const b = stableYamlComparable(readFileSync(backYml, "utf-8"));
    expect(b).toEqual(a);

    const doc = YAML.parse(readFileSync(backYml, "utf-8")) as {
      checklist: Array<{ id: string; done: boolean }>;
    };
    const byId = new Map(doc.checklist.map((c) => [c.id, c.done]));
    expect(byId.get("D01")).toBe(true);
    expect(byId.get("D02")).toBe(false);
    expect(byId.get("D03")).toBe(false);
  });

  it("honours a hand-edited markdown checkbox when yml-from-md runs (md drives canonical yml)", () => {
    const work = tempDir();
    const inYml = join(work, "in.status.yml");
    const mdPath = join(work, "paired.status.md");
    const outYml = join(work, "merged.status.yml");
    copyFileSync(FIXTURE_YML, inYml);

    expect(runRoundtripCli(["md-from-yml", "--in", inYml, "--out", mdPath]).code).toBe(0);

    let md = readFileSync(mdPath, "utf-8");
    md = md.replace(
      "- [ ] **D03** — Third deliverable for round-trip",
      "- [x] **D03** — Third deliverable for round-trip",
    );
    writeFileSync(mdPath, md, "utf-8");

    const past = new Date("2020-01-01T00:00:00.000Z");
    utimesSync(inYml, past, past);
    const newer = new Date("2030-01-01T00:00:00.000Z");
    utimesSync(mdPath, newer, newer);

    expect(runRoundtripCli(["yml-from-md", "--in", mdPath, "--out", outYml]).code).toBe(0);
    const doc = YAML.parse(readFileSync(outYml, "utf-8")) as {
      checklist: Array<{ id: string; done: boolean }>;
    };
    const d3 = doc.checklist.find((c) => c.id === "D03");
    expect(d3?.done).toBe(true);
  });
});
