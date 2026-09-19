import { usePathname, router } from 'expo-router';
import { useEffect } from 'react';
import { useMe } from '../../auth/useAuth';

/**
 * Системное правило: авторизованный пользователь без завершённого онбординга
 * попадает в мастер с первого незаполненного шага, куда бы он ни зашёл.
 */
export function OnboardingGate() {
  const me = useMe();
  const pathname = usePathname();
  useEffect(() => {
    const u = me.data;
    if (!u || pathname.startsWith('/onboarding')) return;
    if (u.profile?.onboardingCompletedAt) return;
    const step = !u.profile?.displayName ? 'about' : u.disciplines.length === 0 ? 'disciplines' : (u.profile.waterTypes?.length ?? 0) === 0 ? 'waters' : 'gear';
    router.replace(`/onboarding/${step}` as never);
  }, [me.data, pathname]);
  return null;
}
