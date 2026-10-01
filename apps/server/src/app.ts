import express, { type Express, type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { recipesRouter } from './routes/recipes.js';
import { nutritionRouter } from './routes/nutrition.js';
import { healthRouter } from './routes/health.js';
import { initializeFirebaseAdmin } from './services/firebase.js';

// Load environment variables from .env
dotenv.config();

// Initialize Firebase Admin (safe fallback if credentials missing)
initializeFirebaseAdmin();

export function createApp(): Express {
  const app = express();

  // Basic security and parsing middlewares
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Health check endpoints (both /health and /api/health for Cloud Run)
  app.use('/health', healthRouter);
  app.use('/api/health', healthRouter);

  // Business logic API routes
  app.use('/api/recipes', recipesRouter);
  app.use('/api/nutrition', nutritionRouter);

  // Static web frontend serving (for single-container Cloud Run deployment)
  const clientDistPaths = [
    path.resolve(process.cwd(), '../web/dist'),
    path.resolve(process.cwd(), './public'),
    path.resolve(process.cwd(), './web-dist'),
  ];

  for (const staticPath of clientDistPaths) {
    if (fs.existsSync(staticPath)) {
      app.use(express.static(staticPath));
      app.get('*', (req: Request, res: Response, next: NextFunction) => {
        if (req.path.startsWith('/api') || req.path.startsWith('/health')) {
          return next();
        }
        res.sendFile(path.join(staticPath, 'index.html'));
      });
      break;
    }
  }

  // 404 handler for unhandled API routes
  app.use('/api/*', (_req: Request, res: Response) => {
    res.status(404).json({ error: 'Endpoint nicht gefunden' });
  });

  // Global Error Handler
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[App Error]', err);
    res.status(500).json({
      error: 'Interner Serverfehler',
      message: (err as Error).message || 'Unbekannter Fehler',
    });
  });

  return app;
}
