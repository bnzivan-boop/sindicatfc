import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import type { PropsWithChildren } from 'react';
import { Pressable, View } from 'react-native';
import { DetailTopBar, LimeButton, Page, PageTitle, Round, T } from '../../components/ui';
import { goBack } from '../../navigation';
import { useTheme } from '../../theme/useTheme';
import { PROFILE_STEPS, type Step } from './store';

/**
 * Каркас шага: топбар, .wizard-steps (прогресс-полоски из прототипа), заголовок,
 * контент, кнопка «продолжить» и необязательный «пропустить».
 */
export function WizardFrame({ step, title, subtitle, children, onNext, nextLabel = 'продолжить', nextDisabled, onSkip, error, busy }: PropsWithChildren<{
  step: Step; title: string; subtitle?: string; onNext: () => void; nextLabel?: string; nextDisabled?: boolean; onSkip?: () => void; error?: string | null; busy?: boolean;
}>) {
  const { colors } = useTheme();
  const idx = PROFILE_STEPS.indexOf(step);
  return (
    <Page>
      <DetailTopBar title={idx >= 0 ? `шаг ${idx + 1} из ${PROFILE_STEPS.length}` : 'вход'} left={<Round icon={ArrowLeft} onPress={() => goBack('/')} />} right={onSkip ? <Pressable onPress={onSkip} hitSlop={8}><T size={11} color={colors.green}>пропустить</T></Pressable> : undefined} />
      {idx >= 0 && (
        <View style={{ flexDirection: 'row', gap: 5, marginBottom: 13 }}>
          {PROFILE_STEPS.map((s, i) => <View key={s} style={{ flex: 1, height: 4, borderRadius: 99, backgroundColor: i <= idx ? colors.green : colors.line }} />)}
        </View>
      )}
      <PageTitle title={title} subtitle={subtitle} />
      <View style={{ gap: 12 }}>
        {children}
        {error ? <T size={10} color={colors.orange}>{error}</T> : null}
        <LimeButton title={busy ? 'сохраняем…' : nextLabel} disabled={nextDisabled || busy} onPress={onNext} />
      </View>
    </Page>
  );
}

export const go = (step: Step) => router.replace(`/onboarding/${step}` as never);
