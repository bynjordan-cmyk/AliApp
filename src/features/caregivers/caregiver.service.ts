import { getSupabaseClient } from '@/lib/supabase';

export async function listCaregivers(householdId: string) {
  const { data, error } = await getSupabaseClient()
    .from('household_members')
    .select('role, status, profile_id')
    .eq('household_id', householdId)
    .order('created_at');
  if (error) throw error;
  const { data: profiles, error: profilesError } = await getSupabaseClient()
    .from('profiles')
    .select('id, display_name')
    .in(
      'id',
      data.map((row) => row.profile_id),
    );
  if (profilesError) throw profilesError;
  return data.map((row) => ({
    ...row,
    displayName: profiles.find((p) => p.id === row.profile_id)?.display_name,
  }));
}

export async function listInvitations(householdId: string) {
  const { data, error } = await getSupabaseClient()
    .from('household_invitations')
    .select('id, role, expires_at')
    .eq('household_id', householdId)
    .is('accepted_at', null)
    .is('revoked_at', null)
    .gt('expires_at', new Date().toISOString());
  if (error) throw error;
  return data;
}

export async function issueInvitation(
  householdId: string,
  role: 'caregiver' | 'professional_viewer',
) {
  const { data, error } = await getSupabaseClient().rpc('issue_household_invite', {
    p_household: householdId,
    p_role: role,
  });
  if (error) throw error;
  return data as { id: string; code: string; expiresAt: string };
}

export async function acceptInvitation(code: string) {
  const { data, error } = await getSupabaseClient().rpc('accept_household_invite', {
    p_code: code.trim(),
  });
  if (error) throw error;
  if (typeof data !== 'string') throw new Error('Invalid invitation response');
  return data;
}

export async function revokeInvitation(id: string) {
  const { error } = await getSupabaseClient().rpc('revoke_household_invite', { p_id: id });
  if (error) throw error;
}

export async function revokeCaregiver(householdId: string, profileId: string) {
  const { error } = await getSupabaseClient()
    .from('household_members')
    .update({ status: 'revoked' })
    .eq('household_id', householdId)
    .eq('profile_id', profileId)
    .in('role', ['caregiver', 'professional_viewer'])
    .select('profile_id')
    .single();
  if (error) throw error;
}
