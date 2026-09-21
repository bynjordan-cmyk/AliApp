#!/usr/bin/env node
/**
 * Comprobación de OCR REAL en un navegador real.
 *
 * No es una prueba unitaria con dobles: arranca Chromium, dibuja dos etiquetas
 * distintas en un canvas —el mismo canvas → dataURL que usa la cámara de la
 * aplicación—, se las pasa al proveedor web de verdad (`providers/web.ts`, el
 * que se publica) y comprueba tres cosas:
 *
 *   1. la etiqueta A devuelve el texto de A,
 *   2. la etiqueta B devuelve un texto DISTINTO, el de B,
 *   3. los ingredientes salen y la comparación con la lista de "Evitar"
 *      encuentra la leche en A y no encuentra nada en B.
 *
 * Que el texto sea distinto importa más de lo que parece: un motor mal
 * conectado que devolviera siempre lo mismo pasaría cualquier prueba que solo
 * mirase una imagen.
 *
 * Uso:  npm run test:ocr:web
 */
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { createReadStream, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { cp } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WORK = path.join(process.env.TMPDIR ?? '/tmp', 'aliapp-ocr-check');
const PORT = Number(process.env.ALIAPP_OCR_CHECK_PORT ?? 8311);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.wasm': 'application/wasm',
  '.gz': 'application/gzip',
  '.json': 'application/json',
};

function log(mensaje) {
  process.stdout.write(`${mensaje}\n`);
}

/** Transpila los módulos que se van a probar, tal cual están en el repositorio. */
function transpilar() {
  const fuentes = [
    'src/features/labels/ocr-types.ts',
    'src/features/labels/ocr-normalize.ts',
    'src/features/labels/ingredients.ts',
    'src/features/labels/label-scan.ts',
    'src/features/labels/providers/web.ts',
  ];

  try {
    execFileSync(
      'npx',
      [
        'tsc',
        '--ignoreConfig',
        ...fuentes,
        '--target',
        'es2022',
        '--module',
        'es2022',
        '--moduleResolution',
        'bundler',
        '--skipLibCheck',
        '--outDir',
        WORK,
      ],
      { cwd: ROOT, stdio: 'pipe' },
    );
  } catch {
    // tsc se queja de tipos que aquí no importan (alias '@/', `process`).
    // Lo que interesa es el JavaScript emitido, que sí sale.
  }

  // El navegador necesita la extensión explícita en las rutas relativas.
  for (const fichero of ['ocr-normalize.js', 'ingredients.js', 'label-scan.js', 'providers/web.js']) {
    const destino = path.join(WORK, fichero);
    if (!existsSync(destino)) throw new Error(`No se emitió ${fichero}`);
    writeFileSync(
      destino,
      readFileSync(destino, 'utf8').replace(/(from '(\.\.?\/[^']+))'/g, "$1.js'"),
    );
  }
}

/**
 * Usa los MISMOS assets que se publican (`public/ocr`), no una copia hecha
 * para la ocasión. Si lo que se despliega estuviera roto o desfasado, esta
 * comprobación tiene que enterarse antes que una madre con el envase en la
 * mano.
 */
async function prepararMotor() {
  const ocr = path.join(WORK, 'ocr');
  const vendor = path.join(WORK, 'vendor');
  const publicados = path.join(ROOT, 'public', 'ocr');
  mkdirSync(vendor, { recursive: true });

  if (!existsSync(publicados)) {
    throw new Error('Falta public/ocr. Ejecuta primero: npm run ocr:assets');
  }

  await cp(publicados, ocr, { recursive: true });

  const instalada = JSON.parse(
    readFileSync(path.join(ROOT, 'node_modules/tesseract.js/package.json'), 'utf8'),
  ).version;
  const manifiesto = JSON.parse(readFileSync(path.join(ocr, 'manifest.json'), 'utf8'));

  if (manifiesto.tesseractVersion !== instalada) {
    throw new Error(
      `public/ocr se copió para tesseract.js ${manifiesto.tesseractVersion} y hay ` +
        `instalada la ${instalada}. Ejecuta: npm run ocr:assets`,
    );
  }

  log(`  · motor publicado: tesseract.js ${manifiesto.tesseractVersion}`);

  await cp(
    path.join(ROOT, 'node_modules/tesseract.js/dist/tesseract.esm.min.js'),
    path.join(vendor, 'tesseract.esm.min.js'),
  );

  // El bundle ESM de tesseract.js solo trae export por defecto; Metro hace la
  // interoperación con CJS en la aplicación y aquí se puentea a mano.
  writeFileSync(
    path.join(vendor, 'tesseract-shim.js'),
    [
      "import tesseract from './tesseract.esm.min.js';",
      'export const createWorker = tesseract.createWorker;',
      'export default tesseract;',
      '',
    ].join('\n'),
  );

  await cp(path.join(ROOT, 'scripts/ocr-web-check.html'), path.join(WORK, 'index.html'));
}

function servir() {
  const servidor = createServer((peticion, respuesta) => {
    const url = new URL(peticion.url ?? '/', 'http://localhost');
    const relativa = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
    const fichero = path.join(WORK, relativa);

    if (!fichero.startsWith(WORK) || !existsSync(fichero)) {
      respuesta.writeHead(404).end('no');
      return;
    }

    respuesta.writeHead(200, {
      'Content-Type': MIME[path.extname(fichero)] ?? 'application/octet-stream',
    });
    createReadStream(fichero).pipe(respuesta);
  });

  return new Promise((resolve) => servidor.listen(PORT, '127.0.0.1', () => resolve(servidor)));
}

/**
 * Playwright no es dependencia del proyecto: se usa desde donde esté instalado.
 * `ALIAPP_PLAYWRIGHT_PATH` permite apuntarlo a una instalación global.
 */
async function cargarPlaywright() {
  const rutas = [process.env.ALIAPP_PLAYWRIGHT_PATH, 'playwright'].filter(Boolean);

  for (const ruta of rutas) {
    try {
      const modulo = await import(ruta);
      return modulo.chromium ?? modulo.default?.chromium;
    } catch {
      // Se prueba la siguiente.
    }
  }

  throw new Error(
    'Falta Playwright. Instálalo (npm i -D playwright) o apunta ALIAPP_PLAYWRIGHT_PATH ' +
      'a una instalación global.',
  );
}

async function abrirChromium() {
  const chromium = await cargarPlaywright();
  const ejecutable = process.env.ALIAPP_CHROMIUM_PATH;
  return chromium.launch(ejecutable ? { executablePath: ejecutable } : {});
}

function comprobar(condicion, mensaje) {
  if (!condicion) throw new Error(`✗ ${mensaje}`);
  log(`  ✓ ${mensaje}`);
}

async function main() {
  rmSync(WORK, { recursive: true, force: true });
  mkdirSync(WORK, { recursive: true });

  log('→ transpilando los módulos del repositorio');
  transpilar();

  log('→ usando el motor que se publica (public/ocr)');
  await prepararMotor();

  log(`→ sirviendo en http://127.0.0.1:${PORT}`);
  const servidor = await servir();

  const navegador = await abrirChromium();
  const pagina = await navegador.newPage();
  const fallos = [];
  pagina.on('pageerror', (error) => fallos.push(String(error)));

  try {
    log('→ leyendo tres etiquetas en Chromium (la primera vez tarda)');
    await pagina.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'domcontentloaded' });
    await pagina.waitForFunction(() => window.__RESULTADO__ !== undefined, null, {
      timeout: 240000,
    });

    const r = await pagina.evaluate(() => window.__RESULTADO__);

    if (!r.ok) throw new Error(`La página falló: ${r.error}`);

    log('\nTexto leído de la etiqueta A:\n' + r.a.rawText);
    log('\nTexto leído de la etiqueta B:\n' + r.b.rawText);
    log('\nTexto leído de la etiqueta C (foto mala):\n' + r.c.rawText);
    log('');

    comprobar(r.a.engine === 'tesseract.js@7', 'el motor es tesseract.js, no un doble');
    comprobar(r.a.platform === 'web', 'la plataforma se reporta como web');
    comprobar(/harina de trigo/i.test(r.a.rawText), 'A contiene "harina de trigo"');
    comprobar(/leche en polvo/i.test(r.a.rawText), 'A contiene "leche en polvo"');
    comprobar(/arroz/i.test(r.b.rawText), 'B contiene "arroz"');
    comprobar(/zanahoria/i.test(r.b.rawText), 'B contiene "zanahoria"');
    comprobar(r.a.rawText !== r.b.rawText, 'A y B devuelven textos DISTINTOS');
    comprobar(!/leche/i.test(r.b.rawText), 'B no arrastra el texto de A');
    comprobar(r.a.ingredientes.length >= 5, 'de A salen los ingredientes troceados');
    comprobar(
      r.a.avoid.some((linea) => linea.endsWith('cow_milk')),
      'en A la leche coincide con un alimento marcado como Evitar',
    );
    comprobar(r.b.avoid.length === 0, 'en B no hay ninguna coincidencia con Evitar');
    comprobar(r.a.progresos > 0, 'el progreso se informa durante la lectura');

    // La etiqueta C es el caso que de verdad importa: una foto mala. Diez de
    // doce deja margen para que el motor se coma un acento o parta una
    // palabra, y no lo deja para que devuelva sopa.
    comprobar(
      r.c.encontradas.length >= 10,
      `C, mal fotografiada, conserva el texto (${r.c.encontradas.length}/${r.c.esperadas}: ` +
        `${r.c.encontradas.join(', ')})`,
    );
    comprobar(
      r.c.avoid.some((linea) => linea.endsWith('cow_milk')),
      'en C la leche sigue coincidiendo con un alimento marcado como Evitar',
    );
    comprobar(fallos.length === 0, `sin errores de página (${fallos.join(' | ')})`);

    log('\n✓ OCR real verificado en navegador');
  } finally {
    await navegador.close();
    servidor.close();
  }
}

await main();
