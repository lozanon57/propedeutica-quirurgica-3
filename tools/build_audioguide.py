"""Regenera la audioguía de la app a partir de las presentaciones actuales.

Para cada clase: lee las notas del ponente de cada diapositiva del .pptx, sintetiza la pista con la voz
neural es-ES-AlvaroNeural (edge-tts), guarda la imagen de la diapositiva desde el PDF exportado y escribe
data/audioguia.json. La diapositiva final del QR («Repasa esta clase en la app») no entra en la audioguía.

Uso: python3 build_audioguide.py <carpeta_pptx> <carpeta_pdf> <python_con_edge_tts>
"""
import asyncio, json, re, subprocess, sys
from pathlib import Path
from pptx import Presentation

APP = Path(__file__).resolve().parent.parent
VOICE = "es-ES-AlvaroNeural"
DECKS = {
    "t25": "Temas 25-26 - Fisiopatologia arterial",
    "t27": "Tema 27 - Fisiopatologia venosa y linfatica",
    "t32": "Tema 32 - Tecnologia avanzada en cirugia",
    "t39": "Tema 39 - Intraoperatorio",
}
PARALLEL = 4


def clean_notes(text):
    text = re.sub(r"\(~[^)]*\)\s*$", "", text.strip())          # marca de tiempo final
    text = re.sub(r"\s*RITMO\b.*$", "", text, flags=re.S)
    return re.sub(r"[ \t]+", " ", text).strip()


def spoken(text):
    text = re.sub(r"\[pausa[^\]]*\]", "…", text)
    text = text.replace("—", ", ").replace("·", ",")
    return re.sub(r"\b([A-ZÁÉÍÓÚÑ]{5,})\b", lambda m: m.group(1).lower(), text)


def slide_title(slide, first):
    texts = [s for s in slide.shapes if s.has_text_frame and s.text_frame.text.strip()]
    if first:
        return texts[0].text_frame.paragraphs[0].text.strip()
    body = [s for s in texts if s.top > 457200]                   # bajo la etiqueta de bloque (0,5 in)
    return body[0].text_frame.paragraphs[0].text.strip() if body else ""


def read_deck(pptx):
    prs = Presentation(pptx)
    out = []
    for i, s in enumerate(prs.slides):
        titulo = slide_title(s, i == 0)
        if i > 0 and titulo == "Repasa esta clase en la app":   # cierre con QR: no se narra en la app
            continue
        notes = s.notes_slide.notes_text_frame.text if s.has_notes_slide else ""
        out.append({"page": i + 1, "titulo": slide_title(s, i == 0), "notas": clean_notes(notes)})
    return out


async def synth(sem, py, text, mp3):
    async with sem:
        if mp3.exists() and mp3.stat().st_size > 0:
            return
        txt = mp3.with_suffix(".txt")
        txt.write_text(spoken(text), encoding="utf-8")
        proc = await asyncio.create_subprocess_exec(py, "-m", "edge_tts", "--voice", VOICE, "-f", str(txt), "--write-media", str(mp3))
        if await proc.wait() != 0:
            raise RuntimeError(f"edge-tts falló en {mp3.name}")
        txt.unlink()


def duration(mp3):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(mp3)], capture_output=True, text=True)
    return round(float(r.stdout), 1)


async def main(pptx_dir, pdf_dir, py):
    sem = asyncio.Semaphore(PARALLEL)
    (APP / "audio").mkdir(exist_ok=True)
    previo_path = APP / "data" / "audioguia.json"
    previo = json.loads(previo_path.read_text(encoding="utf-8")) if previo_path.exists() else {}
    notas_previas = {(cid, t["n"]): t["notas"] for cid, ts in previo.items() for t in ts}
    manifest, jobs = {}, []
    for cid, name in DECKS.items():
        slides = read_deck(Path(pptx_dir) / f"{name}.pptx")
        for n, s in enumerate(slides, start=1):
            s["n"] = n
            jpg = APP / "slides" / f"{cid}-{n:02d}.jpg"
            subprocess.run(["pdftoppm", "-jpeg", "-jpegopt", "quality=80", "-scale-to-x", "1280", "-scale-to-y", "-1",
                            "-f", str(s["page"]), "-l", str(s["page"]), "-singlefile", str(Path(pdf_dir) / f"{name}.pdf"), str(jpg.with_suffix(""))], check=True)
            mp3 = APP / "audio" / f"{cid}_{n:02d}.mp3"
            if notas_previas.get((cid, n)) != s["notas"] and mp3.exists():
                mp3.unlink()                                   # notas cambiadas: se vuelve a narrar
                print("re-narrar", mp3.name)
            jobs.append(synth(sem, py, s["notas"], APP / "audio" / f"{cid}_{n:02d}.mp3"))
        manifest[cid] = slides
    await asyncio.gather(*jobs)
    for cid, slides in manifest.items():
        manifest[cid] = [{"n": s["n"], "titulo": s["titulo"], "audio": f"audio/{cid}_{s['n']:02d}.mp3",
                          "seg": duration(APP / "audio" / f"{cid}_{s['n']:02d}.mp3"), "notas": s["notas"]} for s in slides]
        print(cid, len(slides), "pistas", round(sum(t["seg"] for t in manifest[cid]) / 60, 1), "min")
    (APP / "data" / "audioguia.json").write_text(json.dumps(manifest, ensure_ascii=False), encoding="utf-8")


if __name__ == "__main__":
    asyncio.run(main(*sys.argv[1:4]))
