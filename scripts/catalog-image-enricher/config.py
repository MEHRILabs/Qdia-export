"""Configuration centralisée — variables d'environnement + constantes métier."""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

# Charge .env à la racine du monorepo puis le .env local du script
ROOT = Path(__file__).resolve().parents[2]
SCRIPT_DIR = Path(__file__).resolve().parent

load_dotenv(ROOT / ".env")
load_dotenv(SCRIPT_DIR / ".env", override=True)

# ── Base de données ──────────────────────────────────────────
DATABASE_URL = os.getenv("DATABASE_URL", "")
CSV_FALLBACK = os.getenv("CSV_FALLBACK", "")  # chemin CSV/Excel optionnel

# ── Chemins ──────────────────────────────────────────────────
OUTPUT_DIR = Path(os.getenv("OUTPUT_DIR", SCRIPT_DIR / "output" / "images"))
LOG_DIR = Path(os.getenv("LOG_DIR", SCRIPT_DIR / "logs"))
STATE_FILE = Path(os.getenv("STATE_FILE", SCRIPT_DIR / "output" / "progress.json"))
REPORT_FILE = Path(os.getenv("REPORT_FILE", SCRIPT_DIR / "output" / "report.json"))
WATERMARK_PATH = Path(
    os.getenv("WATERMARK_PATH", SCRIPT_DIR / "assets" / "watermark.png")
)
# Copie auto vers le dossier servi par l'API (optionnel)
UPLOAD_SYNC_DIR = Path(
    os.getenv(
        "UPLOAD_SYNC_DIR",
        ROOT / "artifacts" / "api-server" / "uploads" / "catalog",
    )
)
# URL publique relative (servie par l'API /uploads/…)
PUBLIC_IMAGE_PREFIX = os.getenv("PUBLIC_IMAGE_PREFIX", "/uploads/catalog")

# ── Images ───────────────────────────────────────────────────
TARGET_SIZE = int(os.getenv("TARGET_SIZE", "1024"))
MIN_RESOLUTION = int(os.getenv("MIN_RESOLUTION", "800"))
JPEG_QUALITY = int(os.getenv("JPEG_QUALITY", "88"))
WATERMARK_OPACITY = float(os.getenv("WATERMARK_OPACITY", "0.25"))  # 20–30 %
WATERMARK_SCALE = float(os.getenv("WATERMARK_SCALE", "0.18"))  # % largeur image

# ── Scraping ─────────────────────────────────────────────────
SEARCH_ENGINE = os.getenv("SEARCH_ENGINE", "google")  # google | duckduckgo
HEADLESS = os.getenv("HEADLESS", "true").lower() in ("1", "true", "yes")
REQUEST_TIMEOUT = int(os.getenv("REQUEST_TIMEOUT", "30"))
DELAY_MIN = float(os.getenv("DELAY_MIN", "1.5"))
DELAY_MAX = float(os.getenv("DELAY_MAX", "3.5"))
MAX_WORKERS = int(os.getenv("MAX_WORKERS", "3"))
BATCH_LIMIT = int(os.getenv("BATCH_LIMIT", "0"))  # 0 = tous
ONLY_WITHOUT_PHOTO = os.getenv("ONLY_WITHOUT_PHOTO", "true").lower() in (
    "1",
    "true",
    "yes",
)
USER_AGENT = os.getenv(
    "USER_AGENT",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
)

# ── Remove background ────────────────────────────────────────
REMOVEBG_API_KEY = os.getenv("REMOVEBG_API_KEY", "")
BG_PROVIDER = os.getenv("BG_PROVIDER", "auto")  # auto | rembg | removebg | none

# ── Descriptions IA (bonus, optionnel) ───────────────────────
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
GENERATE_DESCRIPTIONS = os.getenv("GENERATE_DESCRIPTIONS", "false").lower() in (
    "1",
    "true",
    "yes",
)
TRANSLATE_DESCRIPTIONS = os.getenv("TRANSLATE_DESCRIPTIONS", "false").lower() in (
    "1",
    "true",
    "yes",
)

# ── Filtres pertinence ───────────────────────────────────────
# Mots-clés dans l'URL / alt à éviter (logos, icônes, placeholders)
BLOCKED_URL_KEYWORDS = (
    "logo",
    "icon",
    "sprite",
    "avatar",
    "placeholder",
    "favicon",
    "banner-ad",
    "advert",
    "1x1",
    "pixel",
    "spacer",
    "blank",
    "svg+xml",
)
MIN_FILE_BYTES = int(os.getenv("MIN_FILE_BYTES", "8000"))


def ensure_dirs() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
