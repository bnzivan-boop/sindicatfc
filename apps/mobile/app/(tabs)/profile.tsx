import { goBack } from '../../src/navigation';
import { DISCIPLINE_LABELS_RU } from '@sindikat/domain';
import { router } from 'expo-router';
import { ArrowLeft, ChevronRight, CircleDot, FishSymbol, Gem, NotebookPen, Sailboat, Shield, SquarePen, Trophy, Users } from 'lucide-react-native';
import { Image, Pressable, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { uploadTo } from '../../src/features/media/upload';
import { useBoat, useGearKits } from '../../src/features/gear/useGear';
import { useFriends } from '../../src/features/friends/useFriends';
import { STATUS_RU as REG_STATUS, useMyRegistrations } from '../../src/features/registrations/useRegistrations';
import { useLogout, useMe } from '../../src/auth/useAuth';
import { Avatar, DeepCard, DetailTopBar, EventTag, fontFamily, InfoList, InfoRow, LimeButton, Page, Round, SectionHead, Stats, T, Track } from '../../src/components/ui';
import { whiteAlpha } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/useTheme';


/** my-profile-view прототипа. */
export default function ProfileScreen() {
  const { colors } = useTheme();
  const me = useMe();
  const logout = useLogout();
  const qc = useQueryClient();
  const avatar = useMutation({
    mutationFn: async () => {
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, allowsEditing: true, aspect: [1, 1] });
      const a = res.assets?.[0];
      if (res.canceled || !a) return;
      await uploadTo('/me/avatar/upload-url', { uri: a.uri, mimeType: a.mimeType ?? 'image/jpeg' });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me'] }),
  });
  const kits = useGearKits();
  const boat = useBoat();
  const regs = useMyRegistrations(!!me.data);
  const friends = useFriends(!!me.data);
  const upcoming = (regs.data ?? []).filter((r) => !['FINISHED', 'CANCELLED', 'REFUNDED', 'REJECTED'].includes(r.status));
  const finished = (regs.data ?? []).filter((r) => r.status === 'FINISHED');

  if (me.data === null) {
    return (
      <Page>
        <DetailTopBar title="мой профиль" left={<Round icon={ArrowLeft} onPress={() => goBack()} />} />
        <DeepCard><Text style={[fontFamily, { fontSize: 21, fontWeight: '500', color: colors.white, marginBottom: 12 }]}>Войдите по телефону</Text><LimeButton title="войти" onPress={() => router.push('/onboarding')} /></DeepCard>
      </Page>
    );
  }
  const p = me.data?.profile;
  const name = p?.displayName ?? 'Рыболов';
  const filled = [p?.displayName, p?.cityId, p?.experienceYears, me.data?.disciplines?.length, kits.data?.length].filter(Boolean).length;
  const pct = Math.round((filled / 5) * 100);
  const primary = me.data?.disciplines?.[0]?.discipline;
  const since = me.data ? new Date(me.data.createdAt).getFullYear() : new Date().getFullYear();

  return (
    <Page>
      <DetailTopBar title="мой профиль" left={<Round icon={ArrowLeft} onPress={() => goBack()} />} right={<Round icon={SquarePen} onPress={() => router.push('/onboarding/about')} />} />

      <DeepCard style={{ borderRadius: 23, padding: 17, marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <Pressable onPress={() => avatar.mutate()}>{me.data?.avatarUrl ? <Image source={{ uri: me.data.avatarUrl }} style={{ width: 62, height: 62, borderRadius: 19 }} /> : <Avatar name={name} size={62} lime radius={19} />}<View style={{ position: 'absolute', right: -4, bottom: -4, backgroundColor: colors.lime, borderRadius: 999, paddingHorizontal: 6, paddingVertical: 2 }}><Text style={[fontFamily, { fontSize: 8, color: colors.onLime }]}>{avatar.isPending ? '…' : 'фото'}</Text></View></Pressable>
          <View style={{ flex: 1 }}>
            <Text style={[fontFamily, { fontSize: 21, fontWeight: '500', letterSpacing: -0.8, color: colors.white, marginBottom: 4 }]}>{name}</Text>
            <Text style={[fontFamily, { fontSize: 10, color: whiteAlpha(70) }]}>
              {p?.city?.name ?? 'Москва'}{primary ? ` · ${DISCIPLINE_LABELS_RU[primary]}${me.data?.season?.rank ? ` №${me.data.season.rank}` : ''}` : ''} · участник с {since}
            </Text>
          </View>
          <Pressable onPress={() => router.push('/onboarding/about')} hitSlop={8}><Text style={[fontFamily, { fontSize: 9, color: colors.lime }]}>изменить</Text></Pressable>
        </View>
        <View style={{ marginTop: 14 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={[fontFamily, { fontSize: 8, color: whiteAlpha(65) }]}>профиль заполнен</Text>
            <Text style={[fontFamily, { fontSize: 8, fontWeight: '500', color: whiteAlpha(65) }]}>{pct}%</Text>
          </View>
          <Track pct={pct} />
        </View>
      </DeepCard>

      <Stats items={[
        { label: 'рейтинг', value: me.data?.season?.rank ? `#${me.data.season.rank}` : '—' },
        { label: 'очки', value: (me.data?.season?.points ?? 0).toLocaleString('ru-RU') },
        { label: 'старты', value: String(me.data?.season?.starts ?? 0) },
      ]} />

      <SectionHead title="мои старты" action={finished.length ? `история · ${finished.length}` : 'все'} onAction={() => router.push('/my-registrations')} />
      <InfoList>
        {upcoming.length === 0 && <InfoRow icon={Trophy} label="заявок нет" value="выберите старт в календаре" onPress={() => router.push('/(tabs)/tournaments')} />}
        {upcoming.map((r) => (
          <InfoRow key={r.id} icon={Trophy} label={`${new Date(r.tournament?.startsAt ?? 0).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })} · ${REG_STATUS[r.status]}${r.startNumber ? ` · №${r.startNumber}` : ''}`} value={r.tournament?.title ?? ''} onPress={() => router.push({ pathname: '/registration/[id]', params: { id: r.id } })} trailing={<ChevronRight size={14} color={colors.muted} />} />
        ))}
      </InfoList>

      <SectionHead title="мои комплекты" action="+ добавить" onAction={() => router.push('/gear/new')} />
      <InfoList>
        {(kits.data ?? []).map((k) => (
          <InfoRow key={k.id} icon={FishSymbol} label={`${DISCIPLINE_LABELS_RU[k.discipline].toLowerCase()} · ${k.isPrimary ? 'основной' : 'запасной'}`} value={[k.rod?.customBrand, k.rod?.customModel, k.rod?.lureTestMinG !== undefined ? `${k.rod.lureTestMinG}–${k.rod.lureTestMaxG} г` : null].filter(Boolean).join(' ') || k.name} action="изменить" onAction={() => router.push({ pathname: '/gear/[id]', params: { id: k.id } })} />
        ))}
        {kits.data?.length === 0 && <InfoRow icon={CircleDot} label="арсенал" value="добавьте первый комплект: удилище → катушка → шнур → поводок → приманки" />}
        <InfoRow icon={Sailboat} label="лодка" value={boat.data ? [boat.data.customName, boat.data.equipment?.motor?.powerHp ? `мотор ${boat.data.equipment.motor.powerHp} л.с.` : null].filter(Boolean).join(' · ') || boat.data.type : 'добавить лодку для лодочных турниров'} action="изменить" onAction={() => router.push('/gear/boat')} />
      </InfoList>

      <SectionHead title="аккаунт" />
      <InfoList>
        <InfoRow icon={Trophy} label="турниры" value="мои заявки и история участий" onPress={() => router.push('/my-registrations')} trailing={<ChevronRight size={14} color={colors.muted} />} />
        <InfoRow icon={Users} label={`друзья · ${friends.data?.friends.length ?? 0}`} value={friends.data?.incoming.length ? `${friends.data.incoming.length} новых заявок` : 'напарники, одноклубники, компания на рыбалку'} onPress={() => router.push('/friends')} trailing={friends.data?.incoming.length ? <EventTag>{String(friends.data.incoming.length)}</EventTag> : <ChevronRight size={14} color={colors.muted} />} />
        <InfoRow icon={NotebookPen} label="личное" value="дневник рыбалок и уловов" onPress={() => router.push('/diary')} trailing={<ChevronRight size={14} color={colors.muted} />} />
        <InfoRow icon={Shield} label="настройки" value="приватность и видимость снаряжения" onPress={() => router.push('/settings')} trailing={<ChevronRight size={14} color={colors.muted} />} />
        <InfoRow icon={Gem} label="подписка" value="Синдикат Premium" trailing={<EventTag>premium</EventTag>} />
      </InfoList>

      <View style={{ marginTop: 20 }}>
        <T size={10} muted>{me.data?.phone}</T>
        <Pressable onPress={() => logout.mutate()} hitSlop={8} style={{ marginTop: 6 }}><T size={11} color={colors.orange}>выйти из аккаунта</T></Pressable>
      </View>
    </Page>
  );
}
