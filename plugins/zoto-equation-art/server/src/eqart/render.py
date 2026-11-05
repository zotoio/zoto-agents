"""Sandboxed, cached rendering."""
from __future__ import annotations

import multiprocessing as mp
import os
import time
import uuid
from pathlib import Path

import numpy as np
from PIL import Image

from .interp import EqartError, run_program
from .ir import ir_hash, validate


def home() -> Path:
    p = Path(os.environ.get("EQART_HOME") or (Path.home() / ".eqart")).expanduser().resolve()
    p.mkdir(parents=True, exist_ok=True)
    return p


def confine(out_dir: str | None) -> Path:
    """Output dirs must live under EQART_HOME or inside a path component named '.eqart'."""
    if not out_dir:
        p = home() / "runs" / f"{time.strftime('%Y%m%d-%H%M%S')}-{uuid.uuid4().hex[:6]}"
    else:
        p = Path(out_dir).expanduser().resolve()
        h = home()
        if not (p == h or h in p.parents or ".eqart" in p.parts):
            raise EqartError(f"out_dir {p} must be under {h} or inside a '.eqart' directory")
    p.mkdir(parents=True, exist_ok=True)
    return p


def _child(conn, ir, width, height, precision, snap_dir, snapshot_every, mem_bytes, max_steps):
    try:
        try:
            import resource
            resource.setrlimit(resource.RLIMIT_AS, (mem_bytes, mem_bytes))
        except (ImportError, ValueError, OSError):
            pass  # not supported on this platform (e.g. macOS)
        snaps = []

        def on_snap(step, img):
            path = os.path.join(snap_dir, f"step_{step:07d}.png")
            Image.fromarray(img).save(path)
            snaps.append(path)

        img, info = run_program(ir, width, height, precision, snapshot_every,
                                on_snap if snapshot_every else None, max_steps)
        info["snapshots"] = snaps
        conn.send(("ok", img, info))
    except MemoryError:
        conn.send(("err", "memory limit exceeded", None))
    except Exception as e:  # noqa: BLE001 - report everything to the caller
        conn.send(("err", f"{type(e).__name__}: {e}", None))
    finally:
        conn.close()


def render(ir: dict, out_dir=None, width=None, height=None, precision="f32",
           snapshot_every=0, timeout_s=120.0, mem_gib=4.0, use_cache=True,
           sandbox=True) -> dict:
    rep = validate(ir, width=width, height=height)
    if not rep.ok:
        return {"ok": False, "errors": rep.errors, "warnings": rep.warnings}
    out = confine(out_dir)
    key = ir_hash(ir, width, height, precision)
    cache_dir = home() / "cache"
    cache_dir.mkdir(exist_ok=True)
    cached = cache_dir / f"{key}.png"
    target = out / "render.png"
    if use_cache and cached.exists() and not snapshot_every:
        target.write_bytes(cached.read_bytes())
        return {"ok": True, "png_path": str(target), "cache_hit": True, "elapsed_s": 0.0,
                "warnings": rep.warnings, "cost_estimate": rep.cost}
    t0 = time.time()
    snap_dir = str(out)
    if sandbox:
        ctx = mp.get_context("fork") if hasattr(os, "fork") else mp.get_context("spawn")
        parent, child = ctx.Pipe(duplex=False)
        p = ctx.Process(target=_child, args=(child, ir, width, height, precision, snap_dir,
                                             snapshot_every, int(mem_gib * 2 ** 30), None))
        p.start()
        child.close()
        if not parent.poll(timeout_s):
            p.kill()
            p.join()
            return {"ok": False, "errors": [f"render timed out after {timeout_s}s"], "warnings": rep.warnings}
        try:
            status, a, b = parent.recv()
        except EOFError:
            status, a, b = "err", f"render process died (exit {p.exitcode})", None
        p.join()
        if status != "ok":
            return {"ok": False, "errors": [a], "warnings": rep.warnings}
        img, info = a, b
    else:
        img, info = run_program(ir, width, height, precision)
        info["snapshots"] = []
    Image.fromarray(np.asarray(img)).save(target)
    if use_cache:
        cached.write_bytes(target.read_bytes())
    return {"ok": True, "png_path": str(target), "cache_hit": False,
            "elapsed_s": round(time.time() - t0, 3), "steps": info["steps"],
            "nonfinite_fraction": info["nonfinite_fraction"], "snapshots": info["snapshots"],
            "width": info["width"], "height": info["height"], "warnings": rep.warnings,
            "cost_estimate": rep.cost}
