import { Router, type Request, type Response } from 'express';
import { getNutritionKnowledge } from '../services/nutrition.js';

export const nutritionRouter = Router();

/**
 * GET /api/nutrition/:id
 * Fetches or generates nutritional knowledge for the given ingredient ID.
 */
nutritionRouter.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id || typeof id !== 'string' || !id.trim()) {
    res.status(400).json({ error: 'Zutaten-ID fehlt oder ist ungültig' });
    return;
  }

  try {
    const knowledge = await getNutritionKnowledge(id);
    res.status(200).json(knowledge);
  } catch (error) {
    console.error(`[Nutrition] Error fetching knowledge for ${id}:`, (error as Error).message);
    res.status(500).json({
      error: 'Fehler beim Abrufen des Ernährungswissens',
      message: (error as Error).message,
    });
  }
});
