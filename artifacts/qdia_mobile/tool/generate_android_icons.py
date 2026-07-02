"""Génère les icônes Android à partir du logo site (logo.png)."""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "assets" / "icon" / "app_icon.png"
RES = ROOT / "android" / "app" / "src" / "main" / "res"

MIPMAP_SIZES = {
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192,
}

FOREGROUND_SIZES = {
    "drawable-mdpi": 108,
    "drawable-hdpi": 162,
    "drawable-xhdpi": 216,
    "drawable-xxhdpi": 324,
    "drawable-xxxhdpi": 432,
}


def square_icon(src: Image.Image, size: int, padding: float = 0.08) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), (255, 255, 255, 255))
    inner = int(size * (1 - padding * 2))
    logo = src.copy().convert("RGBA")
    logo.thumbnail((inner, inner), Image.Resampling.LANCZOS)
    x = (size - logo.width) // 2
    y = (size - logo.height) // 2
    canvas.paste(logo, (x, y), logo)
    return canvas


def save_icon(src: Image.Image, path: Path, size: int) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    square_icon(src, size).save(path, "PNG")


def main() -> None:
    src = Image.open(SRC).convert("RGBA")
    for folder, size in MIPMAP_SIZES.items():
        save_icon(src, RES / folder / "ic_launcher.png", size)
        save_icon(src, RES / folder / "ic_launcher_round.png", size)
    for folder, size in FOREGROUND_SIZES.items():
        save_icon(src, RES / folder / "ic_launcher_foreground.png", size)
    print("Android launcher icons generated from site logo.")


if __name__ == "__main__":
    main()
