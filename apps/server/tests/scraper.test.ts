import { describe, it, expect, vi } from 'vitest';
import { createTestClient } from './testClient.js';
import { createApp } from '../src/app.js';
import {
  parseIsoDuration,
  parseServings,
  extractInstructions,
  findRecipeInJsonLd,
  scrapeRecipeFromHtml,
} from '../src/services/scraper.js';
import { RecipeSchema } from '@essensplaner/shared';

describe('Scraper Service & Route Tests', () => {
  describe('Helper Functions', () => {
    it('parseIsoDuration correctly parses ISO 8601 durations', () => {
      expect(parseIsoDuration('PT30M')).toBe(30);
      expect(parseIsoDuration('PT1H')).toBe(60);
      expect(parseIsoDuration('PT1H15M')).toBe(75);
      expect(parseIsoDuration('P0DT45M')).toBe(45);
      expect(parseIsoDuration('20 min')).toBe(20);
      expect(parseIsoDuration(25)).toBe(25);
      expect(parseIsoDuration('')).toBe(0);
    });

    it('parseServings correctly extracts number of portions', () => {
      expect(parseServings('4 Portionen')).toBe(4);
      expect(parseServings('4-6')).toBe(4);
      expect(parseServings(2)).toBe(2);
      expect(parseServings(['3'])).toBe(3);
      expect(parseServings(null)).toBe(4);
    });

    it('extractInstructions extracts text from various HowTo formats', () => {
      const strings = ['Schritt 1: Zwiebeln schneiden', 'Schritt 2: Anbraten'];
      expect(extractInstructions(strings)).toEqual(strings);

      const howToSteps = [
        { '@type': 'HowToStep', text: 'Wasser kochen' },
        { '@type': 'HowToStep', name: 'Nudeln hineingeben' },
      ];
      expect(extractInstructions(howToSteps)).toEqual([
        'Wasser kochen',
        'Nudeln hineingeben',
      ]);

      const howToSection = [
        {
          '@type': 'HowToSection',
          name: 'Vorbereitung',
          itemListElement: [{ '@type': 'HowToStep', text: 'Gemüse waschen' }],
        },
      ];
      expect(extractInstructions(howToSection)).toEqual(['Gemüse waschen']);
    });

    it('findRecipeInJsonLd locates Recipe in deeply nested or @graph objects', () => {
      const single = { '@context': 'https://schema.org', '@type': 'Recipe', name: 'Test' };
      expect(findRecipeInJsonLd(single)?.name).toBe('Test');

      const graph = {
        '@context': 'https://schema.org',
        '@graph': [
          { '@type': 'WebSite', name: 'Site' },
          { '@type': 'Recipe', name: 'Graph Recipe' },
        ],
      };
      expect(findRecipeInJsonLd(graph)?.name).toBe('Graph Recipe');
    });
  });

  describe('scrapeRecipeFromHtml', () => {
    it('extracts recipe accurately from Schema.org JSON-LD', async () => {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Spaghetti Bolognese</title>
          <script type="application/ld+json">
          {
            "@context": "https://schema.org",
            "@type": "Recipe",
            "name": "Klassische Spaghetti Bolognese",
            "prepTime": "PT15M",
            "cookTime": "PT30M",
            "recipeYield": "4 Portionen",
            "image": "https://example.com/bolognese.jpg",
            "recipeCategory": "Pasta, Italienisch",
            "recipeIngredient": [
              "500 g Spaghetti",
              "400 g Rinderhackfleisch",
              "1 Zwiebel",
              "2 Zehen Knoblauch",
              "2 EL Olivenöl",
              "1 Dose gehackte Tomaten",
              "1 Prise Salz"
            ],
            "recipeInstructions": [
              { "@type": "HowToStep", "text": "Zwiebel und Knoblauch fein hacken." },
              { "@type": "HowToStep", "text": "Hackfleisch in heißem Olivenöl anbraten." },
              { "@type": "HowToStep", "text": "Tomaten zugeben und 25 Minuten köcheln lassen." },
              { "@type": "HowToStep", "text": "Spaghetti al dente kochen und servieren." }
            ]
          }
          </script>
        </head>
        <body>
          <h1>Klassische Spaghetti Bolognese</h1>
        </body>
        </html>
      `;

      const recipe = await scrapeRecipeFromHtml(html, 'https://example.com/rezept');
      expect(recipe.title).toBe('Klassische Spaghetti Bolognese');
      expect(recipe.prepTimeMinutes).toBe(15);
      expect(recipe.cookTimeMinutes).toBe(30);
      expect(recipe.servings).toBe(4);
      expect(recipe.photoUrl).toBe('https://example.com/bolognese.jpg');
      expect(recipe.categories).toEqual(['Pasta', 'Italienisch']);
      expect(recipe.ingredients.length).toBe(7);

      const spaghetti = recipe.ingredients.find((i) => i.canonicalId === 'spaghetti');
      expect(spaghetti).toBeDefined();
      expect(spaghetti?.amount).toBe(500);
      expect(spaghetti?.unit).toBe('g');

      const oliveOil = recipe.ingredients.find((i) => i.canonicalId === 'olivenoel');
      expect(oliveOil).toBeDefined();
      expect(oliveOil?.isStaple).toBe(true);

      expect(recipe.instructions.length).toBe(4);
      expect(RecipeSchema.parse(recipe)).toBeDefined();
    });

    it('falls back to heuristic HTML parser when no JSON-LD is available', async () => {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta property="og:title" content="Schneller Tomatensalat" />
          <meta property="og:image" content="https://example.com/salad.jpg" />
        </head>
        <body>
          <h1>Schneller Tomatensalat</h1>
          <div class="recipe-ingredients">
            <ul>
              <li>500 g Strauchtomaten</li>
              <li>1 rote Zwiebel</li>
              <li>2 EL Olivenöl</li>
              <li>1 Prise Salz</li>
            </ul>
          </div>
          <div class="recipe-instructions">
            <ol>
              <li>Tomaten in Scheiben schneiden.</li>
              <li>Zwiebel in feine Ringe schneiden.</li>
              <li>Mit Olivenöl und Salz anmachen.</li>
            </ol>
          </div>
        </body>
        </html>
      `;

      const recipe = await scrapeRecipeFromHtml(html, 'https://example.com/salad');
      expect(recipe.title).toBe('Schneller Tomatensalat');
      expect(recipe.photoUrl).toBe('https://example.com/salad.jpg');
      expect(recipe.ingredients.length).toBe(4);
      expect(recipe.instructions.length).toBe(3);
      expect(RecipeSchema.parse(recipe)).toBeDefined();
    });
  });

  describe('POST /api/recipes/scrape Route', () => {
    it('returns 400 when url is missing or invalid', async () => {
      const app = createApp();

      const res1 = await createTestClient(app).post('/api/recipes/scrape', {});
      expect(res1.status).toBe(400);

      const res2 = await createTestClient(app).post('/api/recipes/scrape', { url: 'not-a-valid-url' });
      expect(res2.status).toBe(400);
    });

    it('scrapes valid recipe and returns 200 with Recipe schema', async () => {
      const mockHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <script type="application/ld+json">
          {
            "@context": "https://schema.org",
            "@type": "Recipe",
            "name": "Schnelle Pfanne",
            "prepTime": "PT10M",
            "cookTime": "PT10M",
            "recipeYield": "2 Portionen",
            "recipeIngredient": ["200 g Tofu", "1 EL Sojasauce"],
            "recipeInstructions": ["Tofu anbraten", "Mit Sojasauce ablöschen"]
          }
          </script>
        </head>
        </html>
      `;

      // Mock global fetch for this test
      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => mockHtml,
      } as unknown as Response);

      const app = createApp();
      const res = await createTestClient(app).post('/api/recipes/scrape', { url: 'https://example.com/schnelle-pfanne' });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Schnelle Pfanne');
      expect(res.body.servings).toBe(2);
      expect(res.body.ingredients.length).toBe(2);
      expect(RecipeSchema.parse(res.body)).toBeDefined();

      globalThis.fetch = originalFetch;
    });
  });
});
