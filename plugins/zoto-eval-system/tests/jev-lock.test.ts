/**
 * Row d: the fixture set and every question template are pinned by hash in
 * `evals/jev/jev.lock.json`, alongside the vendored jev commit. Changing a
 * fixture or template wording without a conscious re-lock goes red.
 */
import { appendFileSync, cpSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { createJevGraderContext, gradeWithJev } from "../engine/graders/jev.js";
import { JEV_PIN } from "../engine/jev/pin.js";
import { VENDOR_DIR, computeLock, hashVendoredCode, sha256, verifyLock } from "../engine/jev/template.js";
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

describe("vendored code is pinned by vendor_sha256", () => {
  it("the lock records the hash of every file under engine/jev/", () => {
    const lock = JSON.parse(readFileSync(join(JEV_DIR, "jev.lock.json"), "utf-8"));
    expect(lock.vendor_sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(lock.vendor_sha256).toBe(hashVendoredCode());
  });

  it("editing one vendored line without re-locking is drift", () => {
    const vendor = mkdtempSync(join(tmpdir(), "zoto-jev-vendor-"));
    cpSync(VENDOR_DIR, vendor, { recursive: true });
    const p = join(vendor, "gates.ts");
    writeFileSync(p, readFileSync(p, "utf-8").replace("act: 0.85", "act: 0.5"));
    const check = verifyLock(JEV_DIR, vendor);
    expect(check.kind).toBe("drift");
    if (check.kind === "drift") expect(check.problems.join()).toMatch(/vendored Jev code \(engine\/jev\) changed/);
  });

  it("a lock without vendor_sha256 is drift", () => {
    const dir = copyJevDir();
    const p = join(dir, "jev.lock.json");
    const { vendor_sha256: _drop, ...rest } = JSON.parse(readFileSync(p, "utf-8"));
    writeFileSync(p, JSON.stringify(rest));
    expect(verifyLock(dir).kind).toBe("drift");
  });

  it("every result record carries vendor_sha256", async () => {
    const ctx = createJevGraderContext({ jevDir: JEV_DIR, env: {} });
    for (const { case: c } of readCases("cases/eval-system-replies.json")) {
      const r = await gradeWithJev(c.grader, c.reply, ctx);
      expect(r.provenance.vendor_sha256).toBe(hashVendoredCode());
    }
  });
});

describe("template_sha256 records the hash actually found (drift / load errors)", () => {
  it("under drift, template_sha256 is the drifted file's hash, not null", async () => {
    const dir = copyJevDir();
    const p = join(dir, "templates", "evidence-verdict.v1.json");
    writeFileSync(p, readFileSync(p, "utf-8").replace("Judge only what the reply", "Be generous with what the reply"));
    const found = sha256(readFileSync(p, "utf-8"));
    const c = readCases("cases/eval-system-replies.json")[0]!.case;
    const r = await gradeWithJev(c.grader, c.reply, createJevGraderContext({ jevDir: dir, env: {} }));
    expect(r.verdict.kind).toBe("inconclusive");
    expect(r.provenance.template_sha256).toBe(found);
  });

  it("on a template load error, template_sha256 is the broken file's hash", async () => {
    const dir = copyJevDir();
    const p = join(dir, "templates", "evidence-verdict.v1.json");
    writeFileSync(p, '{ "id": "evidence-verdict", "version": 1, "kind": "nope" }\n');
    writeFileSync(join(dir, "jev.lock.json"), JSON.stringify(computeLock(dir)));
    const c = readCases("cases/eval-system-replies.json")[0]!.case;
    const r = await gradeWithJev(c.grader, c.reply, createJevGraderContext({ jevDir: dir, env: {} }));
    expect(r.verdict).toMatchObject({ kind: "inconclusive", reason: expect.stringMatching(/^template:/) });
    expect(r.provenance.template_sha256).toBe(sha256(readFileSync(p, "utf-8")));
  });

  it("a template that does not exist records null (nothing was found)", async () => {
    const c = readCases("cases/eval-system-replies.json")[0]!.case;
    const r = await gradeWithJev(
      { ...c.grader, template: "no-such-template@9" },
      c.reply,
      createJevGraderContext({ jevDir: JEV_DIR, env: {} }),
    );
    expect(r.verdict.kind).toBe("inconclusive");
    expect(r.provenance.template_sha256).toBeNull();
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
