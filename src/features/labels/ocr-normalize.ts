import type { LabelOcrResult, OcrBlock, OcrPlatform } from './ocr-types';

/**
 * Normalización de la salida de cualquier motor de OCR.
 *
 * Cada motor devuelve una forma distinta: tesseract.js da bloques con párrafos
 * y líneas; ML Kit da bloques con líneas; alguno solo dará texto suelto. Aquí
 * todo se convierte a la MISMA forma, y a partir de este punto AliApp no sabe
 * —ni le importa— de dónde vino.
 *
 * Módulo puro: sin red, sin plataforma, sin motor. Por eso se puede probar.
 */

/** Forma laxa que aceptamos de los motores. Todo es opcional a propósito. */
export type RawOcrPayload = {
  text?: string | null;
  blocks?: RawOcrBlock[] | null;
  lines?: RawOcrLine[] | null;
};

type RawOcrLine = { text?: string | null } | string;

type RawOcrBlock = {
  text?: string | null;
  lines?: RawOcrLine[] | null;
  /** tesseract.js mete otro nivel: bloque → párrafos → líneas. */
  paragraphs?: { lines?: RawOcrLine[] | null; text?: string | null }[] | null;
};

function lineText(line: RawOcrLine): string {
  const value = typeof line === 'string' ? line : (line?.text ?? '');
  return value.replace(/\s+/g, ' ').trim();
}

function splitIntoLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line) => line.length > 0);
}

function normalizeBlock(block: RawOcrBlock): OcrBlock | null {
  const deParrafos = (block.paragraphs ?? []).flatMap((parrafo) =>
    (parrafo?.lines ?? []).map(lineText),
  );
  const directas = (block.lines ?? []).map(lineText);
  const texto = (block.text ?? '').trim();

  const lines = [...deParrafos, ...directas].filter((line) => line.length > 0);
  const finales = lines.length > 0 ? lines : splitIntoLines(texto);

  if (finales.length === 0 && texto.length === 0) return null;

  return {
    text: texto.length > 0 ? texto : finales.join('\n'),
    lines: finales,
  };
}

/**
 * Convierte lo que sea que devuelva un motor en el resultado de AliApp.
 *
 * Si el motor no da estructura, se deriva del texto. Si no da texto pero sí
 * bloques, se reconstruye. Lo único que nunca se hace es inventar: si no hay
 * nada, el resultado va vacío y la pantalla lo dice.
 */
export function normalizeOcrPayload(
  payload: RawOcrPayload,
  meta: { engine: string; platform: OcrPlatform },
): LabelOcrResult {
  const blocks = (payload.blocks ?? [])
    .map(normalizeBlock)
    .filter((block): block is OcrBlock => block !== null);

  const sueltas = (payload.lines ?? []).map(lineText).filter((line) => line.length > 0);

  const deBloques = blocks.flatMap((block) => block.lines);
  const delTexto = splitIntoLines(payload.text ?? '');

  // Se prefiere la estructura del motor; el texto plano es el último recurso.
  const lines = deBloques.length > 0 ? deBloques : sueltas.length > 0 ? sueltas : delTexto;

  const rawText = (payload.text ?? '').trim() || lines.join('\n');

  return {
    rawText,
    lines,
    blocks,
    engine: meta.engine,
    platform: meta.platform,
  };
}

/** ¿Se leyó algo aprovechable? Dos caracteres sueltos no son una etiqueta. */
export function hasUsableText(result: LabelOcrResult): boolean {
  return result.rawText.replace(/\s/g, '').length >= 3;
}
