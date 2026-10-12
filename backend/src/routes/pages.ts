import { Router } from 'express';

export const pagesRouter = Router();

/**
 * GET /api/pages
 * Distinct tracked page URLs with view/click counts (feeds the heatmap page selector).
 */
pagesRouter.get('/', async (_req, res) => {
  // TODO: aggregate distinct page_url with counts
  res.status(501).json({ error: 'Not implemented' });
});

/**
 * GET /api/pages/clicks?url=<page_url>
 * Click positions for one page, for the heatmap.
 * Response item: { x, y, page_width, page_height, viewport_width, timestamp }
 */
pagesRouter.get('/clicks', async (_req, res) => {
  // TODO: find({ page_url, event_type: 'click' }) with a projection
  res.status(501).json({ error: 'Not implemented' });
});
