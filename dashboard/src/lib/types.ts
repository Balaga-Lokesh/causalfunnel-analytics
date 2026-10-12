// Mirrors the backend API responses (backend/src/routes/*).

export type EventType = 'page_view' | 'click';

export interface SessionSummary {
  session_id: string;
  total_events: number;
  page_views: number;
  clicks: number;
  first_seen: string;
  last_seen: string;
  entry_page: string;
}

export interface TrackedEvent {
  _id: string;
  session_id: string;
  event_type: EventType;
  page_url: string;
  full_url?: string;
  timestamp: string;
  x?: number;
  y?: number;
  viewport_width?: number;
  viewport_height?: number;
  page_width?: number;
  page_height?: number;
  target?: string;
  referrer?: string;
}

export interface PageSummary {
  page_url: string;
  page_views: number;
  clicks: number;
}

export interface ClickPoint {
  x: number;
  y: number;
  page_width?: number;
  page_height?: number;
  viewport_width?: number;
  timestamp: string;
}
