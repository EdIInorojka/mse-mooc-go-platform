/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { fetchMe, loginRequest, refreshRequest, registerRequest, updateProfileRequest } from '../api/services/auth';
import { setAccessToken } from '../api/client';
import type { AuthSession, LoginCredentials, RegisterPayload, Role, SessionUser, UpdateProfilePayload } from '../types/models';

interface AuthContextValue {
  token: string | null;
  refreshToken: string | null;
  role: Role | null;
  user: SessionUser | null;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  updateProfile: (payload: UpdateProfilePayload) => Promise<void>;
  logout: () => void;
}

const STORAGE_KEY = 'mse-mooc-session';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readStoredSession(): AuthSession | null {
  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

function persistSession(session: AuthSession | null) {
  if (!session) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() => readStoredSession());

  useEffect(() => {
    setAccessToken(session?.accessToken ?? null);
  }, [session]);

  useEffect(() => {
    const restore = async () => {
      if (!session?.refreshToken || !session) {
        return;
      }

      if (session.accessToken) {
        const me = await fetchMe();
        if (me) {
          const nextSession = { ...session, user: me };
          setSession(nextSession);
          persistSession(nextSession);
        }
        return;
      }

      const nextSession = await refreshRequest(session.refreshToken, session);
      if (nextSession) {
        setSession(nextSession);
        persistSession(nextSession);
      }
    };

    void restore();
  }, [session]);

  const value = useMemo<AuthContextValue>(
    () => ({
      token: session?.accessToken ?? null,
      refreshToken: session?.refreshToken ?? null,
      role: session?.user.role ?? null,
      user: session?.user ?? null,
      isAuthenticated: Boolean(session?.accessToken && session?.user),
      login: async (credentials: LoginCredentials) => {
        const nextSession = await loginRequest(credentials);
        setSession(nextSession);
        persistSession(nextSession);
      },
      register: async (payload: RegisterPayload) => {
        const nextSession = await registerRequest(payload);
        setSession(nextSession);
        persistSession(nextSession);
      },
      updateProfile: async (payload: UpdateProfilePayload) => {
        if (!session) {
          return;
        }
        const updatedUser = await updateProfileRequest(payload);
        const nextSession = { ...session, user: updatedUser };
        setSession(nextSession);
        persistSession(nextSession);
      },
      logout: () => {
        setSession(null);
        persistSession(null);
        setAccessToken(null);
      },
    }),
    [session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}

