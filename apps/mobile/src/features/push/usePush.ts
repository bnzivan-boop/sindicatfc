import { useQuery } from '@tanstack/react-query';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { api } from '../../api/client';
import { useMe } from '../../auth/useAuth';

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: true }),
  });
}

/**
 * Регистрирует Expo push token на сервере после входа (handoff §11: push о турнирах,
 * приглашениях, статусе результата, протестах и расписании). На web push нет — только in-app.
 */
export function usePushRegistration() {
  const me = useMe();
  useEffect(() => {
    if (!me.data || Platform.OS === 'web') return;
    (async () => {
      if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync('default', { name: 'Синдикат', importance: Notifications.AndroidImportance.HIGH });
      const perm = await Notifications.getPermissionsAsync();
      const granted = perm.granted || (await Notifications.requestPermissionsAsync()).granted;
      if (!granted) return;
      const projectId = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId;
      const token = (await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)).data;
      await api('/me/devices', { method: 'PUT', body: { platform: Platform.OS, pushToken: token } }).catch(() => undefined);
    })().catch(() => undefined);
  }, [me.data?.id]); // eslint-disable-line react-hooks/exhaustive-deps
}

/** Непрочитанные — для точки на колокольчике; обновляется раз в минуту. */
export function useUnreadCount() {
  const me = useMe();
  return useQuery({ queryKey: ['notifications-unread'], queryFn: () => api<{ unread: number }>('/me/notifications/unread'), enabled: !!me.data, refetchInterval: 60_000 });
}
