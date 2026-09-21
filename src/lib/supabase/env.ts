import Constants from 'expo-constants';

/**
 * Configuración de Supabase.
 *
 * Solo se leen variables `EXPO_PUBLIC_*`: son las únicas que el bundler
 * incorpora al cliente. La clave anónima es pública por diseño; la seguridad
 * real la impone RLS (§9). Ninguna clave de servicio vive en la app.
 */

type SupabaseEnv = {
  url: string;
  anonKey: string;
  mediaBucket: string;
};

function readExtra(key: string): string | undefined {
  const extra = Constants.expoConfig?.extra as Record<string, unknown> | undefined;
  const value = extra?.[key];
  return typeof value === 'string' ? value : undefined;
}

export function getSupabaseEnv(): SupabaseEnv {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? readExtra('supabaseUrl');
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? readExtra('supabaseAnonKey');
  const mediaBucket = process.env.EXPO_PUBLIC_SUPABASE_MEDIA_BUCKET ?? 'aliapp-media';

  if (!url || !anonKey) {
    throw new Error(
      'Falta la configuración de Supabase. Copia .env.example a .env.local y define ' +
        'EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_ANON_KEY.',
    );
  }

  return { url, anonKey, mediaBucket };
}

export function isSupabaseConfigured(): boolean {
  try {
    getSupabaseEnv();
    return true;
  } catch {
    return false;
  }
}
