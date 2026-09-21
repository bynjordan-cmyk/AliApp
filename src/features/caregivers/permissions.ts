import type { MemberRole } from '@/types/domain';

/**
 * Espejo en cliente de las políticas RLS (§9).
 *
 * Sirve para decidir qué se muestra y qué se deshabilita en la interfaz. NO es
 * la barrera de seguridad: la barrera está en la base de datos. Si esto y las
 * políticas discrepan, mandan las políticas — y es un error a corregir aquí.
 */

export type Capability =
  | 'household.manageSettings'
  | 'household.manageMembers'
  | 'baby.read'
  | 'baby.write'
  | 'event.create'
  | 'event.editOwnRecent'
  | 'event.editAny'
  | 'event.hardDelete'
  | 'foodStatus.read'
  | 'foodStatus.write'
  | 'journey.read'
  | 'journey.write';

const MANAGER_CAPABILITIES: Capability[] = [
  'household.manageSettings',
  'household.manageMembers',
  'baby.read',
  'baby.write',
  'event.create',
  'event.editOwnRecent',
  'event.editAny',
  'event.hardDelete',
  'foodStatus.read',
  'foodStatus.write',
  'journey.read',
  'journey.write',
];

const CAREGIVER_CAPABILITIES: Capability[] = [
  'baby.read',
  'event.create',
  'event.editOwnRecent',
  'foodStatus.read',
  'journey.read',
];

const PROFESSIONAL_VIEWER_CAPABILITIES: Capability[] = [
  'baby.read',
  'foodStatus.read',
  'journey.read',
];

const CAPABILITIES_BY_ROLE: Record<MemberRole, Capability[]> = {
  owner: MANAGER_CAPABILITIES,
  parent: MANAGER_CAPABILITIES,
  caregiver: CAREGIVER_CAPABILITIES,
  professional_viewer: PROFESSIONAL_VIEWER_CAPABILITIES,
};

export type MembershipContext = {
  role: MemberRole;
  status: 'invited' | 'active' | 'revoked';
  /** Anulaciones excepcionales guardadas en household_members.permissions. */
  overrides?: Record<string, boolean>;
};

/** Ventana durante la que un cuidador puede corregir lo que él mismo registró. */
export const CAREGIVER_EDIT_WINDOW_MS = 24 * 60 * 60 * 1000;

export function can(capability: Capability, membership: MembershipContext | null): boolean {
  // Un miembro revocado o pendiente no tiene acceso a nada (§9).
  if (!membership || membership.status !== 'active') return false;

  if (capability === 'journey.write' && membership.overrides?.manage_journeys === true) {
    return true;
  }

  return CAPABILITIES_BY_ROLE[membership.role].includes(capability);
}

/**
 * ¿Puede esta persona editar esta fila de evento concreta?
 * Refleja app.can_edit_event() de la base.
 */
export function canEditEvent(
  membership: MembershipContext | null,
  event: { createdBy: string | null; createdAt: string },
  currentProfileId: string | null,
  now: Date = new Date(),
): boolean {
  if (!membership || membership.status !== 'active') return false;

  if (can('event.editAny', membership)) return true;

  if (membership.role === 'caregiver') {
    const isOwnRow = event.createdBy !== null && event.createdBy === currentProfileId;
    const withinWindow =
      now.getTime() - new Date(event.createdAt).getTime() <= CAREGIVER_EDIT_WINDOW_MS;
    return isOwnRow && withinWindow;
  }

  return false;
}
