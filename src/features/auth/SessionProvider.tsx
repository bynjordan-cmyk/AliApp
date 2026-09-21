import { useQuery } from '@tanstack/react-query';
import type { Session } from '@supabase/supabase-js';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import { queryKeys } from '@/lib/query-keys';
import { getCurrentProfile } from '@/features/baby/baby.service';
import type { Profile } from '@/types/domain';

/**
 * Sesión de la aplicación: usuario autenticado y su perfil.
 *
 * Tolera que falte la configuración de Supabase para que la app arranque y
 * explique qué falta, en lugar de romper en blanco.
 */

type SessionContextValue = {
  configured: boolean;
  loading: boolean;
  session: Session | null;
  profile: Profile | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const configured = isSupabaseConfigured();
  const [loading, setLoading] = useState(configured);
  const [session, setSession] = useState<Session | null>(null);

  // El perfil se carga como cualquier otro dato del servidor, con la misma
  // caché que el resto de la app: sin sesión, la consulta no se ejecuta y el
  // perfil es null por construcción.
  const profileQuery = useQuery<Profile | null>({
    queryKey: queryKeys.profile,
    queryFn: () => getCurrentProfile(),
    enabled: configured && Boolean(session),
  });

  const profile = session ? (profileQuery.data ?? null) : null;

  const refreshProfile = useCallback(async () => {
    if (!configured || !session) return;
    await profileQuery.refetch();
  }, [configured, session, profileQuery]);

  useEffect(() => {
    if (!configured) return;

    const client = getSupabaseClient();
    let active = true;

    client.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setLoading(false);
    });

    const { data: subscription } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [configured]);

  const signIn = useCallback(async (email: string, password: string) => {
    const client = getSupabaseClient();
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
  }, []);

  const signUp = useCallback(async (email: string, password: string, displayName: string) => {
    const client = getSupabaseClient();
    const { error } = await client.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName, locale: 'es' } },
    });
    if (error) throw new Error(error.message);
  }, []);

  const signOut = useCallback(async () => {
    const client = getSupabaseClient();
    await client.auth.signOut();
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({ configured, loading, session, profile, signIn, signUp, signOut, refreshProfile }),
    [configured, loading, session, profile, signIn, signUp, signOut, refreshProfile],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession debe usarse dentro de <SessionProvider>');
  return context;
}
