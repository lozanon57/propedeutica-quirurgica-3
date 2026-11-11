// Progreso del alumno: solo en su navegador (localStorage), tolerante a modo privado.
const KEY = "pq3-progress-v1";

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    return {};
  }
}

let state = load();

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* almacenamiento no disponible: el progreso dura lo que la pestaña */
  }
}

export function get(cid, area) {
  return state[cid]?.[area] ?? {};
}

export function set(cid, area, key, value) {
  const cls = state[cid] ?? {};
  const { [key]: _old, ...others } = cls[area] ?? {};
  const bucket = value === undefined ? others : { ...others, [key]: value };
  state = { ...state, [cid]: { ...cls, [area]: bucket } };
  persist();
}

export function resetClass(cid) {
  const { [cid]: _dropped, ...rest } = state;
  state = rest;
  persist();
}

export function resetAll() {
  state = state._prefs ? { _prefs: state._prefs } : {};
  persist();
}

export function getPref(name, fallback) {
  return state._prefs?.[name] ?? fallback;
}

export function setPref(name, value) {
  state = { ...state, _prefs: { ...(state._prefs ?? {}), [name]: value } };
  persist();
}

// Resumen numérico por clase para tarjetas y página de progreso.
export function summary(cls, audio) {
  const test = get(cls.id, "test");
  const cortas = get(cls.id, "cortas");
  const largas = get(cls.id, "largas");
  const heard = get(cls.id, "audio");
  const testDone = Object.keys(test).length;
  const testOk = Object.entries(test).filter(([i, v]) => cls.test[i] && v === cls.test[i].c).length;
  const cortasDone = Object.keys(cortas).length;
  const cortasOk = Object.values(cortas).filter((v) => v.ok).length;
  const largasDone = Object.values(largas).filter((v) => v.score != null).length;
  const audioDone = Object.keys(heard).length;
  const parts = [
    testOk / cls.test.length,
    cortasOk / cls.cortas.length,
    largasDone / cls.largas.length,
    audioDone / Math.max(1, audio.length),
  ];
  const pct = Math.round((parts.reduce((a, b) => a + b, 0) / parts.length) * 100);
  return { testDone, testOk, cortasDone, cortasOk, largasDone, audioDone, pct };
}
