import { Annotation, Comment, Label, Progress, Tokens, User } from './types';

const jsonHeaders = { 'Content-Type': 'application/json' };
const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

function getAccessToken(): string | null {
  return sessionStorage.getItem('access_token');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  const token = getAccessToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  const body = (await response.json()) as { success?: boolean; data?: T; error?: string };
  if (!response.ok || body.success === false) {
    throw new Error(body.error || 'Não foi possível concluir a operação');
  }
  return body.data as T;
}

export async function login(name: string, password: string): Promise<{ user: User; tokens: Tokens }> {
  const data = await request<{
    user: User;
    accessToken: string;
    refreshToken: string;
  }>('/api/auth/login', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ name, password }),
  });
  return {
    user: data.user,
    tokens: { accessToken: data.accessToken, refreshToken: data.refreshToken },
  };
}

export async function loadComments(): Promise<Comment[]> {
  const pages = await Promise.all(
    [1, 2, 3].map((page) =>
      request<{ comments: Comment[] }>(`/api/comments?page=${page}&limit=100`)
    )
  );
  return pages.flatMap((page) => page.comments);
}

export function loadAnnotations(): Promise<Annotation[]> {
  return request<Annotation[]>('/api/annotations');
}

export function loadProgress(): Promise<Progress> {
  return request<Progress>('/api/annotations/progress');
}

export function saveAnnotation(
  commentId: number,
  payload: { label: Label; note: string; is_difficult: boolean }
): Promise<Annotation> {
  return request<Annotation>(`/api/annotations/${commentId}`, {
    method: 'PUT',
    headers: jsonHeaders,
    body: JSON.stringify(payload),
  });
}

export function logout(): Promise<void> {
  return request('/api/auth/logout', { method: 'POST' }).then(() => undefined);
}
