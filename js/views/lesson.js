// Pestañas de lectura de una clase: caso (método del caso), contenidos y audioguía.
import { esc, rich, paras, fmtTime } from "../util.js";
import * as store from "../store.js";
import * as player from "../player.js";

export function renderCase(cls) {
  const c = cls.caso;
  const saved = store.get(cls.id, "caso").decision ?? "";
  const html = `
    <section class="stack">
      <div class="card">
        <span class="eyebrow">Al terminar serás capaz de</span>
        <ul class="objectives" style="margin-top:12px">${cls.objetivos.map((o) => `<li>${rich(capitalize(o.replace(/^al terminar (serás|seras) capaz de\s*/i, "")))}</li>`).join("")}</ul>
      </div>
      <div class="case-grid">
        <article class="card case-text">
          <span class="eyebrow">El caso</span>
          <h2 style="margin-top:8px">${esc(c.titulo)}</h2>
          ${paras(c.narrativa)}
        </article>
        <aside class="card">
          <span class="eyebrow">Datos clave</span>
          <dl class="data-grid" style="margin-top:12px">${c.datos.map((d) => `<div><dt>${esc(d.k)}</dt><dd>${esc(d.v)}</dd></div>`).join("")}</dl>
        </aside>
      </div>
      <div class="decision">
        <span class="eyebrow">Punto de decisión</span>
        <p style="margin-top:8px">${rich(c.decision)}</p>
        <textarea class="field" data-decision placeholder="Escribe tu decisión y por qué, antes de estudiar la clase.">${esc(saved)}</textarea>
        <div class="row" style="margin-top:10px"><span class="psub" style="color:#AEB6CC;font-size:.85rem">Se guarda en este dispositivo. Al final de la clase la contrastarás con la resolución.</span></div>
      </div>
      <div class="card">
        <span class="eyebrow">Para discutir antes de estudiar</span>
        <ol class="discussion" style="margin-top:12px">${c.discusion.map((q) => `<li>${rich(q)}</li>`).join("")}</ol>
      </div>
      <div class="row"><a class="btn primary" href="#/clase/${cls.id}/clase">Estudiar la clase →</a><a class="btn" href="#/clase/${cls.id}/audio">Escuchar la audioguía</a></div>
    </section>`;
  const bind = (root) => {
    root.querySelector("[data-decision]").addEventListener("input", (e) => store.set(cls.id, "caso", "decision", e.target.value));
  };
  return { html, bind };
}

export function renderContent(cls) {
  const resolved = store.get(cls.id, "caso").resuelto === true;
  const decision = store.get(cls.id, "caso").decision;
  const blocks = cls.bloques
    .map(
      (b, i) => `
      <section class="block" id="b${i}">
        <div class="block-head"><span class="n">${String(i + 1).padStart(2, "0")}</span><h2>${esc(b.titulo)}</h2></div>
        <p class="block-idea">${rich(b.idea)}</p>
        ${b.secciones.map(section).join("")}
      </section>`
    )
    .join("");
  const html = `
    <nav class="card" aria-label="Índice">
      <span class="eyebrow">Índice</span>
      <ol style="margin:10px 0 0;padding-left:20px">${cls.bloques.map((b, i) => `<li><a href="javascript:void 0" data-jump="b${i}">${esc(b.titulo)}</a></li>`).join("")}<li><a href="javascript:void 0" data-jump="resol">Resolución del caso</a></li></ol>
    </nav>
    ${blocks}
    <section class="block" id="resol">
      <div class="block-head"><span class="n">✦</span><h2>Resolución del caso</h2></div>
      <div data-resol>${resolved ? resolution(cls, decision) : `
        <div class="reveal-box">
          <p>Antes de mirar: vuelve a tu decisión en la pestaña <b>Caso</b>. ¿La mantendrías después de estudiar?</p>
          <button class="btn primary" data-reveal>Ver la resolución razonada</button>
        </div>`}</div>
    </section>
    <section class="block">
      <div class="block-head"><span class="n">✦</span><h2>Lo que te tienes que llevar</h2></div>
      <ul class="keys">${cls.claves.map((k) => `<li>${rich(k)}</li>`).join("")}</ul>
    </section>
    <section class="block">
      <div class="block-head"><span class="n">✦</span><h2>Glosario</h2></div>
      <div class="gloss">${cls.glosario.map((g) => `<details><summary>${esc(g.t)}</summary><p style="margin:8px 0 0">${rich(g.d)}</p></details>`).join("")}</div>
    </section>
    ${cls.referencias?.length ? `<section class="block"><div class="block-head"><span class="n">✦</span><h2>Bibliografía</h2></div><ol class="refs">${cls.referencias.map((r) => `<li>${esc(r)}</li>`).join("")}</ol></section>` : ""}
    <div class="row" style="margin-top:28px"><a class="btn primary" href="#/clase/${cls.id}/test">Ponerme a prueba →</a></div>`;

  const bind = (root) => {
    root.querySelectorAll("[data-jump]").forEach((a) =>
      a.addEventListener("click", () => {
        const target = document.getElementById(a.dataset.jump);
        window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - 130 });
      })
    );
    root.querySelector("[data-reveal]")?.addEventListener("click", () => {
      store.set(cls.id, "caso", "resuelto", true);
      root.querySelector("[data-resol]").innerHTML = resolution(cls, decision);
    });
    root.querySelectorAll("figure button").forEach((b) => b.addEventListener("click", () => openLightbox(b.dataset.src, b.dataset.cap)));
  };
  return { html, bind };
}

const section = (s) => `
  <div class="card section">
    <h3>${esc(s.titulo)}</h3>
    <div class="prose">${paras(s.texto)}</div>
    ${s.figura ? `<figure><button data-src="img/${esc(s.figura)}.webp" data-cap="${esc(s.pie ?? "")}" aria-label="Ampliar figura"><img loading="lazy" src="img/${esc(s.figura)}.webp" alt="${esc(s.pie ?? s.titulo)}"></button><figcaption>${esc(s.pie ?? "")}</figcaption></figure>` : ""}
    ${s.perla ? `<div class="pearl"><b>Perla</b><span>${rich(s.perla)}</span></div>` : ""}
  </div>`;

const resolution = (cls, decision) => `
  ${decision ? `<div class="card" style="background:var(--surface-2)"><span class="eyebrow">Tu decisión inicial</span><p style="margin:8px 0 0">${esc(decision)}</p></div>` : ""}
  <div class="card prose" style="margin-top:12px">${paras(cls.resolucion)}</div>`;

function openLightbox(src, cap) {
  const d = document.getElementById("lightbox");
  d.querySelector("img").src = src;
  d.querySelector("p").textContent = cap;
  d.showModal();
}
document.querySelector("#lightbox .lb-close").addEventListener("click", () => document.getElementById("lightbox").close());
document.getElementById("lightbox").addEventListener("click", (e) => e.target.id === "lightbox" && e.target.close());

export function renderAudio(cls, tracks) {
  const heard = store.get(cls.id, "audio");
  const total = tracks.reduce((a, t) => a + t.seg, 0);
  const cur = player.current();
  const sel = cur?.cls.id === cls.id ? cur.index : 0;
  const html = `
    <div class="audio-layout">
      <div class="stack">
        <div class="slide-frame"><img data-slide src="${slideSrc(cls, tracks[sel])}" alt="Diapositiva"></div>
        <div class="card">
          <div class="row"><span class="eyebrow" data-now>Diapositiva ${tracks[sel].n}</span><span class="spacer"></span><button class="linkbtn" data-tx>Mostrar transcripción</button></div>
          <h3 data-title style="margin-top:6px">${esc(tracks[sel].titulo)}</h3>
          <div class="transcript" data-text hidden></div>
        </div>
      </div>
      <div class="card">
        <div class="row"><div><span class="eyebrow">Audioguía con las notas del profesor</span><div class="muted mono" style="font-size:.85rem">${tracks.length} pistas · ${Math.round(total / 60)} min</div></div></div>
        <button class="btn primary" data-playall style="width:100%;margin:12px 0">▶ ${cur?.cls.id === cls.id ? "Continuar" : "Escuchar desde el principio"}</button>
        <ol class="track-list">${tracks
          .map(
            (t, i) => `<li class="${heard[t.n] ? "done" : ""}"><button data-i="${i}" class="${i === sel ? "on" : ""}">
              <span class="tn">${String(t.n).padStart(2, "0")}</span><span class="tt">${esc(t.titulo)}</span><span class="td">${fmtTime(t.seg)}</span></button></li>`
          )
          .join("")}</ol>
      </div>
    </div>`;

  const bind = (root) => {
    let shown = sel;
    let showText = false;
    const show = (i) => {
      shown = i;
      root.querySelector("[data-slide]").src = slideSrc(cls, tracks[i]);
      root.querySelector("[data-title]").textContent = tracks[i].titulo;
      root.querySelector("[data-now]").textContent = `Diapositiva ${tracks[i].n}`;
      root.querySelector("[data-text]").innerHTML = paras([tracks[i].notas.replace(/\[pausa\]/g, "…")]);
      root.querySelectorAll(".track-list button").forEach((b) => b.classList.toggle("on", Number(b.dataset.i) === i));
    };
    show(sel);
    root.querySelector("[data-tx]").addEventListener("click", (e) => {
      showText = !showText;
      root.querySelector("[data-text]").hidden = !showText;
      e.target.textContent = showText ? "Ocultar transcripción" : "Mostrar transcripción";
    });
    root.querySelectorAll(".track-list button").forEach((b) =>
      b.addEventListener("click", () => {
        const i = Number(b.dataset.i);
        show(i);
        player.play(cls, tracks, i);
      })
    );
    root.querySelector("[data-playall]").addEventListener("click", () => {
      const c = player.current();
      if (c?.cls.id === cls.id) return player.toggle();
      player.play(cls, tracks, shown);
    });
    const off = player.onChange((c) => {
      if (!root.isConnected) return off();
      if (c?.cls.id === cls.id && c.index !== shown) show(c.index);
    });
  };
  return { html, bind };
}

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

const slideSrc =(cls, t) => `slides/${cls.id}-${String(t.n).padStart(2, "0")}.jpg`;
