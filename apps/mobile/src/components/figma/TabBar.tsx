// expo-router SDK 57 везёт свою копию react-navigation; контексты высоты таббара берём из неё, иначе Page их не увидит
import { BottomTabBarHeightCallbackContext, type BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs';
import { useContext, type ComponentType } from 'react';
import { Pressable, View } from 'react-native';
import type { SvgProps } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ChartIcon from '../../../assets/figma/nav-chart.svg';
import EventsIcon from '../../../assets/figma/nav-events.svg';
import HomeIcon from '../../../assets/figma/nav-home.svg';
import LocationIcon from '../../../assets/figma/nav-location.svg';
import SvyazIcon from '../../../assets/figma/nav-svyaz.svg';
import { figma } from '../../theme/figma';
import { Body } from './ui';

/** Отступ пилюли от нижнего края экрана по макету (Menu: bottom 28). */
const BOTTOM_GAP = 28;

/** Иконки из набора Figma «Icons»; chart/location — внутренние слои, масштабированы в бокс 26. */
const ICONS: Record<string, { Icon: ComponentType<SvgProps>; w: number; h: number }> = {
  index: { Icon: HomeIcon, w: 26, h: 26 },
  tournaments: { Icon: EventsIcon, w: 26, h: 26 },
  rating: { Icon: ChartIcon, w: 20, h: 19 },
  map: { Icon: LocationIcon, w: 17, h: 22 },
  community: { Icon: SvyazIcon, w: 26, h: 26 },
};

/**
 * Нижнее меню по макету Figma «Menu»: плавающая пилюля #1A1A1A, активный пункт — лаймовая
 * капсула с иконкой и подписью, остальные — только иконки. Высоту сообщаем навигатору,
 * чтобы экраны добавляли отступ снизу (см. Page).
 */
export function FigmaTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const reportHeight = useContext(BottomTabBarHeightCallbackContext);
  const bottom = Math.max(insets.bottom, 12) + (BOTTOM_GAP - 12);
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', paddingBottom: bottom }} onLayout={(e) => reportHeight?.(e.nativeEvent.layout.height)}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: figma.navBg, borderRadius: 40, paddingLeft: 5, paddingRight: 8, paddingVertical: 5 }}>
        {state.routes.map((route, i) => {
          const icon = ICONS[route.name];
          if (!icon) return null; // profile и прочие href=null-экраны в меню не показываем
          const { options } = descriptors[route.key]!;
          const active = state.index === i;
          const onPress = () => {
            const ev = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!active && !ev.defaultPrevented) navigation.navigate(route.name);
          };
          const label = typeof options.title === 'string' ? options.title : route.name;
          return (
            <Pressable key={route.key} onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: active }} accessibilityLabel={label}
              style={active ? { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: figma.navLime, borderRadius: 30, paddingLeft: 10, paddingRight: 14, paddingVertical: 10 } : { padding: 10 }}>
              <View style={{ width: 26, height: 26, alignItems: 'center', justifyContent: 'center' }}>
                <icon.Icon width={icon.w} height={icon.h} color={active ? figma.navActiveText : figma.navIcon} />
              </View>
              {active ? <Body size={14} lineHeight={14} weight="semibold" tracking={0} color={figma.navActiveText}>{label}</Body> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
