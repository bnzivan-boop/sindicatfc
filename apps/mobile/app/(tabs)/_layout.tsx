import { Tabs } from 'expo-router';
import { FigmaTabBar } from '../../src/components/figma/TabBar';

/** Нижнее меню по макету Figma «Menu»: главная · турниры · рейтинг · карта · сообщество (иконки — в FigmaTabBar). */
const TABS = [
  { name: 'index', title: 'Главная' },
  { name: 'tournaments', title: 'Турниры' },
  { name: 'rating', title: 'Рейтинг' },
  { name: 'map', title: 'Карта' },
  { name: 'community', title: 'Сообщество' },
] as const;

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <FigmaTabBar {...props} />}>
      {TABS.map((t) => (
        <Tabs.Screen key={t.name} name={t.name} options={{ title: t.title }} />
      ))}
      <Tabs.Screen name="profile" options={{ href: null }} />
    </Tabs>
  );
}
