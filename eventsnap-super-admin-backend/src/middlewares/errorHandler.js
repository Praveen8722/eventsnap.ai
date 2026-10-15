import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { HttpError } from '../utils/HttpError.js';

export function notFound(req, _res, next) {
  next(HttpError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

// Express identifies error handlers by their four-argument signature.
// eslint-disable-next-line no-unused-vars
export function errorHandler(error, _req, res, _next) {
  if (error instanceof HttpError) {
    return res.status(error.status).json({ error: { message: error.message, ...(error.details ? { details: error.details } : {}) } });
  }
  if (error?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { message: 'Request body is not valid JSON.' } });
  }
  if (error?.type === 'entity.too.large') {
    return res.status(413).json({ error: { message: 'Request body is too large.' } });
  }
  if (error instanceof mongoose.Error.ValidationError) {
    return res.status(400).json({ error: { message: Object.values(error.errors).map(e => e.message).join(' ') } });
  }
  if (error instanceof mongoose.Error.CastError) {
    return res.status(400).json({ error: { message: `Invalid value for ${error.path}.` } });
  }

  if (!env.isTest) console.error(error);
  return res.status(500).json({ error: { message: 'An unexpected error occurred.' } });
}
