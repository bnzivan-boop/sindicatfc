import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DISCIPLINE_LABELS_RU } from '@sindikat/domain';
import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { api } from '../../src/api/client';
import { useMe } from '../../src/auth/useAuth';
import { Avatar, DeepCard, fontFamily, fontSemi, LimeButton, Page, PageTitle, Stats } from '../../src/components/ui';
import { useOnboarding } from '../../src/features/onboarding/store';
import { whiteAlpha } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/useTheme';

/** Финал: превью профиля (как .club-preview в прототипе) и фиксация onboardingCompleted на сервере. */
export default function DoneStep() {
  const { colors } = useTheme();
  const { draft, reset } = useOnboarding();
  const me = useMe();
  const qc = useQueryClient();
  const finish = useMutation({
    mutationFn: () => api('/me/profile', { method: 'PATCH', body: { onboardingCompleted: true } }),
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: ['me'] }); reset(); router.replace('/'); },
  });
  const name = draft.displayName || me.data?.profile?.displayName || 'Рыболов';
  const primary = draft.disciplines[0] ?? me.data?.disciplines?.[0]?.discipline;

  return (
    <Page>
      <PageTitle title="готово" subtitle="профиль создан — можно регистрироваться на турниры" />
      <DeepCard style={{ borderRadius: 17, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <Avatar name={name} size={46} lime radius={14} />
        <View style={{ flex: 1 }}>
          <Text style={[fontSemi, { fontSize: 14, color: colors.white }]}>{name}</Text>
          <Text style={[fontFamily, { fontSize: 9, color: whiteAlpha(65) }]}>{primary ? DISCIPLINE_LABELS_RU[primary] : 'дисциплина не выбрана'}{draft.experienceYears ? ` · стаж ${draft.experienceYears} лет` : ''} · участник с {me.data ? new Date(me.data.createdAt).getFullYear() : new Date().getFullYear()}</Text>
        </View>
      </DeepCard>
      <Stats items={[{ label: 'дисциплины', value: String(draft.disciplines.length || me.data?.disciplines?.length || 0) }, { label: 'комплект', value: draft.kit?.rodText ? 'есть' : '—' }, { label: 'лодка', value: draft.hasBoat ? 'есть' : '—' }]} />
      <LimeButton title={finish.isPending ? 'секунду…' : 'на главную'} disabled={finish.isPending} onPress={() => finish.mutate()} />
    </Page>
  );
}
