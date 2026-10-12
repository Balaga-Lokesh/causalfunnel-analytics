import { Router } from 'express';
import { z } from 'zod';
import { normalizePageUrl } from '../lib/url.js';
import { Event } from '../models/Event.js';

export const pagesRouter = Router();

const clicksQuerySchema = z.object({
  url: z.string().min(1).max(2048),
  limit: z.coerce.number().int().min(1).max(20000).default(5000),
});

/**
 * GET /api/pages
 * Tracked pages with view/click counts; feeds the heatmap page selector.
 */
pagesRouter.get('/', async (_req, res) => {
  const pages = await Event.aggregate([
    {
      $group: {
        _id: '$page_url',
        page_views: { $sum: { $cond: [{ $eq: ['$event_type', 'page_view'] }, 1, 0] } },
        clicks: { $sum: { $cond: [{ $eq: ['$event_type', 'click'] }, 1, 0] } },
        sessions: { $addToSet: '$session_id' },
        last_seen: { $max: '$timestamp' },
      },
    },
    {
      $project: {
        _id: 0,
        page_url: '$_id',
        page_views: 1,
        clicks: 1,
        sessions: { $size: '$sessions' },
        last_seen: 1,
      },
    },
    { $sort: { clicks: -1, page_views: -1, page_url: 1 } },
  ]);

  res.json({ pages });
});

/**
 * GET /api/pages/clicks?url=<page_url>&limit=5000
 * Click positions for one page, newest first, for the heatmap.
 * The url is normalized the same way as on ingest, so a raw URL works too.
 */
pagesRouter.get('/clicks', async (req, res) => {
  const { url, limit } = clicksQuerySchema.parse(req.query);
  const pageUrl = normalizePageUrl(url);

  const filter = { page_url: pageUrl, event_type: 'click' as const };
  const [clicks, total] = await Promise.all([
    Event.find(filter)
      .sort({ timestamp: -1 })
      .limit(limit)
      .select({
        _id: 0,
        x: 1,
        y: 1,
        page_width: 1,
        page_height: 1,
        viewport_width: 1,
        viewport_height: 1,
        target: 1,
        timestamp: 1,
      })
      .lean(),
    Event.countDocuments(filter),
  ]);

  res.json({
    page_url: pageUrl,
    total,
    truncated: total > clicks.length,
    clicks,
  });
});
