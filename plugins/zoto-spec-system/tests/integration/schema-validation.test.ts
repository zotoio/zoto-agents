import { Ajv, type ValidateFunction } from "ajv";
import addFormatsImport from "ajv-formats";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import YAML from "yaml";

import { loadConfig } from "../../src/config-loader.js";
import {
  extractStatusBlocks,
  statusFromMarkedMd,
} from "../../scripts/spec-status-roundtrip.ts";

const PLUGIN_ROOT = resolve(import.meta.dirname, "../..");
const STATUS_TMPL_DIR = join(PLUGIN_ROOT, "templates/status");
const SCHEMA_DIR = join(PLUGIN_ROOT, "templates/schema");
const SUBTASK_SCHEMA_PATH = join(SCHEMA_DIR, "subtask-status.schema.json");
const SPEC_SCHEMA_PATH = join(SCHEMA_DIR, "spec-status.schema.json");
const CONFIG_SCHEMA_PATH = join(SCHEMA_DIR, "config.schema.json");
const TEMPLATE_CONFIG_PATH = join(PLUGIN_ROOT, "templates/config.json");
const EXAMPLE_CONFIG_YML_PATH = join(PLUGIN_ROOT, "docs/example-config.yml");

const addFormats = addFormatsImport as unknown as (a: InstanceType<typeof Ajv>) => void;

function compileStandalone(path: string): ValidateFunction {
  const instance = new Ajv({ allErrors: true, strict: false, useDefaults: true });
  addFormats(instance);
  const raw = JSON.parse(readFileSync(path, "utf-8")) as object;
  return instance.compile(raw);
}

const validateSubtaskDoc = compileStandalone(SUBTASK_SCHEMA_PATH);
const validateSpecRootDoc = compileStandalone(SPEC_SCHEMA_PATH);
const validateConfigDoc = compileStandalone(CONFIG_SCHEMA_PATH);

const tmpRepos: string[] = [];

afterEach(() => {
  for (const d of tmpRepos.splice(0)) {
    try {
      rmSync(d, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
});

function tempRepo(): string {
  const d = mkdtempSync(join(tmpdir(), "zoto-spec-schema-live-"));
  tmpRepos.push(d);
  return d;
}

function readTmpl(name: string): string {
  return readFileSync(join(STATUS_TMPL_DIR, name), "utf-8");
}

function substitute(tmpl: string, vars: Record<string, string>): string {
  return tmpl.replace(/\{\{(\w+)\}\}/g, (_, k: string) => vars[k] ?? "");
}

const SUBTASK_VARS: Record<string, string> = {
  schema_version: "1",
  subtask_id: "01",
  feature: "demo-feature",
  assigned_agent: "explore",
  model: "composer-2.5-fast",
  token_budget: "200000",
  state: "in_progress",
  started_at: "2026-05-06T08:00:00.000Z",
  last_heartbeat: "2026-05-06T09:00:00.000Z",
  completed_at: "",
  git_sha: "deadbeef",
  agent_session_id: "sess-001",
  checklist_md: "- [ ] **D01** — sample deliverable",
  artifacts_md: "_None._",
  errors_md: "_None._",
  notes: "sample notes",
};

const SPEC_VARS: Record<string, string> = {
  schema_version: "1",
  spec_id: "20260506-spec-system-live-status",
  phase: "0",
  aggregate_state: "pending",
  started_at: "2026-05-06T08:00:00.000Z",
  updated_at: "2026-05-06T08:00:00.000Z",
  aggregate_progress_total: "0",
  aggregate_progress_completed: "0",
  aggregate_progress_in_progress: "0",
  aggregate_progress_blocked: "0",
  aggregate_progress_failed: "0",
  config_reloaded_md: "_None._",
  aggregate_progress_md: "| Metric | Count |\n|--------|-------|",
  subtasks_md: "_No subtask sources scanned._",
  blockers_md: "_None._",
  definition_of_done_md: "_None._",
  events_md: "_None._",
};

describe("schema validation across shipped templates and docs", () => {
  it("subtask-status.yml.tmpl: substituted YAML validates against subtask-status.schema.json", () => {
    const text = substitute(readTmpl("subtask-status.yml.tmpl"), SUBTASK_VARS);
    const data = YAML.parse(text);
    if (data && typeof data === "object" && !Array.isArray(data)) {
      const obj = data as Record<string, unknown>;
      for (const k of [
        "started_at",
        "last_heartbeat",
        "completed_at",
        "git_sha",
        "agent_session_id",
      ]) {
        if (obj[k] === "") delete obj[k];
      }
    }
    expect(validateSubtaskDoc(data), JSON.stringify(validateSubtaskDoc.errors, null, 2)).toBe(true);
  });

  it("subtask-status.md.tmpl: rendered Markdown round-trips back to a schema-valid doc", () => {
    const text = substitute(readTmpl("subtask-status.md.tmpl"), SUBTASK_VARS);
    const blocks = extractStatusBlocks(text);
    for (const block of Object.values(blocks)) {
      expect(typeof block).toBe("string");
    }
    const doc = statusFromMarkedMd(text);
    expect(doc.subtask_id).toBe("01");
    expect(doc.checklist).toHaveLength(1);
    expect(doc.checklist[0]!.id).toBe("D01");
    expect(doc.checklist[0]!.text.trim()).toBe("sample deliverable");
  });

  it("spec-status.yml.tmpl: substituted YAML validates against spec-status.schema.json", () => {
    const text = substitute(readTmpl("spec-status.yml.tmpl"), SPEC_VARS);
    const data = YAML.parse(text);
    expect(validateSpecRootDoc(data), JSON.stringify(validateSpecRootDoc.errors, null, 2)).toBe(true);
  });

  it("spec-status.md.tmpl: substituted markdown contains all expected block markers", () => {
    const text = substitute(readTmpl("spec-status.md.tmpl"), SPEC_VARS);
    for (const id of [
      "overview",
      "progress",
      "subtasks",
      "blockers",
      "definition-of-done",
      "events",
    ]) {
      expect(text).toContain(`<!-- status:${id}:start -->`);
      expect(text).toContain(`<!-- status:${id}:end -->`);
    }
  });

  it("templates/status discovery covers exactly the four shipped tmpl files", () => {
    const files = readdirSync(STATUS_TMPL_DIR).filter((n) => n.endsWith(".tmpl"));
    expect(files.sort()).toEqual([
      "spec-status.md.tmpl",
      "spec-status.yml.tmpl",
      "subtask-status.md.tmpl",
      "subtask-status.yml.tmpl",
    ]);
  });

  it("templates/config.json validates against config.schema.json (internal default carrier)", () => {
    const data = JSON.parse(readFileSync(TEMPLATE_CONFIG_PATH, "utf-8"));
    expect(validateConfigDoc(data), JSON.stringify(validateConfigDoc.errors, null, 2)).toBe(true);
  });

  it("docs/example-config.yml validates against config.schema.json (after YAML parse)", () => {
    expect(existsSync(EXAMPLE_CONFIG_YML_PATH)).toBe(true);
    const data = YAML.parse(readFileSync(EXAMPLE_CONFIG_YML_PATH, "utf-8"));
    expect(validateConfigDoc(data), JSON.stringify(validateConfigDoc.errors, null, 2)).toBe(true);
  });

  it("an empty {} validates against config.schema.json (defaults supply required fields)", () => {
    const empty: Record<string, unknown> = {};
    expect(validateConfigDoc(empty), JSON.stringify(validateConfigDoc.errors, null, 2)).toBe(true);
  });

  it("empty config.yml merges with defaults via loadConfig (live reload contract)", () => {
    const repo = tempRepo();
    const dir = join(repo, ".zoto", "spec-system");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "config.yml"), YAML.stringify({}), "utf-8");
    const res = loadConfig(repo, 0);
    expect(res.config.specsDir.length).toBeGreaterThan(0);
    expect(res.config.subagents.default.tokenBudget).toBeGreaterThan(0);
  });
});
