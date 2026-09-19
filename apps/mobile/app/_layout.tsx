import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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
