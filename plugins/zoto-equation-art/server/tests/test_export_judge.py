import json
from importlib import resources

import numpy as np
import pytest
from PIL import Image

from eqart import jev, judge, webgpu
from eqart.cli import main as cli_main
from eqart.mcp_server import export_program, fractal_render

EX = resources.files("eqart") / "examples"


def ex(name):
    return json.loads((EX / f"{name}.json").read_text())


@pytest.fixture(autouse=True)
def home(tmp_path, monkeypatch):
    monkeypatch.setenv("EQART_HOME", str(tmp_path / "home"))
    monkeypatch.delenv("TYPESAFE_API_KEY", raising=False)
    monkeypatch.delenv("EQART_WEIGHTS", raising=False)
    return tmp_path


@pytest.mark.parametrize("name", ["sdf_badge", "mandelbrot", "yeganeh_grove"])
def test_closed_form_programs_transpile(name):
    t = webgpu.transpile(ex(name))
    assert t["mode"] == "shader"
    assert "vec3 eqart(vec2 p)" in t["glsl"]
    assert "fn eqart(p: vec2<f32>) -> vec3<f32>" in t["wgsl"]


def test_field_program_uses_texture_fallback():
    sh = webgpu.build_shaders(ex("gray_scott"))
    assert sh["mode"] == "texture" and "textureSampleLevel" in sh["wgsl"]


def test_sdf_badge_viewer_has_webgl_and_webgpu(tmp_path):
    out = tmp_path / ".eqart" / "viewer"
    r = export_program(ex("sdf_badge"), ["webgpu"], str(out))
    assert r["ok"] and r["viewer_mode"] == "shader"
    html = (out / "viewer.html").read_text()
    assert "navigator.gpu" in html and "getContext('webgpu')" in html
    assert "getContext('webgl2')" in html and "#version 300 es" in html
    assert "@fragment" in html and "@vertex" in html
    assert (out / "program.wgsl").read_text().count("fn eqart") == 1
    assert "void main()" in (out / "program.frag.glsl").read_text()


def test_sdf_meta_drives_height(tmp_path):
    ir = ex("sdf_badge")
    ir["meta"]["sdf"] = ["sd_circle", "x", "y", 0.5]
    sh = webgpu.build_shaders(ir)
    assert sh["sdf"] and "eqart_sdf" in sh["glsl"] and "eqart_sdf" in sh["wgsl"]


def test_texture_viewer_embeds_png(tmp_path):
    ir = ex("life")
    out = tmp_path / ".eqart" / "life"
    r = export_program(ir, ["webgl"], str(out))
    assert r["ok"] and r["viewer_mode"] == "texture"
    assert 'TEX_B64 = "iVBOR' in (out / "viewer.html").read_text()


def test_fractal_program_exports(tmp_path):
    fr = fractal_render({"preset": "julia_dendrite", "size": 64}, str(tmp_path / ".eqart" / "f"))
    prog = json.loads(open(fr["files"]["ir"]).read())
    r = export_program(prog, ["webgpu"], str(tmp_path / ".eqart" / "fv"))
    assert r["ok"] and r["viewer_mode"] == "shader"


def test_cli_export_and_fractal(tmp_path, capsys):
    p = tmp_path / "badge.json"
    p.write_text(json.dumps(ex("sdf_badge")))
    assert cli_main(["export", str(p), "--format", "webgl", "--out-dir", str(tmp_path / ".eqart" / "c")]) == 0
    assert (tmp_path / ".eqart" / "c" / "viewer.html").exists()
    assert cli_main(["fractal", "koch_curve", "--size", "64", "--out-dir", str(tmp_path / ".eqart" / "k")]) == 0
    assert (tmp_path / ".eqart" / "k" / "fractal.svg").exists()


def test_wgsl_compiles_with_wgpu_when_available():
    wgpu = pytest.importorskip("wgpu")
    try:
        dev = wgpu.gpu.request_adapter_sync(power_preference="high-performance").request_device_sync()
    except Exception:
        pytest.skip("no GPU adapter")
    for name in ("sdf_badge", "mandelbrot", "gray_scott"):
        dev.create_shader_module(code=webgpu.build_shaders(ex(name))["wgsl"])


def _png(path, val):
    Image.fromarray(np.full((64, 64, 3), val, np.uint8)).save(path)
    return str(path)


def test_judge_host_without_key_or_target(tmp_path):
    c = _png(tmp_path / "c.png", 100)
    r = judge.judge(c)
    assert r["ok"] and r["judge"] == "host"


def test_judge_metrics_with_target(tmp_path):
    t = _png(tmp_path / "t.png", 120)
    prev = _png(tmp_path / "p.png", 60)
    cand = _png(tmp_path / "c.png", 118)
    r = judge.judge(cand, prev, t)
    assert r["judge"] == "metrics" and r["decision"] == "accept" and r["improved"] is True


def test_judge_jev_requires_key(tmp_path):
    c = _png(tmp_path / "c.png", 100)
    r = judge.judge(c, judge="jev")
    assert r["ok"] is False and "TYPESAFE_API_KEY" in r["errors"][0]


def test_jev_request_shape_and_key_never_leaks(tmp_path, monkeypatch):
    monkeypatch.setenv("TYPESAFE_API_KEY", "sk-test-secret")
    c, p, t = (_png(tmp_path / f"{n}.png", v) for n, v in (("c", 1), ("p", 2), ("t", 3)))
    req = jev.build_request(c, p, t, "autumn grove")
    assert set(req["questions"]) == {"verdict", "weakest", "improved"}
    assert req["questions"]["weakest"]["type"] == "box"
    assert len(req["assets"]) == 3
    blob = json.dumps(req)
    assert "sk-test-secret" not in blob
    for ref in req["assets"]:
        assert ref in blob.replace(json.dumps(req["assets"]), "")  # every asset referenced

    captured = {}

    class Resp:
        def __enter__(self):
            return self

        def __exit__(self, *a):
            return False

        def read(self):
            return json.dumps({"model": "jev-1.14.0", "answers": {
                "verdict": {"type": "choice", "choice": "accept", "confidence": 0.9},
                "improved": {"type": "noul", "value": True},
                "weakest": {"type": "box", "box": {"top": 0.1, "bottom": 0.5, "left": 0.2, "right": 0.6}}}}).encode()

    def fake_urlopen(r, timeout=0):
        captured["headers"] = dict(r.header_items())
        return Resp()

    monkeypatch.setattr(jev.urllib.request, "urlopen", fake_urlopen)
    out = judge.judge(c, p, t, "autumn grove")
    assert out["judge"] == "jev" and out["decision"] == "accept" and out["improved"] is True
    assert out["focus_box"]["left"] == 0.2
    assert captured["headers"].get("Typesafe-danger-zone-images") == "true"
    assert "sk-test-secret" not in json.dumps(out)


def test_perceptual_judge_is_opt_in(tmp_path):
    c = _png(tmp_path / "c.png", 100)
    t = _png(tmp_path / "t.png", 110)
    r = judge.judge(c, target=t)
    assert r["judge"] == "metrics"  # weights never used implicitly
    try:
        import lpips  # noqa: F401
    except ImportError:
        r = judge.judge(c, target=t, judge="perceptual")
        assert r["ok"] is False and "weights" in r["errors"][0]
