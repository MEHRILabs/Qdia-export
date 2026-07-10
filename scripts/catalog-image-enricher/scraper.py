"""Recherche d'images (Google Images / DuckDuckGo) + téléchargement."""

from __future__ import annotations

import logging
import random
import re
import time
from io import BytesIO
from typing import Optional
from urllib.parse import quote_plus, urlparse

import requests
from PIL import Image

from config import (
    BLOCKED_URL_KEYWORDS,
    DELAY_MAX,
    DELAY_MIN,
    HEADLESS,
    MIN_FILE_BYTES,
    MIN_RESOLUTION,
    REQUEST_TIMEOUT,
    SEARCH_ENGINE,
    USER_AGENT,
)

logger = logging.getLogger(__name__)

SESSION = requests.Session()
SESSION.headers.update(
    {
        "User-Agent": USER_AGENT,
        "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
    }
)


def polite_delay() -> None:
    time.sleep(random.uniform(DELAY_MIN, DELAY_MAX))


def _is_blocked_url(url: str) -> bool:
    low = url.lower()
    return any(k in low for k in BLOCKED_URL_KEYWORDS)


def _looks_like_product_image(img: Image.Image, url: str) -> bool:
    """Heuristiques : taille, ratio, pas trop « logo » (peu de pixels / fond uni)."""
    w, h = img.size
    if w < MIN_RESOLUTION or h < MIN_RESOLUTION:
        logger.debug("Résolution trop faible %sx%s — %s", w, h, url[:80])
        return False
    ratio = w / max(h, 1)
    if ratio < 0.4 or ratio > 2.5:
        return False
    # Logos souvent très petits en poids déjà filtrés ; ici on refuse images quasi monochromes
    sample = img.convert("RGB").resize((32, 32))
    colors = sample.getcolors(maxcolors=1024) or []
    if len(colors) < 8:
        return False
    return True


def download_image(url: str) -> Optional[Image.Image]:
    if not url or not url.startswith("http") or _is_blocked_url(url):
        return None
    try:
        resp = SESSION.get(url, timeout=REQUEST_TIMEOUT, stream=True)
        resp.raise_for_status()
        ctype = (resp.headers.get("Content-Type") or "").lower()
        if "image" not in ctype and not any(
            url.lower().endswith(ext) for ext in (".jpg", ".jpeg", ".png", ".webp")
        ):
            return None
        data = resp.content
        if len(data) < MIN_FILE_BYTES:
            return None
        img = Image.open(BytesIO(data))
        img.load()
        if img.mode not in ("RGB", "RGBA"):
            img = img.convert("RGBA")
        if not _looks_like_product_image(img, url):
            return None
        return img
    except Exception as exc:
        logger.debug("Téléchargement échoué %s: %s", url[:100], exc)
        return None


def search_google_image_urls(query: str, max_results: int = 8) -> list[str]:
    """
    Recherche Google Images via Playwright.
    Ignore les blocs sponsorisés (data-is-ad / texte Sponsored).
    """
    try:
        from playwright.sync_api import sync_playwright
    except ImportError as e:
        raise RuntimeError(
            "Playwright requis: pip install playwright && playwright install chromium"
        ) from e

    urls: list[str] = []
    search_url = (
        "https://www.google.com/search?tbm=isch&hl=fr&q="
        + quote_plus(query + " product photo packshot")
    )

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=HEADLESS)
        context = browser.new_context(
            user_agent=USER_AGENT,
            locale="fr-FR",
            viewport={"width": 1280, "height": 900},
        )
        page = context.new_page()
        try:
            page.goto(search_url, wait_until="domcontentloaded", timeout=45000)
            # Consentement cookies éventuel
            for sel in (
                "button:has-text('Tout accepter')",
                "button:has-text('Accept all')",
                "#L2AGLb",
            ):
                try:
                    btn = page.locator(sel).first
                    if btn.is_visible(timeout=1500):
                        btn.click()
                        break
                except Exception:
                    pass

            page.wait_for_timeout(1200)
            # Cliquer la première vignette non sponsorisée
            thumbs = page.locator("div[data-id] a, a.wXeWr, div.isv-r a")
            count = min(thumbs.count(), max_results + 4)
            for i in range(count):
                try:
                    thumb = thumbs.nth(i)
                    # Skip ads
                    parent_html = thumb.evaluate(
                        """el => {
                          let n = el;
                          for (let i=0;i<6 && n;i++) {
                            const t = (n.innerText||'') + ' ' + (n.getAttribute('aria-label')||'');
                            if (/sponsor|sponsored|annonce|ad\\s/i.test(t)) return 'AD';
                            n = n.parentElement;
                          }
                          return 'OK';
                        }"""
                    )
                    if parent_html == "AD":
                        continue
                    thumb.click(timeout=3000)
                    page.wait_for_timeout(800)
                    # Image grande dans le panneau latéral
                    for img_sel in (
                        "img.sFlh5c",
                        "img.n3VNCb",
                        "a[href*='imgurl'] img",
                        "img[jsname]",
                    ):
                        for el in page.locator(img_sel).all()[:5]:
                            src = el.get_attribute("src") or ""
                            if src.startswith("http") and "gstatic.com/images" not in src:
                                if src not in urls and not _is_blocked_url(src):
                                    urls.append(src)
                            # parfois data-src
                            dsrc = el.get_attribute("data-src") or ""
                            if dsrc.startswith("http") and dsrc not in urls:
                                urls.append(dsrc)
                    if len(urls) >= max_results:
                        break
                except Exception:
                    continue
        finally:
            context.close()
            browser.close()

    # Déduplique en préservant l'ordre
    seen: set[str] = set()
    ordered: list[str] = []
    for u in urls:
        if u not in seen:
            seen.add(u)
            ordered.append(u)
    logger.info("Google Images « %s » → %d URL(s)", query[:60], len(ordered))
    return ordered[:max_results]


def search_duckduckgo_image_urls(query: str, max_results: int = 8) -> list[str]:
    """Fallback DuckDuckGo (moins fragile que Google)."""
    try:
        from playwright.sync_api import sync_playwright
    except ImportError as e:
        raise RuntimeError("Playwright requis") from e

    urls: list[str] = []
    search_url = "https://duckduckgo.com/?q=" + quote_plus(query) + "&iax=images&ia=images"

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=HEADLESS)
        page = browser.new_page(user_agent=USER_AGENT)
        try:
            page.goto(search_url, wait_until="domcontentloaded", timeout=45000)
            page.wait_for_timeout(2000)
            for el in page.locator("img.tile--img__img, img[data-src]").all()[: max_results * 2]:
                src = el.get_attribute("data-src") or el.get_attribute("src") or ""
                if src.startswith("//"):
                    src = "https:" + src
                if src.startswith("http") and not _is_blocked_url(src) and src not in urls:
                    urls.append(src)
                if len(urls) >= max_results:
                    break
        finally:
            browser.close()
    return urls


def find_best_product_image(title: str) -> Optional[Image.Image]:
    """Recherche + télécharge la première image pertinente."""
    query = re.sub(r"\s+", " ", title).strip()
    if not query:
        return None

    polite_delay()
    try:
        if SEARCH_ENGINE == "duckduckgo":
            candidates = search_duckduckgo_image_urls(query)
        else:
            candidates = search_google_image_urls(query)
            if not candidates:
                logger.warning("Google vide — fallback DuckDuckGo pour « %s »", query[:40])
                candidates = search_duckduckgo_image_urls(query)
    except Exception as exc:
        logger.error("Recherche images échouée: %s", exc)
        return None

    for url in candidates:
        polite_delay()
        img = download_image(url)
        if img:
            logger.info("Image OK (%sx%s) ← %s", img.width, img.height, urlparse(url).netloc)
            return img
    return None
