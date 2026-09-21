import type { OtpChannel, Discipline, UpsertGearKit, WaterType } from '@sindikat/domain';
import { createContext, useContext, useMemo, useState, type PropsWithChildren } from 'react';

/**
 * Состояние мастера онбординга (концепция «Профиль участника», handoff §2.3).
 * Порядок шагов фиксирован; данные копятся в одном объекте и отправляются
 * на сервер по завершении каждого шага, поэтому прерванный онбординг возобновляется.
 */
export const STEPS = ['phone', 'code', 'about', 'disciplines', 'waters', 'gear', 'boat', 'done'] as const;
export type Step = (typeof STEPS)[number];

/** Шаги после входа — по ним считается прогресс. */
export const PROFILE_STEPS: Step[] = ['about', 'disciplines', 'waters', 'gear', 'boat'];

export interface OnboardingDraft {
  phone: string;
  displayName: string;
  cityId?: string;
  experienceYears?: number;
  disciplines: Discipline[];
  targetSpeciesIds: string[];
  waterTypes: WaterType[];
  kit?: Partial<UpsertGearKit> & { rodText?: string; reelText?: string; lineText?: string };
  hasBoat?: boolean;
  boatText?: string;
  /** Куда ушёл код и какие каналы ещё можно попросить («не пришло»). */
  otp?: { channel: OtpChannel; fallbacks: OtpChannel[] };
}

const initial: OnboardingDraft = { phone: '+7', displayName: '', disciplines: [], targetSpeciesIds: [], waterTypes: [] };

const Ctx = createContext<{ draft: OnboardingDraft; patch: (p: Partial<OnboardingDraft>) => void; reset: () => void } | null>(null);

export function OnboardingProvider({ children }: PropsWithChildren) {
  const [draft, setDraft] = useState<OnboardingDraft>(initial);
  const value = useMemo(() => ({ draft, patch: (p: Partial<OnboardingDraft>) => setDraft((d) => ({ ...d, ...p })), reset: () => setDraft(initial) }), [draft]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useOnboarding() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('OnboardingProvider отсутствует');
  return ctx;
}

export const nextStep = (s: Step): Step => STEPS[Math.min(STEPS.indexOf(s) + 1, STEPS.length - 1)]!;
export const stepIndex = (s: Step) => PROFILE_STEPS.indexOf(s);
