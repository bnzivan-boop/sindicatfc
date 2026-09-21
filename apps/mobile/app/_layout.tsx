import { FiraSansExtraCondensed_600SemiBold } from '@expo-google-fonts/fira-sans-extra-condensed';
import { InterTight_400Regular, InterTight_500Medium, InterTight_600SemiBold } from '@expo-google-fonts/inter-tight';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../src/theme/useTheme';
import { OnboardingGate } from '../src/features/onboarding/OnboardingGate';
import { usePushRegistration } from '../src/features/push/usePush';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1 } } });

function PushRegistrar() {
  usePushRegistration();
  return null;
}

export default function RootLayout() {
  const { colors, scheme } = useTheme();
  // Шрифты макета Figma: Fira Sans Extra Condensed (заголовки) + Inter Tight (текст). До загрузки экран не рисуем,
  // чтобы не мигал системный шрифт; при ошибке загрузки показываем как есть.
  const [fontsReady, fontsError] = useFonts({ FiraSansExtraCondensed_600SemiBold, InterTight_400Regular, InterTight_500Medium, InterTight_600SemiBold });
  if (!fontsReady && !fontsError) return null;
  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <OnboardingGate />
      <PushRegistrar />
      <Stack
        screenOptions={{
          headerShown: false,
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
        <Stack.Screen name="tournament/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="live/[id]" options={{ headerShown: false }} />
      </Stack>
    </QueryClientProvider>
  );
}
