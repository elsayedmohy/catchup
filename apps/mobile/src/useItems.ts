import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import type { SavedItem } from '@catchup/contracts';
import { ApiError, api } from './api';
import { useAuth } from './auth';
import { useShareRefresh } from './share';

const PAGE_SIZE = 25;

export function useDebouncedValue<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timeout);
  }, [value, delay]);

  return debounced;
}

export function useItems({ archived }: { archived: boolean }) {
  const { token, clearSession } = useAuth();
  const { refreshKey } = useShareRefresh();

  const [query, setQuery] = useState('');
  const [source, setSource] = useState<string | null>(null);
  const [sort, setSort] = useState<'asc' | 'desc'>('desc');

  const [items, setItems] = useState<SavedItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debouncedQuery = useDebouncedValue(query);
  const requestId = useRef(0);

  const describeError = useCallback(
    async (caught: unknown): Promise<string> => {
      if (caught instanceof ApiError && caught.status === 401) {
        await clearSession();
        return 'Your session expired. Please sign in again.';
      }
      return caught instanceof Error ? caught.message : 'Something went wrong.';
    },
    [clearSession],
  );

  const filters = useCallback(
    () => ({
      q: debouncedQuery.trim() || undefined,
      source: source ?? undefined,
      archived,
      sort,
      limit: PAGE_SIZE,
    }),
    [debouncedQuery, source, archived, sort],
  );

  const loadFirst = useCallback(async () => {
    if (!token) return;
    const id = ++requestId.current;

    setBusy(true);
    setError(null);

    try {
      const result = await api.listItems(token, filters());
      if (id !== requestId.current) return;
      setItems(result.items);
      setNextCursor(result.nextCursor);
      setHasMore(result.hasMore);
    } catch (caught) {
      if (id !== requestId.current) return;
      setError(await describeError(caught));
    } finally {
      if (id === requestId.current) {
        setLoading(false);
        setBusy(false);
      }
    }
  }, [token, filters, describeError]);

  // Refresh whenever the screen regains focus or a shared link is saved.
  useFocusEffect(
    useCallback(() => {
      loadFirst();
    }, [loadFirst, refreshKey]),
  );

  // Also refresh when the app returns to the foreground (share extension flow).
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') loadFirst();
    });
    return () => subscription.remove();
  }, [loadFirst]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadFirst();
    } finally {
      setRefreshing(false);
    }
  }, [loadFirst]);

  const loadMore = useCallback(async () => {
    if (!token || !hasMore || !nextCursor || loadingMore) return;

    setLoadingMore(true);
    try {
      const result = await api.listItems(token, { ...filters(), cursor: nextCursor });
      setItems((previous) => {
        const seen = new Set(previous.map((item) => item.id));
        return [...previous, ...result.items.filter((item) => !seen.has(item.id))];
      });
      setNextCursor(result.nextCursor);
      setHasMore(result.hasMore);
    } catch (caught) {
      setError(await describeError(caught));
    } finally {
      setLoadingMore(false);
    }
  }, [token, hasMore, nextCursor, loadingMore, filters, describeError]);

  const replaceItem = useCallback((updated: SavedItem) => {
    setItems((previous) => previous.map((item) => (item.id === updated.id ? updated : item)));
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((previous) => previous.filter((item) => item.id !== id));
  }, []);

  return {
    items,
    loading,
    busy,
    refreshing,
    loadingMore,
    hasMore,
    error,
    query,
    setQuery,
    source,
    setSource,
    sort,
    setSort,
    refresh,
    loadMore,
    replaceItem,
    removeItem,
    retry: loadFirst,
  };
}
