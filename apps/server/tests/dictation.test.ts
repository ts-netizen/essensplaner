import { describe, it, expect } from 'vitest';
import { createTestClient } from './testClient.js';
import { createApp } from '../src/app.js';
import {
  parseDictation,
  parseDictationHeuristically,
} from '../src/services/dictation.js';
import { RecipeSchema } from '@essensplaner/shared';

describe('Dictation Service & Route Tests', () => {
  const sampleVoiceMemo = `
    Wir kochen heute Spaghetti Bolognese für 4 Personen.
    Dafür brauchen wir 500 Gramm Rinderhackfleisch, 1 Zwiebel, 2 Knoblauchzehen, 2 Dosen gehackte Tomaten, 2 Esslöffel Olivenöl und 400 Gramm Spaghetti.
    Zubereitung:
    Zuerst die Zwiebel und Knoblauch fein hacken.
    Dann im Olivenöl anbraten.
    Das Hackfleisch dazugeben und krümelig anbraten.
    Die Tomaten dazugeben und 20 Minuten köcheln lassen.
    Spaghetti kochen und mit Salz abschmecken.
  `;

  describe('parseDictationHeuristically', () => {
    it('accurately parses title, servings, times, ingredients and instructions', () => {
      const recipe = parseDictationHeuristically(sampleVoiceMemo);

      expect(recipe.title).toContain('Spaghetti Bolognese');
      expect(recipe.servings).toBe(4);
      expect(recipe.cookTimeMinutes).toBe(20);
      expect(recipe.ingredients.length).toBeGreaterThanOrEqual(4);

      // Check ingredient properties
      const meat = recipe.ingredients.find((i) => i.canonicalId.includes('hackfleisch'));
      expect(meat).toBeDefined();
      expect(meat?.amount).toBe(500);
      expect(meat?.unit).toBe('g');

      const tomatoes = recipe.ingredients.find((i) => i.canonicalId.includes('tomaten'));
      expect(tomatoes).toBeDefined();
      expect(tomatoes?.amount).toBe(2);
      expect(tomatoes?.unit).toBe('Dose(n)');

      // Check instructions
      expect(recipe.instructions.length).toBeGreaterThanOrEqual(3);
      expect(recipe.instructions[0]).toMatch(/^Schritt 1:/);

      expect(RecipeSchema.parse(recipe)).toBeDefined();
    });

    it('handles short or casual dictations gracefully', () => {
      const casualText = 'Rezept für Rührei mit Schnittlauch. 3 Eier, 1 EL Butter und etwas Schnittlauch. In der Pfanne stocken lassen.';
      const recipe = parseDictationHeuristically(casualText);

      expect(recipe.title).toContain('Rührei');
      expect(recipe.ingredients.length).toBeGreaterThanOrEqual(2);
      expect(recipe.instructions.length).toBeGreaterThanOrEqual(1);
      expect(RecipeSchema.parse(recipe)).toBeDefined();
    });
  });

  describe('parseDictation main entrypoint', () => {
    it('throws error on empty string', async () => {
      await expect(parseDictation('')).rejects.toThrow();
      await expect(parseDictation('   ')).rejects.toThrow();
    });

    it('returns a valid Recipe object', async () => {
      const recipe = await parseDictation(sampleVoiceMemo);
      expect(recipe.title).toBeDefined();
      expect(RecipeSchema.parse(recipe)).toBeDefined();
    });
  });

  describe('POST /api/recipes/parse-dictation Route', () => {
    it('returns 400 when rawText is missing or empty', async () => {
      const app = createApp();
      const res = await createTestClient(app).post('/api/recipes/parse-dictation', {});

      expect(res.status).toBe(400);
    });

    it('returns 200 with Recipe schema on valid rawText', async () => {
      const app = createApp();
      const res = await createTestClient(app).post(
        '/api/recipes/parse-dictation',
        { rawText: sampleVoiceMemo },
      );

      expect(res.status).toBe(200);
      expect(res.body.title).toContain('Spaghetti Bolognese');
      expect(res.body.servings).toBe(4);
      expect(Array.isArray(res.body.ingredients)).toBe(true);
      expect(Array.isArray(res.body.instructions)).toBe(true);
      expect(RecipeSchema.parse(res.body)).toBeDefined();
    });
  });
});
