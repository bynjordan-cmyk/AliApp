#!/usr/bin/env node
/**
 * Comprueba que lo que se publica es lo que creemos que se publica.
 *
 * Dos cosas, y las dos importan por la misma razón: una madre no debe recibir
 * nunca una lectura de mentira creyendo que es la suya.
 *
 *   1. El FIXTURE de pruebas no puede aparecer en ningún bundle. Metro debería
 *      resolver el proveedor por plataforma y dejarlo fuera, pero "debería" no
 *      es una garantía: esto lo comprueba sobre el fichero exportado.
 *   2. Cada plataforma lleva su motor y solo el suyo: web con tesseract.js y
 *      la cámara del navegador, nativo con ML Kit.
 *
 * Uso:  node scripts/check-bundle-purity.mjs <directorio-exportado> [web|native]
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const [, , directorio, plataforma = 'web'] = process.argv;

if (!directorio || !existsSync(directorio)) {
  console.error('Uso: node scripts/check-bundle-purity.mjs <directorio-exportado> [web|native]');
  process.exit(1);
}

/** Trozo del texto del fixture. Si aparece, el fixture viajó con el bundle. */
const MARCA_FIXTURE = 'aceite de girasol';

function bundles(dir) {
  const encontrados = [];

  for (const entrada of readdirSync(dir)) {
    const ruta = path.join(dir, entrada);
    if (statSync(ruta).isDirectory()) {
      encontrados.push(...bundles(ruta));
    } else if (/\.(js|hbc)$/.test(entrada) && ruta.includes(`${path.sep}_expo${path.sep}`)) {
      encontrados.push(ruta);
    }
  }

  return encontrados;
}

function contiene(contenido, aguja) {
  return contenido.includes(aguja);
}

const esperados = {
  web: { presentes: ['createWorker', 'getUserMedia'], ausentes: ['TextRecognition'] },
  native: { presentes: ['TextRecognition'], ausentes: ['getUserMedia'] },
};

const reglas = esperados[plataforma];
if (!reglas) {
  console.error(`Plataforma desconocida: ${plataforma}`);
  process.exit(1);
}

const ficheros = bundles(directorio);
if (ficheros.length === 0) {
  console.error(`No se encontró ningún bundle en ${directorio}`);
  process.exit(1);
}

let fallos = 0;

function comprobar(condicion, mensaje) {
  if (condicion) {
    console.log(`  ✓ ${mensaje}`);
  } else {
    console.log(`  ✗ ${mensaje}`);
    fallos += 1;
  }
}

console.log(`→ revisando ${ficheros.length} bundle(s) de ${plataforma}`);

for (const fichero of ficheros) {
  // Los bundles de Hermes son binarios; se leen como latin1 para poder buscar
  // las cadenas literales que siguen dentro.
  const contenido = readFileSync(fichero, 'latin1');
  const nombre = path.basename(fichero);

  comprobar(!contiene(contenido, MARCA_FIXTURE), `${nombre}: sin el fixture de pruebas`);

  for (const aguja of reglas.presentes) {
    comprobar(contiene(contenido, aguja), `${nombre}: lleva "${aguja}"`);
  }
  for (const aguja of reglas.ausentes) {
    comprobar(!contiene(contenido, aguja), `${nombre}: no lleva "${aguja}"`);
  }
}

if (plataforma === 'web') {
  const motor = path.join(directorio, 'ocr', 'manifest.json');
  comprobar(existsSync(motor), 'el motor de OCR viaja en el export (/ocr)');
  comprobar(
    existsSync(path.join(directorio, 'ocr', 'lang', 'spa.traineddata')),
    'los datos de español van sin comprimir',
  );
}

if (fallos > 0) {
  console.error(`\n✗ ${fallos} comprobación(es) fallida(s)`);
  process.exit(1);
}

console.log('\n✓ los bundles publican lo que deben');
