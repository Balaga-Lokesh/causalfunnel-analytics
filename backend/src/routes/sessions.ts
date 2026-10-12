import { Router } from 'express';

export const sessionsRouter = Router();

/**
 * GET /api/sessions
 * List of sessions with event counts, most recent first.
 * Response item: { session_id, total_events, page_views, clicks, first_seen, last_seen, entry_page }
 */
sessionsRouter.get('/', async (_req, res) => {
  // TODO: aggregate events grouped by session_id
  res.status(501).json({ error: 'Not implemented' });
});

/**
 * GET /api/sessions/:sessionId/events
 * All events of one session ordered by timestamp (the user journey).
 */
sessionsRouter.get('/:sessionId/events', async (_req, res) => {
  // TODO: find({ session_id }).sort({ timestamp: 1 })
  res.status(501).json({ error: 'Not implemented' });
});
