import { goBack } from '../../src/navigation';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Bell, Camera, Fish, MessageSquareWarning } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { plural } from '../../src/api/helpers';
import { useLiveTournament } from '../../src/api/live';
import { useLeaderboard, useTournament } from '../../src/api/tournaments';
import { useMyResults } from '../../src/features/results/useResults';
import { useOutbox } from '../../src/features/results/useOutbox';
import { useMe } from '../../src/auth/useAuth';
import { ActionButton, DeepCard, DetailTopBar, fontDisplay, fontFamily, Page, Pathway, Round, SectionHead, Surface, T } from '../../src/components/ui';
import { useTheme } from '../../src/theme/useTheme';

function useCountdown(to?: string) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!to) return '--:--:--';
  const s = Math.max(0, Math.floor((new Date(to).getTime() - now) / 1000));
  return [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60].map((n) => String(n).padStart(2, '0')).join(':');
}

/** live-view прототипа: таймер, путь, действия, live-рейтинг, последние зачёты. */
export default function LiveScreen() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  useLiveTournament(id);
  const { data: t } = useTournament(id);
  const { data: lb } = useLeaderboard(id);
  const me = useMe();
  const mine = useMyResults(id);
  const outbox = useOutbox();
  const queued = outbox.items.filter((i) => i.tournamentId === id);
  const timer = useCountdown(t?.endsAt);
  const entries = lb?.entries ?? [];
  const accepted = entries.reduce((s, e) => s + e.countedFish, 0);
  const levelIdx = { SPRINT: 0, QUALIFIER: 1, OPEN: 2, MAJOR: 2, GRAND_FINAL: 3 }[t?.level ?? 'SPRINT'];
  const finished = t?.status === 'FINALIZED' || t?.status === 'ARCHIVED' || !!lb?.isFinal;
  const byWeight = t?.scoringMode === 'TOTAL_WEIGHT';
  const fmtScore = (v: number) => (t?.scoringMode === 'LENGTH_SUM' ? `${Math.round(v / 10)} см` : byWeight ? `${(v / 1000).toFixed(2)} кг` : t?.scoringMode === 'PLACE_SUM' ? `${v} мест` : `${v} очк.`);

  return (
    <Page>
      <DetailTopBar title={finished ? "итоговый протокол" : "live-центр турнира"} left={<Round icon={ArrowLeft} onPress={() => goBack()} />} right={<Round icon={Bell} />} />

      <DeepCard style={{ borderRadius: 22, padding: 16, marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={[fontFamily, { fontSize: 11, color: colors.white }]}>{t?.title ?? '…'}</Text>
          <Text style={[fontFamily, { fontSize: 11, color: colors.lime }]}>● {finished ? 'завершён' : t?.status === 'LIVE' ? 'идёт сейчас' : 'подведение итогов'}</Text>
        </View>
        <Text style={[fontDisplay, { fontSize: 23, letterSpacing: -0.9, color: colors.white, marginTop: 24, marginBottom: 5 }]}>{finished ? 'финальный протокол' : 'до финиша'}</Text>
        <Text style={[fontDisplay, { fontSize: 40, lineHeight: 40, letterSpacing: -1.6, color: colors.white, marginTop: 13, fontVariant: ['tabular-nums'] }]}>{finished ? (t ? new Date(t.startsAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }) : '') : timer}</Text>
        <Text style={[fontFamily, { fontSize: 10, color: colors.white, opacity: 0.7, marginTop: 6 }]}>
          {t?.registeredCount ?? 0} {plural(t?.registeredCount ?? 0, 'участник', 'участника', 'участников')} · принято {accepted} результатов
        </Text>
      </DeepCard>

      <Pathway steps={[{ label: 'sprint', sub: '×1' }, { label: 'qualifier', sub: '×1,25' }, { label: 'open', sub: '×2' }, { label: 'final', sub: '×3' }]} activeUntil={levelIdx} />

      {!finished && <View style={{ flexDirection: 'row', gap: 7, marginBottom: 14 }}>
        <ActionButton icon={Camera} title="добавить рыбу" primary onPress={() => router.push({ pathname: '/result/new', params: { tournamentId: id } })} />
        <ActionButton icon={MessageSquareWarning} title="подать протест" onPress={() => router.push({ pathname: '/protest/new', params: { tournamentId: id } })} />
      </View>}

      <SectionHead title={finished ? "итоги" : "live-рейтинг"} action="правила" onAction={() => router.push({ pathname: '/tournament/[id]', params: { id } })} />
      <View style={{ backgroundColor: colors.surface2, borderRadius: 17, overflow: 'hidden' }}>
        {entries.length === 0 && <View style={{ padding: 12, backgroundColor: colors.surface }}><T size={9} muted>принятых результатов пока нет</T></View>}
        {entries.map((e, i) => {
          const isMe = e.participantId === me.data?.id;
          return (
            <Pressable key={e.participantId} onPress={() => router.push(isMe ? '/(tabs)/profile' : { pathname: '/user/[id]', params: { id: e.participantId } })} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, backgroundColor: isMe ? `${colors.green}1c` : colors.surface, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.line }}>
              <T size={9} style={{ width: 24 }}>{e.place}</T>
              <View style={{ flex: 1 }}>
                <T size={9} weight="500">{e.displayName}</T>
                <T size={9} muted>{e.countedFish} {plural(e.countedFish, 'рыба', 'рыбы', 'рыб')}</T>
              </View>
              <T size={11} weight="500">{fmtScore(e.score)}</T>
            </Pressable>
          );
        })}
      </View>

      <SectionHead title="мои результаты" action={finished ? undefined : 'добавить'} onAction={() => router.push({ pathname: '/result/new', params: { tournamentId: id } })} />
      <View style={{ gap: 6 }}>
        {queued.map((q) => (
          <Surface key={q.clientId} radius={15} style={{ padding: 11, flexDirection: 'row', gap: 9, alignItems: 'center', borderColor: colors.orange, borderStyle: 'dashed' }}>
            <View style={{ width: 34, height: 34, borderRadius: 11, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' }}><Fish size={16} color={colors.orange} strokeWidth={1.6} /></View>
            <View style={{ flex: 1 }}>
              <T size={10} weight="500">{q.draft.lengthMm ? `${q.draft.lengthMm / 10} см` : q.draft.weightG ? `${q.draft.weightG} г` : 'рыба'} · в очереди на отправку</T>
              <T size={9} muted>{q.lastError ? `${q.lastError} · повтор ${q.attempts}` : 'ждём связь'}</T>
            </View>
            <Pressable onPress={() => outbox.flush()} hitSlop={8}><T size={9} color={colors.green}>повторить</T></Pressable>
          </Surface>
        ))}
        {(mine.data ?? []).length === 0 && queued.length === 0 && <Surface radius={15} style={{ padding: 11 }}><T size={9} muted>{me.data ? 'ещё нет отправленных рыб' : 'войдите, чтобы отправлять результаты'}</T></Surface>}
        {(mine.data ?? []).map((r) => {
          const st = { DRAFT: ['черновик', colors.muted], UPLOADING: ['загружается', colors.muted], SUBMITTED: ['отправлено', colors.text], AUTO_CHECKED: ['проверка', colors.text], PENDING_JUDGE: ['у судьи', colors.text], ACCEPTED: ['засчитано', colors.green], NEEDS_RESUBMISSION: ['нужно новое фото', colors.orange], REJECTED: ['отклонено', colors.orange], UNDER_PROTEST: ['протест', colors.orange], CORRECTED: ['скорректировано', colors.green] }[r.status] ?? [r.status, colors.text];
          return (
            <Surface key={r.id} radius={15} style={{ padding: 11, flexDirection: 'row', gap: 9, alignItems: 'center' }} onTouchEnd={() => ['ACCEPTED', 'REJECTED'].includes(r.status) && router.push({ pathname: '/protest/new', params: { tournamentId: id } })}>
              <View style={{ width: 34, height: 34, borderRadius: 11, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' }}>
                <Fish size={16} color={colors.green} strokeWidth={1.6} />
              </View>
              <View style={{ flex: 1 }}>
                <T size={10} weight="500">{r.species.nameRu}{r.lengthMm ? ` · ${r.lengthMm / 10} см` : ''}{r.weightG ? ` · ${r.weightG} г` : ''}</T>
                <T size={9} muted>{r.decisions[0]?.reason ?? new Date(r.capturedAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</T>
              </View>
              <T size={9} weight="500" color={st[1] as string}>{st[0] as string}</T>
            </Surface>
          );
        })}
      </View>
    </Page>
  );
}
