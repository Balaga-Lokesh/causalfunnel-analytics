import { Router } from 'express';
import { normalizePageUrl } from '../lib/url.js';
import { Event } from '../models/Event.js';
import { ingestBodySchema, type IncomingEvent } from '../validation.js';

export const eventsRouter = Router();

function toDocument(event: IncomingEvent, userAgent: string | undefined) {
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

/**
 * POST /api/events
 * Body: a single event, or { events: [...] } for a batch (see validation.ts).
 * Accepts application/json and text/plain (what navigator.sendBeacon sends).
 */
eventsRouter.post('/', async (req, res) => {
  // text/plain bodies arrive as a string; a SyntaxError here becomes a 400.
  const body: unknown = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const parsed = ingestBodySchema.parse(body);

  const events = 'events' in parsed ? parsed.events : [parsed];
  const userAgent = req.get('user-agent')?.slice(0, 500);

  await Event.insertMany(
    events.map((event) => toDocument(event, userAgent)),
    { ordered: false },
  );

  res.status(202).json({ accepted: events.length });
});
