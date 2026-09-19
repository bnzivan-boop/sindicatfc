import { useState } from 'react';
import { useVerifyOtp } from '../../src/auth/useAuth';
import { Field } from '../../src/components/Field';
import { T } from '../../src/components/ui';
import { go, WizardFrame } from '../../src/features/onboarding/WizardFrame';
import { useOnboarding } from '../../src/features/onboarding/store';
import { router } from 'expo-router';

export default function CodeStep() {
  const { draft } = useOnboarding();
  const [code, setCode] = useState('');
  const verify = useVerifyOtp();
  return (
    <WizardFrame step="code" title="код из SMS" subtitle={`отправили на ${draft.phone}`} nextLabel="войти" nextDisabled={code.length < 4} busy={verify.isPending} error={verify.isError ? String(verify.error) : null}
      onNext={() => verify.mutate(
        // Согласия TERMS/PRIVACY фиксируются на этом шаге (consents в БД); версия — из конфигурации.
        { phone: draft.phone, code, consents: [{ type: 'TERMS', version: '1.0' }, { type: 'PRIVACY', version: '1.0' }] },
        { onSuccess: (res) => (res.isNewUser ? go('about') : router.replace('/')) },
      )}>
      <Field value={code} onChangeText={setCode} keyboardType="number-pad" autoFocus maxLength={6} placeholder="••••••" style={{ fontSize: 26, letterSpacing: 8, textAlign: 'center' }} />
      <T size={9} muted style={{ textAlign: 'center' }}>Продолжая, вы принимаете правила лиги и политику приватности. В dev-режиме код 000000.</T>
    </WizardFrame>
  );
}
