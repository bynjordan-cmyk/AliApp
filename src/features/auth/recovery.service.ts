import * as Linking from 'expo-linking';
import { getSupabaseClient } from '@/lib/supabase';

export async function requestPasswordRecovery(email: string): Promise<void> {
  const { error } = await getSupabaseClient().auth.resetPasswordForEmail(email.trim(), {
    redirectTo: Linking.createURL('/reset-password'),
  });
  if (error) throw error;
}

export async function changePassword(password: string): Promise<void> {
  const { error } = await getSupabaseClient().auth.updateUser({ password });
  if (error) throw error;
}
