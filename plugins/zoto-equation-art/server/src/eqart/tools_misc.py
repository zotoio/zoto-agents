"""JSON-Patch (RFC 6902), LaTeX pretty-printing, and the persistent operator library."""
from __future__ import annotations

import copy
import hashlib
import json
import time

from .interp import ALL_OPS, EqartError
from .ir import validate

# ------------------------------------------------------------------ JSON Patch


def _tokens(ptr: str):
    if ptr == "":
        return []
    if not ptr.startswith("/"):
        raise EqartError(f"bad JSON pointer {ptr!r}")
    return [t.replace("~1", "/").replace("~0", "~") for t in ptr[1:].split("/")]


def _walk(doc, toks):
    cur = doc
    for t in toks:
        if isinstance(cur, list):
            cur = cur[int(t)]
        elif isinstance(cur, dict):
            cur = cur[t]
        else:
            raise EqartError(f"cannot descend into {type(cur).__name__}")
    return cur


def _get(doc, ptr):
    return _walk(doc, _tokens(ptr))


def _add(doc, ptr, val):
    toks = _tokens(ptr)
    if not toks:
        return val
    parent = _walk(doc, toks[:-1])
    last = toks[-1]
    if isinstance(parent, list):
        parent.insert(len(parent) if last == "-" else int(last), val)
    else:
        parent[last] = val
    return doc


def _remove(doc, ptr):
    toks = _tokens(ptr)
    parent = _walk(doc, toks[:-1])
    last = toks[-1]
    if isinstance(parent, list):
        return parent.pop(int(last))
    return parent.pop(last)


def apply_patch(doc, patch: list):
    doc = copy.deepcopy(doc)
    for i, op in enumerate(patch):
        try:
            kind, path = op["op"], op["path"]
            if kind == "add":
                doc = _add(doc, path, copy.deepcopy(op["value"]))
            elif kind == "remove":
                _remove(doc, path)
            elif kind == "replace":
                _remove(doc, path)
                doc = _add(doc, path, copy.deepcopy(op["value"]))
            elif kind == "move":
                v = _remove(doc, op["from"])
                doc = _add(doc, path, v)
            elif kind == "copy":
                doc = _add(doc, path, copy.deepcopy(_get(doc, op["from"])))
            elif kind == "test":
                if _get(doc, path) != op["value"]:
                    raise EqartError("test failed")
            else:
                raise EqartError(f"unknown op {kind}")
        except (KeyError, IndexError, ValueError, TypeError) as e:
            raise EqartError(f"patch op {i} ({op.get('op')} {op.get('path')}): {e}") from e
    return doc


# ------------------------------------------------------------------ LaTeX

_FN = {"sin": r"\sin", "cos": r"\cos", "tan": r"\tan", "atan": r"\arctan", "tanh": r"\tanh",
       "exp": r"\exp", "log": r"\log"}


def latex(node, depth=0) -> str:
    if depth > 40:
        return r"\cdots"
    if isinstance(node, (int, float)):
        return f"{node:g}"
    if isinstance(node, str):
        if node.startswith("$"):
            return r"\theta_{\mathrm{" + node[1:].replace("_", r"\_") + "}}"
        return {"pi": r"\pi"}.get(node, node.replace("_", r"\_"))
    if not isinstance(node, list) or not node:
        return "?"
    h, a = node[0], node[1:]
    L = lambda n: latex(n, depth + 1)  # noqa: E731
    if h == "add":
        return "(" + " + ".join(L(x) for x in a) + ")"
    if h == "mul":
        return r" \cdot ".join(L(x) for x in a)
    if h == "sub":
        return f"({L(a[0])} - {L(a[1])})"
    if h == "div":
        return r"\frac{" + L(a[0]) + "}{" + L(a[1]) + "}"
    if h == "neg":
        return "-" + L(a[0])
    if h == "pow":
        return "{" + L(a[0]) + "}^{" + L(a[1]) + "}"
    if h in _FN:
        return _FN[h] + r"\left(" + L(a[0]) + r"\right)"
    if h == "sqrt":
        return r"\sqrt{" + L(a[0]) + "}"
    if h == "abs":
        return r"\left|" + L(a[0]) + r"\right|"
    if h == "softmask":
        return "e^{-e^{" + L(a[1]) + " " + L(a[0]) + "}}"
    if h == "sawtooth":
        return r"\arctan(\tan(" + L(a[0]) + "))"
    if h == "tap":
        return f"{a[0]}_{{i{a[1] if len(a) > 1 else 0:+g},j{a[2] if len(a) > 2 else 0:+g}}}"
    if h == "lap":
        return r"\nabla^2 " + str(a[0])
    if h in ("sum_i", "prod_i"):
        sym = r"\sum" if h == "sum_i" else r"\prod"
        return f"{sym}_{{{a[0]}={a[1]}}}^{{{a[2]}}}" + r"\left(" + L(a[3]) + r"\right)"
    if h == "let":
        binds = r",\ ".join(f"{k} = {L(v)}" for k, v in a[0].items())
        return L(a[1]) + r"\quad\text{where } " + binds
    if h == "iterate":
        upd = r",\ ".join(f"{k} \\leftarrow {L(v)}" for k, v in a[2].items())
        return r"\left[" + upd + r"\right]^{\times " + str(a[0]) + "} \\Rightarrow " + L(a[3])
    return r"\operatorname{" + str(h).replace("_", r"\_") + "}" + r"\left(" + ", ".join(L(x) for x in a) + r"\right)"


def latex_program(ir: dict) -> str:
    lines = []
    for name, od in (ir.get("opdefs") or {}).items():
        lines.append(r"\operatorname{" + name.replace("_", r"\_") + "}(" + ", ".join(od.get("args", [])) + ") = " + latex(od["body"]))
    for name, spec in (ir.get("fields") or {}).items():
        if "init" in spec:
            lines.append(f"{name}^{{(0)}} = " + latex(spec["init"]))

    def sched(items, prefix=""):
        for it in items:
            if "loop" in it:
                lines.append(r"\text{repeat } " + str(it["loop"]) + r"\times:")
                sched(it.get("schedule") or [], prefix + r"\quad ")
            else:
                for f, e in it["writes"].items():
                    lines.append(prefix + f"{f} \\leftarrow " + latex(e))

    sched(ir.get("schedule") or [])
    lines.append(r"\mathrm{rgb} = " + latex(ir["output"]))
    return "\\begin{aligned}\n" + " \\\\\n".join("& " + ln for ln in lines) + "\n\\end{aligned}\n"


# ------------------------------------------------------------------ Operator library


class OpLib:
    def __init__(self, path):
        self.path = path
        self.data = {"version": 1, "ops": {}}
        if path.exists():
            self.data = json.loads(path.read_text())

    def save(self):
        tmp = self.path.with_suffix(".tmp")
        tmp.write_text(json.dumps(self.data, indent=2, sort_keys=True))
        tmp.replace(self.path)

    def list(self):
        return [{"name": k, "args": v["args"], "origin": v.get("origin"), "wins": v.get("wins", 0),
                 "description": v.get("description", "")} for k, v in sorted(self.data["ops"].items())]

    def get(self, name):
        if name not in self.data["ops"]:
            raise EqartError(f"no library op {name!r}")
        return self.data["ops"][name]

    def add(self, name, opdef: dict, origin="llm", description=""):
        if name in ALL_OPS:
            raise EqartError(f"{name} shadows a core op")
        probe = {"ir": "eqart-ir/2", "canvas": {"width": 4, "height": 4},
                 "opdefs": {name: opdef}, "output": [name, *([0.0] * len(opdef.get("args", [])))]}
        # allow references to other library ops
        for dep, od in self.data["ops"].items():
            if dep != name:
                probe["opdefs"].setdefault(dep, {"args": od["args"], "body": od["body"]})
        rep = validate(probe)
        if not rep.ok:
            raise EqartError("invalid opdef: " + "; ".join(rep.errors))
        h = hashlib.sha256(json.dumps(opdef, sort_keys=True).encode()).hexdigest()[:16]
        self.data["ops"][name] = {"args": opdef["args"], "body": opdef["body"], "origin": origin,
                                  "hash": h, "added": time.strftime("%Y-%m-%d"), "wins": 0,
                                  "description": description}
        self.save()
        return self.data["ops"][name]

    def import_into(self, ir: dict, names: list) -> dict:
        ir = copy.deepcopy(ir)
        ods = ir.setdefault("opdefs", {})
        todo = list(names)
        while todo:
            n = todo.pop()
            if n in ods:
                continue
            od = self.get(n)
            ods[n] = {"args": od["args"], "body": od["body"], "origin": od.get("origin", "library")}
            # pull transitive deps
            s = json.dumps(od["body"])
            todo.extend(k for k in self.data["ops"] if f'"{k}"' in s and k not in ods)
        return ir
