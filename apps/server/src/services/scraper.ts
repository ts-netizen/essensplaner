import * as cheerio from 'cheerio';
import { type Recipe, type Ingredient } from '@essensplaner/shared';
import {
  parseIngredientString,
  enrichIngredient,
} from './ingredientParser.js';
import { generateStructuredJson, isGeminiAvailable } from './gemini.js';

/**
 * Parses ISO 8601 duration strings like "PT30M", "PT1H15M", "P0DT45M".
 * Also supports plain numbers or strings like "45 min".
 */
export function parseIsoDuration(duration: unknown): number {
  if (typeof duration === 'number') {
    return Math.max(0, Math.round(duration));
  }
  if (typeof duration !== 'string') {
    return 0;
  }

  const str = duration.trim();
  // Check ISO 8601 duration regex: P[nD]T[nH][nM][nS]
  const isoMatch = str.match(
    /^P(?:([0-9]+)D)?(?:T(?:([0-9]+)H)?(?:([0-9]+)M)?(?:([0-9]+)S)?)?$/i,
  );
  if (isoMatch) {
    const days = parseInt(isoMatch[1] || '0', 10);
    const hours = parseInt(isoMatch[2] || '0', 10);
    const minutes = parseInt(isoMatch[3] || '0', 10);
    return days * 24 * 60 + hours * 60 + minutes;
  }

  // Check plain number or "X min"
  const minMatch = str.match(/^(\d+)\s*(?:min|minuten|m)?$/i);
  if (minMatch) {
    return parseInt(minMatch[1], 10);
  }

  return 0;
}

/**
 * Parses servings/yield from recipe yield strings (e.g. "4 Portionen", "4-6", 4).
 */
export function parseServings(yieldVal: unknown): number {
  if (typeof yieldVal === 'number' && yieldVal > 0) {
    return Math.round(yieldVal);
  }
  if (Array.isArray(yieldVal) && yieldVal.length > 0) {
    return parseServings(yieldVal[0]);
  }
  if (typeof yieldVal === 'string') {
    const match = yieldVal.match(/(\d+)/);
    if (match) {
      const parsed = parseInt(match[1], 10);
      if (parsed > 0) return parsed;
    }
  }
  return 4; // Default standard household serving
}

/**
 * Extracts image URL from various Schema.org image formats.
 */
function extractImageUrl(image: unknown): string {
  if (typeof image === 'string') {
    return image;
  }
  if (Array.isArray(image) && image.length > 0) {
    return extractImageUrl(image[0]);
  }
  if (typeof image === 'object' && image !== null) {
    const obj = image as Record<string, unknown>;
    if (typeof obj.url === 'string') {
      return obj.url;
    }
    if (typeof obj.contentUrl === 'string') {
      return obj.contentUrl;
    }
  }
  return '';
}

/**
 * Recursively extracts instructions from strings, HowToStep, or HowToSection objects.
 */
export function extractInstructions(raw: unknown): string[] {
  const steps: string[] = [];

  if (typeof raw === 'string') {
    // If it's a single block of text, split by newlines or numbered patterns
    const lines = raw
      .split(/\r?\n+/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    return lines;
  }

  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (typeof item === 'string') {
        const trimmed = item.trim();
        if (trimmed) steps.push(trimmed);
      } else if (typeof item === 'object' && item !== null) {
        const obj = item as Record<string, unknown>;
        // If HowToSection with nested steps
        if (Array.isArray(obj.itemListElement)) {
          steps.push(...extractInstructions(obj.itemListElement));
        } else if (typeof obj.text === 'string' && obj.text.trim()) {
          steps.push(obj.text.trim());
        } else if (typeof obj.name === 'string' && obj.name.trim()) {
          steps.push(obj.name.trim());
        }
      }
    }
  }

  return steps;
}

/**
 * Recursively searches a JSON-LD object or array for a Schema.org Recipe.
 */
export function findRecipeInJsonLd(obj: unknown): Record<string, unknown> | null {
  if (!obj || typeof obj !== 'object') {
    return null;
  }

  if (Array.isArray(obj)) {
    for (const item of obj) {
      const found = findRecipeInJsonLd(item);
      if (found) return found;
    }
    return null;
  }

  const record = obj as Record<string, unknown>;

  // Check @type
  const typeVal = record['@type'];
  if (
    typeVal === 'Recipe' ||
    (Array.isArray(typeVal) && typeVal.includes('Recipe'))
  ) {
    return record;
  }

  // Check @graph array
  if (Array.isArray(record['@graph'])) {
    const found = findRecipeInJsonLd(record['@graph']);
    if (found) return found;
  }

  // Check nested properties
  for (const key of Object.keys(record)) {
    if (typeof record[key] === 'object' && record[key] !== null) {
      const found = findRecipeInJsonLd(record[key]);
      if (found) return found;
    }
  }

  return null;
}

/**
 * Scrapes a recipe from HTML using Schema.org JSON-LD, with Gemini and heuristic fallbacks.
 */
export async function scrapeRecipeFromHtml(html: string, url: string): Promise<Recipe> {
  const $ = cheerio.load(html);

  // 1. Try extracting Schema.org JSON-LD
  const ldJsonScripts = $('script[type="application/ld+json"]').toArray();
  for (const scriptEl of ldJsonScripts) {
    try {
      const content = $(scriptEl).html();
      if (!content) continue;
      const parsed = JSON.parse(content);
      const recipeObj = findRecipeInJsonLd(parsed);

      if (recipeObj) {
        const title = (
          (recipeObj.name as string) ||
          (recipeObj.headline as string) ||
          $('h1').first().text().trim() ||
          'Rezept'
        ).trim();

        const prepTimeMinutes = parseIsoDuration(recipeObj.prepTime);
        const rawCookTime = parseIsoDuration(recipeObj.cookTime);
        const rawTotalTime = parseIsoDuration(recipeObj.totalTime);
        const cookTimeMinutes =
          rawCookTime > 0
            ? rawCookTime
            : Math.max(0, rawTotalTime - prepTimeMinutes);

        const servings = parseServings(recipeObj.recipeYield);
        const photoUrl = extractImageUrl(recipeObj.image);

        // Categories
        const categories: string[] = [];
        if (typeof recipeObj.recipeCategory === 'string') {
          categories.push(
            ...recipeObj.recipeCategory
              .split(',')
              .map((c) => c.trim())
              .filter(Boolean),
          );
        } else if (Array.isArray(recipeObj.recipeCategory)) {
          categories.push(
            ...recipeObj.recipeCategory
              .map((c) => String(c).trim())
              .filter(Boolean),
          );
        }

        // Ingredients
        const rawIngredients: string[] = [];
        if (Array.isArray(recipeObj.recipeIngredient)) {
          for (const item of recipeObj.recipeIngredient) {
            if (typeof item === 'string' && item.trim()) {
              rawIngredients.push(item.trim());
            }
          }
        }

        const ingredients: Ingredient[] = rawIngredients.map((str) =>
          parseIngredientString(str),
        );

        // Instructions
        const instructions = extractInstructions(recipeObj.recipeInstructions);

        const id = `recipe-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

        return {
          id,
          title,
          sourceUrl: url,
          prepTimeMinutes,
          cookTimeMinutes,
          servings,
          isLunch: prepTimeMinutes + cookTimeMinutes <= 35,
          isDinner: true,
          categories: categories.length > 0 ? categories : ['Hauptgericht'],
          visibility: 'private',
          photoUrl: photoUrl || '',
          ingredients,
          instructions: instructions.length > 0 ? instructions : ['Keine Zubereitungsschritte angegeben.'],
          createdAt: new Date().toISOString(),
        };
      }
    } catch {
      // Continue searching next JSON-LD block
    }
  }

  // 2. Fallback: LLM Extraction via Gemini 1.5 Flash if available
  if (isGeminiAvailable()) {
    // Remove scripts, styles, navigation, footer to minimize tokens
    $('script, style, nav, footer, header, aside, iframe, noscript').remove();
    const cleanText = $('body').text().replace(/\s+/g, ' ').substring(0, 15000);

    const prompt = `Analysiere den folgenden Webseiten-Text und extrahiere das Kochrezept.
Antworte zwingend im folgenden JSON-Format:
{
  "title": "Rezepttitel",
  "prepTimeMinutes": 15,
  "cookTimeMinutes": 25,
  "servings": 4,
  "categories": ["Pasta", "Vegetarisch"],
  "ingredients": [
    { "displayName": "Spaghetti", "amount": 500, "unit": "g" }
  ],
  "instructions": [
    "Schritt 1: Wasser zum Kochen bringen...",
    "Schritt 2: Nudeln bissfest garen..."
  ]
}

Webseiten-Inhalt:
${cleanText}`;

    interface GeminiRecipeResponse {
      title?: string;
      prepTimeMinutes?: number;
      cookTimeMinutes?: number;
      servings?: number;
      categories?: string[];
      ingredients?: Array<{ displayName?: string; amount?: number; unit?: string }>;
      instructions?: string[];
    }

    const geminiResult = await generateStructuredJson<GeminiRecipeResponse>(
      'Du bist ein spezialisierter Rezept-Extraktions-Assistent. Extrahiere Rezepte präzise.',
      prompt,
    );

    if (geminiResult && geminiResult.title) {
      const ingredients = (geminiResult.ingredients || []).map((ing) =>
        enrichIngredient(ing),
      );

      return {
        id: `recipe-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        title: geminiResult.title,
        sourceUrl: url,
        prepTimeMinutes: geminiResult.prepTimeMinutes || 15,
        cookTimeMinutes: geminiResult.cookTimeMinutes || 20,
        servings: geminiResult.servings || 4,
        isLunch: (geminiResult.prepTimeMinutes || 15) + (geminiResult.cookTimeMinutes || 20) <= 35,
        isDinner: true,
        categories: geminiResult.categories && geminiResult.categories.length > 0 ? geminiResult.categories : ['Hauptgericht'],
        visibility: 'private',
        photoUrl: $('meta[property="og:image"]').attr('content') || '',
        ingredients,
        instructions: geminiResult.instructions && geminiResult.instructions.length > 0 ? geminiResult.instructions : ['Zubereiten und servieren.'],
        createdAt: new Date().toISOString(),
      };
    }
  }

  // 3. Rule-based Heuristic HTML Fallback
  const title =
    $('meta[property="og:title"]').attr('content') ||
    $('h1').first().text().trim() ||
    $('title').text().trim() ||
    'Unbekanntes Rezept';

  const photoUrl = $('meta[property="og:image"]').attr('content') || '';

  // Heuristic ingredients extraction
  const rawIngredients: string[] = [];
  $('[class*="ingredient"] li, [class*="zutat"] li, ul.ingredients li, [itemprop="recipeIngredient"]').each(
    (_, el) => {
      const text = $(el).text().trim();
      if (text) rawIngredients.push(text);
    },
  );

  const ingredients = rawIngredients.map((str) => parseIngredientString(str));

  // Heuristic instructions extraction
  const instructions: string[] = [];
  $('[class*="instruction"] li, [class*="zubereitung"] li, [class*="schritte"] li, ol.instructions li, [itemprop="recipeInstructions"]').each(
    (_, el) => {
      const text = $(el).text().trim();
      if (text) instructions.push(text);
    },
  );

  return {
    id: `recipe-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
    title: title.replace(/[-|].*$/, '').trim(),
    sourceUrl: url,
    prepTimeMinutes: 15,
    cookTimeMinutes: 20,
    servings: 4,
    isLunch: false,
    isDinner: true,
    categories: ['Hauptgericht'],
    visibility: 'private',
    photoUrl,
    ingredients: ingredients.length > 0 ? ingredients : [parseIngredientString('Zutaten nach Wahl')],
    instructions: instructions.length > 0 ? instructions : ['Keine Zubereitungsschritte gefunden.'],
    createdAt: new Date().toISOString(),
  };
}

/**
 * Fetches HTML from a remote URL and scrapes the recipe.
 */
export async function scrapeRecipe(url: string): Promise<Recipe> {
  const response = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 (EssensplanerBot/1.0)',
      Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`Konnte Rezept-URL nicht abrufen (HTTP ${response.status}: ${response.statusText})`);
  }

  const html = await response.text();
  return scrapeRecipeFromHtml(html, url);
}
