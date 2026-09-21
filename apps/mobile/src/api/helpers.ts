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
/** Короткие месяцы для бейджей дат макета: «Сент» */
export const MONTHS_SHORT = ['Янв', 'Февр', 'Март', 'Апр', 'Май', 'Июнь', 'Июль', 'Авг', 'Сент', 'Окт', 'Нояб', 'Дек'];
export const MONTHS = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];

export const money = (minor: number) => `${(minor / 100).toLocaleString('ru-RU')} ₽`;
/** Цена в карточках макета: «3500₽» без разрядов и пробела. */
export const moneyTight = (minor: number) => `${Math.round(minor / 100)}₽`;
/** «17 часов назад» — полные слова, как в макете ленты. */
export const agoWords = (iso: string) => {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (m < 1) return 'только что';
  if (m < 60) return `${m} ${plural(m, 'минуту', 'минуты', 'минут')} назад`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} ${plural(h, 'час', 'часа', 'часов')} назад`;
  const d = Math.round(h / 24);
  return `${d} ${plural(d, 'день', 'дня', 'дней')} назад`;
};
export const hours = (from: string, to: string) => {
  const h = (new Date(to).getTime() - new Date(from).getTime()) / 3_600_000;
  return `${h % 1 === 0 ? h : h.toFixed(1).replace('.', ',')} ${h === 1 ? 'час' : h < 5 ? 'часа' : 'часов'}`;
};
export const time = (iso: string) => new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Moscow' });
export const plural = (n: number, one: string, few: string, many: string) => (n % 10 === 1 && n % 100 !== 11 ? one : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? few : many);

/** Год активного сезона (seed: SEASON_YEAR). */
export const SEASON_YEAR = new Date().getFullYear();
