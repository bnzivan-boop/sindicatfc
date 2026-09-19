/**
 * МОКОВЫЕ данные: только личные сообщения (нужен realtime-канал — этап 5).
 * Каналы, публикации, выезды, подбор компании и клубы — на API (useCommunity.ts).
 */
export interface Dialog { id: string; mark: string; name: string; time: string; last: string; unread?: number; online?: boolean; messages: Array<{ mine?: boolean; text: string; time: string }> }

export const DIALOGS: Dialog[] = [
  { id: 'd1', mark: 'ДК', name: 'Денис Крылов', time: '12:41', last: 'Да, давай сегодня в 19:00 у главного входа', unread: 2, online: true, messages: [{ text: 'Едешь сегодня на Нескучный?', time: '12:30' }, { mine: true, text: 'Да, после работы. Во сколько?', time: '12:38' }, { text: 'Да, давай сегодня в 19:00 у главного входа', time: '12:41' }] },
  { id: 'd2', mark: 'SM', name: 'Стрит Москва · флудилка', time: '12:30', last: 'Мария: Кто сегодня выбирается на реку?', unread: 8, messages: [{ text: 'Мария: Кто сегодня выбирается на реку?', time: '12:30' }] },
  { id: 'd3', mark: 'АТ', name: 'Area Trout Club', time: 'вчера', last: 'Капитан: Тренировка подтверждена на 08:00', messages: [{ text: 'Капитан: Тренировка подтверждена на 08:00', time: 'вчера' }] },
  { id: 'd4', mark: 'МН', name: 'Мария Наумова', time: 'ср', last: 'Отправила тебе регламент турнира', messages: [{ text: 'Отправила тебе регламент турнира', time: 'ср' }] },
];
