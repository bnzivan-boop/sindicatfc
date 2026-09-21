import { router } from 'expo-router';
import { Check, UserMinus, UserPlus, X } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import { useMe } from '../../auth/useAuth';
import { T } from '../../components/ui';
import { useTheme } from '../../theme/useTheme';
import { useFriendAction, useFriendStatus, type FriendState } from './useFriends';

/**
 * Кнопка дружбы с состояниями: в друзья → заявка отправлена (отменить) → в друзьях (убрать); входящая — принять/отклонить.
 * `state` можно передать снаружи (профиль уже знает), иначе спросит сама.
 */
export function FriendButton({ userId, state: given, mutual, compact }: { userId: string; state?: FriendState; mutual?: number; compact?: boolean }) {
  const { colors } = useTheme();
  const me = useMe();
  const status = useFriendStatus(userId, !!me.data && !given);
  const act = useFriendAction();
  const state = given ?? status.data?.state ?? 'NONE';
  if (!me.data || state === 'SELF' || state === 'BLOCKED_BY') return null;
  const busy = act.isPending;
  const pad = compact ? { paddingHorizontal: 10, paddingVertical: 6 } : { paddingHorizontal: 12, paddingVertical: 10 };
  const size = compact ? 9 : 10;

  if (state === 'INCOMING') {
    return (
      <View style={{ flexDirection: 'row', gap: 6 }}>
        <Pressable disabled={busy} onPress={() => act.mutate({ userId, action: 'accept' })} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.lime, borderRadius: 999, ...pad }}><Check size={12} color={colors.onLime} strokeWidth={2} /><T size={size} weight="500" color={colors.onLime}>принять</T></Pressable>
        <Pressable disabled={busy} onPress={() => act.mutate({ userId, action: 'decline' })} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: colors.line, borderRadius: 999, ...pad }}><X size={12} color={colors.text} strokeWidth={2} /><T size={size}>{compact ? '' : 'отклонить'}</T></Pressable>
      </View>
    );
  }
  if (state === 'FRIENDS') return <Pressable disabled={busy} onPress={() => act.mutate({ userId, action: 'remove' })} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: `${colors.green}1f`, borderRadius: 999, ...pad }}><Check size={12} color={colors.green} strokeWidth={2} /><T size={size} color={colors.green}>в друзьях{mutual ? ` · ${mutual} общ.` : ''}</T></Pressable>;
  if (state === 'OUTGOING') return <Pressable disabled={busy} onPress={() => act.mutate({ userId, action: 'remove' })} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.surface2, borderRadius: 999, ...pad }}><UserMinus size={12} color={colors.muted} strokeWidth={1.8} /><T size={size} muted>заявка отправлена</T></Pressable>;
  if (state === 'BLOCKED') return <Pressable disabled={busy} onPress={() => act.mutate({ userId, action: 'unblock' })} style={{ borderWidth: 1, borderColor: colors.orange, borderRadius: 999, ...pad }}><T size={size} color={colors.orange}>разблокировать</T></Pressable>;
  return <Pressable disabled={busy} onPress={() => (me.data ? act.mutate({ userId, action: 'request' }) : router.push('/onboarding'))} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.text, borderRadius: 999, ...pad }}><UserPlus size={12} color={colors.bg} strokeWidth={1.8} /><T size={size} color={colors.bg}>в друзья{mutual ? ` · ${mutual} общ.` : ''}</T></Pressable>;
}
