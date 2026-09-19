import { useQuery } from '@tanstack/react-query';
import { DISCIPLINE_LABELS_RU } from '@sindikat/domain';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import { api } from '../../../src/api/client';
import { plural } from '../../../src/api/helpers';
import { useTournament } from '../../../src/api/tournaments';
import { useMe } from '../../../src/auth/useAuth';
import { Avatar, DetailTopBar, EventTag, Page, PageTitle, Round, Surface, T } from '../../../src/components/ui';
import { goBack } from '../../../src/navigation';
import { useTheme } from '../../../src/theme/useTheme';

interface Entry { registrationId: string; format: string; status: string; startNumber: string | null; members: Array<{ userId: string | null; displayName: string; city: string | null; rank: number | null; role: string }> }

/** Список участников турнира (публичный): кто заявился, стартовые номера, место в рейтинге дисциплины. */
export default function ParticipantsScreen() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: t } = useTournament(id);
  const me = useMe();
  const { data, isLoading } = useQuery({ queryKey: ['participants', id], queryFn: () => api<Entry[]>(`/tournaments/${id}/participants`, { auth: false }), enabled: !!id });
  const rows = data ?? [];
  const people = rows.reduce((n, r) => n + r.members.length, 0);

  return (
    <Page>
      <DetailTopBar title={t?.title ?? 'участники'} left={<Round icon={ArrowLeft} onPress={() => goBack({ pathname: '/tournament/[id]', params: { id } })} />} />
      <PageTitle title="участники" subtitle={t ? `${people} ${plural(people, 'человек', 'человека', 'человек')} из ${t.capacity} · ${DISCIPLINE_LABELS_RU[t.discipline].toLowerCase()}` : '…'} />
      <View style={{ gap: 6 }}>
        {rows.length === 0 && <Surface><T size={10} muted>{isLoading ? 'Загрузка…' : 'Подтверждённых заявок пока нет — будьте первым.'}</T></Surface>}
        {rows.map((r) => (
          <Surface key={r.registrationId} radius={15} style={{ padding: 10, gap: 8 }}>
            {r.members.map((m) => {
              const isMe = m.userId === me.data?.id;
              return (
                <Pressable key={m.userId ?? m.displayName} disabled={!m.userId} onPress={() => router.push(isMe ? '/(tabs)/profile' : { pathname: '/user/[id]', params: { id: m.userId! } })} style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
                  <View style={{ width: 28, alignItems: 'center' }}><T size={11} weight="500" muted={!r.startNumber}>{r.startNumber ?? '—'}</T></View>
                  <Avatar name={m.displayName} size={34} lime={isMe} />
                  <View style={{ flex: 1 }}>
                    <T size={11} weight="500">{m.displayName}{isMe ? ' · вы' : ''}</T>
                    <T size={9} muted>{[m.city, m.rank ? `№${m.rank} в дисциплине` : 'без рейтинга', r.format === 'PAIR' ? (m.role === 'OWNER' ? 'пара · заявитель' : 'пара · напарник') : r.format === 'TEAM' ? 'команда' : r.format === 'CREW' ? 'экипаж' : null].filter(Boolean).join(' · ')}</T>
                  </View>
                  {r.status === 'CHECKED_IN' && <EventTag>на старте</EventTag>}
                </Pressable>
              );
            })}
          </Surface>
        ))}
      </View>
      <T size={9} muted style={{ marginTop: 14 }}>Показываются только подтверждённые заявки. Телефоны и статус оплаты видит только организатор.</T>
    </Page>
  );
}
