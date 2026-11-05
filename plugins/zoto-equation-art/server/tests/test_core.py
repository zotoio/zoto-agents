import hashlib
import json
import math
from importlib import resources

import numpy as np
import pytest

from eqart import bits
from eqart.interp import EqartError, run_program
from eqart.ir import Limits, validate
from eqart.metrics import compare, psnr
from eqart.render import confine, render
from eqart.tools_misc import OpLib, apply_patch, latex_program

EX = resources.files("eqart") / "examples"


def ex(name):
    return json.loads((EX / f"{name}.json").read_text())


def prog(output, **kw):
    d = {"ir": "eqart-ir/2", "canvas": {"width": 16, "height": 8}, "output": output}
    d.update(kw)
    return d


# ---------------------------------------------------------------- validator

@pytest.mark.parametrize("name", ["gray_scott", "life", "mandelbrot", "sdf_badge", "yeganeh_grove"])
def test_examples_validate(name):
    r = validate(ex(name))
    assert r.ok, r.errors


def test_unknown_op_and_name():
    r = validate(prog(["frobnicate", "x"]))
    assert not r.ok and "unknown operator" in r.errors[0]
    r = validate(prog(["add", "x", "zz"]))
    assert not r.ok and "unknown name" in r.errors[0]


def test_opdef_cycle_rejected():
    d = prog(["a", "x"], opdefs={"a": {"args": ["v"], "body": ["b", "v"]},
                                 "b": {"args": ["v"], "body": ["a", "v"]}})
    assert any("cycle" in e for e in validate(d).errors)


def test_opdef_scope_is_closed():
    d = prog(["f", "x"], opdefs={"f": {"args": ["v"], "body": ["add", "v", "q"]}})
    assert any("unknown name" in e for e in validate(d).errors)


def test_cost_budget():
    d = prog(["sum_i", "s", 1, 10000, ["sin", ["mul", "s", "x"]]])
    assert not validate(d, limits=Limits(max_cost=1e5)).ok


def test_cfl_warning():
    d = prog(["tap", "U", 0, 0], fields={"U": {"channels": 1}},
             schedule=[{"writes": {"U": ["add", ["tap", "U", 0, 0], ["mul", 0.4, ["lap", "U"]]]}}])
    r = validate(d)
    assert r.ok and any("CFL" in w for w in r.warnings)


def test_iterate_undeclared_state():
    d = prog(["iterate", 3, {"z": 0}, {"w": 1}, "z"])
    assert any("undeclared" in e for e in validate(d).errors)


# ---------------------------------------------------------------- interpreter semantics

def test_coordinates_centered_y_up():
    img, _ = run_program(prog(["vec", ["gt", "x", 0], ["gt", "y", 0], 0]))
    assert img[0, -1, 0] == 255 and img[0, -1, 1] == 255   # top-right: x>0, y>0
    assert img[-1, 0, 0] == 0 and img[-1, 0, 1] == 0       # bottom-left


def test_softmask_and_sawtooth():
    d = prog(["vec", ["softmask", "x", 1000], ["div", ["add", ["sawtooth", ["mul", 7, "x"]], 1.5708], 3.1416], 0])
    img, _ = run_program(d)
    assert img[4, 0, 0] == 255 and img[4, -1, 0] == 0


def test_tap_wrap_and_jacobi():
    # shift right by one each step on a wrapped field: after W steps we are back where we started
    d = {"ir": "eqart-ir/2", "canvas": {"width": 8, "height": 2},
         "fields": {"A": {"channels": 1, "boundary": "wrap", "init": ["eq", "px", 0]}},
         "schedule": [{"writes": {"A": ["tap", "A", -1, 0]}, "repeat": 8}],
         "output": ["tap", "A", 0, 0]}
    img, info = run_program(d)
    assert info["steps"] == 8 and img[0, 0, 0] == 255 and img[0, 1:, 0].max() == 0
    d["schedule"][0]["repeat"] = 3
    img, _ = run_program(d)
    assert img[0, 3, 0] == 255


def test_tap_dy_is_up():
    d = {"ir": "eqart-ir/2", "canvas": {"width": 2, "height": 4},
         "fields": {"A": {"channels": 1, "boundary": "zero", "init": ["eq", "py", 3]}},
         "schedule": [{"writes": {"A": ["tap", "A", 0, -1]}}],   # value from the row below moves up
         "output": ["tap", "A", 0, 0]}
    img, _ = run_program(d)
    assert img[2, 0, 0] == 255 and img[3, 0, 0] == 0


def test_life_blinker():
    d = ex("life")
    d["canvas"] = {"width": 5, "height": 5}
    d["fields"]["A"]["init"] = ["mul", ["eq", "py", 2], ["ge", "px", 1], ["le", "px", 3]]
    d["schedule"][0]["repeat"] = 1
    img, _ = run_program(d)
    col = img[:, 2, 0] > 0
    assert col.tolist() == [False, True, True, True, False]
    assert (img[:, :, 0] > 0).sum() == 3


def test_iterate_escape_counts():
    d = prog(["div", ["iterate", 50, {"z": 0}, {"z": ["add", "z", 1]}, "_n", ["ge", "z", 10]], 50])
    img, _ = run_program(d)
    assert abs(int(img[0, 0, 0]) - round(10 / 50 * 255)) <= 1


def test_matvec_and_params():
    d = prog(["matvec", "$W", ["vec", 1, 0.5], "$b"],
             params={"W": {"value": [[0.2, 0.4], [0.0, 1.0], [1.0, 0.0]]}, "b": {"value": [0.1, 0.0, -0.5]}})
    img, _ = run_program(d)
    assert tuple(img[0, 0]) == (round(0.5 * 255), round(0.5 * 255), round(0.5 * 255))


def test_conv_matches_lap():
    base = {"ir": "eqart-ir/2", "canvas": {"width": 12, "height": 12},
            "fields": {"A": {"channels": 1, "boundary": "wrap", "init": ["hash", "px", "py", 3]},
                       "B": {"channels": 1, "boundary": "wrap"}},
            "params": {"K": {"value": [[0, 1, 0], [1, -4, 1], [0, 1, 0]]}}}
    d1 = dict(base, schedule=[{"writes": {"B": ["add", 0.5, ["mul", 0.1, ["lap", "A"]]]}}], output=["tap", "B", 0, 0])
    d2 = dict(base, schedule=[{"writes": {"B": ["add", 0.5, ["mul", 0.1, ["conv", "A", "$K"]]]}}], output=["tap", "B", 0, 0])
    a, _ = run_program(d1, precision="f64")
    b, _ = run_program(d2, precision="f64")
    assert np.array_equal(a, b)


def test_sample_lowres_field():
    d = {"ir": "eqart-ir/2", "canvas": {"width": 32, "height": 32},
         "fields": {"L": {"channels": 1, "res": [4, 4], "boundary": "clamp", "init": ["gt", "x", 0]}},
         "output": ["sample", "L", "x", "y"]}
    img, _ = run_program(d)
    assert img[16, 0, 0] == 0 and img[16, -1, 0] == 255 and 0 < img[16, 16, 0] < 255


def test_hash_deterministic_uniform():
    d = prog(["hash", "px", "py", 11])
    d["canvas"] = {"width": 64, "height": 64}
    a, _ = run_program(d)
    b, _ = run_program(d)
    assert np.array_equal(a, b)
    assert 100 < a.mean() < 155


def test_nonfinite_aborts():
    d = {"ir": "eqart-ir/2", "canvas": {"width": 4, "height": 4},
         "fields": {"A": {"channels": 1, "init": 1}},
         "schedule": [{"id": "blowup", "writes": {"A": ["exp", ["mul", 800, ["tap", "A", 0, 0]]]}, "repeat": 3}],
         "output": ["tap", "A", 0, 0]}
    with pytest.raises(EqartError, match="non-finite"):
        run_program(d, precision="f32")


def test_gray_scott_golden_short():
    d = ex("gray_scott")
    d["schedule"][0]["loop"] = 200
    img, info = run_program(d, precision="f64")
    assert info["steps"] == 200 and info["nonfinite_fraction"] == 0
    h = hashlib.sha256(img.tobytes()).hexdigest()
    img2, _ = run_program(d, precision="f64")
    assert hashlib.sha256(img2.tobytes()).hexdigest() == h


# ---------------------------------------------------------------- bits, metrics, patch, latex, oplib

def test_bits_and_decoded():
    rng = np.random.default_rng(0)
    d = prog(["matvec", "$W", ["vec", "x", "y"]], params={"W": {"value": rng.normal(size=(3, 2)).tolist(), "quant": 6}})
    b = bits.account(d)
    assert b["total_bits"] == b["structure_bits"] + b["param_bits"] + b["header_bits"]
    dec = bits.decoded(d)
    assert np.max(np.abs(np.array(dec["params"]["W"]["value"]) - np.array(d["params"]["W"]["value"]))) < 0.1


def test_metrics_identity():
    a = (np.random.default_rng(1).random((32, 32, 3)) * 255).astype(np.uint8)
    m = compare(a, a)
    assert m["identical"] and m["psnr"] == 100.0 and m["ssim"] > 0.999 and m["ms_ssim"] > 0.999


def test_patch_roundtrip():
    d = ex("gray_scott")
    p = apply_patch(d, [{"op": "replace", "path": "/params/f/value", "value": 0.03},
                        {"op": "add", "path": "/meta/note", "value": "x"}])
    assert p["params"]["f"]["value"] == 0.03 and d["params"]["f"]["value"] != 0.03


def test_latex_runs():
    for n in ("gray_scott", "yeganeh_grove", "mandelbrot"):
        assert "\\begin{aligned}" in latex_program(ex(n))


def test_oplib_add_import(tmp_path):
    lib = OpLib(tmp_path / "oplib.json")
    lib.add("ring", {"args": ["x", "y", "r"], "body": ["abs", ["sub", ["len", ["vec", "x", "y"]], "r"]]})
    lib.add("glow", {"args": ["x", "y"], "body": ["exp", ["neg", ["mul", 20, ["ring", "x", "y", 0.5]]]]})
    d = lib.import_into(prog(["glow", "x", "y"]), ["glow"])
    assert set(d["opdefs"]) == {"glow", "ring"} and validate(d).ok
    with pytest.raises(EqartError):
        lib.add("sin", {"args": ["x"], "body": "x"})


# ---------------------------------------------------------------- render, sandbox, confinement

def test_render_cache_and_confinement(tmp_path, monkeypatch):
    monkeypatch.setenv("EQART_HOME", str(tmp_path / "home"))
    d = ex("sdf_badge")
    r1 = render(d, out_dir=str(tmp_path / "proj" / ".eqart" / "r1"))
    assert r1["ok"] and not r1["cache_hit"], r1
    r2 = render(d, out_dir=str(tmp_path / "proj" / ".eqart" / "r2"))
    assert r2["cache_hit"]
    with pytest.raises(EqartError):
        confine(str(tmp_path / "elsewhere"))


def test_render_timeout(tmp_path, monkeypatch):
    monkeypatch.setenv("EQART_HOME", str(tmp_path))
    d = {"ir": "eqart-ir/2", "canvas": {"width": 512, "height": 512},
         "output": ["iterate", 10000, {"z": 0}, {"z": ["sin", ["add", "z", "x"]]}, "z"]}
    r = render(d, timeout_s=1.0, use_cache=False)
    assert not r["ok"] and "timed out" in r["errors"][0]


def test_render_reports_runtime_error(tmp_path, monkeypatch):
    monkeypatch.setenv("EQART_HOME", str(tmp_path))
    d = {"ir": "eqart-ir/2", "canvas": {"width": 8, "height": 8},
         "fields": {"A": {"channels": 1, "init": 1}},
         "schedule": [{"id": "boom", "writes": {"A": ["exp", ["mul", 800, ["tap", "A", 0, 0]]]}, "repeat": 3}],
         "output": ["tap", "A", 0, 0]}
    r = render(d, use_cache=False)
    assert not r["ok"] and "non-finite" in r["errors"][0]


def test_no_eval_exec_in_source():
    import pathlib
    import eqart
    root = pathlib.Path(eqart.__file__).parent
    for f in root.glob("*.py"):
        src = f.read_text()
        assert "eval(" not in src.replace("evaluate(", "").replace("_eval(", ""), f
        assert "exec(" not in src, f
