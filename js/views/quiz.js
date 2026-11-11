// Autoevaluación: test de 4 opciones, respuesta corta (3-7 palabras) y desarrollo (~300 palabras).
import { esc, rich, paras, norm, words, LETTERS, ring, toast } from "../util.js";
import * as store from "../store.js";

const LONG_TARGET = 300;
const LONG_MIN = 250;
const LONG_MAX = 350;

/* ---------------- Test ---------------- */

/**
 * items: [{cid, i, q}] — pregunta original y su posición en la clase.
 * persist: si guarda en el progreso de la clase (false en el simulacro, que lleva su propio registro).
 */
export function renderTest(items, { persist = true, color = "var(--accent)", onRestart } = {}) {
  const answers = new Map(items.map((it, k) => [k, persist ? store.get(it.cid, "test")[it.i] : undefined]));
  let pos = Math.max(0, items.findIndex((_, k) => answers.get(k) == null));
  if (answers.size && [...answers.values()].every((v) => v != null)) pos = items.length;

  const html = `<div data-quiz></div>`;
  const bind = (root) => {
    const box = root.querySelector("[data-quiz]");
    const draw = () => (pos >= items.length ? drawResult() : drawQuestion());

    const dots = () =>
      `<div class="dots">${items
        .map((it, k) => {
          const a = answers.get(k);
          const cls = a == null ? "" : a === it.q.c ? "ok" : "bad";
          return `<i class="${cls} ${k === pos ? "cur" : ""}"></i>`;
        })
        .join("")}</div>`;

    function drawQuestion() {
      const it = items[pos];
      const a = answers.get(pos);
      const done = a != null;
      box.innerHTML = `
        <div class="quiz-top"><span class="chip mono">${pos + 1} / ${items.length}</span>${dots()}</div>
        <div class="card">
          ${it.tag ? `<span class="eyebrow">${esc(it.tag)}</span>` : ""}
          <p class="q-text">${rich(it.q.q)}</p>
          <div class="opts">${it.q.o
            .map((o, k) => {
              const state = done ? (k === it.q.c ? "right" : k === a ? "wrong" : "") : "";
              const why = done ? `<div class="why"><b>${k === it.q.c ? "Correcta." : "Falsa."}</b> ${rich(it.q.e[k])}</div>` : "";
              return `<button class="opt ${state}" data-k="${k}" ${done ? "disabled" : ""}><span class="L">${LETTERS[k]}</span><span>${rich(o)}</span>${why}</button>`;
            })
            .join("")}</div>
          ${done ? `<div class="verdict ${a === it.q.c ? "ok" : "bad"}">${a === it.q.c ? "Bien razonado." : `Era la ${LETTERS[it.q.c]}. Lee por qué cada opción es correcta o falsa.`}</div>` : ""}
        </div>
        <div class="row" style="margin-top:14px">
          <button class="btn" data-prev ${pos === 0 ? "disabled" : ""}>← Anterior</button>
          <span class="spacer"></span>
          <button class="btn primary" data-next ${done ? "" : "disabled"}>${pos === items.length - 1 ? "Ver resultado" : "Siguiente →"}</button>
        </div>`;
      box.querySelectorAll(".opt:not([disabled])").forEach((b) =>
        b.addEventListener("click", () => {
          const k = Number(b.dataset.k);
          answers.set(pos, k);
          if (persist) store.set(it.cid, "test", it.i, k);
          drawQuestion();
          box.querySelector(".verdict")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        })
      );
      box.querySelector("[data-prev]").addEventListener("click", () => ((pos -= 1), draw()));
      box.querySelector("[data-next]").addEventListener("click", () => {
        const nextOpen = items.findIndex((_, k) => k > pos && answers.get(k) == null);
        pos = nextOpen === -1 ? items.length : nextOpen;
        draw();
        window.scrollTo({ top: 0 });
      });
    }

    function drawResult() {
      const ok = items.filter((it, k) => answers.get(k) === it.q.c).length;
      const pct = Math.round((ok / items.length) * 100);
      const wrong = items.map((_, k) => k).filter((k) => answers.get(k) !== items[k].q.c);
      box.innerHTML = `
        <div class="card result">
          ${ring(pct, color)}
          <h2>${ok} de ${items.length} correctas</h2>
          <p class="muted">${pct >= 85 ? "Dominas el tema. Pasa al desarrollo." : pct >= 60 ? "Base sólida; repasa las falladas con calma." : "Vuelve al caso y a los bloques antes de repetir."}</p>
          <div class="row" style="justify-content:center">
            ${wrong.length ? `<button class="btn primary" data-wrong>Repasar las ${wrong.length} falladas</button>` : ""}
            <button class="btn" data-restart>Empezar de nuevo</button>
          </div>
        </div>`;
      box.querySelector("[data-wrong]")?.addEventListener("click", () => {
        wrong.forEach((k) => {
          answers.set(k, undefined);
          if (persist) store.set(items[k].cid, "test", items[k].i, undefined);
        });
        pos = wrong[0];
        draw();
      });
      box.querySelector("[data-restart]").addEventListener("click", () => {
        if (onRestart) return onRestart();
        items.forEach((it, k) => {
          answers.set(k, undefined);
          if (persist) store.set(it.cid, "test", it.i, undefined);
        });
        pos = 0;
        draw();
      });
    }
    draw();
  };
  return { html, bind };
}

/* ---------------- Respuesta corta ---------------- */

export function checkShort(answer, groups) {
  const a = norm(answer);
  const n = words(answer);
  if (!a || n > 12) return false;
  const padded = ` ${a} `;
  const hit = (kw) => {
    const k = norm(kw);
    return k.length <= 3 ? padded.includes(` ${k} `) : a.includes(k);
  };
  return groups.every((g) => g.some(hit));
}

export function renderShort(cls) {
  const saved = store.get(cls.id, "cortas");
  const html = `
    <p class="muted">Responde con <b>3 a 7 palabras</b>. La corrección busca los conceptos clave, no la frase exacta; si crees que tu respuesta es válida, puedes darla por buena.</p>
    ${cls.cortas
      .map(
        (q, i) => `
      <div class="card short-item" data-i="${i}">
        <div class="short-q"><span class="mono muted">${String(i + 1).padStart(2, "0")} · </span>${rich(q.q)}</div>
        <form class="row" data-form>
          <input class="field" style="flex:1;min-width:200px" name="a" autocomplete="off" placeholder="Tu respuesta (3-7 palabras)" value="${esc(saved[i]?.ans ?? "")}">
          <button class="btn primary">Comprobar</button>
        </form>
        <div data-fb>${saved[i] ? feedback(q, saved[i]) : ""}</div>
      </div>`
      )
      .join("")}`;

  const bind = (root) => {
    root.querySelectorAll(".short-item").forEach((card) => {
      const i = Number(card.dataset.i);
      const q = cls.cortas[i];
      card.querySelector("[data-form]").addEventListener("submit", (e) => {
        e.preventDefault();
        const ans = e.target.a.value.trim();
        const n = words(ans);
        if (n < 1) return toast("Escribe una respuesta");
        if (n > 7) toast("Más de 7 palabras: intenta concretar");
        const rec = { ans, ok: checkShort(ans, q.k), manual: false };
        store.set(cls.id, "cortas", i, rec);
        card.querySelector("[data-fb]").innerHTML = feedback(q, rec);
      });
      card.addEventListener("click", (e) => {
        if (!e.target.matches("[data-accept]")) return;
        const rec = { ...store.get(cls.id, "cortas")[i], ok: true, manual: true };
        store.set(cls.id, "cortas", i, rec);
        card.querySelector("[data-fb]").innerHTML = feedback(q, rec);
      });
    });
  };
  return { html, bind };
}

const feedback = (q, rec) => `
  <div class="feedback ${rec.ok ? "ok" : "bad"}">
    <div>${rec.ok ? (rec.manual ? "Dada por buena." : "Correcto.") : "No coincide con lo esperado."} Respuesta modelo: <span class="model">${esc(q.r)}</span></div>
    <div style="margin-top:6px">${rich(q.e)}</div>
    ${rec.ok ? "" : `<div style="margin-top:8px"><button class="linkbtn" data-accept>Mi respuesta decía lo mismo: darla por buena</button></div>`}
  </div>`;

/* ---------------- Desarrollo ---------------- */

export function renderLong(cls) {
  const saved = store.get(cls.id, "largas");
  const html = cls.largas
    .map((q, i) => {
      const s = saved[i] ?? {};
      return `
      <div class="card stack long-item" data-i="${i}" style="margin-bottom:16px">
        <div><span class="eyebrow">Pregunta de desarrollo ${i + 1}</span><p class="q-text" style="margin-top:8px">${rich(q.q)}</p><p class="muted" style="margin:0">${rich(q.guia)}</p></div>
        <div>
          <textarea class="field" data-txt rows="10" placeholder="Unas ${LONG_TARGET} palabras. Razona como en un examen: mecanismo, consecuencia, decisión.">${esc(s.txt ?? "")}</textarea>
          <div class="wc" data-wc></div>
        </div>
        <div data-eval>${s.open ? evaluation(q, s) : `<button class="btn primary" data-open>Ver respuesta modelo y autoevaluarme</button>`}</div>
      </div>`;
    })
    .join("");

  const bind = (root) => {
    root.querySelectorAll(".long-item").forEach((card) => {
      const i = Number(card.dataset.i);
      const q = cls.largas[i];
      const ta = card.querySelector("[data-txt]");
      const wc = card.querySelector("[data-wc]");
      const paint = () => {
        const n = words(ta.value);
        const okRange = n >= LONG_MIN && n <= LONG_MAX;
        wc.className = `wc ${okRange ? "ok" : ""}`;
        wc.innerHTML = `<b class="mono">${n}</b> / ${LONG_TARGET} palabras <span class="bar"><i style="width:${Math.min(100, (n / LONG_TARGET) * 100)}%;background:${okRange ? "var(--ok)" : n > LONG_MAX ? "var(--bad)" : "var(--accent)"}"></i></span>`;
      };
      paint();
      ta.addEventListener("input", () => {
        paint();
        store.set(cls.id, "largas", i, { ...(store.get(cls.id, "largas")[i] ?? {}), txt: ta.value });
      });
      card.addEventListener("click", (e) => {
        if (e.target.matches("[data-open]")) {
          if (words(ta.value) < 60 && !confirm("Has escrito poco. Intentarlo primero fija mucho mejor el tema. ¿Ver la respuesta modelo igualmente?")) return;
          const s = { ...(store.get(cls.id, "largas")[i] ?? {}), open: true };
          store.set(cls.id, "largas", i, s);
          card.querySelector("[data-eval]").innerHTML = evaluation(q, s);
        }
      });
      card.addEventListener("change", (e) => {
        if (!e.target.matches("[data-rub]")) return;
        const checks = [...card.querySelectorAll("[data-rub]")].map((c) => c.checked);
        const score = checks.reduce((a, c, k) => a + (c ? q.rubrica[k].p : 0), 0);
        store.set(cls.id, "largas", i, { ...(store.get(cls.id, "largas")[i] ?? {}), checks, score });
        card.querySelector("[data-score]").textContent = score;
      });
    });
  };
  return { html, bind };
}

const evaluation = (q, s) => {
  const checks = s.checks ?? [];
  const score = s.score ?? 0;
  return `
    <div class="stack">
      <div class="model-answer"><span class="eyebrow">Respuesta modelo · ${words(q.modelo)} palabras</span><div style="margin-top:8px">${paras(q.modelo)}</div></div>
      <div>
        <div class="row"><span class="eyebrow">Autoevaluación: marca lo que tu respuesta contiene</span><span class="spacer"></span><span class="chip lime mono"><span data-score>${score}</span> / 10</span></div>
        <ul class="rubric" style="margin-top:10px">${q.rubrica
          .map((r, k) => `<li><label><input type="checkbox" data-rub ${checks[k] ? "checked" : ""}><span>${rich(r.c)}</span><span class="pts">${r.p} pt</span></label></li>`)
          .join("")}</ul>
      </div>
    </div>`;
};
