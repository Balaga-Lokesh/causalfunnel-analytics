import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import express from 'express';
import { config } from './config.js';
import { errorHandler, notFound } from './middleware/errors.js';
import { eventsRouter } from './routes/events.js';
import { pagesRouter } from './routes/pages.js';
import { sessionsRouter } from './routes/sessions.js';

const here = path.dirname(fileURLToPath(import.meta.url));
// Works from both src/ (tsx) and dist/ (compiled): both sit one level below backend/.
const repoRoot = path.resolve(here, '..', '..');

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', true);

  // sendBeacon posts as text/plain to avoid a CORS preflight, so accept both.
  app.use(express.json({ limit: '100kb' }));
  app.use(express.text({ type: 'text/plain', limit: '100kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // Ingest is public: the tracker runs on any website.
  app.use('/api/events', cors(), eventsRouter);

  // Read APIs are only for the dashboard.
  const dashboardCors = cors({ origin: config.dashboardOrigins });
  app.use('/api/sessions', dashboardCors, sessionsRouter);
  app.use('/api/pages', dashboardCors, pagesRouter);

  // Serve the tracker script and the demo site from the same server.
  app.get('/tracker.js', cors(), (_req, res) => {
    res.type('application/javascript');
    res.sendFile(path.join(repoRoot, 'tracker', 'tracker.js'));
  });
  app.use('/demo', express.static(path.join(repoRoot, 'demo'), { extensions: ['html'] }));
  app.get('/', (_req, res) => res.redirect('/demo/'));

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
