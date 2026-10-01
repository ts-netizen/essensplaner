import { describe, it, expect } from 'vitest';
import { createTestClient } from './testClient.js';
import { createApp } from '../src/app.js';
import { getNutritionKnowledge } from '../src/services/nutrition.js';
import { IngredientsKnowledgeSchema } from '@essensplaner/shared';

describe('Nutrition Service & Route Tests', () => {
  describe('getNutritionKnowledge Service', () => {
    it('returns curated physiological data for known ingredients like knoblauch', async () => {
      const data = await getNutritionKnowledge('knoblauch');

      expect(data.canonicalId).toBe('knoblauch');
      expect(data.name).toBe('Knoblauch');
      expect(data.healthBenefits).toContain('Allicin');
      expect(data.vitaminsAndMinerals).toContain('Vitamin C');
      expect(data.disclaimer).toBe(
        'Kein medizinischer Ratschlag. Die Angaben dienen ausschließlich der allgemeinen Information.',
      );
      expect(IngredientsKnowledgeSchema.parse(data)).toBeDefined();
    });

    it('returns curated data for spinat and lachs', async () => {
      const spinach = await getNutritionKnowledge('spinat');
      expect(spinach.name).toBe('Spinat');
      expect(spinach.vitaminsAndMinerals).toContain('Eisen');
      expect(IngredientsKnowledgeSchema.parse(spinach)).toBeDefined();

      const salmon = await getNutritionKnowledge('lachs');
      expect(salmon.name).toBe('Lachs');
      expect(salmon.healthBenefits).toContain('Omega-3');
      expect(IngredientsKnowledgeSchema.parse(salmon)).toBeDefined();
    });

    it('generates heuristic profile with legal disclaimer for novel ingredient', async () => {
      const novel = await getNutritionKnowledge('exotische-dragonfruit');
      expect(novel.canonicalId).toBe('exotische-dragonfruit');
      expect(novel.healthBenefits.length).toBeGreaterThan(10);
      expect(novel.disclaimer).toBe(
        'Kein medizinischer Ratschlag. Die Angaben dienen ausschließlich der allgemeinen Information.',
      );
      expect(IngredientsKnowledgeSchema.parse(novel)).toBeDefined();
    });

    it('caches knowledge in-memory on subsequent calls', async () => {
      const first = await getNutritionKnowledge('avocado');
      const second = await getNutritionKnowledge('avocado');
      expect(first).toBe(second); // same object reference from cache
    });
  });

  describe('GET /api/nutrition/:id Route', () => {
    it('returns 200 with IngredientsKnowledge for valid ingredient', async () => {
      const app = createApp();
      const res = await createTestClient(app).get('/api/nutrition/haferflocken');

      expect(res.status).toBe(200);
      expect(res.body.canonicalId).toBe('haferflocken');
      expect(res.body.healthBenefits).toBeDefined();
      expect(Array.isArray(res.body.vitaminsAndMinerals)).toBe(true);
      expect(res.body.disclaimer).toContain('Kein medizinischer Ratschlag');
      expect(IngredientsKnowledgeSchema.parse(res.body)).toBeDefined();
    });

    it('handles umlauts in parameter e.g. olivenöl', async () => {
      const app = createApp();
      const res = await createTestClient(app).get(
        `/api/nutrition/${encodeURIComponent('olivenöl')}`,
      );

      expect(res.status).toBe(200);
      expect(res.body.canonicalId).toBe('olivenoel');
      expect(IngredientsKnowledgeSchema.parse(res.body)).toBeDefined();
    });
  });
});
