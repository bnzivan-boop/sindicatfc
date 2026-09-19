import { useQuery } from '@tanstack/react-query';
import { Discipline } from '@sindikat/domain';
import { CircleHelp } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { api } from '../../src/api/client';
import { plural, SEASON_YEAR } from '../../src/api/helpers';
import { useMe } from '../../src/auth/useAuth';
import { Avatar, Brand, DeepCard, FilterRow, fontFamily, Page, PageTitle, Round, SectionHead, T, TopBar } from '../../src/components/ui';
import { whiteAlpha } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/useTheme';

interface RankingRow { userId: string; points: string; rank: number; starts: number; user: { profile: { displayName: string } | null } }

const FILTERS: Array<{ value: Discipline; label: string }> = [
  { value: 'STREET', label: 'street' }, { value: 'AREA_TROUT', label: 'trout' }, { value: 'FEEDER', label: 'feeder' }, { value: 'FLOAT', label: 'float' },
  { value: 'SHORE_JIG', label: 'jig' }, { value: 'ICE', label: 'лёд' }, { value: 'BOAT', label: 'лодки' },
];
const TITLES: Record<Discipline, string> = { STREET: 'street fishing', AREA_TROUT: 'area trout', FEEDER: 'feeder', FLOAT: 'float', SHORE_JIG: 'shore jig', ICE: 'ice fishing', BOAT: 'boat predator' };

/** rating-view прототипа: фильтр, hero с моим местом, подиум, таблица. */
export default function RatingScreen() {
  const { colors } = useTheme();
  const [discipline, setDiscipline] = useState<Discipline>('STREET');
  const me = useMe();
  const { data, isLoading } = useQuery({ queryKey: ['rankings', discipline], queryFn: () => api<RankingRow[]>(`/rankings?discipline=${discipline}`, { auth: false }) });
  const rows = data ?? [];
  const mine = rows.find((r) => r.userId === me.data?.id);
  const podium = [rows[1], rows[0], rows[2]];
  const short = (n: string) => { const [f, ...r] = n.split(' '); return r.length ? `${f?.[0]}. ${r.join(' ')}` : n; };
  const pts = (p: string) => Number(p).toLocaleString('ru-RU', { maximumFractionDigits: 0 });

  return (
    <Page>
      <TopBar left={<Brand />} right={<Round icon={CircleHelp} />} />
      <PageTitle title="рейтинг" subtitle={`сезон ${SEASON_YEAR} · личный зачёт`} />
      <FilterRow items={FILTERS} value={discipline} onChange={setDiscipline} />

      <DeepCard style={{ borderRadius: 23, marginBottom: 14 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18 }}>
          <Text style={[fontFamily, { fontSize: 10, color: whiteAlpha(62) }]}>{TITLES[discipline]}</Text>
          <Text style={[fontFamily, { fontSize: 10, color: whiteAlpha(62) }]}>{rows.length} {plural(rows.length, 'спортсмен', 'спортсмена', 'спортсменов')}</Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <Text style={[fontFamily, { fontSize: 48, lineHeight: 46, fontWeight: '500', letterSpacing: -2.9, color: colors.white }]}>{mine ? `#${mine.rank}` : '—'}</Text>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[fontFamily, { fontSize: 20, fontWeight: '500', color: colors.white }]}>{mine ? pts(mine.points) : '0'}</Text>
            <Text style={[fontFamily, { fontSize: 10, color: whiteAlpha(60) }]}>ваши очки</Text>
          </View>
        </View>
      </DeepCard>

      {rows.length >= 3 && (
        <View style={{ flexDirection: 'row', gap: 7, alignItems: 'flex-end', marginVertical: 14 }}>
          {podium.map((r, i) => r && (
            <Pressable key={r.userId} onPress={() => router.push({ pathname: '/user/[id]', params: { id: r.userId } })} style={{ flex: 1, alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: i === 1 ? `${colors.green}99` : colors.line, borderRadius: 17, paddingHorizontal: 7, paddingVertical: 12, paddingTop: i === 1 ? 18 : 12 }}>
              <View style={{ marginBottom: 8 }}><Avatar name={r.user.profile?.displayName ?? '—'} size={i === 1 ? 46 : 38} lime={i === 1} /></View>
              <T size={10} weight="500">{short(r.user.profile?.displayName ?? '—')}</T>
              <T size={9} muted>{pts(r.points)}</T>
            </Pressable>
          ))}
        </View>
      )}

      <SectionHead title="таблица спортсменов" action="поиск" />
      <View style={{ borderWidth: 1, borderColor: colors.line, borderRadius: 18, overflow: 'hidden' }}>
        {rows.length === 0 && <View style={{ padding: 12, backgroundColor: colors.surface }}><T size={10} muted>{isLoading ? 'Загрузка…' : 'Очки появятся после первого финализированного старта'}</T></View>}
        {rows.map((r, i) => {
          const isMe = r.userId === me.data?.id;
          return (
            <Pressable key={r.userId} onPress={() => router.push(isMe ? '/(tabs)/profile' : { pathname: '/user/[id]', params: { id: r.userId } })} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, backgroundColor: isMe ? `${colors.green}1c` : colors.surface, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.line }}>
              <T size={11} muted style={{ width: 28 }}>{String(r.rank).padStart(2, '0')}</T>
              <Avatar name={isMe ? 'ВЫ' : (r.user.profile?.displayName ?? '—')} size={34} />
              <View style={{ flex: 1 }}>
                <T size={11} weight="500">{r.user.profile?.displayName ?? '—'}</T>
                <T size={9} muted>{r.starts} {plural(r.starts, 'старт', 'старта', 'стартов')}</T>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <T size={11} weight="500">{pts(r.points)}</T>
                <T size={9} muted>очков</T>
              </View>
            </Pressable>
          );
        })}
      </View>
    </Page>
  );
}
