import { DISCIPLINE_LABELS_RU } from '@sindikat/domain';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Camera, Share2, UserPlus } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import { useMe } from '../../../src/auth/useAuth';
import { Avatar, DeepCard, DetailTopBar, EventTag, fontDisplay, fontFamily, fontSemi, Page, Round, SectionHead, Stats, Surface, T, Track } from '../../../src/components/ui';
import { Mark } from '../../../src/features/community/components';
import { useApplyClub, useClub, useDecideClub } from '../../../src/features/community/useCommunity';
import { goBack } from '../../../src/navigation';
import { whiteAlpha } from '../../../src/theme/tokens';
import { useTheme } from '../../../src/theme/useTheme';

/** club-view прототипа на реальных данных: рейтинг клуба = сумма очков состава в его дисциплине. */
export default function ClubScreen() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useMe();
  const { data: c } = useClub(id);
  const apply = useApplyClub(id);
  const decide = useDecideClub(id);
  if (!c) return <Page><DetailTopBar title="клуб" left={<Round icon={ArrowLeft} onPress={() => goBack('/(tabs)/community')} />} /><T muted>Загрузка…</T></Page>;
  const disc = DISCIPLINE_LABELS_RU[c.discipline as keyof typeof DISCIPLINE_LABELS_RU]?.toLowerCase();
  return (
    <Page>
      <DetailTopBar title="спортивный клуб" left={<Round icon={ArrowLeft} onPress={() => goBack('/(tabs)/community')} />} right={<Round icon={Share2} />} />
      <DeepCard style={{ borderRadius: 22, padding: 16, marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
          <Mark text={c.name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('')} official size={48} />
          <View style={{ flex: 1 }}>
            <Text style={[fontDisplay, { fontSize: 20, letterSpacing: -0.7, color: colors.white }]}>{c.name}</Text>
            <Text style={[fontFamily, { fontSize: 9, color: whiteAlpha(65) }]}>{[c.city, `основан в ${c.foundedYear}`, `${c.members} участников`, disc].filter(Boolean).join(' · ')}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 14, marginBottom: 6 }}>
          <Text style={[fontFamily, { fontSize: 8, color: whiteAlpha(65) }]}>клубный рейтинг · #{c.rank ?? '—'}</Text>
          <Text style={[fontSemi, { fontSize: 14, color: colors.white }]}>{c.points.toLocaleString('ru-RU')} очков</Text>
        </View>
        <Track pct={Math.min(100, Math.round((c.points / 8000) * 100))} />
        {c.description ? <Text style={[fontFamily, { fontSize: 10, color: whiteAlpha(75), marginTop: 12 }]}>{c.description}</Text> : null}
      </DeepCard>
      <View style={{ flexDirection: 'row', gap: 7 }}>
        {c.isCaptain ? <View style={{ flex: 1, backgroundColor: colors.surface2, borderRadius: 11, padding: 11, alignItems: 'center' }}><T size={9}>вы капитан</T></View> : (
          <Pressable onPress={() => (me.data ? apply.mutate() : router.push('/onboarding'))} disabled={!c.recruiting && !c.myRole} style={{ flex: 1, backgroundColor: c.myRole ? colors.surface2 : c.recruiting ? colors.text : colors.surface2, borderRadius: 11, padding: 11, alignItems: 'center' }}><T size={9} color={c.myRole || !c.recruiting ? colors.text : colors.bg}>{c.myRole === 'ATHLETE' ? 'вы в составе · выйти' : c.myRole === 'APPLICANT' ? 'заявка отправлена · отозвать' : !c.recruiting ? 'набор закрыт' : 'подать заявку'}</T></Pressable>
        )}
        <Pressable onPress={() => router.push('/community/messages')} style={{ flex: 1, backgroundColor: colors.surface2, borderRadius: 11, padding: 11, alignItems: 'center' }}><T size={9}>чат клуба</T></Pressable>
      </View>
      {apply.isError && <T size={10} color={colors.orange}>{String(apply.error)}</T>}

      {c.applicants.length > 0 && (
        <>
          <SectionHead title="заявки в клуб" tag={String(c.applicants.length)} />
          <View style={{ gap: 6 }}>{c.applicants.map((a) => (
            <Surface key={a.userId} radius={14} style={{ padding: 10, flexDirection: 'row', alignItems: 'center', gap: 9 }}>
              <Avatar name={a.displayName} size={30} /><T size={11} weight="500" style={{ flex: 1 }}>{a.displayName}</T>
              <Pressable onPress={() => decide.mutate({ userId: a.userId, accept: true })} style={{ backgroundColor: colors.lime, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 }}><T size={9} color={colors.onLime}>принять</T></Pressable>
              <Pressable onPress={() => decide.mutate({ userId: a.userId, accept: false })} style={{ backgroundColor: colors.surface2, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 }}><T size={9}>отказать</T></Pressable>
            </Surface>
          ))}</View>
        </>
      )}

      <SectionHead title="состав" action={`${c.members} участников`} />
      <Surface radius={16} style={{ padding: 10, gap: 8 }}>
        {c.roster.map((r) => (
          <Pressable key={r.userId} onPress={() => router.push(r.userId === me.data?.id ? '/(tabs)/profile' : { pathname: '/user/[id]', params: { id: r.userId } })} style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
            <Avatar name={r.displayName} size={34} lime={r.role === 'CAPTAIN'} />
            <View style={{ flex: 1 }}><T size={11} weight="500">{r.displayName}</T><T size={9} muted>{r.rank ? `${disc} №${r.rank} · ${r.points.toLocaleString('ru-RU')} очков` : 'без рейтинга в дисциплине'}</T></View>
            <EventTag plain={r.role !== 'CAPTAIN'}>{r.role === 'CAPTAIN' ? 'капитан' : 'спортсмен'}</EventTag>
          </Pressable>
        ))}
      </Surface>
      {c.slots.length > 0 && (
        <>
          <SectionHead title="открытые позиции" />
          <View style={{ gap: 7 }}>{c.slots.map((s, i) => (
            <Surface key={s.id} radius={14} style={{ padding: 11, flexDirection: 'row', alignItems: 'center', gap: 9 }}>
              {i === 0 ? <UserPlus size={16} color={colors.green} strokeWidth={1.6} /> : <Camera size={16} color={colors.green} strokeWidth={1.6} />}
              <View style={{ flex: 1 }}><T size={10} weight="500">{s.title}</T>{s.note ? <T size={8} muted>{s.note}</T> : null}</View>
              {!c.myRole && !c.isCaptain && <Pressable onPress={() => (me.data ? apply.mutate() : router.push('/onboarding'))} style={{ backgroundColor: colors.text, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 }}><T size={8} color={colors.bg}>откликнуться</T></Pressable>}
            </Surface>
          ))}</View>
        </>
      )}
      <SectionHead title="результаты сезона" />
      <Stats items={[{ label: 'победы', value: String(c.wins) }, { label: 'подиумы', value: String(c.podiums) }, { label: 'стартов', value: String(c.starts) }]} />
    </Page>
  );
}
