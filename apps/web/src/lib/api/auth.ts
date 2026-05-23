import { api, setAccessToken } from './client';
import type { AuthUser, LoginResponse } from './types';

export async function login(email: string, password: string): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/auth/login', { email, password });
  setAccessToken(data.accessToken);
  return data;
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout');
  setAccessToken(null);
}

export async function fetchMe(): Promise<AuthUser> {
  const { data } = await api.get<AuthUser>('/auth/me');
  return data;
}

export async function updateLang(lang: 'UZ' | 'RU' | 'EN'): Promise<void> {
  await api.patch('/auth/me/lang', { lang });
}
