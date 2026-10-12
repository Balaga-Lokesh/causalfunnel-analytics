import { Router } from 'express';
import { z } from 'zod';
import { Event } from '../models/Event.js';

export const sessionsRouter = Router();

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

const sessionIdSchema = z.string().min(1).max(100);

// A session's journey is capped so one runaway session can't produce a huge response.
const MAX_EVENTS_PER_SESSION = 1000;

/**
 * GET /api/sessions?limit=50&offset=0
 * Sessions with event counts, most recently active first.
 */
sessionsRouter.get('/', async (req, res) => {
  const { limit, offset } = listQuerySchema.parse(req.query);

  const [result] = await Event.aggregate<{
    sessions: unknown[];
    total: { count: number }[];
  }>([
    {
      $group: {
        _id: '$session_id',
        total_events: { $sum: 1 },
        page_views: { $sum: { $cond: [{ $eq: ['$event_type', 'page_view'] }, 1, 0] } },
        clicks: { $sum: { $cond: [{ $eq: ['$event_type', 'click'] }, 1, 0] } },
        first_seen: { $min: '$timestamp' },
        last_seen: { $max: '$timestamp' },
        entry_page: { $top: { sortBy: { timestamp: 1 }, output: '$page_url' } },
        exit_page: { $bottom: { sortBy: { timestamp: 1 }, output: '$page_url' } },
        pages: { $addToSet: '$page_url' },
        user_agent: { $first: '$user_agent' },
      },
    },
    {
      $facet: {
        sessions: [
          { $sort: { last_seen: -1, _id: 1 } },
          { $skip: offset },
          { $limit: limit },
          {
            $project: {
              _id: 0,
              session_id: '$_id',
              total_events: 1,
              page_views: 1,
              clicks: 1,
              unique_pages: { $size: '$pages' },
              first_seen: 1,
              last_seen: 1,
              duration_ms: { $subtract: ['$last_seen', '$first_seen'] },
              entry_page: 1,
              exit_page: 1,
              user_agent: 1,
            },
          },
        ],
        total: [{ $count: 'count' }],
      },
    },
  ]);

  res.json({
    sessions: result?.sessions ?? [],
    total: result?.total[0]?.count ?? 0,
    limit,
    offset,
  });
});

/**
 * GET /api/sessions/:sessionId/events
 * All events of one session ordered by time: the user journey.
 */
sessionsRouter.get('/:sessionId/events', async (req, res) => {
  const sessionId = sessionIdSchema.parse(req.params.sessionId);

  const events = await Event.find({ session_id: sessionId })
    .sort({ timestamp: 1, _id: 1 })
    .limit(MAX_EVENTS_PER_SESSION)
    .lean();

  if (events.length === 0) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  res.json({
    session_id: sessionId,
    total_events: events.length,
    first_seen: events[0]!.timestamp,
    last_seen: events[events.length - 1]!.timestamp,
    // Same browser for the whole session, so report it once instead of per event.
    user_agent: events[0]!.user_agent ?? null,
    truncated: events.length === MAX_EVENTS_PER_SESSION,
    events: events.map(({ user_agent: _ua, ...event }) => event),
  });
});
