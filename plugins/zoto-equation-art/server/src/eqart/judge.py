"""Improvement-iteration judges.

Order for judge="auto":
  1. jev        - when TYPESAFE_API_KEY is set (eqart.jev); image-aware accept/revise/reject + focus box.
  2. metrics    - when a target image is given: weight-free PSNR / MS-SSIM (the spec's ranking metric).
  3. host       - otherwise: the host agent opens the PNGs and critiques them (default for text-to-image).
judge="perceptual" is opt-in only (extra `weights` + EQART_WEIGHTS=1 or explicit argument); it adds an
LPIPS distance as a tie-breaker / critique signal. It never replaces the fidelity gate or the default
rankings (PSNR >= 35 dB and MS-SSIM >= 0.98, then bits, speed, novelty).
The host/user still owns apply: judges recommend, they never write programs.
"""
from __future__ import annotations

import os

from . import jev
from . import metrics as M


def weights_enabled() -> bool:
    return os.environ.get("EQART_WEIGHTS", "").lower() in ("1", "true", "yes")


def perceptual_distance(a_png: str, b_png: str) -> float:
    try:
        import lpips  # type: ignore
        import torch  # type: ignore
    except ImportError as e:
        raise RuntimeError("perceptual judge needs the optional 'weights' extra: uv sync --project <plugin>/server --extra weights") from e
    a = M.load_rgb(a_png)
    b = M.load_rgb(b_png, size=(a.shape[1], a.shape[0]))
    t = lambda x: torch.from_numpy(x).permute(2, 0, 1)[None].float() / 127.5 - 1  # noqa: E731
    net = lpips.LPIPS(net="alex", verbose=False)  # backbone weights fetched on first explicit use only
    with torch.no_grad():
        return float(net(t(a), t(b)).item())


def _metric_decision(candidate, previous, target):
    tgt = M.load_rgb(target)
    size = (tgt.shape[1], tgt.shape[0])
    c = M.compare(M.load_rgb(candidate, size=size), tgt)
    out = {"candidate": c}
    if previous:
        p = M.compare(M.load_rgb(previous, size=size), tgt)
        out["previous"] = p
        better = (c["psnr"] > p["psnr"] + 0.05) or (c["ms_ssim"] > p["ms_ssim"] + 0.002)
        worse = (c["psnr"] < p["psnr"] - 0.5) and (c["ms_ssim"] < p["ms_ssim"])
        out["improved"] = bool(better and not worse)
        out["decision"] = "accept" if out["improved"] else ("reject" if worse else "revise")
    else:
        out["improved"] = None
        out["decision"] = "revise"
    out["meets_fidelity"] = bool(c["psnr"] >= 35 and c["ms_ssim"] >= 0.98)
    return out


def judge(candidate: str, previous: str | None = None, target: str | None = None, goal: str | None = None,
          judge: str = "auto") -> dict:
    tried = []
    if judge in ("auto", "jev") and jev.available():
        r = jev.decide(candidate, previous, target, goal)
        if r.get("ok"):
            if target:
                r["metrics"] = _metric_decision(candidate, previous, target)
            r["note"] = "Recommendation only: the host/user applies changes."
            return r
        tried.append(r)
    elif judge == "jev":
        return {"ok": False, "judge": "jev", "errors": [f"{jev.ENV_KEY} not set; use judge=auto/host"]}
    if judge == "perceptual" or (judge == "auto" and weights_enabled() and target):
        try:
            ref = target or previous
            if not ref:
                raise RuntimeError("perceptual judge needs a target or previous image")
            d = perceptual_distance(candidate, ref)
            out = {"ok": True, "judge": "perceptual", "lpips_to_ref": d}
            if previous and target:
                dp = perceptual_distance(previous, target)
                out.update(lpips_previous=dp, improved=d < dp, decision="accept" if d < dp else "revise")
            if target:
                out["metrics"] = _metric_decision(candidate, previous, target)
            return out
        except RuntimeError as e:
            if judge == "perceptual":
                return {"ok": False, "judge": "perceptual", "errors": [str(e)]}
            tried.append({"judge": "perceptual", "errors": [str(e)]})
    if target and judge in ("auto", "metrics"):
        r = _metric_decision(candidate, previous, target)
        return {"ok": True, "judge": "metrics", **r, "fallbacks": tried or None}
    return {"ok": True, "judge": "host", "decision": None,
            "instructions": "Open the candidate (and previous) PNG yourself, critique against the request using "
                            "references/critique-rubric.md, then decide accept / revise / reject.",
            "candidate": candidate, "previous": previous, "fallbacks": tried or None}
