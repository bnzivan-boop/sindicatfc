import { Tabs } from 'expo-router';
import { ChartNoAxesColumnIncreasing, House, Map as MapIcon, MessagesSquare, Trophy } from 'lucide-react-native';
import { useTheme } from '../../src/theme/useTheme';

/** .bottom-nav из прототипа: главная · турниры · рейтинг · карта · сообщество. */
const TABS = [
  { name: 'index', title: 'главная', icon: House },
  { name: 'tournaments', title: 'турниры', icon: Trophy },
  { name: 'rating', title: 'рейтинг', icon: ChartNoAxesColumnIncreasing },
  { name: 'map', title: 'карта', icon: MapIcon },
  { name: 'community', title: 'сообщество', icon: MessagesSquare },
] as const;

export default function TabsLayout() {
  const { colors } = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.line, height: 70, paddingTop: 8 },
        tabBarActiveTintColor: colors.green,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 8, marginTop: 3 },
      }}
    >
      {TABS.map((t) => (
        <Tabs.Screen key={t.name} name={t.name} options={{ title: t.title, tabBarIcon: ({ color }) => <t.icon size={18} color={color} strokeWidth={1.6} /> }} />
      ))}
      <Tabs.Screen name="profile" options={{ href: null }} />
    </Tabs>
  );
}
