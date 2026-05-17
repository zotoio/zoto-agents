import type { GraderReport } from "./common.js";

export interface RegexGraderConfig {
  type: "regex";
  pattern: string;
  flags?: string;
  expect?: "match" | "no-match";
}

export function regex(
  config: RegexGraderConfig,
  response: string,
): GraderReport {
  const want = config.expect ?? "match";
  let re: RegExp;
  try {
    re = new RegExp(config.pattern, config.flags ?? "");
  } catch (err) {
    return {
      grader: "regex",
      verdict: "fail",
      detail: `invalid pattern: ${(err as Error).message}`,
    };
  }
  const matched = re.test(response);
  const ok = want === "match" ? matched : !matched;
  return {
    grader: "regex",
    verdict: ok ? "pass" : "fail",
    detail: `/${config.pattern}/${config.flags ?? ""} ${matched ? "matched" : "did not match"} (expected ${want})`,
  };
}
