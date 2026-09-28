# Corrección de nitidez del logo — 28 septiembre 2026

Se inspeccionaron los cuatro PNG sin extensión facilitados por la usuaria. Las versiones originales tienen ruido en transparencia y bordes; los recursos de la app estaban reducidos a 240 px de alto. No son originales vectoriales.

La versión horizontal en color se limpió con la herramienta integrada image_gen usando AliApp_completo como referencia. Se conserva el PNG de 1942 × 809 sin reducirlo; BrandLogo recorta los márgenes visualmente. El eslogan ahora es texto real y no letras rasterizadas pequeñas. La imagen tiene fondo blanco y se utiliza en superficies blancas. Las variantes navy e isotipo existentes se conservan; no se certifican como corregidas en esta entrega.

Archivo: assets/brand/aliapp-clean-white.png. Validación: typecheck, lint, catálogo i18n y revisión de acceso web a 390 × 844, sin errores de consola. Captura: docs/branding/web-logo-clean-access.png.

Prompt (herramienta integrada):

Production cleanup of the supplied AliApp logo, preserve exactly its symbol, letter shapes, spacing, rounded geometry and heart over the i. Output ONLY the horizontal symbol plus AliApp wordmark, remove the small tagline (it will be typeset separately in the app). Repair jagged and speckled edges and noisy transparency. Solid pure white opaque background everywhere outside logo and inside spoon and counters, NOT transparent. Flat solid coral #FF6B6B for symbol and App, flat navy #0F2D5B for Ali, coral heart above i. No gradients, textures, glows, shadows, extra marks, redesign, or added text. Smooth clean antialiased contours, faithful silhouette, generous resolution at least 2400 pixels wide if supported. Tight horizontal canvas aspect 3.5:1 with small uniform white border.
