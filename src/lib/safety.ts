/**
 * Límites de seguridad del producto (§10).
 *
 * AliApp describe hechos y patrones temporales. No diagnostica, no atribuye
 * causas, no indica tratamientos ni dosis, y no calcula ninguna puntuación de
 * riesgo.
 *
 * Este módulo centraliza la regla para que no viva solo en componentes sueltos:
 * cualquier texto generado por el producto (resúmenes, informes, mensajes
 * descriptivos) debe pasar por `assertSafeStatement` en tiempo de desarrollo.
 */

/** Frases que el producto NUNCA debe generar. */
const FORBIDDEN_PATTERNS: { pattern: RegExp; reason: string }[] = [
  {
    // Sin \b de cierre: en JavaScript las vocales acentuadas no cuentan como
    // carácter de palabra, así que "causó" no formaría límite al final.
    pattern: /\b(caus[óoa]|provoc[óoa]|es (la )?culpa de)/i,
    reason: 'atribución de causalidad',
  },
  { pattern: /\bcaused\b/i, reason: 'atribución de causalidad' },
  {
    pattern: /\b(APLV|CMPA|alergia (a|al|a la)\b.*\bconfirmada)\b/i,
    reason: 'diagnóstico',
  },
  {
    pattern: /\b(tu beb[ée] tiene|el beb[ée] tiene)\b.*\b(alergia|intolerancia)\b/i,
    reason: 'diagnóstico',
  },
  {
    pattern: /\b(retira|elimina|suprime|deja de dar)\b.*\b(de la dieta)?\b/i,
    reason: 'indicación de tratamiento',
  },
  { pattern: /\b(\d+\s?(mg|ml|g)\b.*\b(cada|dosis))/i, reason: 'indicación de dosis' },
  { pattern: /\b(es seguro|es segura|sin riesgo)\b/i, reason: 'declaración de seguridad' },
  {
    pattern: /\b(reintroduce|vuelve a dar|puedes volver a ofrecer)\b/i,
    reason: 'indicación clínica',
  },
  { pattern: /\b(riesgo|probabilidad)\b.*\b\d+\s?%/i, reason: 'puntuación de riesgo' },
];

export type SafetyViolation = {
  reason: string;
  matched: string;
};

/** Devuelve las infracciones encontradas en un texto generado por el producto. */
export function findSafetyViolations(text: string): SafetyViolation[] {
  const violations: SafetyViolation[] = [];

  for (const { pattern, reason } of FORBIDDEN_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      violations.push({ reason, matched: match[0] });
    }
  }

  return violations;
}

export function isSafeStatement(text: string): boolean {
  return findSafetyViolations(text).length === 0;
}

/**
 * Falla en desarrollo si un texto generado cruza un límite de seguridad.
 * En producción no interrumpe a la usuaria: registra y deja pasar el texto,
 * porque bloquear la pantalla de una madre nunca es la respuesta correcta.
 */
export function assertSafeStatement(text: string): string {
  const violations = findSafetyViolations(text);

  if (violations.length > 0) {
    const detail = violations.map((v) => `${v.reason} ("${v.matched}")`).join('; ');
    const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production';
    if (isDev) {
      throw new Error(`[AliApp] Texto fuera de los límites de seguridad: ${detail}`);
    }
    console.warn(`[AliApp] Texto fuera de los límites de seguridad: ${detail}`);
  }

  return text;
}
