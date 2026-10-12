import type { ClickPoint, PageSummary, SessionSummary, TrackedEvent } from './types';

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`GET ${path} failed: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export function getSessions() {
  return get<SessionSummary[]>('/api/sessions');
}

export function getSessionEvents(sessionId: string) {
  return get<TrackedEvent[]>(`/api/sessions/${encodeURIComponent(sessionId)}/events`);
}

export function getPages() {
  return get<PageSummary[]>('/api/pages');
}

export function getPageClicks(pageUrl: string) {
  return get<ClickPoint[]>(`/api/pages/clicks?url=${encodeURIComponent(pageUrl)}`);
}
