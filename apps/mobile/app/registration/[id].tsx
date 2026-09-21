import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Search } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { money } from '../../src/api/helpers';
import { useMe } from '../../src/auth/useAuth';
import { Avatar, DeepCard, DetailTopBar, EventTag, fontDisplay, fontFamily, LimeButton, Page, PageTitle, Round, SectionHead, Surface, T } from '../../src/components/ui';
import { FORMAT_RU, STATUS_RU, useCancel, useInvite, usePay, useRegistration, useUserSearch } from '../../src/features/registrations/useRegistrations';
import { goBack } from '../../src/navigation';
import { whiteAlpha } from '../../src/theme/tokens';
import { useFriends } from '../../src/features/friends/useFriends';
import { useTheme } from '../../src/theme/useTheme';
import { Text } from 'react-native';

/** Заявка: статус, участники, приглашение напарника (.partner из прототипа), оплата, отмена. */
export default function RegistrationScreen() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: reg } = useRegistration(id);
  const me = useMe();
  const invite = useInvite(id);
  const pay = usePay(id);
  const cancel = useCancel(id);
  const [q, setQ] = useState('');
  const hits = useUserSearch(q);
  const friends = useFriends(!!me.data);
  const memberIds = new Set((reg?.members ?? []).map((m) => m.userId));
  const friendHits = q.trim().length < 2 ? (friends.data?.friends ?? []).filter((f) => !memberIds.has(f.id)).map((f) => ({ id: f.id, displayName: f.displayName, city: f.city, discipline: f.discipline })) : [];

  if (!reg) return <Page><DetailTopBar title="заявка" left={<Round icon={ArrowLeft} onPress={() => goBack('/my-registrations')} />} /><T muted>Загрузка…</T></Page>;
  const isOwner = reg.ownerId === me.data?.id;
  const limit = { SOLO: 1, PAIR: 2, CREW: 2, TEAM: 4 }[reg.format];
  const activeMembers = reg.members.filter((m) => m.invitationStatus !== 'DECLINED' && m.invitationStatus !== 'EXPIRED');
  const canInvite = isOwner && reg.format !== 'SOLO' && activeMembers.length < limit && ['DRAFT', 'WAITING_MEMBERS', 'WAITLISTED'].includes(reg.status);
  const canPay = isOwner && ['WAITING_PAYMENT', 'PAYMENT_FAILED'].includes(reg.status);
  const canCancel = isOwner && ['DRAFT', 'WAITING_MEMBERS', 'WAITING_PAYMENT', 'CONFIRMED', 'WAITLISTED'].includes(reg.status);
  const total = reg.amountMinor ?? 0;
  const good = ['CONFIRMED', 'CHECKED_IN', 'FINISHED'].includes(reg.status);

  return (
    <Page>
      <DetailTopBar title="заявка" left={<Round icon={ArrowLeft} onPress={() => goBack('/my-registrations')} />} />
      <DeepCard style={{ marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ backgroundColor: good ? colors.lime : whiteAlpha(15), borderRadius: 10, paddingHorizontal: 9, paddingVertical: 6 }}><Text style={[fontFamily, { fontSize: 9, letterSpacing: 0.7, textTransform: 'uppercase', color: good ? colors.onLime : colors.white }]}>{STATUS_RU[reg.status]}</Text></View>
          {reg.startNumber && <Text style={[fontDisplay, { fontSize: 24, color: colors.lime }]}>№{reg.startNumber}</Text>}
        </View>
        <Text style={[fontDisplay, { fontSize: 22, letterSpacing: -0.8, color: colors.white, marginTop: 18 }]}>{reg.tournament?.title ?? 'Турнир'}</Text>
        <Text style={[fontFamily, { fontSize: 10, color: whiteAlpha(70), marginTop: 4 }]}>{FORMAT_RU[reg.format]} · {total ? money(total) : 'без взноса'}{reg.payments[0]?.status === 'SUCCEEDED' ? ' · оплачено' : ''}</Text>
      </DeepCard>

      <SectionHead title={reg.format === 'SOLO' ? 'участник' : `состав · ${activeMembers.length} из ${limit}`} />
      <Surface radius={16} style={{ padding: 10, gap: 8 }}>
        {activeMembers.map((m) => (
          <Pressable key={m.id} disabled={!m.userId || m.userId === me.data?.id} onPress={() => router.push({ pathname: '/user/[id]', params: { id: m.userId! } })} style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
            <Avatar name={m.user?.profile?.displayName ?? m.invitedPhone ?? '?'} size={34} lime={m.role === 'OWNER'} />
            <View style={{ flex: 1 }}><T size={11} weight="500">{m.user?.profile?.displayName ?? m.invitedPhone ?? 'приглашение'}</T><T size={9} muted>{m.role === 'OWNER' ? 'заявитель' : m.role === 'PARTNER' ? 'напарник' : 'участник'}</T></View>
            <EventTag plain={m.invitationStatus !== 'ACCEPTED'}>{m.invitationStatus === 'ACCEPTED' ? 'принял' : 'ждём ответа'}</EventTag>
          </Pressable>
        ))}
      </Surface>

      {canInvite && (
        <>
          <SectionHead title="добавьте напарника" />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surface, borderRadius: 14, paddingHorizontal: 12 }}>
            <Search size={14} color={colors.muted} />
            <TextInput value={q} onChangeText={setQ} placeholder="имя или фамилия" placeholderTextColor={colors.muted} style={[fontFamily, { flex: 1, color: colors.text, paddingVertical: 10, fontSize: 12 }]} />
          </View>
          <View style={{ gap: 6, marginTop: 8 }}>
            {friendHits.length > 0 && <T size={9} muted>ваши друзья</T>}
            {[...friendHits, ...(hits.data ?? [])].filter((h) => h.id !== me.data?.id).map((h) => (
              <Surface key={h.id} radius={14} style={{ padding: 10, flexDirection: 'row', alignItems: 'center', gap: 9 }}>
                <Avatar name={h.displayName} size={32} />
                <View style={{ flex: 1 }}><T size={11} weight="500">{h.displayName}</T><T size={9} muted>{[h.city, h.discipline?.toLowerCase()].filter(Boolean).join(' · ')}</T></View>
                <Pressable onPress={() => invite.mutate({ userId: h.id }, { onSuccess: () => setQ('') })} style={{ backgroundColor: colors.text, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 }}><T size={9} color={colors.bg}>пригласить</T></Pressable>
              </Surface>
            ))}
            {q.length >= 2 && hits.data?.length === 0 && <T size={9} muted>Никого не нашли. Напарник без аккаунта? Пригласите по номеру: {q.startsWith('+') ? <T size={9} color={colors.green} onPress={() => invite.mutate({ phone: q })}>отправить приглашение на {q}</T> : 'введите номер в формате +7…'}</T>}
            {invite.isError && <T size={10} color={colors.orange}>{String(invite.error)}</T>}
          </View>
        </>
      )}

      <View style={{ gap: 8, marginTop: 20 }}>
        {canPay && <LimeButton title={pay.isPending ? 'оплачиваем…' : `оплатить ${money(total)}`} disabled={pay.isPending} onPress={() => pay.mutate()} />}
        {reg.status === 'WAITING_MEMBERS' && <T size={9} muted style={{ textAlign: 'center' }}>Оплата откроется, когда все участники примут приглашение.</T>}
        {reg.status === 'WAITLISTED' && <T size={9} muted style={{ textAlign: 'center' }}>Мест нет — вы в листе ожидания. Сообщим, когда место освободится.</T>}
        {pay.isError && <T size={10} color={colors.orange}>{String(pay.error)}</T>}
        {canCancel && <Pressable onPress={() => cancel.mutate(undefined, { onSuccess: () => router.replace('/my-registrations') })} style={{ alignItems: 'center', padding: 8 }}><T size={10} color={colors.orange}>{cancel.isPending ? 'отменяем…' : 'отменить заявку'}</T></Pressable>}
      </View>
    </Page>
  );
}
