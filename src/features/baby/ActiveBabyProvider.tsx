import { useQuery } from '@tanstack/react-query';
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import { queryKeys } from '@/lib/query-keys';
import type { Baby, Household, HouseholdMember, MemberRole } from '@/types/domain';
import type { MembershipContext } from '@/features/caregivers/permissions';
import { useSession } from '@/features/auth/SessionProvider';

import { listBabies, listHouseholds, listMembers } from './baby.service';

/**
 * Hogar y bebé activos.
 *
 * Todo lo que se consulta en la app cuelga de estos dos valores, así que vive
 * en un único proveedor en lugar de pasarse por props pantalla a pantalla.
 */

type ActiveBabyContextValue = {
  households: Household[];
  household: Household | null;
  babies: Baby[];
  baby: Baby | null;
  membership: MembershipContext | null;
  role: MemberRole | null;
  loading: boolean;
  setHouseholdId: (id: string) => void;
  setBabyId: (id: string) => void;
};

const ActiveBabyContext = createContext<ActiveBabyContextValue | null>(null);

export function ActiveBabyProvider({ children }: { children: ReactNode }) {
  const { session, profile, configured } = useSession();
  const [selectedHouseholdId, setHouseholdId] = useState<string | null>(null);
  const [selectedBabyId, setBabyId] = useState<string | null>(null);

  const enabled = configured && Boolean(session);

  const householdsQuery = useQuery({
    queryKey: queryKeys.households,
    queryFn: () => listHouseholds(),
    enabled,
  });

  const households = useMemo(() => householdsQuery.data ?? [], [householdsQuery.data]);

  // Hogar y bebé activos son estado derivado: lo elegido por la usuaria, o el
  // primero disponible. Calcularlo en el render evita renders en cascada.
  const householdId = selectedHouseholdId ?? households[0]?.id ?? null;

  const babiesQuery = useQuery({
    queryKey: queryKeys.babies(householdId ?? 'none'),
    queryFn: () => listBabies(householdId as string),
    enabled: enabled && Boolean(householdId),
  });

  const babies = useMemo(() => babiesQuery.data ?? [], [babiesQuery.data]);

  const babyId = selectedBabyId ?? babies[0]?.id ?? null;

  const membersQuery = useQuery({
    queryKey: queryKeys.householdMembers(householdId ?? 'none'),
    queryFn: () => listMembers(householdId as string),
    enabled: enabled && Boolean(householdId),
  });

  const membership = useMemo<MembershipContext | null>(() => {
    if (!profile || !membersQuery.data) return null;

    const row: HouseholdMember | undefined = membersQuery.data.find(
      (member) => member.profile_id === profile.id,
    );
    if (!row) return null;

    return {
      role: row.role,
      status: row.status,
      overrides: (row.permissions ?? {}) as Record<string, boolean>,
    };
  }, [membersQuery.data, profile]);

  const value = useMemo<ActiveBabyContextValue>(
    () => ({
      households,
      household: households.find((item) => item.id === householdId) ?? null,
      babies,
      baby: babies.find((item) => item.id === babyId) ?? null,
      membership,
      role: membership?.role ?? null,
      loading: householdsQuery.isLoading || babiesQuery.isLoading,
      setHouseholdId,
      setBabyId,
    }),
    [
      households,
      householdId,
      babies,
      babyId,
      membership,
      householdsQuery.isLoading,
      babiesQuery.isLoading,
    ],
  );

  return <ActiveBabyContext.Provider value={value}>{children}</ActiveBabyContext.Provider>;
}

export function useActiveBaby(): ActiveBabyContextValue {
  const context = useContext(ActiveBabyContext);
  if (!context) throw new Error('useActiveBaby debe usarse dentro de <ActiveBabyProvider>');
  return context;
}
