"""Optional Jev (TypeSafe System One) decisions for improvement iterations.

Used only when TYPESAFE_API_KEY is set. Sends the candidate render, the previous render and
(optionally) a target image as image assets (Jev 1.14 "danger zone" images) and asks:
  * improved  (noul)   - is the candidate a better match for the goal than the previous render?
  * verdict   (choice) - accept / revise / reject
  * weakest   (box)    - the region of the candidate that most needs work (Jev 1.14 Box type)
Docs: https://typesafe.ai/blog/jev-1-14, https://docs.typesafe.ai/go/images, /go/box.
Stdlib HTTP only (no SDK dependency). The API key is read from the environment and is never
logged, returned or written to disk.
"""
from __future__ import annotations

import base64
import io
import json
import os
import urllib.error
import urllib.request
import uuid

from PIL import Image

ENV_KEY = "TYPESAFE_API_KEY"
DEFAULT_URL = "https://api.typesafe.ai/v1/systemone"
DEFAULT_MODEL = "jev-1.14.0"  # Box questions need Jev 1.14


def available() -> bool:
    return bool(os.environ.get(ENV_KEY, "").strip())


def _prep(path: str) -> str:
    """PNG bytes within Jev limits (each side 280..1568 px), base64."""
    im = Image.open(path).convert("RGB")
    w, h = im.size
    s = 1.0
    if max(w, h) > 1568:
        s = 1568 / max(w, h)
    if min(w, h) * s < 280:
        s = 280 / min(w, h)
    if s != 1.0:
        im = im.resize((min(1568, max(280, round(w * s))), min(1568, max(280, round(h * s)))),
                       Image.NEAREST if s > 1 else Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("ascii")


def build_request(candidate: str, previous: str | None, target: str | None, goal: str | None,
                  model: str | None = None) -> dict:
    assets, state = {}, {}

    def add(name, path):
        ref = f"{uuid.uuid4()}-{name}"
        assets[ref] = {"type": "image", "format": "png", "data_base64": _prep(path)}
        state[name] = ref

    add("candidate", candidate)
    if previous:
        add("previous", previous)
    if target:
        add("target", target)
    state["goal"] = goal or ("Match `target` as closely as possible." if target else "A beautiful, coherent image.")
    ref = "`target`" if target else "the description in `goal`"
    questions = {
        "verdict": {"type": "choice",
                    "instructions": f"Compared with {'`previous`' if previous else 'nothing (first render)'}, how should the editor treat `candidate` given {ref}?",
                    "criteria": {"accept": "The candidate is clearly better and should replace the previous render.",
                                 "revise": "Partly better or mixed; keep iterating from the candidate with targeted fixes.",
                                 "reject": "Worse, broken, blank, or off-goal; go back to the previous program."}},
        "weakest": {"type": "box", "instructions": f"the region of `candidate` that differs most from {ref} and most needs improvement"},
    }
    if previous:
        questions["improved"] = {"type": "noul", "instructions": f"Is `candidate` a better match for {ref} than `previous`?"}
    return {"model": model or os.environ.get("TYPESAFE_JEV_MODEL", DEFAULT_MODEL),
            "state": state, "assets": assets, "questions": questions}


def _answer_value(a):
    if not isinstance(a, dict):
        return a
    for k in ("choice", "box", "noul", "value", "answer", "result", "probability"):
        if k in a:
            return a[k]
    return a


def decide(candidate: str, previous: str | None = None, target: str | None = None, goal: str | None = None,
           timeout: float = 60.0) -> dict:
    key = os.environ.get(ENV_KEY, "").strip()
    if not key:
        return {"ok": False, "judge": "jev", "errors": [f"{ENV_KEY} not set"]}
    body = json.dumps(build_request(candidate, previous, target, goal)).encode()
    req = urllib.request.Request(os.environ.get("TYPESAFE_BASE_URL", DEFAULT_URL), data=body, method="POST",
                                 headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json",
                                          "TypeSafe-Danger-Zone-Images": "true"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            resp = json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        return {"ok": False, "judge": "jev", "errors": [f"Jev HTTP {e.code}"]}
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as e:
        return {"ok": False, "judge": "jev", "errors": [f"Jev request failed: {type(e).__name__}"]}
    ans = resp.get("answers", {})
    verdict = _answer_value(ans.get("verdict"))
    improved = _answer_value(ans.get("improved")) if "improved" in ans else None
    if isinstance(improved, (int, float)) and not isinstance(improved, bool):
        improved = improved >= 0.5
    if verdict not in ("accept", "revise", "reject"):
        verdict = "revise" if improved is None else ("accept" if improved else "reject")
    box = _answer_value(ans.get("weakest"))
    conf = {k: (v.get("confidence") if isinstance(v, dict) else None) for k, v in ans.items()}
    return {"ok": True, "judge": "jev", "model": resp.get("model"), "decision": verdict,
            "improved": improved, "focus_box": box if isinstance(box, dict) else None,
            "confidence": conf, "usage": resp.get("usage")}
