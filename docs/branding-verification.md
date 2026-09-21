# Branding AliApp — verificación

## Alcance

Identidad aprobada: blanco, coral #FF6B6B, navy #0F2D5B, aqua #22D3EE, sunshine #FFC93C y lavender #C4B5FD. Se conservan Expo / React Native, las cinco pestañas, rutas, validaciones, servicios, permisos, migraciones y modelos. Sin nuevas dependencias.

- Tokens con texto navy, secundarios con mayor contraste, radios de 24/32, espaciado 24 y tipografía nativa adaptable al sistema.
- Botones con texto navy sobre coral, carga y foco; campos con etiqueta persistente y error; chips seleccionados con marca además de color.
- Cabeceras, tarjetas, vacíos y estados de consulta coherentes en Hoy, Alimentación, Salud, Procesos y Perfil.
- Registro rápido con iconos y colores; selector compacto al abrir formulario; textos visibles localizados sin modificar valores persistidos.
- Zonas seguras, teclado iOS, tabs que se ocultan al abrir teclado y espacio final para el botón flotante.

## Evidencia

- npm run typecheck: correcto.
- npm run lint: correcto.
- Jest: 8 suites de dominio, 55 pruebas correctas; 3 suites de integración/RLS, 22 pruebas correctas (77 en total).
- expo export --platform ios --platform android --output-dir dist/native --max-workers 2: correcto para ambas plataformas. Esto verifica bundles JS/Hermes; no es una compilación firmada ni ejecución nativa.
- Navegador integrado: revisión a 390×844 y 360×800. Acceso, validación, cinco pestañas, panel de alimentos, registro rápido, selección, Guardar habilitado/deshabilitado, regreso a Hoy y desplazamiento hasta el final. Datos ficticios de servidor local fuera del repositorio, sin credenciales reales.
- Capturas de la revisión: `docs/branding/`, incluidas en el repositorio.

## Pendientes y límites

- Sin simulador iOS ni Android SDK/adb en este equipo. Pendiente ejecución real en iOS y Android: teclado, VoiceOver/TalkBack, tamaños de letra grandes, zonas seguras y gesto atrás. No se instalaron herramientas de sistema.
- Postgres 16.15 portable ejecutado sin instalación de sistema ni permisos de administrador, limitado a 127.0.0.1:55432. Se aplicaron las 14 migraciones, seed y shim de Supabase del repositorio. Pasaron las 22 pruebas existentes, incluido el corte vertical. El shim no incluye Storage: la migración 0012 omite sus buckets/políticas; esto no verifica Supabase Auth/Storage reales.
- Las capturas web no certifican equivalencia visual en los dos sistemas móviles.
- Falta probar guardado y sesión contra el backend real. Los fixtures solo permiten revisar UI; no validan persistencia ni autorización.
- Integrado sobre df8fbf6, conservando navegación lateral, distribución adaptable y etiquetas traducidas del cambio previo.

## Revisión posterior

Revisado sobre la rama: typecheck, lint, 55 pruebas de dominio y 22 contra Postgres real, todo correcto. Se aplicaron cuatro ajustes antes de fusionar:

1. `background` vuelve al valor aprobado (#F7FAFF): ese cambio era cosmético y no afectaba al contraste. Los otros dos cambios de token (`muted` y el nuevo `error`) se conservan por accesibilidad y quedan documentados como desviación en `docs/architecture.md`.
2. Las etiquetas de navegación vuelven a 12px: 10px se queda corto fuera de iOS.
3. La lista de lactancia en Alimentación mostraba `left` / `right` en crudo pese a existir ya las claves `breastfeed.*`; ahora se traducen.
4. Aseo: referencia a la galería corregida a una ruta del repositorio y comentarios de código devueltos al español, que es el idioma de documentación de este repositorio.

Los contrastes medidos sobre blanco confirman la mejora: botón primario 2.78:1 → 4.89:1, texto secundario 4.31:1 → 5.75:1, mensajes de error 2.78:1 → 6.76:1.

## Capturas de la versión integrada

Datos ficticios; React Native Web, no dispositivos nativos. Consola sin errores durante la revisión final.

![Hoy, 390 px](branding/hoy-390.png)

![Registro rápido, 390 px](branding/registro-390.png)

![Hoy, escritorio](branding/hoy-desktop.png)
