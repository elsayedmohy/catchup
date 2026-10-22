import * as SecureStore from 'expo-secure-store';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { User } from '@catchup/contracts';
import { ApiError, api } from './api';

const TOKEN_KEY = 'catchup_access_token';

interface AuthContextValue {
  token: string | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  removeAccount: () => Promise<void>;
  /** Clears local session state, e.g. after the API rejects an expired token. */
  clearSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const clearSession = useCallback(async () => {
    setToken(null);
    setUser(null);
    await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function restore() {
      try {
        const stored = await SecureStore.getItemAsync(TOKEN_KEY);
        if (!stored || cancelled) return;

        // Validate the stored token before trusting it.
        try {
          const currentUser = await api.me(stored);
          if (cancelled) return;
          setToken(stored);
          setUser(currentUser);
        } catch (error) {
          if (error instanceof ApiError && error.status === 401) {
            await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
          } else {
            // Offline: keep the token so the user can retry when back online.
            if (!cancelled) setToken(stored);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    restore();
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const result = await api.login(email.trim(), password);
    await SecureStore.setItemAsync(TOKEN_KEY, result.accessToken);
    setToken(result.accessToken);
    setUser(result.user);
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const result = await api.register(email.trim(), password);
    await SecureStore.setItemAsync(TOKEN_KEY, result.accessToken);
    setToken(result.accessToken);
    setUser(result.user);
  }, []);

  const signOut = useCallback(async () => {
    await clearSession();
  }, [clearSession]);

  const removeAccount = useCallback(async () => {
    if (!token) return;
    await api.deleteAccount(token);
    await clearSession();
  }, [token, clearSession]);

  const value = useMemo<AuthContextValue>(
    () => ({ token, user, loading, signIn, signUp, signOut, removeAccount, clearSession }),
    [token, user, loading, signIn, signUp, signOut, removeAccount, clearSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}
