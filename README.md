# Propedéutica Quirúrgica · 3.º UCM

App de estudio de las cuatro clases de Fisiopatología y Propedéutica Quirúrgica (Pablo Lozano Lominchar):
Temas 25-26 (arterial), 27 (venosa y linfática), 32 (tecnología avanzada) y 39 (intraoperatorio).

Cada clase sigue el método del caso: paciente y punto de decisión, bloques conceptuales, resolución razonada,
audioguía narrada a partir de las notas del ponente, y autoevaluación (14 preguntas tipo test con explicación
de cada opción, 10 de respuesta corta y 3 de desarrollo con respuesta modelo y rúbrica).

Web estática sin dependencias. Contenidos en `data/*.json`; `python3 tools/validate.py` comprueba el esquema.
Para sustituir la voz sintética por una grabación propia basta con reemplazar el fichero `audio/<clase>_<nn>.m4a`
correspondiente (y actualizar su duración `seg` en `data/audioguia.json`).
