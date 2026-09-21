import { router } from 'expo-router';
import { View } from 'react-native';
import { FilterRow, Surface, T } from '../../components/ui';
import { TrophyFeedCard } from '../trophies/TrophyFeedCard';
import { useTrophyFeed, type FeedItem } from '../trophies/useTrophies';
import { PostCard } from './components';
import { usePosts, type PostRow } from './useCommunity';

/** Фильтр ленты сообщества: «для вас» и «рядом» — общий scope, «подписки» — только друзья и свои каналы. */
export type FeedFilter = 'for-you' | 'subs' | 'near';

export const FEED_FILTERS: { value: FeedFilter; label: string }[] = [
  { value: 'for-you', label: 'для вас' },
  { value: 'subs', label: 'подписки' },
  { value: 'near', label: 'рядом' },
];

export type TimelineItem = { kind: 'trophy'; at: string; trophy: FeedItem } | { kind: 'post'; at: string; post: PostRow };

/**
 * Общая лента сообщества: публикации каналов + опубликованные трофеи, по дате.
 * Используется вкладкой «сообщество» и сокращённой лентой на главной — отдельного API у главной нет.
 */
export function useCommunityTimeline(filter: FeedFilter, limit?: number) {
  const scope = filter === 'subs' ? 'friends' : 'all';
  const feed = useTrophyFeed(scope);
  const posts = usePosts(undefined, scope);
  const items: TimelineItem[] = [
    ...(feed.data?.items ?? []).map((trophy): TimelineItem => ({ kind: 'trophy', at: trophy.publishedAt, trophy })),
    ...(posts.data ?? []).map((post): TimelineItem => ({ kind: 'post', at: post.createdAt, post })),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  return {
    items: limit ? items.slice(0, limit) : items,
    isLoading: feed.isLoading || posts.isLoading,
    // Ошибка одного источника не роняет ленту: показываем то, что загрузилось, и пометку
    isError: feed.isError || posts.isError,
    isEmpty: !feed.isLoading && !posts.isLoading && items.length === 0,
  };
}

export function FeedFilters({ value, onChange }: { value: FeedFilter; onChange: (v: FeedFilter) => void }) {
  return <FilterRow items={FEED_FILTERS} value={value} onChange={onChange} />;
}

/** Список карточек ленты с состояниями загрузки / пустоты / ошибки. Поведение карточек одинаково на всех экранах. */
export function Timeline({ filter, limit, gap = 10 }: { filter: FeedFilter; limit?: number; /** Расстояние между карточками; на главной по макету 20 */ gap?: number }) {
  const { items, isLoading, isError, isEmpty } = useCommunityTimeline(filter, limit);
  return (
    <View style={{ gap }}>
      {isError && items.length === 0 && <Surface><T size={10} muted>Не удалось загрузить ленту. Проверьте соединение и откройте экран ещё раз.</T></Surface>}
      {!isError && isLoading && items.length === 0 && <Surface><T size={10} muted>Загрузка…</T></Surface>}
      {!isError && isEmpty && (
        <Surface><T size={10} muted>{filter === 'subs' ? 'Здесь публикации друзей и ваших каналов. Добавьте друзей — они на вкладке «кого добавить» в профиле.' : 'Лента пуста'}</T></Surface>
      )}
      {items.map((x) => (x.kind === 'trophy'
        ? <TrophyFeedCard key={`t-${x.trophy.id}`} item={x.trophy} />
        : <PostCard key={`p-${x.post.id}`} post={x.post} onOpen={() => router.push({ pathname: '/community/topic/[id]', params: { id: x.post.id } })} />))}
    </View>
  );
}
