import { randomUUID } from 'node:crypto';
import type { Client } from 'pg';
import { connectAs, connectAsPostgres, createFixture, expectDenied, type Fixture } from './helpers';

let admin: Client;
let f: Fixture;
let owner: Client;
let stranger: Client;
let caregiver: Client;
beforeAll(async () => {
  admin = await connectAsPostgres();
  f = await createFixture(admin);
  owner = await connectAs(f.users.owner.authUserId);
  stranger = await connectAs(f.users.stranger.authUserId);
  caregiver = await connectAs(f.users.caregiver.authUserId);
});
afterAll(async () => {
  await Promise.all([admin.end(), owner.end(), stranger.end(), caregiver.end()]);
});

async function invite(role = 'caregiver') {
  const result = await owner.query('select public.issue_household_invite($1,$2) as invitation', [
    f.householdId,
    role,
  ]);
  return result.rows[0].invitation as { id: string; code: string };
}

test('only managers issue invitations, never for elevated roles', async () => {
  await expectDenied(
    caregiver.query('select public.issue_household_invite($1,$2)', [f.householdId, 'caregiver']),
  );
  await expectDenied(
    stranger.query('select public.issue_household_invite($1,$2)', [f.householdId, 'caregiver']),
  );
  await expectDenied(invite('owner'));
  await expectDenied(invite('parent'));
});
test('invitation is hashed, grants only chosen role and cannot be reused', async () => {
  const issued = await invite('professional_viewer');
  const saved = await admin.query(
    'select token_hash from public.household_invitations where id=$1',
    [issued.id],
  );
  expect(saved.rows[0].token_hash).not.toBe(issued.code);
  expect((await stranger.query('select * from public.household_invitations')).rows).toHaveLength(0);
  await stranger.query('select public.accept_household_invite($1)', [issued.code]);
  const member = await admin.query(
    'select role,status from public.household_members where household_id=$1 and profile_id=$2',
    [f.householdId, f.users.stranger.profileId],
  );
  expect(member.rows[0]).toEqual({ role: 'professional_viewer', status: 'active' });
  await expectDenied(caregiver.query('select public.accept_household_invite($1)', [issued.code]));
});
test('expired, cancelled and invented invitation codes cannot grant access', async () => {
  const expired = await invite();
  await admin.query(
    "update public.household_invitations set expires_at=now()-interval '1 second' where id=$1",
    [expired.id],
  );
  await expectDenied(stranger.query('select public.accept_household_invite($1)', [expired.code]));
  const cancelled = await invite();
  await expectDenied(caregiver.query('select public.revoke_household_invite($1)', [cancelled.id]));
  await owner.query('select public.revoke_household_invite($1)', [cancelled.id]);
  await expectDenied(stranger.query('select public.accept_household_invite($1)', [cancelled.code]));
  await expectDenied(stranger.query('select public.accept_household_invite($1)', ['invented']));
});
test('journey creation is atomic and respects membership', async () => {
  const input = {
    householdId: f.householdId,
    babyId: f.babyId,
    journeyType: 'exclusion',
    status: 'active',
    startedOn: '2026-09-01',
    indicatedBy: 'family',
    targets: [{ foodId: f.foodIds.hen_egg, targetSubject: 'baby', action: 'avoid' }],
  };
  const result = await owner.query('select (public.create_journey($1)).id', [input]);
  expect(result.rows[0].id).toBeTruthy();
  const count = async () =>
    Number(
      (await admin.query('select count(*) from public.journeys where baby_id=$1', [f.babyId]))
        .rows[0].count,
    );
  const before = await count();
  await expectDenied(
    owner.query('select public.create_journey($1)', [
      { ...input, targets: [...input.targets, { ...input.targets[0], foodId: randomUUID() }] },
    ]),
  );
  expect(await count()).toBe(before);
  await expectDenied(caregiver.query('select public.create_journey($1)', [input]));
  await expectDenied(owner.query('select public.create_journey($1)', [{ ...input, targets: [] }]));
  const other = await createFixture(admin);
  await expectDenied(
    owner.query('select public.create_journey($1)', [{ ...input, babyId: other.babyId }]),
  );
});
