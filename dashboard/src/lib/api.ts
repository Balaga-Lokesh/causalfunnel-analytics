import type {
  PageClicksResponse,
  PagesResponse,
  SessionEventsResponse,
  SessionsResponse,
} from './types';

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { cache: 'no-store' });
  if (!res.ok) {
    throw new ApiError(`GET ${path} failed: ${res.status} ${res.statusText}`, res.status);
  }
  return res.json() as Promise<T>;
}

export function getSessions({ limit = 50, offset = 0 } = {}) {
  return get<SessionsResponse>(`/api/sessions?limit=${limit}&offset=${offset}`);
}

export function getSessionEvents(sessionId: string) {
  return get<SessionEventsResponse>(`/api/sessions/${encodeURIComponent(sessionId)}/events`);
}

export function getPages() {
  return get<PagesResponse>('/api/pages');
}

export function getPageClicks(pageUrl: string) {
  return get<PageClicksResponse>(`/api/pages/clicks?url=${encodeURIComponent(pageUrl)}`);
}
