import axios from 'axios';

let accessToken: string | null = null;
const rawBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api';
const normalizedBaseUrl = rawBaseUrl.replace(/\\r\\n/g, '').trim();

export const apiClient = axios.create({
  baseURL: normalizedBaseUrl,
  timeout: 8000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export function setAccessToken(token: string | null) {
  accessToken = token;
}

apiClient.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
});
