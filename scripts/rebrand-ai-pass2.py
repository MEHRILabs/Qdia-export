# -*- coding: utf-8 -*-
from pathlib import Path
import json

LOC = Path(__file__).resolve().parents[1] / "artifacts" / "qdia-export" / "src" / "locales"

EN = [
    ("l'agent IA vous guidera", "the assistant will guide you"),
    ("L'IA génère le titre", "Automatic generation of the title"),
    ("Generate la listing IA", "Generate product sheet"),
    ("benchmark IA de market", "market benchmark"),
    ("Type de processing IA", "Processing type"),
    ("Processing IA en cours...", "Processing..."),
    ("générée par l'IA", "generated automatically"),
    ("traité par l'agent IA", "prepared by the assistant"),
    ("Suggestions IA", "Personalized suggestions"),
    ("Packshot catalogue IA", "Catalog packshot"),
    ("Décor commercial IA", "Commercial scene"),
    ("remove.bg ou IA multi-fournisseur…", "Multi-provider photo processing…"),
    ("outils IA", "export tools"),
    ("L'IA génère le tableau", "The table is generated automatically"),
    ("IA en cours…", "Generating…"),
    ("Error IA", "Generation error"),
]

AR = [
    ("استوديو صورة IA", "استوديو الصور"),
    ("خطأ IA", "خطأ في التوليد"),
]


def apply(name: str, pairs: list[tuple[str, str]]) -> None:
    p = LOC / name
    t = p.read_text(encoding="utf-8")
    n = 0
    for a, b in pairs:
        c = t.count(a)
        if c:
            t = t.replace(a, b)
            n += c
    p.write_text(t, encoding="utf-8")
    print(name, n)


apply("en.json", EN)
apply("ar.json", AR)

for name in ("fr.json", "en.json", "ar.json"):
    json.loads((LOC / name).read_text(encoding="utf-8"))
    print(name, "JSON OK")
