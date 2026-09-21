import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import Chevron from '../../../assets/figma/chevron-right.svg';
import { Body } from '../../components/figma/ui';
import { Avatar } from '../../components/ui';
import { figma } from '../../theme/figma';
import type { Invitation } from './useRegistrations';

/** Лаймовый баннер «… зовёт вас в пару» по макету Figma (Frame 2147240478). */
export function InvitationBanner({ inv }: { inv: Invitation }) {
  const name = inv.registration.owner.profile?.displayName ?? 'Участник';
  return (
    <Pressable onPress={() => router.push('/my-registrations')} style={{ backgroundColor: figma.lime, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 5, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11, flex: 1 }}>
        <Avatar name={name} size={40} radius={8} />
        <View style={{ gap: 2, flex: 1 }}>
          <Body size={14} weight="semibold" color="#000000" numberOfLines={1}>{name} зовёт вас в пару</Body>
          <Body size={11} color="#000000">{inv.registration.tournament.title}</Body>
        </View>
      </View>
      <View style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}><Chevron width={6} height={10} color="#222221" /></View>
    </Pressable>
  );
}
