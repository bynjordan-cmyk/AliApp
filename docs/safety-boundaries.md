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
