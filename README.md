# Propedéutica Quirúrgica · 3.º UCM

App de estudio de las cuatro clases de Fisiopatología y Propedéutica Quirúrgica (Pablo Lozano Lominchar):
Temas 25-26 (arterial), 27 (venosa y linfática), 32 (tecnología avanzada) y 39 (intraoperatorio).

Cada clase sigue el método del caso: paciente y punto de decisión, bloques conceptuales, resolución razonada,
audioguía narrada a partir de las notas del ponente, y autoevaluación (14 preguntas tipo test con explicación
de cada opción, 10 de respuesta corta y 3 de desarrollo con respuesta modelo y rúbrica).

Web estática sin dependencias. Contenidos en `data/*.json`; `python3 tools/validate.py` comprueba el esquema.
La audioguía (voz neural es-ES-AlvaroNeural) y las imágenes de las diapositivas se regeneran desde los .pptx y sus PDF con
`tools/build_audioguide.py`. Para usar una grabación propia basta con reemplazar `audio/<clase>_<nn>.mp3`
(y actualizar su duración `seg` en `data/audioguia.json`). `tools/e2e.js` recorre la app entera en el navegador.
