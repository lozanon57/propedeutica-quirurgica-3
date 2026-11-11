// Utilidades compartidas: escape HTML, formato mínimo y normalización de texto.
export const esc = (s = "") =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// Permite **negrita** dentro de texto ya escapado.
export const rich = (s = "") => esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

export const paras = (arr = []) => (Array.isArray(arr) ? arr : String(arr).split(/\n\n+/)).map((p) => `<p>${rich(p)}</p>`).join("");

export const norm = (s = "") =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9%\s]/g, " ").replace(/\s+/g, " ").trim();

export const words = (s = "") => (s.trim() ? s.trim().split(/\s+/).length : 0);

export const fmtTime = (sec = 0) => {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

export const LETTERS = ["A", "B", "C", "D"];

export function toast(msg) {
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = msg;
  document.body.append(t);
  setTimeout(() => t.remove(), 2200);
}

// Barajado determinista para el simulacro (no muta el array original).
export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const ring = (pct, color = "var(--accent)") => `
  <svg class="score-ring" viewBox="0 0 120 120" role="img" aria-label="${pct} %">
    <circle cx="60" cy="60" r="50" fill="none" stroke="var(--line)" stroke-width="12"/>
    <circle cx="60" cy="60" r="50" fill="none" stroke="${color}" stroke-width="12" stroke-linecap="round"
      stroke-dasharray="${(pct / 100) * 314} 314" transform="rotate(-90 60 60)"/>
    <text x="60" y="68" text-anchor="middle" font-family="Geist Mono, monospace" font-size="26" font-weight="600" fill="var(--ink)">${pct}%</text>
  </svg>`;
