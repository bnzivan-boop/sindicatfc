import { useContext } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomTabBarHeightContext } from 'expo-router/build/react-navigation/bottom-tabs';
import { router } from 'expo-router';
import { useTournaments } from '../../src/api/tournaments';
import { useMe } from '../../src/auth/useAuth';
import { TopMenu } from '../../src/components/figma/TopMenu';
import { Body, SectionHeader, useFigmaSurfaces } from '../../src/components/figma/ui';
import { Timeline } from '../../src/features/community/Timeline';
import { useUnreadCount } from '../../src/features/push/usePush';
import { InvitationBanner } from '../../src/features/registrations/InvitationBanner';
import { RegistrationRow } from '../../src/features/registrations/RegistrationRow';
import { useInvitations, useMyRegistrations } from '../../src/features/registrations/useRegistrations';
import { NextStartCard } from '../../src/features/tournaments/NextStartCard';
import { figma } from '../../src/theme/figma';

const ACTIVE_REG = ['CONFIRMED', 'CHECKED_IN', 'WAITING_PAYMENT', 'WAITING_MEMBERS'];
/** Сколько элементов общей ленты показываем на главной; полная — во вкладке «сообщество». */
const HOME_FEED_LIMIT = 6;

/**
 * Главная по макету Figma «СФК / Главная» (варианты «добросвязь 5/6»): тёмный хедер с меню,
 * приглашением в пару, ближайшим стартом и заявками; ниже — лента сообщества (трофеи + публикации).
 */
export default function HomeScreen() {
  const s = useFigmaSurfaces();
  const insets = useSafeAreaInsets();
  const tabBar = useContext(BottomTabBarHeightContext) ?? 0;
  const me = useMe();
  const { data: tournaments, isLoading: tournamentsLoading } = useTournaments();
  const next = tournaments?.find((t) => t.status === 'REGISTRATION_OPEN') ?? tournaments?.[0];
  const inv = useInvitations(!!me.data);
  const unread = useUnreadCount();
  const myRegs = useMyRegistrations(!!me.data);
  const upcoming = (myRegs.data ?? []).filter((r) => ACTIVE_REG.includes(r.status)).slice(0, 2);
  const invitation = inv.data?.[0];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: s.bg }} contentContainerStyle={{ paddingBottom: 24 + tabBar, gap: 20 }} showsVerticalScrollIndicator={false}>
      {/* Хедер #212121: статус-бар + меню + контент, низ скруглён на 30 */}
      <View style={{ backgroundColor: figma.ink, paddingTop: insets.top + 16, paddingHorizontal: 16, paddingBottom: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, gap: 21 }}>
        <TopMenu unread={(unread.data?.unread ?? 0) > 0} />
        <View style={{ gap: 10 }}>
          {invitation ? <InvitationBanner inv={invitation} /> : null}

          <View style={{ gap: 4 }}>
            <SectionHeader title="Ближайший старт" action="Все турниры" onAction={() => router.push('/(tabs)/tournaments')} />
            {next ? (
              <NextStartCard t={next} />
            ) : (
              <View style={{ backgroundColor: figma.card, borderRadius: 20, padding: 14 }}>
                <Body size={12} color={figma.white40}>{tournamentsLoading ? 'Загрузка…' : 'Стартов пока нет — календарь сезона появится во вкладке «Турниры»'}</Body>
              </View>
            )}
          </View>

          {upcoming.length > 0 && (
            <View style={{ gap: 4 }}>
              <SectionHeader title="Мои заявки" action="Все заявки" onAction={() => router.push('/my-registrations')} />
              <View style={{ gap: 4 }}>
                {upcoming.map((r) => <RegistrationRow key={r.id} r={r} />)}
              </View>
            </View>
          )}
        </View>
      </View>

      {/* Лента сообщества — по макету сразу под хедером, без заголовка и фильтров; полная лента с фильтрами во вкладке */}
      <View style={{ paddingHorizontal: 16 }}>
        <Timeline filter="for-you" limit={HOME_FEED_LIMIT} gap={20} />
      </View>
    </ScrollView>
  );
}
