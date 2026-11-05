"""eqart MCP server (stdio). Tools return file paths + JSON; never inline images by default."""
from __future__ import annotations

import functools
import json
from importlib import resources
from pathlib import Path
from typing import Any

from fastmcp import FastMCP

from . import bits as bits_mod
from . import metrics as metrics_mod
from .interp import ALL_OPS, ARITY, EqartError
from .ir import validate
from .render import confine, home, render
from .tools_misc import OpLib, apply_patch, latex_program
from . import fractal as fractal_mod
from . import fractal_fit as fit_mod
from . import judge as judge_mod
from . import jev as jev_mod
from . import webgpu as webgpu_mod

mcp = FastMCP(
    "eqart",
    instructions=(
        "Equation-art runtime. Programs are eqart-ir/2 JSON (read eqart://grammar). "
        "Always eqart_validate before eqart_render. Renders return png_path: open that file to look at it. "
        "Edit programs with eqart_patch (RFC 6902) rather than rewriting them."
    ),
)


def _load_ir(ir: Any) -> dict:
    if isinstance(ir, str):
        s = ir.strip()
        if s.startswith("{"):
            return json.loads(s)
        p = Path(s).expanduser()
        if p.suffix == ".json" and p.exists():
            if p.stat().st_size > 512 * 2 ** 20:
                raise EqartError("IR file larger than 512 MiB")
            return json.loads(p.read_text())
        raise EqartError("ir must be a JSON object, JSON string, or path to a .json file")
    if isinstance(ir, dict):
        return ir
    raise EqartError("ir must be an object")


def _guard(fn):
    @functools.wraps(fn)
    def wrapper(*a, **k):
        try:
            return fn(*a, **k)
        except (EqartError, ValueError, json.JSONDecodeError) as e:
            return {"ok": False, "errors": [str(e)]}
    return wrapper


@mcp.tool
@_guard
def eqart_validate(ir: dict | str, width: int | None = None, height: int | None = None) -> dict:
    """Statically check an eqart-ir/2 program: schema, scopes, opdef DAG, limits, CFL warnings, cost estimate."""
    return validate(_load_ir(ir), width=width, height=height).as_dict()


@mcp.tool
@_guard
def eqart_render(ir: dict | str, out_dir: str | None = None, width: int | None = None,
                 height: int | None = None, precision: str = "f32", snapshot_every: int = 0,
                 timeout_s: float = 120.0, save_ir: bool = True) -> dict:
    """Render a program to PNG in a sandboxed subprocess. out_dir must be under EQART_HOME or inside a
    '.eqart' directory (e.g. <workspace>/.eqart/runs/<id>). snapshot_every=N writes a PNG every N steps."""
    data = _load_ir(ir)
    if precision not in ("f32", "f64"):
        raise EqartError("precision must be f32 or f64")
    res = render(data, out_dir, width, height, precision, snapshot_every, timeout_s=min(timeout_s, 900))
    if res.get("ok") and save_ir:
        Path(res["png_path"]).with_name("program.json").write_text(json.dumps(data, indent=1))
    return res


@mcp.tool
@_guard
def eqart_metrics(candidate_png: str, target_png: str | None = None, ir: dict | str | None = None,
                  codec_refs: bool = True) -> dict:
    """Fidelity (PSNR, SSIM, MS-SSIM, gradient L1; no learned weights) vs a target, bit accounting for the
    program, and PNG/JPEG/WebP reference sizes. A result whose bits ≥ the target's PNG size is labelled 'storage'."""
    out: dict = {"ok": True}
    cand = metrics_mod.load_rgb(candidate_png)
    if target_png:
        tgt = metrics_mod.load_rgb(target_png)
        if tgt.shape != cand.shape:
            cand = metrics_mod.load_rgb(candidate_png, size=(tgt.shape[1], tgt.shape[0]))
            out["note"] = "candidate resized to target size"
        out["fidelity"] = metrics_mod.compare(cand, tgt)
        if codec_refs:
            out["codec_refs"] = metrics_mod.codec_references(tgt)
    if ir is not None:
        b = bits_mod.account(_load_ir(ir))
        out["bits"] = b
        if target_png and codec_refs:
            out["storage"] = b["total_bytes"] >= out["codec_refs"]["png_bytes"]
    return out


@mcp.tool
@_guard
def eqart_patch(ir: dict | str, patch: list[dict]) -> dict:
    """Apply an RFC 6902 JSON Patch to a program and validate the result. Returns the patched IR."""
    new = apply_patch(_load_ir(ir), patch)
    return {"ok": True, "ir": new, "validation": validate(new).as_dict()}


def export_program(data: dict, targets: list[str], out_dir: str | None = None) -> dict:
    out = confine(out_dir)
    files: dict = {}
    extra: dict = {}
    for t in targets:
        if t == "latex":
            p = out / "program.tex"
            p.write_text(latex_program(data))
        elif t == "json-min":
            p = out / "program.min.json"
            p.write_text(json.dumps(data, separators=(",", ":")))
        elif t == "decoded":
            p = out / "program.decoded.json"
            p.write_text(json.dumps(bits_mod.decoded(data), separators=(",", ":")))
        elif t in ("html", "webgl", "webgpu", "wgsl", "glsl"):
            if "html" in files:
                continue
            sh = webgpu_mod.build_shaders(data)
            tex = None
            if sh["mode"] == "texture":
                res = render(data, str(out / "texture"), timeout_s=300)
                if not res.get("ok"):
                    return {"ok": False, "errors": ["texture render failed"] + res.get("errors", []), "files": files}
                tex = Path(res["png_path"]).read_bytes()
            r = webgpu_mod.export_viewer(data, out, texture_png=tex)
            files.update(r["files"])
            extra = {"viewer_mode": r["mode"], "fallback_reason": r["reason"], "sdf_height": r["sdf"]}
            continue
        else:
            return {"ok": False, "errors": [f"unknown target {t}"], "files": files}
        files[t] = str(p)
    return {"ok": True, "files": files, **extra}


@mcp.tool
@_guard
def eqart_export(ir: dict | str, targets: list[str], out_dir: str | None = None) -> dict:
    """Export a program. targets: latex, json-min, decoded (params quantized as a decoder sees them),
    html | webgl | webgpu | wgsl | glsl (all write viewer.html + program.wgsl + program.frag.glsl: a
    self-contained WebGPU-first / WebGL2-fallback viewer with 2D and 3D height-field raymarch views).
    Closed-form programs are transpiled to shaders; field programs are rendered once and shown as a texture."""
    return export_program(_load_ir(ir), targets, out_dir)


@mcp.tool
@_guard
def eqart_fractal_presets() -> dict:
    """List the 18 fractal presets (families: ifs, lsystem, spiral, escape)."""
    return {"ok": True, "presets": fractal_mod.presets(), "families": list(fractal_mod.FAMILIES),
            "max_instances": fractal_mod.MAX_INSTANCES}


def fractal_render(spec, out_dir=None, cross_check=False) -> dict:
    r = fractal_mod.render_spec(spec)
    out = confine(out_dir)
    files = {"svg": out / "fractal.svg", "flat_svg": out / "fractal.flat.svg", "png": out / "fractal.png"}
    files["svg"].write_text(r["svg"])
    files["flat_svg"].write_text(r["flat_svg"])
    png = fractal_mod.png_bytes(r["rgb"])
    files["png"].write_bytes(png)
    res = {"ok": True, "family": r["family"], "generative": r["generative"], "instances": r["instances"],
           "depth": r.get("depth"), "bytes": {"svg": len(r["svg"].encode()), "flat_svg": len(r["flat_svg"].encode()),
                                             "png": len(png)}, "note": r.get("note") or r.get("ir_note")}
    if r.get("ir"):
        files["ir"] = out / "program.json"
        files["ir"].write_text(json.dumps(r["ir"], indent=1))
    res["files"] = {k: str(v) for k, v in files.items()}
    res["png_path"] = str(files["png"])
    if cross_check:
        try:
            rv = fractal_mod.resvg_rgb(r["svg"], r["spec"]["size"])
            res["resvg_ssim"] = round(metrics_mod.ssim(rv.astype(float), r["rgb"].astype(float)), 4)
        except EqartError as e:
            res["resvg_ssim"] = None
            res["cross_check_error"] = str(e)
    return res


@mcp.tool
@_guard
def eqart_fractal_render(spec: dict | str, out_dir: str | None = None, cross_check: bool = False) -> dict:
    """Render a fractal preset name or spec ({"preset": "barnsley_fern", "size": 512, ...} or a full
    {"family": "ifs"|"lsystem"|"spiral"|"escape", ...}) to a generative SVG, a flattened SVG, a PNG and an
    eqart-ir/2 program (when one exists). cross_check=True re-renders the generative SVG with resvg
    (extra 'svg') and reports SSIM against the plugin's own raster."""
    return fractal_render(spec, out_dir, cross_check)


def fractal_fit(path: str, family: str = "auto", budget_s: float = 30.0, n_maps: int | None = None,
                out_dir: str | None = None) -> dict:
    """Fit a fractal to an image (.png/.jpg) or SVG. SVGs written by this plugin round-trip exactly from
    their embedded spec; other SVGs are rasterized with resvg (extra 'svg') then fitted. family: auto | ifs |
    lsystem | escape (Julia only). Returns the best spec, overlap (tolerant IoU) and renders it."""
    p = Path(path).expanduser()
    if not p.is_file():
        raise EqartError(f"no such file {p}")
    if p.stat().st_size > 64 * 2 ** 20:
        raise EqartError("input larger than 64 MiB")
    budget_s = float(max(1.0, min(budget_s, 600.0)))
    if p.suffix.lower() in (".svg", ".svgz"):
        res = fit_mod.fit_svg(p.read_text(), family=family, budget_s=budget_s, n_maps=n_maps)
    else:
        res = fit_mod.fit_image(str(p), family=family, budget_s=budget_s, n_maps=n_maps)
    spec = res["best"]["spec"]
    res["render"] = fractal_render(spec, out_dir)
    return res


@mcp.tool
@_guard
def eqart_fractal_fit(path: str, family: str = "auto", budget_s: float = 30.0, n_maps: int | None = None,
                      out_dir: str | None = None) -> dict:
    """Fit a fractal to an image (.png/.jpg) or SVG. SVGs written by this plugin round-trip exactly from
    their embedded spec; other SVGs are rasterized with resvg (extra 'svg') then fitted. family: auto | ifs |
    lsystem | escape (Julia only). Returns the best spec, overlap (tolerant IoU) and renders it."""
    return fractal_fit(path, family, budget_s, n_maps, out_dir)


@mcp.tool
@_guard
def eqart_judge(candidate_png: str, previous_png: str | None = None, target_png: str | None = None,
                goal: str | None = None, judge: str = "auto") -> dict:
    """Decide whether an improvement iteration helped. judge: auto (Jev when TYPESAFE_API_KEY is set, else
    weight-free metrics when a target is given, else the host agent critiques) | jev | metrics | host |
    perceptual (opt-in 'weights' extra). Returns decision accept/revise/reject and, with Jev, a focus box.
    Recommendation only: never applies changes."""
    if judge not in ("auto", "jev", "metrics", "host", "perceptual"):
        raise EqartError("judge must be auto, jev, metrics, host or perceptual")
    for f in (candidate_png, previous_png, target_png):
        if f and not Path(f).expanduser().is_file():
            raise EqartError(f"no such file {f}")
    return judge_mod.judge(candidate_png, previous_png, target_png, goal, judge)


@mcp.tool
@_guard
def eqart_oplib(action: str, name: str | None = None, opdef: dict | None = None,
                description: str = "", ir: dict | str | None = None,
                names: list[str] | None = None) -> dict:
    """Persistent library of invented operators. action: list | get | add (name + opdef {args, body}) |
    import (copy named ops and their deps into an IR's opdefs so the program stays self-contained)."""
    lib = OpLib(home() / "oplib.json")
    if action == "list":
        return {"ok": True, "ops": lib.list()}
    if action == "get":
        return {"ok": True, "op": lib.get(name or "")}
    if action == "add":
        if not name or not opdef:
            raise EqartError("add needs name and opdef")
        return {"ok": True, "op": lib.add(name, opdef, origin=opdef.get("origin", "llm"), description=description)}
    if action == "import":
        if ir is None or not names:
            raise EqartError("import needs ir and names")
        return {"ok": True, "ir": lib.import_into(_load_ir(ir), names)}
    raise EqartError(f"unknown action {action}")


@mcp.tool
@_guard
def eqart_setup(extras: list[str] | None = None) -> dict:
    """Report installed optional extras and the command to add more (fit, basis, gpu-preview, evolve, svg,
    weights), whether a Jev key is configured (boolean only, never the key) and whether EQART_WEIGHTS is on."""
    have = {}
    for mod, extra in (("jax", "fit"), ("pywt", "basis"), ("wgpu", "gpu-preview"), ("openevolve", "evolve"),
                       ("resvg_py", "svg"), ("lpips", "weights")):
        try:
            __import__(mod)
            have[extra] = True
        except ImportError:
            have[extra] = False
    want = extras or [k for k, v in have.items() if not v]
    cmd = "uv sync --project <plugin>/server " + " ".join(f"--extra {e}" for e in want) if want else None
    return {"ok": True, "installed": have, "eqart_home": str(home()),
            "jev_available": jev_mod.available(), "weights_enabled": judge_mod.weights_enabled(),
            "install_command": cmd, "note": "Run the command yourself after confirming with the user."}


# ---------------------------------------------------------------- resources

def _examples_dir():
    return resources.files("eqart") / "examples"


@mcp.resource("eqart://grammar", mime_type="text/markdown")
def grammar() -> str:
    return (resources.files("eqart") / "GRAMMAR.md").read_text()


@mcp.tool
def eqart_grammar() -> str:
    """Return the eqart-ir/2 grammar reference (same as resource eqart://grammar), for clients without resources."""
    return grammar()


@mcp.resource("eqart://ops", mime_type="application/json")
def ops() -> str:
    lib = OpLib(home() / "oplib.json")
    core = {k: {"arity": ARITY.get(k)} for k in sorted(ALL_OPS)}
    return json.dumps({"core": core, "library": lib.list()}, indent=1)


@mcp.resource("eqart://examples/{name}", mime_type="application/json")
def example(name: str) -> str:
    p = _examples_dir() / f"{name}.json"
    if not p.is_file():
        avail = sorted(f.name[:-5] for f in _examples_dir().iterdir() if f.name.endswith(".json"))
        raise EqartError(f"no example {name}; available: {avail}")
    return p.read_text()


@mcp.tool
@_guard
def eqart_examples(name: str | None = None) -> dict:
    """List bundled example programs, or return one program by name (also at eqart://examples/{name})."""
    if name:
        return {"ok": True, "ir": json.loads(example(name))}
    out = {}
    for f in sorted(_examples_dir().iterdir()):
        if f.name.endswith(".json"):
            meta = json.loads(f.read_text()).get("meta", {})
            out[f.name[:-5]] = meta.get("title", "")
    return {"ok": True, "examples": out}


def main():
    mcp.run()


if __name__ == "__main__":
    main()
