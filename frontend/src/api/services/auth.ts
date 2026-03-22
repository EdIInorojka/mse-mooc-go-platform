import { AxiosError } from 'axios';
import { apiClient } from '../client';
import { buildDemoSession, buildRegisteredDemoSession } from '../mock';
import type { AuthSession, LoginCredentials, RegisterPayload, Role, SessionUser } from '../../types/models';

interface BackendAuthResponse {
  user: {
    id: number | string;
    login?: string;
    full_name?: string;
    email: string;
    role: Role;
  };
  tokens: {
    access_token: string;
    refresh_token: string;
  };
}

interface BackendRefreshResponse {
  access_token: string;
  refresh_token: string;
}

function mapBackendUser(user: BackendAuthResponse['user']): SessionUser {
  return {
    id: String(user.id),
    fullName: user.full_name ?? user.login ?? user.email,
    email: user.email,
    role: user.role,
  };
}

function toAuthSession(payload: BackendAuthResponse): AuthSession {
  return {
    accessToken: payload.tokens.access_token,
    refreshToken: payload.tokens.refresh_token,
    user: mapBackendUser(payload.user),
  };
}

export async function loginRequest(credentials: LoginCredentials): Promise<AuthSession> {
  try {
    const response = await apiClient.post<BackendAuthResponse>('/auth/login', {
      login_or_email: credentials.email,
      password: credentials.password,
    });
    return toAuthSession(response.data);
  } catch (error: unknown) {
    if (!(error instanceof AxiosError) || !error.response) {
      return buildDemoSession(credentials.email, credentials.role);
    }
    throw error;
  }
}

export async function registerRequest(payload: RegisterPayload): Promise<AuthSession> {
  try {
    const response = await apiClient.post<BackendAuthResponse>('/auth/register', {
      login: payload.email,
      email: payload.email,
      password: payload.password,
      role: payload.role,
    });
    return toAuthSession(response.data);
  } catch (error: unknown) {
    if (!(error instanceof AxiosError) || !error.response) {
      return buildRegisteredDemoSession(payload);
    }
    throw error;
  }
}

export async function refreshRequest(refreshToken: string, previousSession: AuthSession): Promise<AuthSession | null> {
  try {
    const response = await apiClient.post<BackendRefreshResponse>('/auth/refresh', { refresh_token: refreshToken });
    return {
      ...previousSession,
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
    };
  } catch {
    if (previousSession.accessToken.startsWith('demo-access-')) {
      return previousSession;
    }
    return null;
  }
}

export async function fetchMe(): Promise<SessionUser | null> {
  try {
    const response = await apiClient.get<BackendAuthResponse['user']>('/auth/me');
    return mapBackendUser(response.data);
  } catch {
    return null;
  }
}

