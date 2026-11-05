import os

import numpy as np
import pytest

from eqart import fractal as F
from eqart import fractal_fit as FF
from eqart.interp import run_program
from eqart.ir import validate
from eqart.metrics import ssim

SLOW = os.environ.get("EQART_SLOW") == "1"


def test_eighteen_presets_four_families():
    p = F.presets()
    assert len(p) == 18
    assert {v["family"] for v in p.values()} == set(F.FAMILIES)


@pytest.mark.parametrize("name", sorted(F.PRESETS))
def test_preset_renders_all_outputs(name):
    r = F.render_spec({"preset": name, "size": 96})
    assert r["svg"].startswith("<svg") and "eqart-fractal" in r["svg"]
    assert r["flat_svg"].startswith("<svg")
    assert r["rgb"].shape == (96, 96, 3)
    assert r["rgb"].std() > 5, "render is blank"
    assert r["instances"] <= F.MAX_INSTANCES
    assert "vector-effect" not in r["svg"]
    if F.PRESETS[name]["family"] != "escape":
        assert r["generative"] and len(r["svg"]) < 12_000
    if r["ir"] is not None:
        rep = validate(r["ir"])
        assert rep.ok, rep.as_dict()


def test_scale_balanced_fern_and_cap():
    r = F.render_spec({"preset": "barnsley_fern", "size": 64}, want=("svg",))
    assert 20_000 < r["instances"] <= F.MAX_INSTANCES
    assert len(r["svg"]) < 12_000


def test_binary_doubling_spiral_log_size():
    small = F.render_spec({"preset": "nautilus", "levels": 16, "size": 64}, want=("svg",))
    big = F.render_spec({"preset": "nautilus", "levels": 1024, "size": 64}, want=("svg",))
    assert big["instances"] == 1024
    assert len(big["svg"]) < len(small["svg"]) + 1200  # grows with log2(depth)


@pytest.mark.parametrize("name", ["barnsley_fern", "koch_snowflake", "golden_spiral", "julia_dendrite", "plant_b"])
def test_exact_svg_roundtrip(name):
    r = F.render_spec({"preset": name, "size": 96})
    for svg in (r["svg"], r["flat_svg"]):
        out = FF.fit_svg(svg)
        assert out["exact"] is True
        assert out["best"]["spec"]["family"] == F.PRESETS[name]["family"]


def test_escape_ir_matches_family_render():
    r = F.render_spec({"preset": "julia_rabbit", "size": 64})
    img, _ = run_program(r["ir"], width=64, height=64)
    inside_ir = img.sum(-1) == 0
    cnt, n = F.escape_counts(r["spec"], 64, 64)
    assert FF.overlap(inside_ir, cnt >= n) > 0.8


@pytest.mark.parametrize("name", ["sierpinski_triangle", "sierpinski_carpet", "koch_curve", "golden_spiral"])
def test_ifs_ir_program_draws_attractor(name):
    r = F.render_spec({"preset": name, "size": 128})
    img, _ = run_program(r["ir"], width=128, height=128)
    fg = img.mean(-1) < 200
    assert 0.005 < fg.mean() < 0.7


def test_resvg_cross_check():
    pytest.importorskip("resvg_py")
    for name in ("heighway_dragon", "koch_curve", "mandelbrot", "pythagoras_tree"):
        r = F.render_spec({"preset": name, "size": 192})
        rv = F.resvg_rgb(r["svg"], 192)
        assert rv.shape == r["rgb"].shape
        assert ssim(rv.astype(float), r["rgb"].astype(float)) > 0.8, name


def test_foreign_svg_is_rasterized_and_fitted():
    pytest.importorskip("resvg_py")
    svg = ('<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><rect width="128" height="128" fill="#fff"/>'
           '<path d="M10 118 L64 10 L118 118 Z" fill="#000"/></svg>')
    out = FF.fit_svg(svg, family="lsystem", budget_s=2)
    assert out["exact"] is False and out["method"].startswith("resvg")
    assert 0 <= out["best"]["overlap"] <= 1


def test_quick_julia_fit():
    r = F.render_spec({"preset": "julia_rabbit", "size": 128}, want=("png",))
    out = FF.fit_image(r["rgb"], family="escape", budget_s=3)
    assert out["best"]["family"] == "escape"
    assert out["best"]["overlap"] > 0.6


def test_quick_lsystem_fit():
    r = F.render_spec({"preset": "plant_a", "size": 128}, want=("png",))
    out = FF.fit_image(r["rgb"], family="lsystem", budget_s=5)
    assert out["best"]["spec"]["preset"] == "plant_a"


@pytest.mark.slow
@pytest.mark.skipif(not SLOW, reason="set EQART_SLOW=1 for long raster fits")
def test_slow_sierpinski_ifs_fit():
    r = F.render_spec({"preset": "sierpinski_triangle", "size": 256}, want=("png",))
    out = FF.fit_image(r["rgb"], family="ifs", budget_s=30, n_maps=3)
    assert out["best"]["overlap"] > 0.8


@pytest.mark.slow
@pytest.mark.skipif(not SLOW, reason="set EQART_SLOW=1 for long raster fits")
def test_slow_auto_fit_dragon():
    r = F.render_spec({"preset": "heighway_dragon", "size": 256}, want=("png",))
    out = FF.fit_image(r["rgb"], family="auto", budget_s=40)
    assert out["best"]["overlap"] > 0.6
