import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';

export const notFound: RequestHandler = (_req, res) => {
  res.status(404).json({ error: 'Not found' });
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({ error: 'Invalid request', details: err.issues });
    return;
  }
  if (err instanceof SyntaxError) {
    res.status(400).json({ error: 'Malformed JSON body' });
    return;
  }
  console.error('[api] unhandled error', err);
  res.status(500).json({ error: 'Internal server error' });
};
