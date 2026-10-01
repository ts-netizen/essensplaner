import { Router, type Request, type Response } from 'express';
import {
  ScrapeRecipeRequestSchema,
  ParseDictationRequestSchema,
} from '@essensplaner/shared';
import { scrapeRecipe } from '../services/scraper.js';
import { parseDictation } from '../services/dictation.js';

export const recipesRouter = Router();

/**
 * POST /api/recipes/scrape
 * Body: { url: string }
 * Scrapes recipe metadata from given URL using JSON-LD or Gemini/heuristic fallbacks.
 */
recipesRouter.post('/scrape', async (req: Request, res: Response) => {
  const parseResult = ScrapeRecipeRequestSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: 'Ungültige Anfrage',
      details: parseResult.error.errors,
    });
    return;
  }

  const { url } = parseResult.data;

  try {
    const recipe = await scrapeRecipe(url);
    res.status(200).json(recipe);
  } catch (error) {
    console.error(`[Scraper] Error scraping ${url}:`, (error as Error).message);
    res.status(502).json({
      error: 'Fehler beim Abrufen oder Verarbeiten des Rezepts',
      message: (error as Error).message,
    });
  }
});

/**
 * POST /api/recipes/parse-dictation
 * Body: { rawText: string }
 * Transforms spoken dictation / voice memo text into a structured Recipe.
 */
recipesRouter.post('/parse-dictation', async (req: Request, res: Response) => {
  const parseResult = ParseDictationRequestSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: 'Ungültige Anfrage',
      details: parseResult.error.errors,
    });
    return;
  }

  const { rawText } = parseResult.data;

  try {
    const recipe = await parseDictation(rawText);
    res.status(200).json(recipe);
  } catch (error) {
    console.error('[Dictation] Error parsing speech text:', (error as Error).message);
    res.status(500).json({
      error: 'Fehler beim Parsen des Diktats',
      message: (error as Error).message,
    });
  }
});
