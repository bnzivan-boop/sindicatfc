import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import { MONTHS_GEN } from '../src/api/helpers';
import { useMe } from '../src/auth/useAuth';
import { DetailTopBar, EventTag, Page, PageTitle, Round, SectionHead, Surface, T } from '../src/components/ui';
import { FORMAT_RU, STATUS_RU, useInvitations, useMyRegistrations, useRespondInvitation } from '../src/features/registrations/useRegistrations';
import { goBack } from '../src/navigation';
import { useTheme } from '../src/theme/useTheme';

/** Кабинет участника: приглашения и мои заявки со статусами (история участий). */
export default function MyRegistrationsScreen() {
  const { colors } = useTheme();
  const me = useMe();
  const regs = useMyRegistrations(!!me.data);
  const inv = useInvitations(!!me.data);
  const respond = useRespondInvitation();
  const rows = regs.data ?? [];
  const active = rows.filter((r) => !['FINISHED', 'CANCELLED', 'REFUNDED', 'REJECTED'].includes(r.status));
  const past = rows.filter((r) => ['FINISHED', 'CANCELLED', 'REFUNDED', 'REJECTED'].includes(r.status));

  const Row = ({ r }: { r: (typeof rows)[number] }) => {
    const d = new Date(r.tournament?.startsAt ?? 0);
    const good = ['CONFIRMED', 'CHECKED_IN', 'FINISHED'].includes(r.status);
    return (
      <Pressable onPress={() => router.push({ pathname: '/registration/[id]', params: { id: r.id } })}>
        <Surface radius={17} style={{ padding: 12, flexDirection: 'row', alignItems: 'center', gap: 11 }}>
          <View style={{ width: 42, alignItems: 'center' }}><T size={20} weight="500">{d.getDate()}</T><T size={9} muted>{MONTHS_GEN[d.getMonth()]?.slice(0, 3)}</T></View>
          <View style={{ flex: 1 }}><T size={12} weight="500">{r.tournament?.title}</T><T size={10} muted>{FORMAT_RU[r.format]}{r.startNumber ? ` · №${r.startNumber}` : ''}</T></View>
          <EventTag plain={!good}>{STATUS_RU[r.status]}</EventTag>
        </Surface>
      </Pressable>
    );
  };

  return (
    <Page>
      <DetailTopBar title="мои заявки" left={<Round icon={ArrowLeft} onPress={() => goBack()} />} />
      <PageTitle title="участие" subtitle={`${active.length} активных · ${past.length} в истории`} />
      {(inv.data ?? []).length > 0 && (
        <>
          <SectionHead title="приглашения" tag={String(inv.data!.length)} />
          <View style={{ gap: 7 }}>
            {inv.data!.map((i) => (
              <Surface key={i.id} radius={16} style={{ padding: 12, gap: 8, borderColor: colors.green }}>
                <T size={11} weight="500">{i.registration.owner.profile?.displayName ?? 'Участник'} зовёт в {i.registration.format === 'PAIR' ? 'пару' : 'команду'}</T>
                <T size={10} muted>{i.registration.tournament.title} · {new Date(i.registration.tournament.startsAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}</T>
                <View style={{ flexDirection: 'row', gap: 7 }}>
                  <Pressable onPress={() => respond.mutate({ registrationId: i.registration.id, accept: true })} style={{ flex: 1, backgroundColor: colors.lime, borderRadius: 11, padding: 10, alignItems: 'center' }}><T size={10} weight="500" color={colors.onLime}>принять</T></Pressable>
                  <Pressable onPress={() => respond.mutate({ registrationId: i.registration.id, accept: false })} style={{ flex: 1, borderWidth: 1, borderColor: colors.line, borderRadius: 11, padding: 10, alignItems: 'center' }}><T size={10}>отказаться</T></Pressable>
                </View>
              </Surface>
            ))}
          </View>
        </>
      )}
      <SectionHead title="активные" />
      <View style={{ gap: 7 }}>{active.length === 0 && <Surface><T size={10} muted>{me.data ? 'Заявок пока нет — выберите старт в календаре.' : 'Войдите, чтобы видеть заявки.'}</T></Surface>}{active.map((r) => <Row key={r.id} r={r} />)}</View>
      {past.length > 0 && (<><SectionHead title="история участий" /><View style={{ gap: 7 }}>{past.map((r) => <Row key={r.id} r={r} />)}</View></>)}
    </Page>
  );
}
