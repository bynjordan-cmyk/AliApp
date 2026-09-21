# Límites de seguridad del producto

AliApp registra **observaciones y patrones temporales**. No diagnostica alergia
alimentaria, APLV, intolerancia ni causalidad.

## Lo que AliApp puede decir

- «Se registraron síntomas después de 4 de 6 exposiciones registradas.»
- «Intervalo mediano entre estos eventos: 3 h 10 min.»
- «Este patrón se ha repetido en el periodo seleccionado.»
- «Todavía hay pocos datos registrados.»

## Lo que AliApp nunca debe decir

- «La leche causó esta reacción.»
- «Tu bebé tiene APLV.»
- «Retira el huevo de la dieta.»
- «Dale X mg de medicación.»
- «Este alimento es seguro.»
- «Reintroduce este alimento mañana.»

Tampoco existe ninguna **puntuación numérica de riesgo de alergia**.

## Dónde vive la regla

La regla no está solo en los componentes: está en tres capas.

1. **Base de datos.**
   - `episode_exposures` no tiene columna de causa: solo `relation_type` y una
     `confidence_label` descriptiva.
   - `symptoms` no tiene columna de alimento sospechoso.
   - Un trigger rechaza que un resumen automático (`system_summary`) fije
     `avoid` o `professional_supervision`.
2. **Dominio.** `src/lib/safety.ts` reconoce las frases prohibidas.
   `assertSafeStatement()` falla en desarrollo y solo avisa en producción:
   bloquear la pantalla de una madre no es la respuesta correcta.
3. **Pruebas.** `tests/domain/safety.test.ts` y `tests/rls/domain.test.ts`
   comprueban ambas cosas, para que la regla no dependa de que alguien la
   recuerde al escribir una pantalla nueva.

## Reacciones graves

Una reacción de intensidad alta podrá mostrar una interfaz genérica de
seguridad, que se diseñará más adelante. **La aplicación no inventa un plan de
tratamiento.** Los planes de emergencia indicados por un profesional se guardan
aparte, como documento de la familia.

## Etiquetas de confianza

`insufficient_data`, `under_observation`, `temporally_consistent`,
`inconsistent` describen **consistencia temporal observada**, no probabilidad
clínica. Su redacción visible debe mantenerse descriptiva.

## Lectura de etiquetas

Escanear una etiqueta compara **texto con una lista que hizo una familia**. No
es un análisis del producto: AliApp no sabe qué lleva dentro un envase, solo qué
pone en la foto que le han dado.

Frases válidas:

- «Detectamos: leche en polvo.»
- «Caseinato coincide con un alimento marcado como Evitar.»
- «Ninguno de los ingredientes leídos coincide con un alimento marcado como
  Evitar.»

Frases prohibidas, también aquí:

- «Este alimento es seguro.»
- «Puedes dárselo.»
- «No contiene alérgenos.»

Dos reglas de pantalla que no se negocian:

1. El **texto original detectado** se muestra siempre, tal cual se leyó.
2. El aviso **«Verifica también la etiqueta original del producto.»** está
   siempre visible, haya coincidencias o no.

La ausencia de coincidencias significa exactamente una cosa: ninguna palabra
leída coincide con la lista de esa familia. No dice nada del producto, y el
texto en pantalla lo dice con esas palabras (`label.noMatchesHint`).

El OCR es real en las tres plataformas: tesseract.js sobre WebAssembly en el
navegador y ML Kit en el teléfono, siempre en el dispositivo. El detalle vive
en `label-scan.md`.

Dos consecuencias para la seguridad del producto:

- El texto detectado **se puede corregir antes de comparar**. Un motor de OCR
  se equivoca, y quien tiene el envase en la mano es quien sabe lo que pone.
  La interpretación nunca se guarda sola.
- La pantalla dice de dónde salió el texto (`label.engineNotice`). Si alguna
  vez apareciera el fixture de pruebas, lo diría con todas las letras
  (`label.fixtureNotice`): nadie debe confundir una demostración con la
  lectura de su propia foto.

## Correcciones

Un registro se puede corregir entero, incluida la hora en que ocurrió. Eso no
es una laguna de seguridad: es lo que permite que el historial cuente lo que
pasó de verdad.

Lo que la base garantiza:

- `created_at` y `created_by` no se editan nunca,
- cada corrección deja una fila en `event_revisions`, escrita por un trigger y
  no por el cliente,
- un borrado lógico se guarda como borrado, no como edición,
- quién puede corregir qué lo sigue decidiendo `app.can_edit_event`.

La marca visible es discreta —«Editado»— y nunca tiene tono de error. Nadie
registra perfecto a las cuatro de la mañana.
