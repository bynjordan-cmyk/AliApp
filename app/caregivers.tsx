import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Redirect, useRouter } from 'expo-router';
import {
  Button,
  Card,
  Chip,
  Input,
  PageHeader,
  QueryState,
  Screen,
  Text,
  colors,
} from '@/design-system';
import { useSession } from '@/features/auth/SessionProvider';
import { useActiveBaby } from '@/features/baby/ActiveBabyProvider';
import { can } from '@/features/caregivers/permissions';
import {
  acceptInvitation,
  issueInvitation,
  listCaregivers,
  listInvitations,
  revokeCaregiver,
  revokeInvitation,
} from '@/features/caregivers/caregiver.service';
import { useI18n } from '@/lib/i18n';
import { queryKeys } from '@/lib/query-keys';

export default function CaregiversScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const cache = useQueryClient();
  const { session, profile, loading } = useSession();
  const { household, membership, setHouseholdId } = useActiveBaby();
  const manager = can('household.manageMembers', membership);
  const [role, setRole] = useState<'caregiver' | 'professional_viewer'>('caregiver');
  const [code, setCode] = useState('');
  const [issued, setIssued] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [confirm, setConfirm] = useState<string | null>(null);
  const members = useQuery({
    queryKey: ['caregivers', household?.id],
    queryFn: () => listCaregivers(household!.id),
    enabled: Boolean(household && session),
  });
  const invitations = useQuery({
    queryKey: ['invitations', household?.id],
    queryFn: () => listInvitations(household!.id),
    enabled: Boolean(household && session && manager),
  });
  async function run(action: () => Promise<unknown>, afterSuccess?: () => void) {
    setBusy(true);
    setError(false);
    try {
      await action();
      await Promise.all([
        cache.invalidateQueries({ queryKey: queryKeys.households }),
        cache.invalidateQueries({ queryKey: ['caregivers'] }),
        cache.invalidateQueries({ queryKey: ['invitations'] }),
      ]);
      setConfirm(null);
      afterSuccess?.();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }
  if (!loading && !session) return <Redirect href="/(auth)/sign-in" />;
  return (
    <Screen>
      <PageHeader title={t('caregivers.title')} subtitle={household?.name} />
      {error ? (
        <Text color={colors.error} accessibilityRole="alert">
          {t('caregivers.error')}
        </Text>
      ) : null}
      {household ? (
        <Card>
          <QueryState
            loading={members.isLoading}
            error={members.isError}
            onRetry={() => void members.refetch()}
          >
            {null}
          </QueryState>
          {members.data?.map((member) => (
            <Card key={member.profile_id}>
              <Text variant="bodyStrong">{member.displayName || t('caregivers.member')}</Text>
              <Text>
                {t(`roles.${member.role}`)} · {t(`caregivers.status.${member.status}`)}
              </Text>
              {manager &&
              member.profile_id !== profile?.id &&
              member.status === 'active' &&
              (member.role === 'caregiver' || member.role === 'professional_viewer') ? (
                confirm === member.profile_id ? (
                  <>
                    <Text>{t('caregivers.revokeConfirm')}</Text>
                    <Button
                      label={t('caregivers.revoke')}
                      disabled={busy}
                      onPress={() =>
                        void run(() => revokeCaregiver(household.id, member.profile_id))
                      }
                    />
                    <Button
                      variant="ghost"
                      label={t('common.cancel')}
                      onPress={() => setConfirm(null)}
                    />
                  </>
                ) : (
                  <Button
                    variant="secondary"
                    label={t('caregivers.revoke')}
                    onPress={() => setConfirm(member.profile_id)}
                  />
                )
              ) : null}
            </Card>
          ))}
        </Card>
      ) : null}
      {manager && household ? (
        <Card>
          <Text variant="subtitle">{t('caregivers.invite')}</Text>
          <Text>{t('caregivers.inviteHint')}</Text>
          {(['caregiver', 'professional_viewer'] as const).map((value) => (
            <Chip
              key={value}
              label={t(`roles.${value}`)}
              selected={value === role}
              onPress={() => setRole(value)}
            />
          ))}
          <Button
            label={t('caregivers.generate')}
            disabled={busy}
            onPress={() =>
              void run(async () => {
                setIssued((await issueInvitation(household.id, role)).code);
              })
            }
          />
          {issued ? (
            <Input
              label={t('caregivers.shareCode')}
              value={issued}
              editable={false}
              multiline
              selectTextOnFocus
            />
          ) : null}
          <QueryState
            loading={invitations.isLoading}
            error={invitations.isError}
            onRetry={() => void invitations.refetch()}
          >
            {null}
          </QueryState>
          {invitations.data?.map((invite) => (
            <Card key={invite.id}>
              <Text>
                {t(`roles.${invite.role}`)} · {t('caregivers.expires')}{' '}
                {new Date(invite.expires_at).toLocaleDateString()}
              </Text>
              <Button
                variant="secondary"
                label={t('caregivers.cancelInvite')}
                disabled={busy}
                onPress={() =>
                  void run(
                    () => revokeInvitation(invite.id),
                    () => setIssued(''),
                  )
                }
              />
            </Card>
          ))}
        </Card>
      ) : null}
      <Card>
        <Text variant="subtitle">{t('caregivers.join')}</Text>
        <Input
          label={t('caregivers.code')}
          value={code}
          onChangeText={setCode}
          autoCapitalize="none"
        />
        <Button
          label={t('caregivers.join')}
          disabled={busy || !code.trim()}
          onPress={() =>
            void run(
              async () => {
                const id = await acceptInvitation(code);
                setHouseholdId(id);
                setCode('');
              },
              () => router.replace('/'),
            )
          }
        />
      </Card>
      <Button variant="ghost" label={t('common.close')} onPress={() => router.back()} />
    </Screen>
  );
}
