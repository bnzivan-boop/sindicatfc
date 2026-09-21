/**
 * Токены из макета Figma «сфк» (файл WnwqxPU0VocAE0D24FFkep, страница «мобильное приложение»).
 * Тёмный хедер и карточки в нём — фиксированные цвета; светлые поверхности имеют вариант для тёмной темы.
 */
export const figmaFont = {
  /** Fira Sans Extra Condensed SemiBold — заголовки, крупные цифры, имена */
  display: 'FiraSansExtraCondensed_600SemiBold',
  /** Inter Tight — весь остальной текст */
  regular: 'InterTight_400Regular',
  medium: 'InterTight_500Medium',
  semibold: 'InterTight_600SemiBold',
} as const;

export const figma = {
  /** Хедер главной и статус-бар */
  ink: '#212121',
  /** Карточки внутри хедера (ближайший старт, заявки) */
  card: '#363636',
  /** Блок даты в карточке старта */
  dateBlock: '#6E6E6E',
  /** Подложка бейджа даты в строке заявки */
  dateBadge: '#AFAFAF',
  /** Чип статуса заявки */
  statusChip: '#595959',
  lime: '#C3FD56',
  /** Активный пункт нижнего меню */
  navLime: '#B8F84A',
  navBg: '#1A1A1A',
  navIcon: '#444444',
  navActiveText: '#222222',
  /** Ссылки «Все турниры» в хедере */
  linkMuted: '#838383',
  /** Иконки характеристик трофея (рыба, линейка, весы) */
  chipIcon: '#D2D2D2',
  white40: 'rgba(255,255,255,0.4)',
  white20: 'rgba(255,255,255,0.2)',
} as const;

export interface FigmaSurfaces {
  bg: string;
  /** Карточка трофея */
  feedCard: string;
  /** Карточка публикации («Болталка») */
  postCard: string;
  /** Чипы лайков/комментариев */
  chip: string;
  /** Белая плашка канала внутри публикации */
  label: string;
  text: string;
  text40: string;
  photoPlaceholder: string;
}

export const figmaSurfaces: Record<'light' | 'dark', FigmaSurfaces> = {
  light: { bg: '#FFFFFF', feedCard: '#F9F9F9', postCard: '#E9E9E9', chip: '#D2D2D2', label: '#FFFFFF', text: '#000000', text40: 'rgba(0,0,0,0.4)', photoPlaceholder: '#858585' },
  dark: { bg: '#0F0F0F', feedCard: '#1C1C1C', postCard: '#242424', chip: '#3A3A3A', label: '#2E2E2E', text: '#FFFFFF', text40: 'rgba(255,255,255,0.4)', photoPlaceholder: '#3A3A3A' },
};
