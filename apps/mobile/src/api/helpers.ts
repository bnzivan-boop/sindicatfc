import type { TournamentLevel, TournamentStatus } from '@sindikat/domain';

export const LEVEL_LABEL: Record<TournamentLevel, string> = { SPRINT: 'sprint', QUALIFIER: 'qual.', OPEN: 'open ×2', MAJOR: 'major ×3', GRAND_FINAL: 'final ×3' };

export const STATUS_LABEL: Partial<Record<TournamentStatus, string>> = {
  PUBLISHED: 'анонс',
  REGISTRATION_OPEN: 'регистрация открыта',
  REGISTRATION_CLOSED: 'регистрация закрыта',
  LIVE: 'идёт сейчас',
  JUDGING: 'подведение итогов',
  FINALIZED: 'завершён',
  POSTPONED: 'перенесён',
  CANCELLED: 'отменён',
};

export const MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
export const MONTHS = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];

export const money = (minor: number) => `${(minor / 100).toLocaleString('ru-RU')} ₽`;
export const hours = (from: string, to: string) => {
  const h = (new Date(to).getTime() - new Date(from).getTime()) / 3_600_000;
  return `${h % 1 === 0 ? h : h.toFixed(1).replace('.', ',')} ${h === 1 ? 'час' : h < 5 ? 'часа' : 'часов'}`;
};
export const time = (iso: string) => new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Moscow' });
export const plural = (n: number, one: string, few: string, many: string) => (n % 10 === 1 && n % 100 !== 11 ? one : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? few : many);

/** Год активного сезона (seed: SEASON_YEAR). */
export const SEASON_YEAR = new Date().getFullYear();
