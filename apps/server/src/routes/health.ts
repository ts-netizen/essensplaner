import { Router, type Request, type Response } from 'express';
import { isFirebaseAvailable } from '../services/firebase.js';
import { isGeminiAvailable } from '../services/gemini.js';

export const healthRouter = Router();

/**
 * GET /health or /api/health
 * Container and service health check endpoint.
 */
healthRouter.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    services: {
      firebase: isFirebaseAvailable() ? 'connected' : 'in-memory-fallback',
      gemini: isGeminiAvailable() ? 'available' : 'heuristic-fallback',
    },
  });
});
