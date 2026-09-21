# AliApp · lo construido en esta tanda

Resumen de lo que se añadió, con lo verificado y lo que queda pendiente.

## Qué entró

| Fase | Estado | Dónde vive |
| --- | --- | --- |
| 1 · Elevar el sistema visual | Hecho | `src/design-system/`, todas las pestañas |
| 2 · Calendario de evolución | Hecho | `src/features/calendar/` |
| 3 · Reaction Builder | Hecho | `app/reaction-builder.tsx`, `src/features/reactions/` |
| 4 · Fotos y evolución visual | Hecho | `src/features/media/` |
| 5 · Cross-log de deposiciones | Hecho | `src/features/diapers/` |
| 6 · Recordatorios | Fundación | `src/features/notifications/` |
| 7 · Ali Capture | Fundación parcial | `src/features/capture/` |
| 8 · Label Scan | No iniciado | — |
| 9 · Estados vacíos | Hecho | catálogos `es`/`en` |
| 10 · Accesibilidad | Revisado | ver abajo |

## Reglas de seguridad, por escrito y en el código

Cada pieza nueva respeta los límites de `safety-boundaries.md`, y además:

- **Reaction Builder**: las ventanas de 6/12/24 h son filtros de consulta, y así
  se explican en pantalla. Las relaciones se guardan como `manual` —las eligió
  una persona— y sin etiqueta de confianza. La interfaz dice cuánto tiempo pasó
  entre dos registros, que es un hecho medible, y nada más.
- **Cross-log del pañal**: mismo principio. "Se registró maíz 5 h 40 min antes
  de esta deposición" es válido; atribuirle los restos, no.
- **"Lo importante hoy"**: elige un hecho del día entre cinco posibles y lo
  describe. Nunca destaca un alimento como sospechoso. La lógica vive en
  `src/features/today/highlight.ts`, sin React ni base de datos, para poder
  probar exactamente eso.
- **Fotos**: son documentación. AliApp las ordena en el tiempo y no dice nada
  sobre lo que muestran.
- **Recordatorios**: AliApp no propone horarios. No hay intervalos por defecto.
- **Ali Capture**: propone y espera confirmación; nunca guarda en silencio, y no
  deduce síntomas ni causas.

## Base de datos

- `0015_stool_detail.sql` — cantidad, restos visibles de alimento, esfuerzo y
  olor inusual en `diaper_events`, todo opcional.
- `0016_reminders_and_notification_preferences.sql` — `reminders`,
  `notification_preferences` y `notification_settings`, con RLS que hace los
  avisos **personales**: nadie ve los de otro, ni el responsable del hogar.

## Accesibilidad (fase 10)

Lo comprobado por lectura de código y en el navegador:

- objetivos táctiles: los controles nuevos usan `touchTarget.min` (44) o más;
  las celdas del calendario y las filas desplegables tienen `minHeight: 44`
- contraste: la paleta se validó en la tanda anterior (AA en texto y botones);
  los tonos de superficie nuevos se usan con tinta navy, que da entre 5,1:1 y
  12,3:1 según el fondo
- nada depende solo del color: cada celda del calendario lleva su número, cada
  estado del panel su nombre, cada evento su icono **y** su título
- etiquetas: los iconos decorativos van con `accessible={false}`; los
  desplegables informan de `expanded`; los errores usan `accessibilityRole="alert"`
- texto dinámico: `Text` limita el escalado a 1.6 para que no rompa la caja

Pendiente de verificar en dispositivo: VoiceOver y TalkBack reales.

## Qué NO se verificó

Este entorno no tiene simulador de iOS ni SDK de Android, así que:

- los bundles de iOS y Android **compilan** (`expo export --platform ios
  --platform android`), lo que prueba que el JavaScript y los módulos nativos
  resuelven, pero **no** es una ejecución en dispositivo
- notificaciones, cámara y galería usan API de Expo que no se pueden ejercitar
  sin dispositivo: la lógica alrededor (horas de silencio, decisión de entrega,
  compresión y rutas de almacenamiento) sí está probada
- el comportamiento del teclado, el gesto atrás de Android y las áreas seguras
  reales quedan por comprobar en dispositivo

## Siguiente corte recomendado

1. **Ejecutar en dispositivo** (Expo Go o build de desarrollo) y recorrer el
   flujo completo: registrar síntoma → foto → recordatorio → agrupar episodio.
   Es la única forma de cerrar la fase 10 de verdad.
2. **Label Scan (fase 8)**: la arquitectura está libre para ello; conviene
   hacerlo con el mismo patrón que Ali Capture —interfaz, mock y confirmación
   explícita— y con el lenguaje permitido del encargo.
3. **Pantalla de creación de procesos**, que sigue siendo el único hueco real
   de la navegación.
