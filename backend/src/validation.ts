import { z } from 'zod';
import { EVENT_TYPES } from './models/Event.js';

/** Shape of a single event as sent by tracker.js. */
export const incomingEventSchema = z.object({
  session_id: z.string().min(1).max(100),
  event_type: z.enum(EVENT_TYPES),
  page_url: z.string().min(1).max(2048),
  timestamp: z.coerce.date(),

  x: z.number().nonnegative().optional(),
  y: z.number().nonnegative().optional(),
  viewport_width: z.number().int().positive().optional(),
  viewport_height: z.number().int().positive().optional(),
  page_width: z.number().int().positive().optional(),
  page_height: z.number().int().positive().optional(),

  target: z.string().max(200).optional(),
  referrer: z.string().max(2048).optional(),
}).refine((e) => e.event_type !== 'click' || (e.x !== undefined && e.y !== undefined), {
  message: 'click events require x and y',
  path: ['x'],
});

/** The ingest endpoint accepts a single event or a batch. */
export const ingestBodySchema = z.union([
  incomingEventSchema,
  z.object({ events: z.array(incomingEventSchema).min(1).max(100) }),
]);

export type IncomingEvent = z.infer<typeof incomingEventSchema>;
