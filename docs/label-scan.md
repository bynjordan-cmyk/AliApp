# Lectura de etiquetas

Leer la lista de ingredientes de un envase y compararla con los alimentos que
la familia ha marcado en su panel. Funciona en la web, en iOS y en Android, con
el mismo camino y el mismo texto en pantalla.

## Lo que hace y lo que no

Compara **texto con una lista que hizo una persona**. No analiza el producto:
AliApp no sabe qué lleva dentro un bote, solo qué pone en la foto que le han
dado, leída por un motor que se equivoca a veces.

De ahí las tres reglas de pantalla, que no se negocian:

1. El **texto detectado se enseña siempre**, tal cual salió del motor.
2. Ese texto **se puede corregir** antes de comparar. La interpretación nunca
   se guarda sola.
3. El aviso **«Verifica también la etiqueta original. La lectura automática
   puede contener errores.»** está visible en todos los pasos, haya
   coincidencias o no.

Frases prohibidas también aquí: «es seguro», «puedes dárselo», «no contiene
alérgenos». Ausencia de coincidencias significa exactamente una cosa: ninguna
palabra leída coincide con la lista de esa familia.

## Arquitectura

Una sola interfaz, `LabelOcrProvider` (`src/features/labels/ocr-types.ts`), y
un proveedor por plataforma. Ni la pantalla ni el módulo de ingredientes saben
qué motor leyó el texto.

```
app/label-scan.tsx
      │  getLabelOcrProvider()
      ▼
ocr-provider.web.ts      ocr-provider.native.ts     ocr-provider.ts
      │                        │                          │
 providers/web.ts        providers/native.ts        providers/fixture.ts
 tesseract.js (WASM)     ML Kit (on-device)         solo para pruebas
      │                        │                          │
      └────────────── normalizeOcrPayload() ──────────────┘
                              │
              { rawText, lines, blocks, engine, platform }
                              │
          parseIngredientList → matchIngredients → buildLabelScanResult
```

Metro resuelve el fichero por plataforma (`.web.ts` / `.native.ts`), así que la
elección del motor no es una condición en tiempo de ejecución: es resolución de
módulos. Verificado sobre los bundles exportados: el de web contiene
`tesseract` y `getUserMedia` y no el módulo nativo; el de Android contiene
`TextRecognition` y no tesseract.

`normalizeOcrPayload` acepta las formas de los dos motores —tesseract.js da
bloques con párrafos y líneas, ML Kit da bloques con líneas— y también un motor
que solo devuelva texto suelto. Si no se leyó nada, no inventa nada.

## Web

- Motor: **tesseract.js 7** sobre WebAssembly, idiomas `spa` + `eng`.
- Cámara: `navigator.mediaDevices.getUserMedia` pidiendo la trasera
  (`facingMode: environment`). Requiere HTTPS, que es como se sirve AliApp.
- Respaldo: `<input type="file" accept="image/*" capture="environment">`,
  ofrecido **siempre**, no solo cuando la cámara falla. En varios navegadores
  móviles es lo que de verdad funciona, y en un ordenador es lo natural.
- La cámara se apaga al salir de la pantalla.

### Privacidad

La foto **no sale del dispositivo**: se dibuja en un canvas, se convierte en un
data URL y va directa al motor, que corre en la propia pestaña. No se sube a
ningún servicio de reconocimiento y no se guarda en AliApp.

El **motor** tampoco viaja desde un tercero. AliApp lo sirve desde su propio
dominio, en `/ocr`, así que leer una etiqueta no hace **ninguna** petición
fuera: ni la foto, ni el hecho de que alguien esté leyendo una etiqueta.

Los assets viven en `public/ocr/`, que Expo copia al export, y se regeneran con:

```bash
npm run ocr:assets
```

```
public/ocr/worker.min.js            de node_modules/tesseract.js
public/ocr/core/*-lstm.wasm.js      los tres núcleos LSTM (con y sin SIMD)
public/ocr/lang/spa.traineddata.gz  datos de idioma
public/ocr/lang/eng.traineddata.gz
public/ocr/manifest.json            para qué versión de tesseract.js se copió
```

Son unos 15 MB en disco. Se sirven comprimidos y el navegador los cachea, así
que el coste es de la primera lectura y solo de esa.

Los **tres** núcleos son necesarios: el worker elige uno según lo que admita el
navegador (relaxed SIMD → SIMD → sin SIMD) y si el que elige no está, falla.

El `manifest.json` existe para un fallo muy concreto: actualizar tesseract.js y
olvidar volver a copiar el motor. `npm run test:ocr:web` compara la versión del
manifiesto con la instalada y se niega a pasar si no coinciden.

Para volver al CDN público (por ejemplo, para no versionar los binarios):

```bash
EXPO_PUBLIC_OCR_ASSET_BASE=cdn
```

Cualquier otro valor se usa como ruta base.

## iOS y Android

- Motor: **ML Kit Text Recognition** vía `@react-native-ml-kit/text-recognition`,
  reconociendo el texto **en el propio teléfono**.
- Captura: cámara del sistema con `expo-image-picker`, que ya trae su propia
  previsualización y su "repetir".

**Requiere una build nativa** (dev client o EAS): es código nativo y no existe
en Expo Go. El proveedor lo carga de forma perezosa y comprueba
`NativeModules.TextRecognition` antes de nada; si no está, la pantalla lo dice
(`label.unavailable`) en lugar de reventar, y se puede escribir el texto a mano.

Estado de verificación: los bundles de JavaScript de iOS y Android se exportan
con el módulo instalado. La compilación nativa con EAS está **sin verificar**
en este repositorio.

## Flujo

```
cámara / galería
   → previsualización  ("Usar esta foto" / "Repetir")
   → leyendo           (barra de progreso; la primera vez descarga el motor)
   → texto detectado   (editable, siempre)
   → ingredientes      (quitar los que sobren, añadir los que falten)
   → coincidencias     (Evitar · supervisión · resto · sin coincidencia)
```

## Alias de etiqueta

Una etiqueta no dice "leche de vaca": dice `caseinato`, `lactosuero`,
`ovoalbúmina`, `lecitina de soja`. `LABEL_ALIASES` une esa jerga con las claves
canónicas del catálogo, y `ALIAS_EXCLUSIONS` evita los falsos positivos que
enseñan a ignorar los avisos —«leche de almendras» no es leche de vaca—.

## Comprobación de OCR real

```bash
npm run test:ocr:web
```

Arranca Chromium, dibuja **dos etiquetas distintas** en un canvas (el mismo
canvas → dataURL que usa la cámara), se las pasa al proveedor web real y
comprueba que A devuelve el texto de A, que B devuelve un texto **distinto**,
que los ingredientes salen troceados y que la comparación encuentra la leche en
A y nada en B.

Que los textos sean distintos importa: un motor mal conectado que devolviera
siempre lo mismo pasaría cualquier prueba que solo mirase una imagen.

Usa **los mismos assets que se publican** (`public/ocr`), no una copia hecha
para la ocasión: si lo desplegado estuviera roto o desfasado, esta comprobación
se entera antes que una madre con el envase en la mano.

Necesita Playwright. En una máquina donde no sea dependencia del proyecto:

```bash
ALIAPP_PLAYWRIGHT_PATH=… ALIAPP_CHROMIUM_PATH=… npm run test:ocr:web
```

Y si `public/ocr` no existe, lo dice y manda ejecutar `npm run ocr:assets`.

El fixture (`providers/fixture.ts`) queda **solo para pruebas**. Si apareciera
en un dispositivo, la pantalla lo diría con todas las letras.
