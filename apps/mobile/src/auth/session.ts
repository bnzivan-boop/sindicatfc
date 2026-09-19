import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { TokenPair } from '@sindikat/domain';

const ACCESS = 'sindikat.access';
const REFRESH = 'sindikat.refresh';

/** SecureStore нет на web — там localStorage (только для dev-просмотра в браузере). */
const store = {
  async get(key: string) {
    if (Platform.OS === 'web') return typeof localStorage === 'undefined' ? null : localStorage.getItem(key);
    return SecureStore.getItemAsync(key);
  },
  async set(key: string, value: string) {
    if (Platform.OS === 'web') return localStorage.setItem(key, value);
    return SecureStore.setItemAsync(key, value);
  },
  async del(key: string) {
    if (Platform.OS === 'web') return localStorage.removeItem(key);
    return SecureStore.deleteItemAsync(key);
  },
};

export async function saveSession(pair: TokenPair) {
  await store.set(ACCESS, pair.accessToken);
  await store.set(REFRESH, pair.refreshToken);
}

export function getAccessToken() {
  return store.get(ACCESS);
}

export function getRefreshToken() {
  return store.get(REFRESH);
}

export async function clearSession() {
  await store.del(ACCESS);
  await store.del(REFRESH);
}
