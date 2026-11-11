// Recorrido completo de la app en el navegador (pegar en la consola o ejecutar con una herramienta de automatización).
// Ejecutar con el progreso vacío (localStorage borrado y página recargada).
// Devuelve un informe con los fallos encontrados; un array vacío en `errors` significa que todo funciona.
(async () => {
  const errors = [];
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const go = async (hash) => { location.hash = hash; await wait(350); };
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const ok = (cond, msg) => { if (!cond) errors.push(msg); };
  const head = async (url) => (await fetch(url, { method: "HEAD", cache: "no-store" })).ok;

  if (localStorage.length) return { errors: ["borra localStorage y recarga antes de ejecutar"] };
  const ids = ["t25", "t27", "t32", "t39"];
  const audio = await (await fetch("data/audioguia.json", { cache: "no-store" })).json();

  for (const id of ids) {
    const cls = await (await fetch(`data/${id}.json`, { cache: "no-store" })).json();

    await go(`#/clase/${id}/caso`);
    ok($$(".objectives li").length === cls.objetivos.length, `${id}: objetivos`);
    const ta = $("[data-decision]");
    ta.value = "mi decisión"; ta.dispatchEvent(new Event("input"));

    await go(`#/clase/${id}/clase`);
    ok($$(".block").length >= cls.bloques.length + 2, `${id}: bloques`);
    const imgs = $$("figure img");
    for (const img of imgs) if (!(await head(img.getAttribute("src")))) errors.push(`${id}: figura ${img.src}`);
    $("figure button")?.click(); await wait(100);
    ok($("#lightbox").open, `${id}: lightbox no abre`); $("#lightbox .lb-close").click();
    $("[data-reveal]").click(); await wait(50);
    ok($("[data-resol]").textContent.includes("mi decisión"), `${id}: resolución sin decisión`);

    await go(`#/clase/${id}/audio`);
    const tracks = audio[id];
    ok($$(".track-list button").length === tracks.length, `${id}: pistas`);
    for (const t of tracks) {
      if (!(await head(t.audio))) errors.push(`${id}: audio ${t.audio}`);
      const slide = `slides/${id}-${String(t.n).padStart(2, "0")}.jpg`;
      if (!(await head(slide))) errors.push(`${id}: diapositiva ${slide}`);
    }

    await go(`#/clase/${id}/test`);
    for (let i = 0; i < cls.test.length; i++) {
      const k = i % 2 ? cls.test[i].c : (cls.test[i].c + 1) % 4;   // mitad aciertos, mitad fallos
      $(`.opt[data-k="${k}"]`).click(); await wait(20);
      ok($$(".opt .why").length === 4, `${id}: test ${i} sin 4 explicaciones`);
      $("[data-next]").click(); await wait(20);
    }
    ok($(".result h2")?.textContent.startsWith("7 de 14"), `${id}: resultado test (${$(".result h2")?.textContent})`);
    $("[data-wrong]").click(); await wait(20);
    ok(!$(".verdict"), `${id}: repaso de falladas no limpia la pregunta`);

    await go(`#/clase/${id}/cortas`);
    $$(".short-item").forEach((card, i) => {
      const f = card.querySelector("form"); f.a.value = cls.cortas[i].r; f.requestSubmit();
    });
    await wait(50);
    ok($$(".feedback.ok").length === cls.cortas.length, `${id}: cortas modelo rechazadas (${$$(".feedback.ok").length})`);
    const f0 = $(".short-item form"); f0.a.value = "no lo sé"; f0.requestSubmit(); await wait(20);
    ok($(".short-item .feedback.bad"), `${id}: corta incorrecta aceptada`);
    $(".short-item [data-accept]").click(); await wait(20);
    ok($(".short-item .feedback.ok"), `${id}: override no funciona`);

    await go(`#/clase/${id}/desarrollo`);
    const t0 = $("[data-txt]"); t0.value = "palabra ".repeat(300); t0.dispatchEvent(new Event("input"));
    $("[data-open]").click(); await wait(30);
    $$("[data-rub]").forEach((c) => c.click()); await wait(30);
    ok($("[data-score]").textContent === "10", `${id}: rúbrica no suma 10`);
  }

  await go("#/progreso");
  ok($$(".prog-grid .card").length === 4, "progreso: tarjetas");
  await go("#/simulacro");
  ok($$(".opt").length === 4 && $(".chip").textContent.includes("/ 20"), "simulacro");
  await go("#/audio");
  ok($$(".class-card").length === 4, "índice de audio");
  await go("#/");
  ok($$(".class-card").length === 4, "inicio");
  return { errors, checked: ids.length };
})();
