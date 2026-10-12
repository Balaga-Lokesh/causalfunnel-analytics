import type { IncomingEvent } from '../validation.js';
import { normalizePageUrl } from './url.js';

/** Maps a validated incoming event to the stored document shape. */
export function toDocument(event: IncomingEvent, userAgent: string | undefined) {
  const { x, y, ...rest } = event;
  return {
    ...rest,
    page_url: normalizePageUrl(event.page_url),
    full_url: event.page_url,
    // Coordinates only make sense for clicks.
    ...(event.event_type === 'click' ? { x, y } : {}),
    user_agent: userAgent,
  };
}
