"""Fidelity metrics with no learned weights, plus codec reference sizes."""
from __future__ import annotations

import io
import math

import numpy as np
from PIL import Image

Image.MAX_IMAGE_PIXELS = 4096 * 4096 * 2  # decompression-bomb guard


def load_rgb(path: str, size=None) -> np.ndarray:
    with Image.open(path) as im:
        im = im.convert("RGB")
        if size and im.size != tuple(size):
            im = im.resize(tuple(size), Image.LANCZOS)
        return np.asarray(im, dtype=np.uint8)


def psnr(a: np.ndarray, b: np.ndarray) -> float:
    mse = np.mean((a.astype(np.float64) - b.astype(np.float64)) ** 2)
    return float("inf") if mse == 0 else float(10 * np.log10(255.0 ** 2 / mse))


def _gauss(sigma=1.5, size=11):
    ax = np.arange(size) - size // 2
    g = np.exp(-(ax ** 2) / (2 * sigma ** 2))
    return g / g.sum()


def _blur(img, g):
    pad = len(g) // 2
    p = np.pad(img, ((pad, pad), (0, 0)), mode="reflect")
    out = sum(g[i] * p[i:i + img.shape[0]] for i in range(len(g)))
    p = np.pad(out, ((0, 0), (pad, pad)), mode="reflect")
    return sum(g[i] * p[:, i:i + img.shape[1]] for i in range(len(g)))


def _ssim_map(x, y, L=255.0):
    g = _gauss()
    C1, C2 = (0.01 * L) ** 2, (0.03 * L) ** 2
    mx, my = _blur(x, g), _blur(y, g)
    sxx = _blur(x * x, g) - mx * mx
    syy = _blur(y * y, g) - my * my
    sxy = _blur(x * y, g) - mx * my
    cs = (2 * sxy + C2) / (sxx + syy + C2)
    ssim = ((2 * mx * my + C1) / (mx * mx + my * my + C1)) * cs
    return ssim, cs


def _luma(img):
    f = img.astype(np.float64)
    return 0.299 * f[..., 0] + 0.587 * f[..., 1] + 0.114 * f[..., 2]


def ssim(a, b) -> float:
    return float(np.mean(_ssim_map(_luma(a), _luma(b))[0]))


def ms_ssim(a, b) -> float:
    w = np.array([0.0448, 0.2856, 0.3001, 0.2363, 0.1333])
    x, y = _luma(a), _luma(b)
    scales = 5
    while scales > 1 and min(x.shape) / (2 ** (scales - 1)) < 16:
        scales -= 1
    w = w[:scales] / w[:scales].sum()
    vals = []
    for s in range(scales):
        sm, cs = _ssim_map(x, y)
        vals.append(np.mean(sm) if s == scales - 1 else np.mean(cs))
        if s < scales - 1:
            h, wd = (x.shape[0] // 2) * 2, (x.shape[1] // 2) * 2
            x = x[:h, :wd].reshape(h // 2, 2, wd // 2, 2).mean(axis=(1, 3))
            y = y[:h, :wd].reshape(h // 2, 2, wd // 2, 2).mean(axis=(1, 3))
    vals = np.maximum(np.array(vals), 1e-8)
    return float(np.prod(vals ** w))


def grad_l1(a, b) -> float:
    x, y = _luma(a), _luma(b)
    gx = lambda z: np.diff(z, axis=1)  # noqa: E731
    gy = lambda z: np.diff(z, axis=0)  # noqa: E731
    return float((np.abs(gx(x) - gx(y)).mean() + np.abs(gy(x) - gy(y)).mean()) / 2 / 255.0)


def codec_references(target: np.ndarray, jpeg_qualities=(10, 30, 50, 70, 90)) -> dict:
    im = Image.fromarray(target)
    buf = io.BytesIO()
    im.save(buf, format="PNG", optimize=True)
    out = {"png_bytes": buf.tell(), "jpeg": [], "webp": []}
    for fmt, key in (("JPEG", "jpeg"), ("WEBP", "webp")):
        for q in jpeg_qualities:
            b = io.BytesIO()
            try:
                im.save(b, format=fmt, quality=q)
            except (OSError, KeyError):
                break
            dec = np.asarray(Image.open(io.BytesIO(b.getvalue())).convert("RGB"))
            out[key].append({"quality": q, "bytes": b.tell(), "psnr": round(psnr(target, dec), 3)})
    return out


def compare(candidate: np.ndarray, target: np.ndarray) -> dict:
    if candidate.shape != target.shape:
        raise ValueError(f"shape mismatch {candidate.shape} vs {target.shape}")
    p = psnr(candidate, target)
    return {"psnr": 100.0 if math.isinf(p) else round(p, 4), "identical": math.isinf(p), "ssim": round(ssim(candidate, target), 5),
            "ms_ssim": round(ms_ssim(candidate, target), 5), "grad_l1": round(grad_l1(candidate, target), 5)}
