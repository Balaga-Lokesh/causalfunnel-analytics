// Mirrors the backend API responses (backend/src/routes/*).

export type EventType = 'page_view' | 'click';

export interface SessionSummary {
  session_id: string;
  total_events: number;
  page_views: number;
  clicks: number;
  unique_pages: number;
  first_seen: string;
  last_seen: string;
  duration_ms: number;
  entry_page: string;
  exit_page: string;
  user_agent?: string;
}

export interface SessionsResponse {
  sessions: SessionSummary[];
  total: number;
  limit: number;
  offset: number;
}

export interface TrackedEvent {
  _id: string;
  session_id: string;
  event_type: EventType;
  page_url: string;
  full_url?: string;
  timestamp: string;
  received_at?: string;
  x?: number;
  y?: number;
  viewport_width?: number;
  viewport_height?: number;
  page_width?: number;
  page_height?: number;
  target?: string;
  referrer?: string;
}

export interface SessionEventsResponse {
  session_id: string;
  total_events: number;
  first_seen: string;
  last_seen: string;
  user_agent: string | null;
  truncated: boolean;
  events: TrackedEvent[];
}

export interface PageSummary {
  page_url: string;
  page_views: number;
  clicks: number;
  sessions: number;
  last_seen: string;
}

export interface PagesResponse {
  pages: PageSummary[];
}

export interface ClickPoint {
  x: number;
  y: number;
  page_width?: number;
  page_height?: number;
  viewport_width?: number;
  viewport_height?: number;
  target?: string;
  timestamp: string;
}

export interface PageClicksResponse {
  page_url: string;
  total: number;
  truncated: boolean;
  clicks: ClickPoint[];
}
