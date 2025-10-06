import AsyncStorage from '@react-native-async-storage/async-storage';
import { PropsWithChildren, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const AUTH_STORAGE_KEY = 'smartdental_auth_session_v1';

type AuthUser = {
  _id: string;
  email: string;
  fullName?: string;
  role: string;
};

type AuthSession = {
  user: AuthUser;
  token: string;
};

type AuthContextValue = {
  session: AuthSession | null;
  isHydrating: boolean;
  isAuthenticated: boolean;
  setSession: (session: AuthSession) => Promise<void>;
  clearSession: () => Promise<void>;
  updateUser: (updates: Partial<AuthUser>) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSessionState] = useState<AuthSession | null>(null);
  const [isHydrating, setIsHydrating] = useState(true);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        const raw = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw) as AuthSession;
        if (isMounted) {
          setSessionState(parsed);
        }
      } catch (error) {
        console.warn('Không thể nạp phiên đăng nhập đã lưu', error);
      } finally {
        if (isMounted) {
          setIsHydrating(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const persistSession = useCallback(async (next: AuthSession | null) => {
    if (!next) {
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
      return;
    }
    await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(next));
  }, []);

  const setSession = useCallback(
    async (next: AuthSession) => {
      setSessionState(next);
      await persistSession(next);
    },
    [persistSession],
  );

  const clearSession = useCallback(async () => {
    setSessionState(null);
    await persistSession(null);
  }, [persistSession]);

  const updateUser = useCallback(
    async (updates: Partial<AuthUser>) => {
      setSessionState((prev) => {
        if (!prev) {
          return prev;
        }
        const merged: AuthSession = {
          ...prev,
          user: {
            ...prev.user,
            ...updates,
          },
        };
        void persistSession(merged);
        return merged;
      });
    },
    [persistSession],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      isHydrating,
      isAuthenticated: Boolean(session?.token),
      setSession,
      clearSession,
      updateUser,
    }),
    [session, isHydrating, setSession, clearSession, updateUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth phải được sử dụng bên trong AuthProvider');
  }
  return context;
}
