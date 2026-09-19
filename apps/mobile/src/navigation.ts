import { router, type Href } from 'expo-router';

/** «Назад» с запасным маршрутом: на web страница может быть открыта напрямую, и стека нет. */
export function goBack(fallback: Href = '/') {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}
