// Enrutado por hash y vistas generales (inicio, audioguías, simulacro, progreso).
import { loadAll, colorVars } from "./data.js";
import { esc, ring, fmtTime, shuffle } from "./util.js";
import * as store from "./store.js";
import { renderCase, renderContent, renderAudio } from "./views/lesson.js";
import { renderTest, renderShort, renderLong } from "./views/quiz.js";

const view = document.getElementById("view");
const SIM_SIZE = 20;

const TABS = [
  ["caso", "Caso"],
  ["clase", "Clase"],
  ["audio", "Audioguía"],
  ["test", "Test"],
  ["cortas", "Cortas"],
  ["desarrollo", "Desarrollo"],
];

let cleanup = null;

function mount({ html, bind }, navKey) {
  cleanup?.();
  cleanup = null;
  view.innerHTML = html;
  view.classList.remove("view-enter");
  void view.offsetWidth;
  view.classList.add("view-enter");
  const dispose = bind?.(view);
  if (typeof dispose === "function") cleanup = dispose;
  document.querySelectorAll("[data-nav]").forEach((a) => a.classList.toggle("active", a.dataset.nav === navKey));
}

/* ---------------- Inicio ---------------- */

function home(data) {
  const sums = data.classes.map((c) => store.summary(c, data.audio[c.id]));
  const totalPct = Math.round(sums.reduce((a, s) => a + s.pct, 0) / sums.length);
  const totalMin = Math.round(Object.values(data.audio).flat().reduce((a, t) => a + t.seg, 0) / 60);
  const nQ = data.classes.reduce((a, c) => a + c.test.length + c.cortas.length + c.largas.length, 0);
  return {
    html: `
      <section class="hero">
        <span class="eyebrow">Fisiopatología y Propedéutica Quirúrgica · UCM</span>
        <h1>Cuatro clases.<br><span>Un método.</span></h1>
        <p class="lead">Cada clase empieza con un paciente y una decisión. Estudias los principios, escuchas la clase con las notas del profesor y compruebas que sabes razonar, no solo recordar.</p>
        <div class="hero-stats">
          <div class="stat"><b>${totalPct}%</b><span>tu avance</span></div>
          <div class="stat"><b>${totalMin}′</b><span>de audioguía</span></div>
          <div class="stat"><b>${nQ}</b><span>preguntas</span></div>
        </div>
      </section>
      <section class="bento">
        ${data.classes
          .map(
            (c, i) => `
          <a class="class-card" href="#/clase/${c.id}/caso" style="${colorVars(c.id)}">
            <span class="num">${String(i + 1).padStart(2, "0")} · ${esc(c.tema)}</span>
            <h3>${esc(c.titulo)}</h3>
            <p>${esc(c.subtitulo)}</p>
            <div class="meta"><span class="bar"><i style="width:${sums[i].pct}%"></i></span><span class="mono" style="font-size:.85rem">${sums[i].pct}%</span></div>
          </a>`
          )
          .join("")}
      </section>
      <section class="card" style="margin-top:16px">
        <span class="eyebrow">Cómo estudiar cada clase</span>
        <ol class="discussion" style="margin-top:12px;--c:var(--accent)">
          <li><span><b>Caso.</b> Lee el paciente y escribe tu decisión antes de saber la respuesta.</span></li>
          <li><span><b>Clase y audioguía.</b> Estudia los bloques; escucha la clase diapositiva a diapositiva.</span></li>
          <li><span><b>Resolución.</b> Contrasta tu decisión con el razonamiento del caso.</span></li>
          <li><span><b>Autoevaluación.</b> Test, preguntas cortas y una de desarrollo con respuesta modelo.</span></li>
        </ol>
      </section>
      <p class="footer-note">Pablo Lozano Lominchar · Cirugía General, Hospital General Universitario Gregorio Marañón<br>Tu progreso se guarda solo en este dispositivo.</p>`,
  };
}

/* ---------------- Clase ---------------- */

function classPage(data, cid, tab) {
  const cls = data.byId[cid];
  if (!cls) return notFound();
  const tracks = data.audio[cid] ?? [];
  const body =
    {
      caso: () => renderCase(cls),
      clase: () => renderContent(cls),
      audio: () => renderAudio(cls, tracks),
      test: () => renderTest(cls.test.map((q, i) => ({ cid, i, q })), { color: `var(--c-${cid})` }),
      cortas: () => renderShort(cls),
      desarrollo: () => renderLong(cls),
    }[tab] ?? (() => renderCase(cls));
  const inner = body();
  return {
    html: `
      <div style="${colorVars(cid)}">
        <a class="back" href="#/">← Todas las clases</a>
        <header class="class-head ${tab === "caso" ? "" : "compact"}">
          <span class="eyebrow">${esc(cls.tema)} · ${cls.minutos} min</span>
          <h1>${esc(cls.titulo)}</h1>
          <p class="sub">${esc(cls.subtitulo)}</p>
          <div class="row">${cls.bloquesTemario.map((b) => `<span class="chip">${esc(b)}</span>`).join("")}</div>
        </header>
        <nav class="seg" aria-label="Secciones de la clase"><div class="seg-inner">
          ${TABS.map(([k, label]) => `<a href="#/clase/${cid}/${k}" class="${k === tab ? "active" : ""}">${label}</a>`).join("")}
        </div></nav>
        ${inner.html}
      </div>`,
    bind: inner.bind,
  };
}

/* ---------------- Audioguías (índice) ---------------- */

function audioIndex(data) {
  return {
    html: `
      <span class="eyebrow">Audioguías</span>
      <h1 style="margin-top:6px">Escucha las clases</h1>
      <p class="muted">Cada clase narrada diapositiva a diapositiva a partir de las notas del profesor. Sigue sonando con la pantalla bloqueada y al cambiar de sección.</p>
      <div class="bento" style="margin-top:16px">
        ${data.classes
          .map((c) => {
            const t = data.audio[c.id] ?? [];
            const heard = Object.keys(store.get(c.id, "audio")).length;
            return `<a class="class-card" style="${colorVars(c.id)};min-height:180px" href="#/clase/${c.id}/audio">
              <span class="num">${esc(c.tema)}</span><h3>${esc(c.titulo)}</h3>
              <p class="mono">${t.length} pistas · ${fmtTime(t.reduce((a, x) => a + x.seg, 0))}</p>
              <div class="meta"><span class="bar"><i style="width:${(heard / Math.max(1, t.length)) * 100}%"></i></span><span class="mono" style="font-size:.85rem">${heard}/${t.length}</span></div>
            </a>`;
          })
          .join("")}
      </div>`,
  };
}

/* ---------------- Simulacro ---------------- */

function simulacro(data) {
  const pool = data.classes.flatMap((c) => c.test.map((q, i) => ({ cid: c.id, i, q, tag: `${c.tema} · ${c.titulo}` })));
  const items = shuffle(pool).slice(0, SIM_SIZE);
  const quiz = renderTest(items, { persist: false, onRestart: () => route() });
  return {
    html: `
      <span class="eyebrow">Simulacro de examen</span>
      <h1 style="margin-top:6px">${SIM_SIZE} preguntas al azar</h1>
      <p class="muted">Mezcla las cuatro clases. Cada vez que entras sale una selección distinta; no cuenta para el progreso de cada clase.</p>
      ${quiz.html}`,
    bind: quiz.bind,
  };
}

/* ---------------- Progreso ---------------- */

function progress(data) {
  const rows = data.classes.map((c) => {
    const s = store.summary(c, data.audio[c.id]);
    const line = (label, n, total) =>
      `<div class="prog-row"><span>${label}</span><span class="bar"><i style="width:${(n / Math.max(1, total)) * 100}%"></i></span><span class="mono">${n}/${total}</span></div>`;
    return `
      <div class="card" style="${colorVars(c.id)}">
        <div class="row"><div><span class="eyebrow">${esc(c.tema)}</span><h3 style="margin:4px 0 0">${esc(c.titulo)}</h3></div><span class="spacer"></span><div style="width:84px">${ring(s.pct, `var(--c-${c.id})`)}</div></div>
        ${line("Test (aciertos)", s.testOk, c.test.length)}
        ${line("Cortas (aciertos)", s.cortasOk, c.cortas.length)}
        ${line("Desarrollo", s.largasDone, c.largas.length)}
        ${line("Audioguía", s.audioDone, (data.audio[c.id] ?? []).length)}
        <div class="row" style="margin-top:12px"><a class="btn" href="#/clase/${c.id}/test">Ir al test</a><span class="spacer"></span><button class="linkbtn" data-reset="${c.id}">Reiniciar</button></div>
      </div>`;
  });
  return {
    html: `
      <span class="eyebrow">Tu progreso</span>
      <h1 style="margin-top:6px">Dónde estás</h1>
      <p class="muted">Se guarda solo en este navegador. Si cambias de móvil o borras los datos del navegador, empiezas de cero.</p>
      <div class="prog-grid" style="margin-top:16px">${rows.join("")}</div>
      <div class="row" style="margin-top:20px"><button class="btn" data-reset-all>Borrar todo mi progreso</button></div>`,
    bind: (root) => {
      root.querySelectorAll("[data-reset]").forEach((b) =>
        b.addEventListener("click", () => {
          if (!confirm("¿Reiniciar el progreso de esta clase?")) return;
          store.resetClass(b.dataset.reset);
          route();
        })
      );
      root.querySelector("[data-reset-all]").addEventListener("click", () => {
        if (!confirm("¿Borrar todo tu progreso? No se puede deshacer.")) return;
        store.resetAll();
        route();
      });
    },
  };
}

const notFound = () => ({ html: `<div class="card"><h2>No encontrado</h2><p><a href="#/">Volver al inicio</a></p></div>` });

/* ---------------- Router ---------------- */

let lastPath = null;

async function route() {
  let data;
  try {
    data = await loadAll();
  } catch (err) {
    view.innerHTML = `<div class="card"><h2>No se han podido cargar las clases</h2><p class="muted">${esc(err.message)}. Comprueba la conexión y recarga.</p></div>`;
    return;
  }
  const [, section, cid, tab] = (location.hash.replace(/^#/, "") || "/").split("/");
  const path = location.hash;
  if (section === "clase") mount(classPage(data, cid, tab || "caso"), "home");
  else if (section === "audio") mount(audioIndex(data), "audio");
  else if (section === "simulacro") mount(simulacro(data), "simulacro");
  else if (section === "progreso") mount(progress(data), "progreso");
  else mount(home(data), "home");
  // Al cambiar de pestaña dentro de la misma clase, mantener la cabecera a la vista.
  const sameClass = lastPath && section === "clase" && lastPath.split("/")[2] === cid;
  if (sameClass) {
    const header = view.querySelector(".class-head");
    const top = header ? header.offsetTop + header.offsetHeight - 50 : 0;
    window.scrollTo({ top: Math.min(window.scrollY, top) });
  } else window.scrollTo({ top: 0 });
  lastPath = path;
}

window.addEventListener("hashchange", route);
route();

if ("serviceWorker" in navigator && location.protocol === "https:") {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
