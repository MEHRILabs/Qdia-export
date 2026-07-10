"""Traitement d'image : fond, carré 1024, filigrane, compression, hash doublons."""

from __future__ import annotations

import hashlib
import logging
from io import BytesIO
from pathlib import Path
from typing import Optional

import requests
from PIL import Image, ImageEnhance

from config import (
    BG_PROVIDER,
    JPEG_QUALITY,
    REMOVEBG_API_KEY,
    TARGET_SIZE,
    WATERMARK_OPACITY,
    WATERMARK_PATH,
    WATERMARK_SCALE,
)

logger = logging.getLogger(__name__)


def remove_background(img: Image.Image) -> Image.Image:
    """Supprime le fond via Remove.bg API ou rembg (local)."""
    provider = BG_PROVIDER
    if provider == "none":
        return img.convert("RGBA")

    if provider in ("auto", "removebg") and REMOVEBG_API_KEY:
        try:
            return _removebg_api(img)
        except Exception as exc:
            logger.warning("Remove.bg échoué (%s) — fallback rembg", exc)
            if provider == "removebg":
                raise

    if provider in ("auto", "rembg"):
        try:
            return _rembg_local(img)
        except Exception as exc:
            logger.warning("rembg indisponible (%s) — conservation du fond", exc)

    return img.convert("RGBA")


def _removebg_api(img: Image.Image) -> Image.Image:
    buf = BytesIO()
    img.convert("RGB").save(buf, format="PNG")
    buf.seek(0)
    resp = requests.post(
        "https://api.remove.bg/v1.0/removebg",
        files={"image_file": ("product.png", buf, "image/png")},
        data={"size": "auto"},
        headers={"X-Api-Key": REMOVEBG_API_KEY},
        timeout=60,
    )
    if resp.status_code != 200:
        raise RuntimeError(f"Remove.bg HTTP {resp.status_code}: {resp.text[:200]}")
    out = Image.open(BytesIO(resp.content))
    out.load()
    return out.convert("RGBA")


def _rembg_local(img: Image.Image) -> Image.Image:
    from rembg import remove  # type: ignore

    buf = BytesIO()
    img.convert("RGBA").save(buf, format="PNG")
    result = remove(buf.getvalue())
    out = Image.open(BytesIO(result))
    out.load()
    return out.convert("RGBA")


def square_crop_center(img: Image.Image, size: int = TARGET_SIZE) -> Image.Image:
    """Recadre au centre en carré puis redimensionne à size×size."""
    img = img.convert("RGBA")
    w, h = img.size
    side = min(w, h)
    left = (w - side) // 2
    top = (h - side) // 2
    cropped = img.crop((left, top, left + side, top + side))
    return cropped.resize((size, size), Image.Resampling.LANCZOS)


def paste_on_white(img: Image.Image) -> Image.Image:
    """Fond blanc sous calque RGBA."""
    if img.mode != "RGBA":
        return img.convert("RGB")
    bg = Image.new("RGB", img.size, (255, 255, 255))
    bg.paste(img, mask=img.split()[3])
    return bg


def apply_watermark(
    img: Image.Image,
    watermark_path: Path | None = None,
    opacity: float = WATERMARK_OPACITY,
) -> Image.Image:
    """Filigrane PNG transparent en bas à droite (opacité 20–30 %)."""
    path = watermark_path or WATERMARK_PATH
    if not path.exists():
        logger.debug("Pas de filigrane (%s)", path)
        return img

    base = img.convert("RGBA")
    mark = Image.open(path).convert("RGBA")

    # Redimensionne le logo
    target_w = max(48, int(base.width * WATERMARK_SCALE))
    ratio = target_w / mark.width
    mark = mark.resize(
        (target_w, max(24, int(mark.height * ratio))),
        Image.Resampling.LANCZOS,
    )

    # Opacité
    alpha = mark.split()[3]
    alpha = ImageEnhance.Brightness(alpha).enhance(max(0.05, min(1.0, opacity)))
    mark.putalpha(alpha)

    margin = max(12, base.width // 40)
    x = base.width - mark.width - margin
    y = base.height - mark.height - margin
    base.alpha_composite(mark, (x, y))
    return base


def compress_jpeg(img: Image.Image, quality: int = JPEG_QUALITY) -> bytes:
    """JPEG optimisé (qualité élevée, peu de perte visuelle)."""
    rgb = img.convert("RGB") if img.mode != "RGB" else img
    buf = BytesIO()
    rgb.save(buf, format="JPEG", quality=quality, optimize=True, progressive=True)
    return buf.getvalue()


def perceptual_hash(img: Image.Image, hash_size: int = 16) -> str:
    """Hash simple pour détection de doublons (average hash)."""
    small = img.convert("L").resize((hash_size, hash_size), Image.Resampling.LANCZOS)
    pixels = list(small.getdata())
    avg = sum(pixels) / len(pixels)
    bits = "".join("1" if p >= avg else "0" for p in pixels)
    return hashlib.sha256(bits.encode()).hexdigest()[:32]


def process_pipeline(
    raw: Image.Image,
    *,
    skip_bg: bool = False,
    watermark: bool = True,
) -> tuple[Image.Image, bytes, str]:
    """
    Pipeline complet :
    fond → carré 1024 → blanc → filigrane → JPEG.
    Retourne (image RGB, bytes jpeg, phash).
    """
    img = raw.convert("RGBA")
    if not skip_bg:
        img = remove_background(img)
    img = square_crop_center(img, TARGET_SIZE)
    img = paste_on_white(img)
    if watermark:
        img = apply_watermark(img)
        img = paste_on_white(img) if img.mode == "RGBA" else img
    data = compress_jpeg(img)
    phash = perceptual_hash(img)
    return img.convert("RGB"), data, phash


def save_image(data: bytes, path: Path) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)
    return path
