"""Bonus : génération / traduction de descriptions produit (OpenAI optionnel)."""

from __future__ import annotations

import json
import logging
from typing import Optional

import requests

from config import GENERATE_DESCRIPTIONS, OPENAI_API_KEY, TRANSLATE_DESCRIPTIONS

logger = logging.getLogger(__name__)


def generate_description(name: str, category: str | None = None) -> Optional[str]:
    if not GENERATE_DESCRIPTIONS or not OPENAI_API_KEY:
        return None
    prompt = (
        "Rédige une description produit B2B export (2-3 phrases, français) pour : "
        f'"{name}"'
        + (f" (catégorie {category})." if category else ".")
        + " Ton professionnel, sans marketing excessif."
    )
    try:
        resp = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {OPENAI_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": "gpt-4o-mini",
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.4,
                "max_tokens": 220,
            },
            timeout=45,
        )
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"].strip()
    except Exception as exc:
        logger.warning("Génération description échouée: %s", exc)
        return None


def translate_descriptions(text_fr: str) -> dict[str, str]:
    """Retourne {fr, en, ar} — arabe optionnel."""
    out = {"fr": text_fr, "en": text_fr, "ar": text_fr}
    if not TRANSLATE_DESCRIPTIONS or not OPENAI_API_KEY or not text_fr.strip():
        return out
    try:
        resp = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {OPENAI_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": "gpt-4o-mini",
                "messages": [
                    {
                        "role": "user",
                        "content": (
                            "Traduis ce texte produit B2B en anglais et arabe. "
                            "Réponds UNIQUEMENT en JSON {\"en\":\"...\",\"ar\":\"...\"}.\n\n"
                            + text_fr
                        ),
                    }
                ],
                "temperature": 0.2,
                "max_tokens": 500,
            },
            timeout=45,
        )
        resp.raise_for_status()
        raw = resp.json()["choices"][0]["message"]["content"].strip()
        if raw.startswith("```"):
            raw = raw.strip("`").removeprefix("json").strip()
        data = json.loads(raw)
        out["en"] = data.get("en") or text_fr
        out["ar"] = data.get("ar") or text_fr
    except Exception as exc:
        logger.warning("Traduction échouée: %s", exc)
    return out
