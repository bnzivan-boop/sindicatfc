import { DISCIPLINE_LABELS_RU } from '@sindikat/domain';
import { Link, router } from 'expo-router';
import { Bell, CalendarDays, CalendarRange, ClipboardCheck, Lock, Map as MapIcon, MapPinned, NotebookPen, Play, ShoppingBag, User, Users, type LucideIcon } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import { hours, money, SEASON_YEAR, STATUS_LABEL, time } from '../../src/api/helpers';
import { useTournaments } from '../../src/api/tournaments';
import { useMe } from '../../src/auth/useAuth';
import { useInvitations, useMyRegistrations } from '../../src/features/registrations/useRegistrations';
import { useUnreadCount } from '../../src/features/push/usePush';
import { Brand, Chip, DateBadge, DeepCard, EventTag, fontFamily, Page, Round, SectionHead, Status, Surface, T, TopBar, Track } from '../../src/components/ui';
import { whiteAlpha } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/useTheme';

/** home-view прототипа. */
export default function HomeScreen() {
  const { colors } = useTheme();
  const me = useMe();
  const { data: tournaments } = useTournaments();
  const next = tournaments?.find((t) => t.status === 'REGISTRATION_OPEN') ?? tournaments?.[0];
  const inv = useInvitations(!!me.data);
  const unread = useUnreadCount();
  const myRegs = useMyRegistrations(!!me.data);
  const upcoming = (myRegs.data ?? []).filter((r) => ['CONFIRMED', 'CHECKED_IN', 'WAITING_PAYMENT', 'WAITING_MEMBERS'].includes(r.status));
  const disciplines = me.data?.disciplines?.map((d) => DISCIPLINE_LABELS_RU[d.discipline].toLowerCase()) ?? ['street', 'trout', 'feeder'];

  return (
    <Page>
      <TopBar
        left={<Brand location="москва и область" />}
        right={
          <>
            <Round icon={Bell} notice={(unread.data?.unread ?? 0) > 0} onPress={() => router.push('/notifications')} />
            <Round icon={User} onPress={() => router.push(me.data ? '/(tabs)/profile' : '/onboarding')} />
          </>
        }
      />

      {/* .rank-card */}
      <DeepCard>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={[fontFamily, { fontSize: 10, letterSpacing: 0.9, textTransform: 'uppercase', color: whiteAlpha(65) }]}>мой сезон</Text>
          <Text style={[fontFamily, { fontSize: 10, letterSpacing: 0.9, color: whiteAlpha(65) }]}>{SEASON_YEAR}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 15, marginBottom: 19 }}>
          {disciplines.slice(0, 3).map((d, i) => <Chip key={d} label={d} active={i === 0} />)}
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 5 }}>
            <Text style={[fontFamily, { fontSize: me.data?.season?.rank ? 58 : 34, lineHeight: 54, fontWeight: '500', letterSpacing: -4, color: colors.white }]}>
              {me.data?.season?.rank ? `#${me.data.season.rank}` : 'вне'}
            </Text>
            <Text style={[fontFamily, { fontSize: 15, color: whiteAlpha(60) }]}>{me.data?.season?.rank ? 'место' : 'рейтинга'}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[fontFamily, { fontSize: 20, fontWeight: '500', color: colors.white }]}>{(me.data?.season?.points ?? 0).toLocaleString('ru-RU')}</Text>
            <Text style={[fontFamily, { fontSize: 10, color: whiteAlpha(60) }]}>очков сезона</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, marginBottom: 7 }}>
          <Text style={[fontFamily, { fontSize: 10, color: whiteAlpha(70) }]}>путь в grand final</Text>
          <Text style={[fontFamily, { fontSize: 10, fontWeight: '500', color: whiteAlpha(70) }]}>{me.data?.season?.finalProgress ?? 0}%</Text>
        </View>
        <Track pct={me.data?.season?.finalProgress ?? 0} />
      </DeepCard>

      {(inv.data ?? []).length > 0 && (
        <Pressable onPress={() => router.push('/my-registrations')} style={{ marginTop: 12 }}>
          <Surface radius={15} style={{ padding: 12, borderColor: colors.green, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View><T size={11} weight="500">{inv.data![0]!.registration.owner.profile?.displayName ?? 'Участник'} зовёт вас в пару</T><T size={9} muted>{inv.data![0]!.registration.tournament.title} · ответить</T></View>
            <Text style={{ color: colors.green }}>›</Text>
          </Surface>
        </Pressable>
      )}
      {upcoming.length > 0 && (
        <>
          <SectionHead title="мои заявки" action="все" onAction={() => router.push('/my-registrations')} />
          <View style={{ gap: 6 }}>
            {upcoming.slice(0, 2).map((r) => (
              <Pressable key={r.id} onPress={() => router.push({ pathname: '/registration/[id]', params: { id: r.id } })}>
                <Surface radius={15} style={{ padding: 11, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View><T size={11} weight="500">{r.tournament?.title}</T><T size={9} muted>{r.format === 'SOLO' ? 'личный' : r.format === 'PAIR' ? 'парный' : r.format.toLowerCase()}{r.startNumber ? ` · №${r.startNumber}` : ''}</T></View>
                  <EventTag plain={!['CONFIRMED', 'CHECKED_IN'].includes(r.status)}>{{ CONFIRMED: 'подтверждена', CHECKED_IN: 'на старте', WAITING_PAYMENT: 'к оплате', WAITING_MEMBERS: 'ждём напарника' }[r.status as string] ?? r.status.toLowerCase()}</EventTag>
                </Surface>
              </Pressable>
            ))}
          </View>
        </>
      )}

      <SectionHead title="ближайший старт" action="все турниры" onAction={() => router.push('/(tabs)/tournaments')} />
      {next ? (
        <Link href={{ pathname: '/tournament/[id]', params: { id: next.id } }} asChild>
          <Pressable>
            <Surface>
              <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
                <DateBadge date={new Date(next.startsAt)} />
                <View style={{ flex: 1 }}>
                  <Status>{STATUS_LABEL[next.status] ?? next.status.toLowerCase()}</Status>
                  <Text style={[fontFamily, { fontSize: 16, lineHeight: 18, fontWeight: '500', letterSpacing: -0.4, color: colors.text, marginBottom: 6 }]}>{next.title}</Text>
                  <T size={10} muted>{time(next.startsAt)} · {next.locationTitle} · {hours(next.startsAt, next.endsAt)}</T>
                </View>
              </View>
              <View style={{ borderTopWidth: 1, borderTopColor: colors.line, marginTop: 12, paddingTop: 11, flexDirection: 'row', justifyContent: 'space-between' }}>
                <T size={10} muted>{next.registeredCount} из {next.capacity} участников</T>
                <T size={10} weight="500">{next.entryFee ? money(next.entryFee.amountMinor) : 'бесплатно'} →</T>
              </View>
            </Surface>
          </Pressable>
        </Link>
      ) : (
        <Surface><T muted>Стартов пока нет</T></Surface>
      )}

      <SectionHead title="быстрые действия" />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Quick icon={CalendarDays} label="турниры" onPress={() => router.push('/(tabs)/tournaments')} />
        <Quick icon={Users} label="компания" onPress={() => router.push('/(tabs)/community')} />
        <Quick icon={NotebookPen} label="дневник" onPress={() => router.push('/diary')} />
        <Quick icon={MapIcon} label="карта" onPress={() => router.push('/(tabs)/map')} />
      </View>

      <SectionHead title="премиум-разделы" tag="по паролю" />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Protected icon={MapPinned} title="глубины" sub="карта водоёмов" />
        <Protected icon={Play} title="медиа" sub="эфиры и видео" />
        <Protected icon={ShoppingBag} title="магазин" sub="экипировка" />
      </View>

      <SectionHead title="центр лиги" tag={`сезон ${SEASON_YEAR}`} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <League icon={CalendarRange} title="полный сезон" sub="30 стартов · 7 дисциплин" onPress={() => router.push('/(tabs)/tournaments')} />
        <League icon={ClipboardCheck} title="организатор" sub="допуски, судьи, бюджет" onPress={() => router.push('/organizer')} />
      </View>
    </Page>
  );
}

function Quick({ icon: Icon, label, onPress }: { icon: LucideIcon; label: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} style={{ flex: 1, alignItems: 'center' }}>
      <View style={{ width: '100%', height: 65, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
        <Icon size={16} color={colors.text} strokeWidth={1.6} />
      </View>
      <T size={9} muted>{label}</T>
    </Pressable>
  );
}

function Protected({ icon: Icon, title, sub }: { icon: LucideIcon; title: string; sub: string }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={() => router.push('/(tabs)/map')} style={{ flex: 1, minHeight: 92, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 8 }}>
      <View style={{ position: 'absolute', right: 8, top: 8, width: 18, height: 18, borderRadius: 9, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' }}>
        <Lock size={9} color={colors.muted} strokeWidth={1.8} />
      </View>
      <Icon size={16} color={colors.green} strokeWidth={1.6} style={{ marginBottom: 13 }} />
      <T size={11} weight="500">{title}</T>
      <T size={9} muted>{sub}</T>
    </Pressable>
  );
}

function League({ icon: Icon, title, sub, onPress }: { icon: LucideIcon; title: string; sub: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} style={{ flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 17, padding: 13 }}>
      <Icon size={16} color={colors.green} strokeWidth={1.6} style={{ marginBottom: 14 }} />
      <T size={12} weight="500">{title}</T>
      <T size={9} muted>{sub}</T>
    </Pressable>
  );
}

