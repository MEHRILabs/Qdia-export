"""
Enrichissement catalogue images — point d'entrée.

Usage:
  python main.py --limit 50
  python main.py --resume
  python main.py --engine duckduckgo --workers 2
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path

from config import (
    BATCH_LIMIT,
    LOG_DIR,
    MAX_WORKERS,
    OUTPUT_DIR,
    PUBLIC_IMAGE_PREFIX,
    REPORT_FILE,
    SEARCH_ENGINE,
    STATE_FILE,
    ensure_dirs,
)
from database import Database, ProductRow, iter_products
from descriptions import generate_description
from image_processor import process_pipeline, save_image
from scraper import find_best_product_image

# ── Logging ──────────────────────────────────────────────────
ensure_dirs()
LOG_FILE = LOG_DIR / f"enrich_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.FileHandler(LOG_FILE, encoding="utf-8"),
        logging.StreamHandler(sys.stdout),
    ],
)
logger = logging.getLogger("main")

# Verrous pour état partagé (threads)
_state_lock = threading.Lock()
_hash_lock = threading.Lock()


@dataclass
class Stats:
    total: int = 0
    success: int = 0
    skipped: int = 0
    errors: int = 0
    duplicates: int = 0
    details: list[dict] = field(default_factory=list)


def load_state() -> dict:
    if STATE_FILE.exists():
        try:
            return json.loads(STATE_FILE.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {"done_ids": [], "hashes": {}, "updated_at": None}


def save_state(state: dict) -> None:
    state["updated_at"] = datetime.now(timezone.utc).isoformat()
    STATE_FILE.write_text(json.dumps(state, indent=2, ensure_ascii=False), encoding="utf-8")


def process_one(
    product: ProductRow,
    *,
    db: Database | None,
    state: dict,
    stats: Stats,
    skip_bg: bool,
    dry_run: bool,
) -> None:
    pid = product.id
    name = product.name
    try:
        with _state_lock:
            if pid in state["done_ids"]:
                stats.skipped += 1
                return

        logger.info("[%s] Recherche image — %s", pid, name[:80])
        raw = find_best_product_image(name)
        if raw is None:
            logger.warning("[%s] Aucune image pertinente — ignoré", pid)
            with _state_lock:
                stats.skipped += 1
                stats.details.append({"id": pid, "status": "skipped", "reason": "no_image"})
                state["done_ids"].append(pid)
                save_state(state)
            return

        img, jpeg_bytes, phash = process_pipeline(raw, skip_bg=skip_bg)

        with _hash_lock:
            existing = state.get("hashes", {})
            if phash in existing and existing[phash] != pid:
                logger.warning(
                    "[%s] Doublon d'image (hash=%s, déjà produit %s)",
                    pid,
                    phash[:8],
                    existing[phash],
                )
                with _state_lock:
                    stats.duplicates += 1
                    stats.details.append(
                        {
                            "id": pid,
                            "status": "duplicate",
                            "duplicate_of": existing[phash],
                        }
                    )
                    state["done_ids"].append(pid)
                    save_state(state)
                return
            existing[phash] = pid
            state["hashes"] = existing

        filename = f"product_{pid}.jpg"
        out_path = OUTPUT_DIR / filename
        if not dry_run:
            save_image(jpeg_bytes, out_path)

        public_url = f"{PUBLIC_IMAGE_PREFIX.rstrip('/')}/{filename}"
        desc = None
        if not product.description:
            desc = generate_description(name, product.category)

        if db and not dry_run:
            db.update_image(pid, public_url, description=desc)

        with _state_lock:
            stats.success += 1
            stats.details.append(
                {
                    "id": pid,
                    "status": "ok",
                    "path": str(out_path),
                    "url": public_url,
                    "bytes": len(jpeg_bytes),
                }
            )
            state["done_ids"].append(pid)
            save_state(state)

        logger.info("[%s] OK → %s (%d Ko)", pid, public_url, len(jpeg_bytes) // 1024)

    except Exception as exc:
        logger.exception("[%s] Erreur: %s", pid, exc)
        with _state_lock:
            stats.errors += 1
            stats.details.append({"id": pid, "status": "error", "error": str(exc)})
            # Ne pas marquer done_ids → retry au prochain --resume


def write_report(stats: Stats) -> None:
    report = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "total": stats.total,
        "success": stats.success,
        "skipped": stats.skipped,
        "errors": stats.errors,
        "duplicates": stats.duplicates,
        "log_file": str(LOG_FILE),
        "details": stats.details[-500:],  # limite taille
    }
    REPORT_FILE.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    logger.info(
        "Rapport: total=%d ok=%d skip=%d err=%d dup=%d → %s",
        stats.total,
        stats.success,
        stats.skipped,
        stats.errors,
        stats.duplicates,
        REPORT_FILE,
    )


def main() -> int:
    parser = argparse.ArgumentParser(description="Enrichissement images catalogue QDIA")
    parser.add_argument("--limit", type=int, default=BATCH_LIMIT, help="Nb max produits (0=tous)")
    parser.add_argument("--workers", type=int, default=MAX_WORKERS, help="Threads parallèles")
    parser.add_argument("--resume", action="store_true", help="Reprendre (ignore done_ids)")
    parser.add_argument("--engine", choices=("google", "duckduckgo"), default=SEARCH_ENGINE)
    parser.add_argument("--skip-bg", action="store_true", help="Ne pas supprimer le fond")
    parser.add_argument("--dry-run", action="store_true", help="Ne pas écrire BDD / fichiers")
    args = parser.parse_args()

    # Override moteur pour ce run
    import config as cfg

    cfg.SEARCH_ENGINE = args.engine

    state = load_state() if args.resume else {"done_ids": [], "hashes": {}, "updated_at": None}
    if not args.resume:
        save_state(state)

    done = set(state.get("done_ids") or [])
    products, db = iter_products(limit=args.limit, skip_ids=done if args.resume else set())
    stats = Stats(total=len(products))

    if not products:
        logger.info("Aucun produit à traiter.")
        write_report(stats)
        if db:
            db.close()
        return 0

    workers = max(1, min(args.workers, 8))
    # Playwright + Google : 1–3 workers max recommandé
    if args.engine == "google":
        workers = min(workers, 3)

    logger.info(
        "Démarrage: %d produits, workers=%d, engine=%s, resume=%s",
        len(products),
        workers,
        args.engine,
        args.resume,
    )

    # Note: Playwright sync n'est pas idéal en multi-thread ; on sérialise la recherche
    # via un pool réduit. Pour 19k produits, préférer --engine duckduckgo ou workers=1–2.
    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = [
            pool.submit(
                process_one,
                p,
                db=db,
                state=state,
                stats=stats,
                skip_bg=args.skip_bg,
                dry_run=args.dry_run,
            )
            for p in products
        ]
        for fut in as_completed(futures):
            try:
                fut.result()
            except Exception as exc:
                logger.error("Future crash: %s", exc)

    write_report(stats)
    if db:
        db.close()
    return 0 if stats.errors == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
