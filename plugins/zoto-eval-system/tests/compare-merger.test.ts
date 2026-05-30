import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import YAML from "yaml";

import {
  canonicalCaseId,
  flattenMultiRunDataset,
  mergedCaseToDatasetRow,
  loadMergedRunForCompare,
} from "../engine/compare.js";

describe("eval compare merger (report + auxiliary YAML)", () => {
  function writeRun(opts: {
    label: string;
    reportSnippet: Record<string, unknown>;
    staticRows?: Record<string, unknown>[];
    llmRows?: Record<string, unknown>[];
  }) {
    const root = mkdtempSync(join(tmpdir(), "zoto-compare-"));
    const runDir = join(root, opts.label);
    mkdirSync(runDir, { recursive: true });
    writeFileSync(
      join(runDir, "report.yml"),
      YAML.stringify(opts.reportSnippet),
    );
    if (opts.staticRows?.length) {
      writeFileSync(
        join(runDir, "static.yml"),
        YAML.stringify({ rows: opts.staticRows }),
      );
    }
    if (opts.llmRows?.length) {
      writeFileSync(join(runDir, "llm.yml"), YAML.stringify({ rows: opts.llmRows }));
    }
    return join(runDir, "report.yml");
  }

  it("fills judge-facing metrics from llm/static when report rows are skeletal", () => {
    const reportPath = writeRun({
      label: "run-alpha",
      reportSnippet: {
        run_id: "run-alpha",
        model: "m-a",
        report: {
          static: { passed: 2 },
          /** Deliberately omit **`llm`** rollup — importer must reopen **`llm.yml`**.**/
        },
        cases: [
          {
            case_id: "one",
            status: "passed",
            tokens: 0,
            verbosity: 0,
            accuracy: 0,
            confidence: 0,
          },
        ],
      },
      staticRows: [
        { case_id: "two", status: "passed", duration_ms: 40 },
      ],
      llmRows: [
        {
          case_id: "one",
          tokens: 500,
          verbosity: 0.5,
          accuracy: 0.91,
          confidence: 0.87,
          status: "passed",
        },
        {
          case_id: "two",
          tokens: 300,
          verbosity: 0.3,
          accuracy: 0.71,
          confidence: 0.65,
        },
      ],
    });

    const rows = loadMergedRunForCompare(reportPath);
    expect(rows).toHaveLength(2);

    const rOne = rows.find((r) => r.case_id === "one")!;
    expect(rOne.tokens).toBe(500);
    expect(rOne.accuracy).toBeCloseTo(0.91);
    expect(rOne.confidence).toBeCloseTo(0.87);
    expect(rOne.duration_ms).toBe(0);

    const rTwo = rows.find((r) => r.case_id === "two")!;
    /** Case only in **`static.yml`** / **`llm.yml`** still exports a row.*/
    expect(rTwo.duration_ms).toBe(40);
    expect(rTwo.tokens).toBe(300);

    /** Judge tier columns remain aligned with **`llm.yml`** for **`two`** */
    expect(rTwo.accuracy).toBeCloseTo(0.71);
    expect(rTwo.confidence).toBeCloseTo(0.65);
  });

  it("runs run-alpha × run-beta × run-gamma in one flattened dataset without dropping rows", () => {
    const runs = ["run-alpha", "run-beta", "run-gamma"] as const;
    const paths: string[] = [];
    for (const id of runs) {
      paths.push(
        writeRun({
          label: id,
          reportSnippet: {
            run_id: id,
            model: `${id}-model`,
            /** Gamma: static rollup present, **`report.llm` absent**.*/
            report:
              id === "run-gamma"
                ? { static: { passed: 1 } }
                : { static: { passed: 1 }, llm: { passed: 1 } },
            cases:
              id === "run-alpha"
                ? [{ case_id: "c1", status: "passed" }]
                : id === "run-beta"
                  ? [{ id: "c2", status: "failed" }]
                  : [{ case_id: "c3", status: "passed" }],
          },
          staticRows:
            id === "run-alpha"
              ? [{ case_id: "c1", duration_ms: 10 }]
              : id === "run-beta"
                ? [{ case_id: "c2", duration_ms: 20 }]
                : [{ case_id: "c3", duration_ms: 30 }],
          llmRows: [
            {
              case_id: id === "run-beta" ? "c2" : id === "run-alpha" ? "c1" : "c3",
              tokens: id === "run-alpha" ? 100 : id === "run-beta" ? 200 : 400,
              verbosity: 0.4,
              accuracy: id === "run-gamma" ? 0.99 : 0.8,
              confidence: id === "run-gamma" ? 0.98 : 0.82,
              judge_score:
                id === "run-gamma" ? 0.955 : undefined,
              status:
                id === "run-beta" ? "failed" : "passed",
            },
          ],
        }),
      );
    }

    const flat = flattenMultiRunDataset(paths);
    expect(flat).toHaveLength(3);

    const gamma = flat.filter((r) => r.run_id === "run-gamma");
    expect(gamma).toHaveLength(1);
    expect(gamma[0].accuracy).toBeCloseTo(0.99);
    expect(gamma[0].confidence).toBeCloseTo(0.98);
    expect(gamma[0].tokens).toBe(400);

    /** Supplements from **`llm.yml`** propagate as scalars.*/
    expect((gamma[0] as Record<string, number>).judge_score).toBeCloseTo(
      0.955,
      6,
    );
  });

  it("canonicalCaseId honours id alias", () => {
    expect(
      canonicalCaseId({ case_id: "x" }),
    ).toBe("x");
    expect(
      canonicalCaseId({ id: "y", case_id: "x" }),
    ).toBe("y");
  });

  it("mergedCaseToDatasetRow carries extra judge scalar overlays", () => {
    const row = mergedCaseToDatasetRow("rid", undefined, {
      id: "c",
      status: "passed",
      tokens: 0,
      duration_ms: 0,
      accuracy: 0,
      verbosity: 0,
      confidence: 0,
      judge_verdict: "accept",
      judge_numeric: 0.77,
      grader_reports: [{}],
    } as Record<string, unknown>);
    expect(row.case_id).toBe("c");
    expect(row.judge_numeric).toBeCloseTo(0.77);
    expect((row as Record<string, unknown>).grader_reports).toBeUndefined();
  });
});
