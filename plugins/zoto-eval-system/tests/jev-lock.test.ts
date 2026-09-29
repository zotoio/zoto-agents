/**
 * Row d: the fixture set and every question template are pinned by hash in
 * `evals/jev/jev.lock.json`, alongside the vendored jev commit. Changing a
 * fixture or template wording without a conscious re-lock goes red.
 */
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { createJevGraderContext, gradeWithJev } from "../engine/graders/jev.js";
import { JEV_PIN } from "../engine/jev/pin.js";
import { computeLock, verifyLock } from "../engine/jev/template.js";
import { JEV_DIR, copyJevDir, readCases } from "./jev-helpers.js";

describe("row d: committed lock matches disk", () => {
  it("the committed evals/jev lock is in sync (fixtures, templates, pin)", () => {
    const check = verifyLock(JEV_DIR);
    expect(check.kind === "drift" ? check.problems : []).toEqual([]);
  });

  it("the lock records the same jev commit as the vendored pin", () => {
    const lock = JSON.parse(readFileSync(join(JEV_DIR, "jev.lock.json"), "utf-8"));
    expect(lock.jev_commit).toBe(JEV_PIN.commit);
    expect(lock.jev_repo).toBe(JEV_PIN.repo);
  });
});

describe("row d: drift is detected and refused", () => {
  it("editing a fixture without re-locking is drift", () => {
    const dir = copyJevDir();
    const p = join(dir, "fixtures", "evidence-verdict", "pass-high-confidence.json");
    writeFileSync(p, readFileSync(p, "utf-8").replace('"confidence": 0.93', '"confidence": 0.99'));
    const check = verifyLock(dir);
    expect(check.kind).toBe("drift");
    if (check.kind === "drift") expect(check.problems.join()).toMatch(/fixture set changed/);
  });

  it("adding a fixture without re-locking is drift", () => {
    const dir = copyJevDir();
    writeFileSync(join(dir, "fixtures", "extra.json"), "{}\n");
    expect(verifyLock(dir).kind).toBe("drift");
  });

  it("changing template wording without its hash changing is drift", () => {
    const dir = copyJevDir();
    const p = join(dir, "templates", "evidence-verdict.v1.json");
    writeFileSync(p, readFileSync(p, "utf-8").replace("Judge only what the reply", "Be generous with what the reply"));
    const check = verifyLock(dir);
    expect(check.kind).toBe("drift");
    if (check.kind === "drift") expect(check.problems.join()).toMatch(/template evidence-verdict@1 changed/);
  });

  it("an unlocked new template is drift", () => {
    const dir = copyJevDir();
    const src = readFileSync(join(dir, "templates", "rubric-met.v1.json"), "utf-8");
    writeFileSync(join(dir, "templates", "rubric-met.v2.json"), src.replace('"version": 1', '"version": 2'));
    expect(verifyLock(dir).kind).toBe("drift");
  });

  it("a lock pinned to a different jev commit is drift", () => {
    const dir = copyJevDir();
    const p = join(dir, "jev.lock.json");
    const lock = JSON.parse(readFileSync(p, "utf-8"));
    writeFileSync(p, JSON.stringify({ ...lock, jev_commit: "0".repeat(40) }));
    expect(verifyLock(dir).kind).toBe("drift");
  });

  it("re-locking (conscious update) clears drift", () => {
    const dir = copyJevDir();
    appendFileSync(join(dir, "fixtures", "rubric-met", "yes.json"), "\n");
    expect(verifyLock(dir).kind).toBe("drift");
    writeFileSync(join(dir, "jev.lock.json"), JSON.stringify(computeLock(dir)));
    expect(verifyLock(dir).kind).toBe("ok");
  });

  it("grading under drift is inconclusive — never pass", async () => {
    const dir = copyJevDir();
    appendFileSync(join(dir, "fixtures", "rubric-met", "yes.json"), "\n");
    const ctx = createJevGraderContext({ jevDir: dir, env: {} });
    for (const { case: c } of readCases("cases/eval-system-replies.json")) {
      const r = await gradeWithJev(c.grader, c.reply, ctx);
      expect(r.verdict.kind, c.id).toBe("inconclusive");
    }
  });
});
