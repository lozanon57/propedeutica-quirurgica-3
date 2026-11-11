// Reproductor de la audioguía: persiste entre vistas, avanza solo de diapositiva en diapositiva.
import { esc, fmtTime } from "./util.js";
import * as store from "./store.js";

const audio = new Audio();
audio.preload = "metadata";
const el = document.getElementById("player");
const listeners = new Set();

let queue = [];
let index = -1;
let classInfo = null;

const SPEEDS = [1, 1.25, 1.5, 1.75, 0.85];
audio.playbackRate = store.getPref("speed", 1);

const ICON_PLAY = '<svg viewBox="0 0 24 24"><path d="M7 4.5v15l13-7.5z"/></svg>';
const ICON_PAUSE = '<svg viewBox="0 0 24 24"><rect x="6" y="4.5" width="4" height="15" rx="1"/><rect x="14" y="4.5" width="4" height="15" rx="1"/></svg>';
const ICON_PREV = '<svg viewBox="0 0 24 24"><path d="M6 5h2v14H6zM20 5v14L9 12z"/></svg>';
const ICON_NEXT = '<svg viewBox="0 0 24 24"><path d="M16 5h2v14h-2zM4 5v14l11-7z"/></svg>';

export const current = () => (index >= 0 ? { cls: classInfo, track: queue[index], index, playing: !audio.paused } : null);
export const onChange = (fn) => (listeners.add(fn), () => listeners.delete(fn));
const emit = () => listeners.forEach((fn) => fn(current()));

export function play(cls, tracks, i) {
  if (classInfo?.id === cls.id && index === i) return toggle();
  classInfo = cls;
  queue = tracks;
  index = i;
  audio.src = tracks[i].audio;
  audio.play().catch(() => {});
  render();
  emit();
  setMediaSession();
}

export function toggle() {
  if (index < 0) return;
  audio.paused ? audio.play().catch(() => {}) : audio.pause();
}

function step(delta) {
  const next = index + delta;
  if (next < 0 || next >= queue.length) return;
  play(classInfo, queue, next);
}

function cycleSpeed() {
  const i = SPEEDS.indexOf(audio.playbackRate);
  audio.playbackRate = SPEEDS[(i + 1) % SPEEDS.length];
  store.setPref("speed", audio.playbackRate);
  render();
}

function setMediaSession() {
  if (!("mediaSession" in navigator)) return;
  const t = queue[index];
  navigator.mediaSession.metadata = new MediaMetadata({
    title: `${t.n}. ${t.titulo}`,
    artist: "Pablo Lozano · Propedéutica Quirúrgica",
    album: `${classInfo.tema} · ${classInfo.titulo}`,
    artwork: [{ src: `slides/${classInfo.id}-${String(t.n).padStart(2, "0")}.jpg`, sizes: "1280x720", type: "image/jpeg" }],
  });
  navigator.mediaSession.setActionHandler("previoustrack", () => step(-1));
  navigator.mediaSession.setActionHandler("nexttrack", () => step(1));
}

function render() {
  if (index < 0) return;
  const t = queue[index];
  el.hidden = false;
  document.body.classList.add("has-player");
  el.innerHTML = `
    <button class="pbtn" data-a="toggle" aria-label="${audio.paused ? "Reproducir" : "Pausa"}">${audio.paused ? ICON_PLAY : ICON_PAUSE}</button>
    <div style="min-width:0">
      <a class="ptitle" href="#/clase/${classInfo.id}/audio" style="color:#fff;display:block">${t.n}. ${esc(t.titulo)}</a>
      <div class="psub"><span data-time>${fmtTime(audio.currentTime)}</span> / ${fmtTime(t.seg)} · ${esc(classInfo.tema)}</div>
      <input type="range" min="0" max="${t.seg}" step="0.5" value="${audio.currentTime}" aria-label="Posición">
    </div>
    <div class="pside">
      <button class="ic" data-a="prev" aria-label="Anterior">${ICON_PREV}</button>
      <button class="ic" data-a="next" aria-label="Siguiente">${ICON_NEXT}</button>
      <button class="ic" data-a="speed" aria-label="Velocidad">${audio.playbackRate}×</button>
    </div>`;
}

el.addEventListener("click", (e) => {
  const a = e.target.closest("[data-a]")?.dataset.a;
  if (a === "toggle") toggle();
  if (a === "prev") step(-1);
  if (a === "next") step(1);
  if (a === "speed") cycleSpeed();
});
el.addEventListener("input", (e) => {
  if (e.target.type === "range") audio.currentTime = Number(e.target.value);
});

audio.addEventListener("timeupdate", () => {
  const t = el.querySelector("[data-time]");
  const r = el.querySelector("input[type=range]");
  if (t) t.textContent = fmtTime(audio.currentTime);
  if (r && document.activeElement !== r) r.value = audio.currentTime;
});
audio.addEventListener("play", () => (render(), emit()));
audio.addEventListener("pause", () => (render(), emit()));
audio.addEventListener("ended", () => {
  store.set(classInfo.id, "audio", queue[index].n, true);
  if (index < queue.length - 1) step(1);
  else emit();
});
audio.addEventListener("error", () => {
  el.querySelector(".psub")?.insertAdjacentHTML("beforeend", " · no se pudo cargar el audio");
});

document.addEventListener("keydown", (e) => {
  if (e.code !== "Space" || index < 0) return;
  if (["INPUT", "TEXTAREA", "BUTTON"].includes(document.activeElement?.tagName)) return;
  e.preventDefault();
  toggle();
});
