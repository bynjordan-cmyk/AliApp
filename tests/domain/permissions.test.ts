import { can, canEditEvent, type MembershipContext } from '@/features/caregivers/permissions';

/**
 * Espejo en cliente de las políticas RLS. Las pruebas de la propia base están
 * en tests/rls; estas comprueban que la UI no ofrezca acciones prohibidas.
 */

const owner: MembershipContext = { role: 'owner', status: 'active' };
const parent: MembershipContext = { role: 'parent', status: 'active' };
const caregiver: MembershipContext = { role: 'caregiver', status: 'active' };
const professional: MembershipContext = { role: 'professional_viewer', status: 'active' };
const revoked: MembershipContext = { role: 'parent', status: 'revoked' };

describe('permisos por rol', () => {
  it('responsable y madre/padre gestionan el hogar y los estados de alimento', () => {
    for (const membership of [owner, parent]) {
      expect(can('household.manageMembers', membership)).toBe(true);
      expect(can('foodStatus.write', membership)).toBe(true);
      expect(can('journey.write', membership)).toBe(true);
    }
  });

  it('el cuidador registra eventos pero no cambia estados de alimento ni roles', () => {
    expect(can('event.create', caregiver)).toBe(true);
    expect(can('foodStatus.read', caregiver)).toBe(true);
    expect(can('foodStatus.write', caregiver)).toBe(false);
    expect(can('household.manageMembers', caregiver)).toBe(false);
    expect(can('event.hardDelete', caregiver)).toBe(false);
    expect(can('journey.write', caregiver)).toBe(false);
  });

  it('un permiso excepcional puede habilitar procesos a un cuidador', () => {
    const withOverride: MembershipContext = {
      ...caregiver,
      overrides: { manage_journeys: true },
    };
    expect(can('journey.write', withOverride)).toBe(true);
    // La excepción no abre nada más.
    expect(can('foodStatus.write', withOverride)).toBe(false);
  });

  it('el profesional solo lee', () => {
    expect(can('baby.read', professional)).toBe(true);
    expect(can('event.create', professional)).toBe(false);
    expect(can('foodStatus.write', professional)).toBe(false);
  });

  it('una membresía revocada pierde todo el acceso', () => {
    expect(can('baby.read', revoked)).toBe(false);
    expect(can('event.create', revoked)).toBe(false);
    expect(can('baby.read', null)).toBe(false);
  });
});

describe('edición de un evento concreto', () => {
  const now = new Date('2026-03-02T12:00:00.000Z');

  it('el cuidador corrige lo suyo dentro de la ventana', () => {
    expect(
      canEditEvent(
        caregiver,
        { createdBy: 'profile-1', createdAt: '2026-03-02T09:00:00.000Z' },
        'profile-1',
        now,
      ),
    ).toBe(true);
  });

  it('el cuidador no edita lo de otra persona', () => {
    expect(
      canEditEvent(
        caregiver,
        { createdBy: 'profile-2', createdAt: '2026-03-02T09:00:00.000Z' },
        'profile-1',
        now,
      ),
    ).toBe(false);
  });

  it('el cuidador no edita fuera de la ventana de corrección', () => {
    expect(
      canEditEvent(
        caregiver,
        { createdBy: 'profile-1', createdAt: '2026-02-20T09:00:00.000Z' },
        'profile-1',
        now,
      ),
    ).toBe(false);
  });

  it('madre/padre edita cualquier evento del hogar', () => {
    expect(
      canEditEvent(
        parent,
        { createdBy: 'profile-9', createdAt: '2025-01-01T00:00:00.000Z' },
        'profile-1',
        now,
      ),
    ).toBe(true);
  });
});
