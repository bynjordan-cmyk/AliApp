import type { PostgrestError } from '@supabase/supabase-js';

/** Error de dominio con el contexto suficiente para depurar sin exponer datos. */
export class AliappDataError extends Error {
  readonly code: string | undefined;
  readonly operation: string;

  constructor(operation: string, cause: PostgrestError | Error) {
    super(`[AliApp] ${operation}: ${cause.message}`);
    this.name = 'AliappDataError';
    this.operation = operation;
    this.code = 'code' in cause ? cause.code : undefined;
  }
}

/** Desenvuelve una respuesta de Supabase o lanza un error tipado. */
export function unwrap<T>(
  operation: string,
  result: { data: T | null; error: PostgrestError | null },
): T {
  if (result.error) {
    throw new AliappDataError(operation, result.error);
  }
  if (result.data === null) {
    throw new AliappDataError(operation, new Error('La consulta no devolvió datos'));
  }
  return result.data;
}

/** Igual que `unwrap`, pero acepta un resultado vacío. */
export function unwrapMaybe<T>(
  operation: string,
  result: { data: T | null; error: PostgrestError | null },
): T | null {
  if (result.error) {
    throw new AliappDataError(operation, result.error);
  }
  return result.data;
}
