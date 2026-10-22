import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useShareIntent } from 'expo-share-intent';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Alert } from 'react-native';
import { ApiError, api, extractUrl } from './api';
import { useAuth } from './auth';

const PENDING_KEY = 'catchup_pending_share';

interface ShareContextValue {
  /** Increments after a shared link is saved so lists can refresh. */
  refreshKey: number;
}

const ShareContext = createContext<ShareContextValue>({ refreshKey: 0 });

export function useShareRefresh(): ShareContextValue {
  return useContext(ShareContext);
}

/**
 * Watches for links shared from other apps, saves them, and gives feedback.
 * A share that arrives while signed out is stored and saved after sign-in.
 */
export function ShareProcessor({ children }: { children: ReactNode }) {
  const { hasShareIntent, shareIntent, resetShareIntent, error } = useShareIntent();
  const { token } = useAuth();
  const router = useRouter();
  const [refreshKey, setRefreshKey] = useState(0);
  const processing = useRef(false);

  const save = useCallback(
    async (url: string) => {
      if (!token) return false;
      try {
        await api.createItem(token, url);
        setRefreshKey((key) => key + 1);
        Alert.alert('Saved', 'Added to your inbox.');
        router.replace('/(tabs)/inbox');
        return true;
      } catch (saveError) {
        Alert.alert(
          'Could not save',
          saveError instanceof ApiError
            ? saveError.message
            : 'Something went wrong. The link was not saved.',
        );
        return false;
      }
    },
    [token, router],
  );

  // Handle a fresh share intent.
  useEffect(() => {
    if (!hasShareIntent || processing.current) return;
    processing.current = true;

    const url = shareIntent.webUrl ?? extractUrl(shareIntent.text);

    if (!url) {
      Alert.alert(
        'No link found',
        "That share didn't include a link, so there was nothing to save.",
      );
      resetShareIntent();
      processing.current = false;
      return;
    }

    if (!token) {
      AsyncStorage.setItem(PENDING_KEY, url)
        .catch(() => {})
        .finally(() => {
          Alert.alert('Sign in to save', "We'll add that link to your inbox after you sign in.");
          resetShareIntent();
          processing.current = false;
          router.replace('/login');
        });
      return;
    }

    save(url).finally(() => {
      resetShareIntent();
      processing.current = false;
    });
  }, [hasShareIntent, shareIntent, token, resetShareIntent, save, router]);

  // Flush a link that was shared while signed out, once the user signs in.
  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    (async () => {
      const pending = await AsyncStorage.getItem(PENDING_KEY).catch(() => null);
      if (!pending || cancelled) return;
      await AsyncStorage.removeItem(PENDING_KEY).catch(() => {});
      if (!cancelled) await save(pending);
    })();

    return () => {
      cancelled = true;
    };
  }, [token, save]);

  // Surface native module errors instead of failing silently.
  useEffect(() => {
    if (error) {
      Alert.alert('Share unavailable', error);
    }
  }, [error]);

  return <ShareContext.Provider value={{ refreshKey }}>{children}</ShareContext.Provider>;
}
