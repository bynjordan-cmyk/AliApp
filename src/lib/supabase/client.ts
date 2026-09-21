import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

import type { Database } from './database.types';
import { getSupabaseEnv } from './env';

export type AliappClient = SupabaseClient<Database>;

let client: AliappClient | null = null;

/**
 * Cliente único de Supabase. La sesión se guarda en AsyncStorage para que la
 * app recuerde al usuario entre arranques.
 */
export function getSupabaseClient(): AliappClient {
  if (client) return client;

  const { url, anonKey } = getSupabaseEnv();

  client = createClient<Database>(url, anonKey, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      // React Native no tiene callbacks de URL de navegador.
      detectSessionInUrl: false,
    },
  });

  return client;
}

/** Sustituye el cliente. Solo para pruebas. */
export function setSupabaseClientForTests(next: AliappClient | null): void {
  client = next;
}
