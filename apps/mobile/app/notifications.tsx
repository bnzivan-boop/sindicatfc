import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Bell, CalendarClock, CheckCircle2, Fish, Heart, MessageCircle, TriangleAlert, UserPlus, type LucideIcon } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { api } from '../src/api/client';
import { useMe } from '../src/auth/useAuth';
import { DetailTopBar, Page, PageTitle, Round, Surface, T } from '../src/components/ui';
import { goBack } from '../src/navigation';
import { useTheme } from '../src/theme/useTheme';

interface Notification { id: string; kind: string; title: string; body: string; readAt: string | null; createdAt: string }

const ICONS: Record<string, LucideIcon> = { 'result.accepted': Fish, 'result.rejected': TriangleAlert, 'result.resubmission': TriangleAlert, 'tournament.reminder': Bell, 'registration.confirmed': CheckCircle2, 'registration.invited': CheckCircle2, 'schedule.changed': CalendarClock, 'protest.resolved': TriangleAlert, 'trophy.comment': MessageCircle, 'trophy.like': Heart, 'friend.request': UserPlus, 'friend.accepted': UserPlus, 'trip.invited': CalendarClock };

const ago = (iso: string) => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (m < 60) return `${m} мин назад`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} ч назад`;
  return `${Math.round(h / 24)} дн назад`;
};

/** notifications-view прототипа. */
export default function NotificationsScreen() {
  const { colors } = useTheme();
  const me = useMe();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['notifications'], queryFn: () => api<Notification[]>('/me/notifications'), enabled: !!me.data });
  const read = useMutation({ mutationFn: (id: string) => api(`/me/notifications/${id}/read`, { method: 'POST', body: {} }), onSuccess: () => { void qc.invalidateQueries({ queryKey: ['notifications'] }); void qc.invalidateQueries({ queryKey: ['notifications-unread'] }); } });
  const readAll = useMutation({ mutationFn: () => api('/me/notifications/read-all', { method: 'POST', body: {} }), onSuccess: () => { void qc.invalidateQueries({ queryKey: ['notifications'] }); void qc.invalidateQueries({ queryKey: ['notifications-unread'] }); } });
  const rows = data ?? [];
  const unseen = rows.filter((n) => !n.readAt).length;

  return (
    <Page>
      <DetailTopBar title="уведомления" left={<Round icon={ArrowLeft} onPress={() => goBack()} />} />
      <PageTitle title="уведомления" subtitle={unseen ? `${unseen} новых` : 'всё прочитано'} right={unseen ? <Pressable onPress={() => readAll.mutate()} hitSlop={8}><T size={10} color={colors.green}>прочитать все</T></Pressable> : undefined} />
      {rows.length === 0 && <Surface><T size={11} muted>{!me.data ? 'Войдите, чтобы получать уведомления' : isLoading ? 'Загрузка…' : 'Пока пусто'}</T></Surface>}
      <View style={{ gap: 8 }}>
        {rows.map((n) => {
          const Icon = ICONS[n.kind] ?? Bell;
          return (
            <Pressable key={n.id} onPress={() => { if (!n.readAt) read.mutate(n.id); if (n.kind.startsWith('friend.')) router.push('/friends'); }}>
              <Surface radius={15} style={{ padding: 11, flexDirection: 'row', gap: 9, alignItems: 'flex-start', backgroundColor: n.readAt ? colors.surface : `${colors.green}14` }}>
                <View style={{ width: 34, height: 34, borderRadius: 11, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={16} color={colors.green} strokeWidth={1.6} />
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <T size={10} weight="500">{n.title}</T>
                  <T size={10} muted>{n.body}</T>
                  <T size={9} muted>{ago(n.createdAt)}</T>
                </View>
              </Surface>
            </Pressable>
          );
        })}
      </View>
    </Page>
  );
}
