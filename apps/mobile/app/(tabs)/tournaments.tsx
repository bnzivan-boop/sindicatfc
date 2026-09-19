import { Discipline, type TournamentSummary } from '@sindikat/domain';
import { Link, router } from 'expo-router';
import { CalendarDays, CheckCircle2, SlidersHorizontal } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { hours, LEVEL_LABEL, MONTHS, plural, SEASON_YEAR, STATUS_LABEL } from '../../src/api/helpers';
import { useTournaments } from '../../src/api/tournaments';
import { useMe } from '../../src/auth/useAuth';
import { STATUS_RU as REG_STATUS, useMyRegistrations } from '../../src/features/registrations/useRegistrations';
import { Brand, EventTag, FilterRow, fontFamily, Page, PageTitle, Round, SectionHead, Surface, T, TopBar } from '../../src/components/ui';
import { useTheme } from '../../src/theme/useTheme';

const FILTERS: Array<{ value: Discipline | undefined; label: string }> = [
  { value: undefined, label: 'все' },
  { value: 'STREET', label: 'street' },
  { value: 'AREA_TROUT', label: 'trout' },
  { value: 'FEEDER', label: 'feeder' },
  { value: 'FLOAT', label: 'float' },
  { value: 'SHORE_JIG', label: 'jig' },
  { value: 'ICE', label: 'лёд' },
  { value: 'BOAT', label: 'лодки' },
];

/** tournaments-view: календарь сезона, сгруппированный по месяцам. */
export default function TournamentsScreen() {
  const { colors } = useTheme();
  const [discipline, setDiscipline] = useState<Discipline | undefined>();
  const { data, isLoading } = useTournaments({ discipline });
  const me = useMe();
  const myRegs = useMyRegistrations(!!me.data);
  const mine = (myRegs.data ?? []).filter((r) => !['FINISHED', 'CANCELLED', 'REFUNDED', 'REJECTED'].includes(r.status) && (!discipline || r.tournament?.discipline === discipline));
  const myIds = new Set((myRegs.data ?? []).map((r) => r.tournamentId));

  const months = useMemo(() => {
    const map = new Map<number, TournamentSummary[]>();
    for (const t of data ?? []) {
      const m = new Date(t.startsAt).getMonth();
      map.set(m, [...(map.get(m) ?? []), t]);
    }
    return [...map.entries()].sort(([a], [b]) => a - b);
  }, [data]);

  return (
    <Page>
      <TopBar left={<Brand />} right={<Round icon={SlidersHorizontal} />} />
      <PageTitle title="турниры" subtitle={`календарь сезона ${SEASON_YEAR}`} right={<Round icon={CalendarDays} />} />
      <FilterRow items={FILTERS} value={discipline} onChange={setDiscipline} />

      {mine.length > 0 && (
        <View>
          <SectionHead title="мои старты" action="все заявки" onAction={() => router.push('/my-registrations')} />
          <View style={{ gap: 6 }}>
            {mine.map((r) => {
              const d = new Date(r.tournament?.startsAt ?? 0);
              const paid = ['CONFIRMED', 'CHECKED_IN'].includes(r.status);
              return (
                <Pressable key={r.id} onPress={() => router.push({ pathname: '/registration/[id]', params: { id: r.id } })} style={{ flexDirection: 'row', alignItems: 'center', gap: 11, padding: 12, borderRadius: 17, borderWidth: 1, borderColor: colors.green, backgroundColor: paid ? `${colors.green}14` : colors.surface }}>
                  <View style={{ width: 42, alignItems: 'center' }}>
                    <Text style={[fontFamily, { fontSize: 20, lineHeight: 22, fontWeight: '500', color: colors.text }]}>{String(d.getDate()).padStart(2, '0')}</Text>
                    <Text style={[fontFamily, { fontSize: 9, color: colors.muted }]}>{d.toLocaleDateString('ru-RU', { month: 'short' }).replace('.', '')}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[fontFamily, { fontSize: 12, fontWeight: '500', marginBottom: 4, color: colors.text }]}>{r.tournament?.title}</Text>
                    <Text style={[fontFamily, { fontSize: 10, color: colors.muted }]}>{r.format === 'SOLO' ? 'личный' : r.format === 'PAIR' ? 'парный' : r.format.toLowerCase()}{r.startNumber ? ` · №${r.startNumber}` : ''}{r.tournament?.status === 'LIVE' ? ' · идёт сейчас' : ''}</Text>
                  </View>
                  <EventTag plain={!paid}>{REG_STATUS[r.status]}</EventTag>
                </Pressable>
              );
            })}
          </View>
          <SectionHead title="календарь" />
        </View>
      )}
      {months.length === 0 && <T muted>{isLoading ? 'Загрузка…' : 'Стартов пока нет'}</T>}
      {months.map(([m, list]) => (
        <View key={m}>
          <Text style={[fontFamily, { fontSize: 10, letterSpacing: 0.9, textTransform: 'uppercase', color: colors.muted, marginTop: 18, marginBottom: 9, marginHorizontal: 2 }]}>
            {MONTHS[m]} · {list.length} {plural(list.length, 'старт', 'старта', 'стартов')}{list.every((t) => t.status === 'FINALIZED') ? ' · завершены' : ''}
          </Text>
          <View style={{ gap: 6 }}>
            {list.map((t) => {
              const featured = t.status === 'LIVE';
              const done = t.status === 'FINALIZED' || t.status === 'ARCHIVED' || t.status === 'CANCELLED';
              const d = new Date(t.startsAt);
              const fg = featured ? colors.white : done ? colors.muted : colors.text;
              return (
                <Link key={t.id} href={{ pathname: '/tournament/[id]', params: { id: t.id } }} asChild>
                  <Pressable style={{ flexDirection: 'row', alignItems: 'center', gap: 11, padding: 12, borderRadius: 17, borderWidth: 1, borderStyle: done ? 'dashed' : 'solid', borderColor: featured ? 'transparent' : colors.line, backgroundColor: featured ? colors.deep : done ? 'transparent' : colors.surface, opacity: done ? 0.75 : 1 }}>
                    <View style={{ width: 42, alignItems: 'center' }}>
                      <Text style={[fontFamily, { fontSize: 20, lineHeight: 22, fontWeight: '500', color: fg, textDecorationLine: done ? 'line-through' : 'none' }]}>{String(d.getDate()).padStart(2, '0')}</Text>
                      <Text style={[fontFamily, { fontSize: 9, color: featured ? colors.white : colors.muted }]}>{d.toLocaleDateString('ru-RU', { month: 'short' }).replace('.', '')}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[fontFamily, { fontSize: 12, fontWeight: '500', marginBottom: 4, color: fg }]}>{t.title}</Text>
                      <Text style={[fontFamily, { fontSize: 10, color: featured ? colors.white : colors.muted, opacity: featured ? 0.75 : 1 }]}>
                        {t.locationTitle} · {t.status === 'REGISTRATION_OPEN' || t.status === 'LIVE' ? STATUS_LABEL[t.status] : done ? 'протокол' : hours(t.startsAt, t.endsAt)}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      {done ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.surface2, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 4 }}>
                          <CheckCircle2 size={9} color={colors.muted} strokeWidth={2} />
                          <Text style={[fontFamily, { fontSize: 8, color: colors.muted }]}>завершён</Text>
                        </View>
                      ) : (
                        <EventTag>{LEVEL_LABEL[t.level]}</EventTag>
                      )}
                      {myIds.has(t.id) && <Text style={[fontFamily, { fontSize: 8, color: featured ? colors.lime : colors.green }]}>● вы участвуете</Text>}
                    </View>
                  </Pressable>
                </Link>
              );
            })}
          </View>
        </View>
      ))}
    </Page>
  );
}
