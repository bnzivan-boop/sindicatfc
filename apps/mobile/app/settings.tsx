import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LocationPrivacy, Visibility } from '@sindikat/domain';
import { router } from 'expo-router';
import { ArrowLeft, Bell, Shield, Trash2 } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import { api } from '../src/api/client';
import { useLogout, useMe } from '../src/auth/useAuth';
import { Picker } from '../src/components/Picker';
import { DetailTopBar, InfoList, InfoRow, Page, PageTitle, Round, SectionHead, Surface, T } from '../src/components/ui';
import { goBack } from '../src/navigation';
import { useTheme } from '../src/theme/useTheme';

const VIS: Record<Visibility, string> = { PUBLIC: 'всем', FRIENDS: 'друзьям', PRIVATE: 'только мне' };
const LOC: Record<LocationPrivacy, string> = { HIDDEN: 'скрывать место', WATERBODY_ONLY: 'только водоём', EXACT: 'точная точка' };

/** Настройки: приватность снаряжения и геолокации (концепция «Отображение в приложении»), уведомления, аккаунт. */
export default function SettingsScreen() {
  const { colors } = useTheme();
  const me = useMe();
  const qc = useQueryClient();
  const logout = useLogout();
  const save = useMutation({ mutationFn: (dto: { gearVisibility?: Visibility; locationPrivacy?: LocationPrivacy }) => api('/me/privacy', { method: 'PATCH', body: dto }), onSuccess: () => { void qc.invalidateQueries({ queryKey: ['me'] }); void qc.invalidateQueries({ queryKey: ['gear-kits'] }); void qc.invalidateQueries({ queryKey: ['catches'] }); } });
  const p = me.data?.privacy;
  return (
    <Page>
      <DetailTopBar title="настройки" left={<Round icon={ArrowLeft} onPress={() => goBack('/(tabs)/profile')} />} />
      <PageTitle title="приватность" subtitle="что видят другие участники" />
      <View style={{ gap: 14 }}>
        <Picker label="видимость арсенала (все комплекты и лодка)" items={Object.values(Visibility).map((v) => ({ value: v, label: VIS[v] }))} value={p?.gearVisibility ?? 'PUBLIC'} onChange={(gearVisibility) => save.mutate({ gearVisibility })} />
        <Picker label="геолокация уловов по умолчанию" items={Object.values(LocationPrivacy).map((v) => ({ value: v, label: LOC[v] }))} value={p?.locationPrivacy ?? 'HIDDEN'} onChange={(locationPrivacy) => save.mutate({ locationPrivacy })} />
        <Surface radius={14} style={{ padding: 12 }}><T size={10} muted>Точная координата никогда не попадает в публичный профиль и ленту, если выбран не «точная точка». Организатор видит только данные, нужные для допуска к конкретному турниру.</T></Surface>
        {save.isError && <T size={10} color={colors.orange}>{String(save.error)}</T>}
      </View>
      <SectionHead title="уведомления" />
      <InfoList>
        <InfoRow icon={Bell} label="push" value="турниры, заявки, результаты, протесты, ответы в темах" onPress={() => router.push('/notifications')} />
      </InfoList>
      <SectionHead title="аккаунт" />
      <InfoList>
        <InfoRow icon={Shield} label="телефон" value={me.data?.phone ?? ''} />
        <InfoRow icon={Trash2} label="удаление аккаунта" value="по запросу в поддержку — политика хранения данных согласуется до релиза (handoff §12)" />
      </InfoList>
      <Pressable onPress={() => logout.mutate(undefined, { onSuccess: () => router.replace('/') })} style={{ alignItems: 'center', padding: 14, marginTop: 10 }}><T size={11} color={colors.orange}>выйти из аккаунта</T></Pressable>
    </Page>
  );
}
