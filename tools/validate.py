"""Comprueba que los contenidos de data/*.json cumplen el esquema que espera la app."""
import json, re, sys, unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
IDS = ["t25", "t27", "t32", "t39"]

def norm(s):
    s = unicodedata.normalize("NFD", s.lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9%\s]", " ", s)).strip()

def check(cid):
    errs = []
    d = json.loads((ROOT / "data" / f"{cid}.json").read_text(encoding="utf-8"))
    for key in ["id", "tema", "titulo", "subtitulo", "objetivos", "caso", "bloques", "resolucion", "claves", "glosario", "test", "cortas", "largas", "bloquesTemario"]:
        if key not in d: errs.append(f"falta {key}")
    for i, q in enumerate(d.get("test", [])):
        if len(q["o"]) != 4 or len(q["e"]) != 4 or q["c"] not in range(4): errs.append(f"test {i} mal formado")
    for i, q in enumerate(d.get("cortas", [])):
        n = len(q["r"].split())
        if not 3 <= n <= 7: errs.append(f"corta {i}: {n} palabras")
        if not all(any(norm(k) in norm(q["r"]) for k in g) for g in q["k"]): errs.append(f"corta {i}: la respuesta modelo no pasa su regla")
    for i, q in enumerate(d.get("largas", [])):
        if sum(r["p"] for r in q["rubrica"]) != 10: errs.append(f"larga {i}: rúbrica != 10")
    for b in d.get("bloques", []):
        for s in b["secciones"]:
            f = s.get("figura")
            if f and not (ROOT / "img" / f"{f}.webp").exists(): errs.append(f"falta img/{f}.webp")
    audio = json.loads((ROOT / "data" / "audioguia.json").read_text(encoding="utf-8"))[cid]
    for t in audio:
        if not (ROOT / t["audio"]).exists(): errs.append(f"falta {t['audio']}")
        if not (ROOT / "slides" / f"{cid}-{t['n']:02d}.jpg").exists(): errs.append(f"falta diapositiva {t['n']}")
    print(cid, "OK" if not errs else errs, f"test={len(d.get('test',[]))} cortas={len(d.get('cortas',[]))} largas={len(d.get('largas',[]))}")
    return not errs

ok = all([check(c) for c in IDS if (ROOT / "data" / f"{c}.json").exists()])
sys.exit(0 if ok else 1)
