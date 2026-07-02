"""Génère le PNG du logo site (logo.svg) pour l'icône APK et l'app."""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT_ICON = ROOT / "assets" / "icon" / "app_icon.png"
OUT_LOGO = ROOT / "assets" / "images" / "logo.png"

SIZE = 1024
SCALE = SIZE / 64


def draw_logo(size: int) -> Image.Image:
    scale = size / 64
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    cx = cy = size // 2

    base = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(base)
    r_outer = int(30 * scale)
    draw.ellipse(
        [cx - r_outer, cy - r_outer, cx + r_outer, cy + r_outer],
        fill="#00868F",
    )

    inner = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    inner_draw = ImageDraw.Draw(inner)
    r_inner = int(22 * scale)
    inner_draw.ellipse(
        [cx - r_inner, cy - r_inner, cx + r_inner, cy + r_inner],
        fill=(0, 223, 252, int(255 * 0.35)),
    )
    base = Image.alpha_composite(base, inner)

    draw = ImageDraw.Draw(base)
    font_size = int(22 * scale * 1.35)
    font = None
    for name in ("arialbd.ttf", "Arial Bold.ttf", "segoeuib.ttf", "calibrib.ttf"):
        try:
            font = ImageFont.truetype(name, font_size)
            break
        except OSError:
            continue
    if font is None:
        font = ImageFont.load_default()

    text = "Q"
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    tx = cx - tw / 2 - bbox[0]
    ty = int(40 * scale) - th / 2 - bbox[1]
    draw.text((tx, ty), text, fill="white", font=font)
    return base


def main() -> None:
    OUT_ICON.parent.mkdir(parents=True, exist_ok=True)
    OUT_LOGO.parent.mkdir(parents=True, exist_ok=True)
    logo = draw_logo(SIZE)
    logo.save(OUT_ICON, "PNG")
    logo.resize((512, 512), Image.Resampling.LANCZOS).save(OUT_LOGO, "PNG")
    print(f"Saved {OUT_ICON}")
    print(f"Saved {OUT_LOGO}")


if __name__ == "__main__":
    main()
