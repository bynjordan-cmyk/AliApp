#!/usr/bin/env node
/**
 * Copia el motor de OCR a `public/ocr/`, para que AliApp lo sirva desde su
 * propio dominio.
 *
 * Por qué: si el motor se descargara de un CDN público, leer una etiqueta
 * implicaría una petición a un tercero cada vez que alguien abre la pantalla
 * en un navegador nuevo. La foto nunca sale del dispositivo en ningún caso,
 * pero el CDN sabría que alguien está leyendo etiquetas, y una red que lo
 * bloquee dejaría la función muerta sin explicación.
 *
 * Qué copia:
 *   · `worker.min.js` de tesseract.js,
 *   · los tres núcleos WASM con LSTM (con y sin SIMD), porque el worker elige
 *     uno u otro según lo que admita el navegador y los tres tienen que estar,
 *   · los datos de idioma de español e inglés, SIN comprimir.
 *
 * Sin comprimir a propósito: un `.traineddata.gz` servido por un CDN que le
 * ponga `Content-Encoding: gzip` lo descomprime el navegador por su cuenta, y
 * entonces tesseract.js recibe bytes crudos donde esperaba un gzip y falla. Con
 * el fichero plano no hay ambigüedad, y el CDN lo comprime igual al enviarlo.
 *
 * Los datos de idioma salen del sistema si están instalados
 * (`tesseract-ocr-spa`, `tesseract-ocr-eng`) y si no se descargan una vez.
 *
 * Uso:  npm run ocr:assets
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { cp } from 'node:fs/promises';
import { Buffer } from 'node:buffer';
import { gunzipSync } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DESTINO = path.join(ROOT, 'public', 'ocr');

/** Solo los núcleos con LSTM: AliApp siempre usa OEM 1. */
const NUCLEOS = [
  'tesseract-core-lstm.wasm.js',
  'tesseract-core-simd-lstm.wasm.js',
  'tesseract-core-relaxedsimd-lstm.wasm.js',
];

const IDIOMAS = ['spa', 'eng'];

const TESSDATA_LOCAL = [
  process.env.ALIAPP_TESSDATA_DIR,
  '/usr/share/tesseract-ocr/5/tessdata',
  '/usr/share/tesseract-ocr/4.00/tessdata',
  '/usr/share/tessdata',
  '/opt/homebrew/share/tessdata',
].filter(Boolean);

function log(mensaje) {
  process.stdout.write(`${mensaje}\n`);
}

async function copiarMotor() {
  mkdirSync(path.join(DESTINO, 'core'), { recursive: true });

  await cp(
    path.join(ROOT, 'node_modules/tesseract.js/dist/worker.min.js'),
    path.join(DESTINO, 'worker.min.js'),
  );

  for (const nucleo of NUCLEOS) {
    await cp(
      path.join(ROOT, 'node_modules/tesseract.js-core', nucleo),
      path.join(DESTINO, 'core', nucleo),
    );
  }

  log(`  · motor: worker + ${NUCLEOS.length} núcleos`);
}

async function copiarIdiomas() {
  const destino = path.join(DESTINO, 'lang');
  mkdirSync(destino, { recursive: true });

  for (const idioma of IDIOMAS) {
    const salida = path.join(destino, `${idioma}.traineddata`);

    const local = TESSDATA_LOCAL.map((dir) => path.join(dir, `${idioma}.traineddata`)).find(
      (ruta) => existsSync(ruta),
    );

    if (local) {
      await cp(local, salida);
      log(`  · ${idioma}: del sistema`);
      continue;
    }

    const url = `https://tessdata.projectnaptha.com/4.0.0/${idioma}.traineddata.gz`;
    const respuesta = await fetch(url);
    if (!respuesta.ok) {
      throw new Error(
        `No hay datos de idioma para "${idioma}". Instala tesseract-ocr-${idioma} ` +
          `o deja accesible ${url}.`,
      );
    }
    // Lo que se publica va sin comprimir, venga de donde venga.
    const comprimido = Buffer.from(await respuesta.arrayBuffer());
    writeFileSync(salida, gunzipSync(comprimido));
    log(`  · ${idioma}: descargado`);
  }
}

/**
 * Deja constancia de para qué versión de tesseract.js se copió esto.
 *
 * El worker y el núcleo tienen que ir a juego con la librería: si alguien
 * actualiza tesseract.js y se olvida de volver a copiar, `npm run test:ocr:web`
 * lo caza antes que un usuario.
 */
function escribirManifiesto() {
  const version = JSON.parse(
    readFileSync(path.join(ROOT, 'node_modules/tesseract.js/package.json'), 'utf8'),
  ).version;

  writeFileSync(
    path.join(DESTINO, 'manifest.json'),
    `${JSON.stringify({ tesseractVersion: version, cores: NUCLEOS, langs: IDIOMAS, gzippedLangs: false }, null, 2)}\n`,
  );

  log(`  · manifiesto: tesseract.js ${version}`);
  return version;
}

log('→ preparando el motor de OCR en public/ocr');
await copiarMotor();
await copiarIdiomas();
escribirManifiesto();
log('✓ listo. AliApp sirve el OCR desde su propio dominio.');
