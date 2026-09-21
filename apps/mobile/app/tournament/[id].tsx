import { goBack } from '../../src/navigation';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Camera, Car, CheckCircle2, CircleSlash2, Flag, MapPin, MessageSquareWarning, Ruler, Share2, TriangleAlert } from 'lucide-react-native';
import { Text, View } from 'react-native';
import { hours, LEVEL_LABEL, MONTHS_GEN, money, STATUS_LABEL, time } from '../../src/api/helpers';
import { useTournament } from '../../src/api/tournaments';
import { useMe } from '../../src/auth/useAuth';
import { DeepCard, DetailSection, DetailTopBar, fontDisplay, fontFamily, fontSemi, InfoList, InfoRow, LimeButton, Page, Round, RuleBlock, T, Timeline } from '../../src/components/ui';
import { whiteAlpha } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/useTheme';
import { FormatSheet } from '../../src/features/registrations/FormatSheet';
import { STATUS_RU as REG_STATUS, useCreateRegistration, useMyRegistrations } from '../../src/features/registrations/useRegistrations';
import { Pressable } from 'react-native';

/** event-view прототипа: hero, статы, локация, тайминг, снасти, правила, регистрация. */
export default function TournamentScreen() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: t } = useTournament(id);
  const me = useMe();
  const register = useCreateRegistration(id);
  const myRegs = useMyRegistrations(!!me.data);
  const myReg = myRegs.data?.find((r) => r.tournamentId === id);

  if (!t) return <Page><DetailTopBar title="турнир" left={<Round icon={ArrowLeft} onPress={() => goBack()} />} /><T muted>Загрузка…</T></Page>;

  const start = new Date(t.startsAt);
  const rules = t.rules?.[0];
  const loc = t.location;

  return (
    <Page>
      <DetailTopBar title="турнир" left={<Round icon={ArrowLeft} onPress={() => goBack()} />} right={<Round icon={Share2} />} />

      <DeepCard minHeight={225}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ backgroundColor: t.status === 'FINALIZED' ? whiteAlpha(15) : colors.lime, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 6 }}>
            <Text style={[fontFamily, { fontSize: 9, letterSpacing: 0.7, textTransform: 'uppercase', color: t.status === 'FINALIZED' ? colors.white : colors.onLime }]}>{t.status === 'FINALIZED' ? '✓ завершён' : (STATUS_LABEL[t.status] ?? t.status)}</Text>
          </View>
          <Text style={[fontFamily, { fontSize: 10, color: whiteAlpha(65) }]}>{t.level} · {LEVEL_LABEL[t.level].split(' ')[1] ?? '×1'}</Text>
        </View>
        <Text style={[fontDisplay, { fontSize: 34, lineHeight: 33, letterSpacing: -1.9, color: colors.white, marginTop: 34, marginBottom: 12, maxWidth: 250 }]}>{t.title}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <MapPin size={12} color={whiteAlpha(75)} strokeWidth={1.6} />
          <Text style={[fontFamily, { fontSize: 11, color: whiteAlpha(75) }]}>{loc?.title ?? t.locationTitle}</Text>
        </View>
        <View style={{ position: 'absolute', right: 18, bottom: 18, alignItems: 'flex-end' }}>
          <Text style={[fontDisplay, { fontSize: 31, lineHeight: 32, color: colors.white }]}>{start.getDate()}</Text>
          <Text style={[fontFamily, { fontSize: 9, letterSpacing: 0.7, textTransform: 'uppercase', color: whiteAlpha(65) }]}>{MONTHS_GEN[start.getMonth()]} · {time(t.startsAt)}</Text>
        </View>
      </DeepCard>

      <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, marginBottom: 18 }}>
        <Pressable onPress={() => router.push({ pathname: '/tournament/[id]/participants', params: { id } })} style={{ flex: 1, backgroundColor: colors.surface2, borderRadius: 10, paddingVertical: 11, paddingHorizontal: 9 }}>
          <Text style={[fontFamily, { fontSize: 9, color: colors.muted, marginBottom: 4 }]}>участники</Text>
          <Text style={[fontSemi, { fontSize: 12, color: colors.text }]}>{t.registeredCount} / {t.capacity} <Text style={{ color: colors.green }}>›</Text></Text>
        </Pressable>
        <View style={{ flex: 1, backgroundColor: colors.surface, borderRadius: 15, paddingVertical: 11, paddingHorizontal: 9 }}>
          <Text style={[fontFamily, { fontSize: 9, color: colors.muted, marginBottom: 4 }]}>длительность</Text>
          <Text style={[fontSemi, { fontSize: 12, color: colors.text }]}>{hours(t.startsAt, t.endsAt)}</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: colors.surface, borderRadius: 15, paddingVertical: 11, paddingHorizontal: 9 }}>
          <Text style={[fontFamily, { fontSize: 9, color: colors.muted, marginBottom: 4 }]}>взнос</Text>
          <Text style={[fontSemi, { fontSize: 12, color: colors.text }]}>{t.entryFee ? money(t.entryFee.amountMinor) : 'бесплатно'}</Text>
        </View>
      </View>

      {myReg ? (
        <Pressable onPress={() => router.push({ pathname: '/registration/[id]', params: { id: myReg.id } })} style={{ marginBottom: 8 }}>
          <View style={{ backgroundColor: colors.surface2, borderRadius: 10, padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View><T size={11} weight="500">ваша заявка · {REG_STATUS[myReg.status]}</T><T size={9} muted>{myReg.startNumber ? `стартовый номер ${myReg.startNumber}` : 'открыть детали, состав и оплату'}</T></View>
            <T size={12} color={colors.green}>›</T>
          </View>
        </Pressable>
      ) : t.status === 'REGISTRATION_OPEN' ? (
        <View style={{ marginBottom: 8 }}>
          {me.data ? (
            <FormatSheet formats={t.formats} feeMinor={t.entryFee?.amountMinor ?? null} busy={register.isPending} onContinue={(f) => register.mutate(f, { onSuccess: (r) => router.push({ pathname: '/registration/[id]', params: { id: r.id } }) })} />
          ) : (
            <LimeButton title="войти и зарегистрироваться" onPress={() => router.push('/onboarding')} />
          )}
          {register.isError && <T size={10} color={colors.orange}>{String(register.error)}</T>}
        </View>
      ) : null}
      {(t.status === 'LIVE' || t.status === 'JUDGING') && <LimeButton title="открыть live-центр" style={{ marginBottom: 8 }} onPress={() => router.push({ pathname: '/live/[id]', params: { id } })} />}
      {t.status === 'FINALIZED' && <LimeButton title="итоговый протокол" style={{ marginBottom: 8 }} onPress={() => router.push({ pathname: '/live/[id]', params: { id } })} />}

      {t.description && <DetailSection title="о турнире" text={t.description} />}

      <DetailSection title="локация и сбор">
        <InfoList>
          <InfoRow icon={MapPin} label="точный адрес" value={loc?.address ?? '—'} action="маршрут" />
          {loc?.meetingPoint && <InfoRow icon={Flag} label="точка регистрации" value={loc.meetingPoint} />}
          {loc?.parking && <InfoRow icon={Car} label="парковка" value={loc.parking} />}
        </InfoList>
      </DetailSection>

      {t.schedule?.length > 0 && (
        <DetailSection title="тайминг">
          <Timeline items={t.schedule.map((s) => ({ time: time(s.at), title: s.title.toLowerCase() }))} />
        </DetailSection>
      )}

      {rules && (
        <>
          <DetailSection title="снасти и приманки">
            <RuleBlock icon={CheckCircle2} title="разрешено" items={rules.allowedTackle} />
            <RuleBlock icon={CircleSlash2} title="запрещено" items={rules.forbiddenTackle} />
          </DetailSection>
          <DetailSection title="правила проведения">
            <InfoList>
              <InfoRow icon={Ruler} label="зачёт" value={rules.scoringSummary} />
              <InfoRow icon={Camera} label="фиксация" value={rules.fixationSummary} />
              {rules.penalties.length > 0 && <InfoRow icon={TriangleAlert} label="штрафы" value={rules.penalties.join('; ')} />}
              <InfoRow icon={MessageSquareWarning} label="протест" value={`в течение ${t.protestDeadlineMinutes} минут после финиша, через приложение`} />
            </InfoList>
          </DetailSection>
        </>
      )}
    </Page>
  );
}
