"""CLI fallback for clients without MCP: same functions as the MCP tools."""
from __future__ import annotations

import argparse
import json
import sys

from . import bits as bits_mod
from . import metrics as metrics_mod
from .ir import validate
from .render import render
from .tools_misc import latex_program


def _load(p):
    with open(p) as f:
        return json.load(f)


def main(argv=None):
    ap = argparse.ArgumentParser(prog="eqart")
    sub = ap.add_subparsers(dest="cmd", required=True)
    v = sub.add_parser("validate"); v.add_argument("ir")
    r = sub.add_parser("render"); r.add_argument("ir"); r.add_argument("--out-dir")
    r.add_argument("--width", type=int); r.add_argument("--height", type=int)
    r.add_argument("--precision", default="f32", choices=["f32", "f64"])
    r.add_argument("--snapshot-every", type=int, default=0); r.add_argument("--timeout", type=float, default=120)
    m = sub.add_parser("metrics"); m.add_argument("candidate"); m.add_argument("--target"); m.add_argument("--ir")
    b = sub.add_parser("bits"); b.add_argument("ir")
    lx = sub.add_parser("latex"); lx.add_argument("ir")
    ex = sub.add_parser("export"); ex.add_argument("ir"); ex.add_argument("--format", default="webgpu",
        choices=["webgpu", "webgl", "html", "wgsl", "glsl", "latex", "json-min", "decoded"]); ex.add_argument("--out-dir")
    fr = sub.add_parser("fractal"); fr.add_argument("spec", help="preset name or path to a spec .json")
    fr.add_argument("--out-dir"); fr.add_argument("--size", type=int); fr.add_argument("--cross-check", action="store_true")
    sub.add_parser("presets")
    ft = sub.add_parser("fit"); ft.add_argument("path"); ft.add_argument("--family", default="auto")
    ft.add_argument("--budget", type=float, default=30.0); ft.add_argument("--n-maps", type=int); ft.add_argument("--out-dir")
    jd = sub.add_parser("judge"); jd.add_argument("candidate"); jd.add_argument("--previous"); jd.add_argument("--target")
    jd.add_argument("--goal"); jd.add_argument("--judge", default="auto", choices=["auto", "jev", "metrics", "host", "perceptual"])
    a = ap.parse_args(argv)
    if a.cmd == "validate":
        out = validate(_load(a.ir)).as_dict()
    elif a.cmd == "render":
        out = render(_load(a.ir), a.out_dir, a.width, a.height, a.precision, a.snapshot_every, timeout_s=a.timeout)
    elif a.cmd == "metrics":
        out = {}
        cand = metrics_mod.load_rgb(a.candidate)
        if a.target:
            tgt = metrics_mod.load_rgb(a.target)
            if tgt.shape != cand.shape:
                cand = metrics_mod.load_rgb(a.candidate, size=(tgt.shape[1], tgt.shape[0]))
            out["fidelity"] = metrics_mod.compare(cand, tgt)
            out["codec_refs"] = metrics_mod.codec_references(tgt)
        if a.ir:
            out["bits"] = bits_mod.account(_load(a.ir))
    elif a.cmd == "bits":
        out = bits_mod.account(_load(a.ir))
    elif a.cmd == "export":
        from .mcp_server import export_program
        out = export_program(_load(a.ir), [a.format], a.out_dir)
    elif a.cmd == "fractal":
        from .mcp_server import fractal_render
        spec = _load(a.spec) if a.spec.endswith(".json") else {"preset": a.spec}
        if a.size:
            spec["size"] = a.size
        out = fractal_render(spec, a.out_dir, a.cross_check)
    elif a.cmd == "presets":
        from .fractal import presets
        out = presets()
    elif a.cmd == "fit":
        from .mcp_server import fractal_fit
        out = fractal_fit(a.path, a.family, a.budget, a.n_maps, a.out_dir)
    elif a.cmd == "judge":
        from .judge import judge
        out = judge(a.candidate, a.previous, a.target, a.goal, a.judge)
    else:
        sys.stdout.write(latex_program(_load(a.ir)))
        return 0
    json.dump(out, sys.stdout, indent=1)
    sys.stdout.write("\n")
    return 0 if out.get("ok", True) else 1


if __name__ == "__main__":
    sys.exit(main())
