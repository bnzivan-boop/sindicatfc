import { Stack } from 'expo-router';
import { OnboardingProvider } from '../../src/features/onboarding/store';

/**
 * Онбординг: телефон → код → о вас → дисциплины и рыба → водоёмы → первый комплект → лодка → готово.
 * Состояние живёт в OnboardingProvider; каждый шаг сохраняет свою часть на сервер.
 */
export default function OnboardingLayout() {
  return (
    <OnboardingProvider>
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />
    </OnboardingProvider>
  );
}
