# -*- coding: utf-8 -*-
"""Remplace la terminologie IA/AI dans les locales QDIA."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LOC = ROOT / "artifacts" / "qdia-export" / "src" / "locales"

FR = [
    ("Agent IA — Import en masse", "Import catalogue en masse"),
    ("Importer en masse avec Agent IA", "Importer en masse"),
    ("Import IA en cours…", "Import en cours…"),
    (
        "Scrape les images, enrichit les fiches avec l'IA, calcule les prix Incoterms et intègre les produits en lot.",
        "Importe les images, enrichit les fiches, calcule les prix Incoterms et intègre les produits en lot.",
    ),
    ("Photos IA ×500 (sans image)", "Photos catalogue ×500 (sans image)"),
    ("Photos IA ×50 (sans image)", "Photos catalogue ×50 (sans image)"),
    ("Enrichir 50 (prix + photos IA)", "Enrichir 50 (prix + photos)"),
    ("générez la photo IA", "générez la photo catalogue"),
    ("Publier avec l'IA →", "Publier un produit →"),
    ("Publier avec l'IA", "Publier un produit"),
    ("Publier le premier produit avec l'IA", "Publier le premier produit"),
    ("Aucun produit — publiez via l'Agent IA", "Aucun produit — publiez via l'assistant produit"),
    ("Import masse IA", "Import en masse"),
    ("Lancer l'import IA", "Lancer l'import"),
    ("Agent IA export", "Assistant export"),
    ("Studio Image IA", "Studio Image"),
    ("Studio IA", "Studio Image"),
    ("Scène IA", "Scène studio"),
    ("Agent IA Export", "Assistant Export"),
    ("Agent IA QDIA", "Assistant QDIA"),
    ("Chat assistant IA", "Assistant intelligent"),
    ("Assistant IA", "Assistant intelligent"),
    ("IA Active", "Actif"),
    ("avec l'IA", "automatiquement"),
    ("l'agent IA vous guidera", "l'assistant vous guidera"),
    ("L'IA génère", "Génération automatique de"),
    ("Générer la fiche IA", "Générer la fiche produit"),
    ("benchmark IA de marché", "benchmark de marché"),
    ("crédits IA", "crédits"),
    ("passe IA", "passe"),
    ("Type de traitement IA", "Type de traitement"),
    ("Traitement IA en cours...", "Traitement en cours..."),
    ("Lancer le Studio IA", "Lancer le Studio"),
    ("générée par l'IA", "générée automatiquement"),
    ("traité par l'agent IA", "préparé par l'assistant"),
    ("Je suis l'Agent IA QDIA Export", "Je suis l'assistant QDIA Export"),
    ("Suggestions IA", "Suggestions personnalisées"),
    ("Remplir le tableau avec l'IA", "Remplir le tableau automatiquement"),
    ("Remplir avec l'IA", "Remplir automatiquement"),
    ("L'IA génère le tableau", "Le tableau est généré automatiquement"),
    ("IA en cours…", "Génération en cours…"),
    ("Erreur IA", "Erreur de génération"),
    ("et IA intégrée", "et outils d'export intégrés"),
    ("· IA", "· Export"),
    ("Packshot catalogue IA", "Packshot catalogue"),
    ("Décor commercial IA", "Décor commercial"),
    ("remove.bg ou IA multi-fournisseur…", "Traitement photo multi-fournisseur…"),
    ("studio IA", "studio image"),
    ("Retour Agent IA", "Retour assistant produit"),
    ("Ouvrir dans Studio IA", "Ouvrir dans le Studio"),
    ("Générer texte IA", "Générer le texte"),
    ("générés par l'IA", "générés automatiquement"),
    ("laissez l'IA en créer une", "générez-en une automatiquement"),
    ("outils IA", "outils d'export"),
    ("Agent IA, pricing", "Assistant produit, pricing"),
    ("Agent IA", "Assistant produit"),
    ('"ai_photo": "IA"', '"ai_photo": "Auto"'),
]

EN = [
    ("AI Agent — Import en masse", "Bulk catalog import"),
    ("Import en masse avec AI Agent", "Bulk import"),
    ("Publish with AI →", "Publish a product →"),
    ("Publish with AI", "Publish a product"),
    ("AI Studio", "Image Studio"),
    ("Export AI Agent", "Export Assistant"),
    ("AI Agent QDIA", "QDIA Assistant"),
    ("Back AI Agent", "Back to product assistant"),
    ("publish via AI Agent", "publish via the product assistant"),
    ("AI Agent, pricing", "Product assistant, pricing"),
    ("AI Agent", "Product Assistant"),
    ("Assistant IA", "Smart assistant"),
    ("IA Active", "Active"),
]

AR = [
    ("وكيل IA", "المساعد الذكي"),
    ("الذكاء الاصطناعي", "المساعد الذكي"),
    ("Studio IA", "استوديو الصور"),
    ("Agent IA", "المساعد الذكي"),
]


def apply(path: Path, pairs: list[tuple[str, str]]) -> int:
    text = path.read_text(encoding="utf-8")
    n = 0
    for old, new in pairs:
        c = text.count(old)
        if c:
            text = text.replace(old, new)
            n += c
    path.write_text(text, encoding="utf-8")
    return n


def main() -> None:
    print("fr:", apply(LOC / "fr.json", FR))
    print("en:", apply(LOC / "en.json", EN))
    print("ar:", apply(LOC / "ar.json", AR))


if __name__ == "__main__":
    main()
