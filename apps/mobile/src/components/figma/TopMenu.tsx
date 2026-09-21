import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import BellIcon from '../../../assets/figma/bell.svg';
import LogoS from '../../../assets/figma/logo-s.svg';
import MessageIcon from '../../../assets/figma/message-top.svg';
import { useMe } from '../../auth/useAuth';
import { figma } from '../../theme/figma';
import { Avatar } from '../ui';

/** Верхнее меню хедера (Figma «menu»): логотип S, сообщения, уведомления, аватар. */
export function TopMenu({ unread }: { unread?: boolean }) {
  const me = useMe();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 35 }}>
      <LogoS width={64} height={28} color="#FFFFFF" />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
        <Pressable onPress={() => router.push('/community/messages')} style={{ width: 30, height: 30, alignItems: 'center', justifyContent: 'center' }} hitSlop={4}>
          <MessageIcon width={24} height={24} color="#FFFFFF" />
        </Pressable>
        <Pressable onPress={() => router.push('/notifications')} style={{ width: 30, height: 30, alignItems: 'center', justifyContent: 'center' }} hitSlop={4}>
          {/* bell.svg — внутренний слой 16×19 внутри бокса 24 */}
          <BellIcon width={16} height={19} color="#FFFFFF" />
          {unread ? <View style={{ position: 'absolute', top: 3, right: 3, width: 7, height: 7, borderRadius: 4, backgroundColor: figma.lime }} /> : null}
        </Pressable>
        <Pressable onPress={() => router.push(me.data ? '/(tabs)/profile' : '/onboarding')} hitSlop={4}>
          {/* В API нет URL аватара в /me для шапки — инициалы на серой подложке, как плейсхолдер макета */}
          <Avatar name={me.data?.profile?.displayName ?? ''} size={35} />
        </Pressable>
      </View>
    </View>
  );
}
