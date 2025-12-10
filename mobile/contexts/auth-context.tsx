import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useSegments } from 'expo-router';
import { PropsWithChildren, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const AUTH_STORAGE_KEY = 'smartdental_auth_session_v1';

type AuthUser = {
  _id: string;
  email: string;
  fullName?: string;
  role: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  avatarUrl?: string;
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
  logout: () => Promise<void>;
  updateUser: (updates: Partial<AuthUser>) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSessionState] = useState<AuthSession | null>(null);
  const [isHydrating, setIsHydrating] = useState(true);
  const router = useRouter();
  const segments = useSegments();

  // Load session from storage on mount
  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        console.log('🔐 Auth: Loading stored session...');
        const raw = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
        if (!raw) {
          console.log('🔐 Auth: No stored session found');
          return;
        }
        const parsed = JSON.parse(raw) as AuthSession;
        console.log('🔐 Auth: Session loaded:', { 
          email: parsed.user?.email, 
          role: parsed.user?.role,
          hasToken: !!parsed.token 
        });
        if (isMounted) {
          setSessionState(parsed);
        }
      } catch (error) {
        console.warn('⚠️ Auth: Could not load stored session', error);
      } finally {
        if (isMounted) {
          console.log('🔐 Auth: Hydration complete');
          setIsHydrating(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  // Auto redirect when session changes
  useEffect(() => {
    if (isHydrating) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      // User logged out, redirect to login
      console.log('🔐 Auth: Redirecting to login (logged out)');
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      // User logged in, redirect to appropriate home
      const role = session.user?.role?.toLowerCase();
      console.log('🔐 Auth: Redirecting to home (logged in as', role, ')');
      
      if (role === 'doctor') {
        router.replace('/(doctor)');
      } else {
        router.replace('/(tabs)');
      }
    }
  }, [session, segments, isHydrating, router]);

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

  const logout = useCallback(async () => {
    await clearSession();
  }, [clearSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      isHydrating,
      isAuthenticated: Boolean(session?.token),
      setSession,
      clearSession,
      logout,
      updateUser,
    }),
    [session, isHydrating, setSession, clearSession, logout, updateUser],
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
