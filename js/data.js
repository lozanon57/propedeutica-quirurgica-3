// Carga de contenidos. Cada clase vive en data/<id>.json; la audioguía en data/audioguia.json.
export const CLASS_IDS = ["t25", "t27", "t32", "t39"];

let cache = null;

async function fetchJson(url) {
  const res = await fetch(url, { cache: "no-cache" });
  if (!res.ok) throw new Error(`No se pudo cargar ${url} (${res.status})`);
  return res.json();
}

/** @returns {Promise<{classes: object[], byId: Record<string, object>, audio: Record<string, object[]>}>} */
export async function loadAll() {
  if (cache) return cache;
  const [audio, ...classes] = await Promise.all([
    fetchJson("data/audioguia.json"),
    ...CLASS_IDS.map((id) => fetchJson(`data/${id}.json`)),
  ]);
  const byId = Object.fromEntries(classes.map((c) => [c.id, c]));
  cache = { classes, byId, audio };
  return cache;
}

export const colorVars = (id) => `--c: var(--c-${id}); --soft: var(--c-${id}-soft);`;
