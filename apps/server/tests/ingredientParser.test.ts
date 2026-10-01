import { describe, it, expect } from 'vitest';
import {
  parseAmount,
  generateCanonicalId,
  checkIsStaple,
  detectCategory,
  parseIngredientString,
  enrichIngredient,
} from '../src/services/ingredientParser.js';

describe('Ingredient Parser Unit Tests', () => {
  describe('parseAmount', () => {
    it('parses integers and decimals', () => {
      expect(parseAmount('500')).toBe(500);
      expect(parseAmount('1.5')).toBe(1.5);
      expect(parseAmount('2,5')).toBe(2.5);
    });

    it('parses unicode fractions', () => {
      expect(parseAmount('½')).toBe(0.5);
      expect(parseAmount('¼')).toBe(0.25);
      expect(parseAmount('¾')).toBe(0.75);
      expect(parseAmount('1 ½')).toBe(1.5);
    });

    it('parses text fractions', () => {
      expect(parseAmount('1/2')).toBe(0.5);
      expect(parseAmount('1 1/2')).toBe(1.5);
    });

    it('handles ranges by averaging', () => {
      expect(parseAmount('1-2')).toBe(1.5);
      expect(parseAmount('2 - 4')).toBe(3);
    });
  });

  describe('generateCanonicalId', () => {
    it('generates normalized lowercase slug with umlaut expansion', () => {
      expect(generateCanonicalId('Olivenöl')).toBe('olivenoel');
      expect(generateCanonicalId('Frische Tomaten')).toBe('frische-tomaten');
      expect(generateCanonicalId('Süßkartoffel')).toBe('suesskartoffel');
      expect(generateCanonicalId('Hähnchenbrust-Filet')).toBe('haehnchenbrust-filet');
    });
  });

  describe('checkIsStaple', () => {
    it('detects common staples correctly', () => {
      expect(checkIsStaple('Salz')).toBe(true);
      expect(checkIsStaple('Schwarzer Pfeffer')).toBe(true);
      expect(checkIsStaple('Olivenöl')).toBe(true);
      expect(checkIsStaple('Weizenmehl')).toBe(true);
      expect(checkIsStaple('Zucker')).toBe(true);
      expect(checkIsStaple('Lachsfilet')).toBe(false);
      expect(checkIsStaple('Brokkoli')).toBe(false);
    });
  });

  describe('detectCategory', () => {
    it('classifies ingredients into standard categories', () => {
      expect(detectCategory('Tomaten')).toBe('Obst & Gemüse');
      expect(detectCategory('Knoblauch')).toBe('Obst & Gemüse');
      expect(detectCategory('Parmesan')).toBe('Kühlung & Milchprodukte');
      expect(detectCategory('Butter')).toBe('Kühlung & Milchprodukte');
      expect(detectCategory('Rinderhackfleisch')).toBe('Fleisch & Fisch');
      expect(detectCategory('Lachs')).toBe('Fleisch & Fisch');
      expect(detectCategory('Spaghetti')).toBe('Trockenwaren & Getreide');
      expect(detectCategory('Basmati Reis')).toBe('Trockenwaren & Getreide');
      expect(detectCategory('Olivenöl')).toBe('Gewürze & Öle');
      expect(detectCategory('Salz')).toBe('Gewürze & Öle');
      expect(detectCategory('Gehackte Tomaten in der Dose')).toBe('Konserven & Fertigprodukte');
      expect(detectCategory('TK-Erbsen')).toBe('Tiefkühl');
    });
  });

  describe('parseIngredientString', () => {
    it('parses standard quantity, unit and name', () => {
      const res = parseIngredientString('500 g Spaghetti');
      expect(res.amount).toBe(500);
      expect(res.unit).toBe('g');
      expect(res.displayName).toBe('Spaghetti');
      expect(res.canonicalId).toBe('spaghetti');
      expect(res.category).toBe('Trockenwaren & Getreide');
      expect(res.isStaple).toBe(false);
    });

    it('parses tablespoons and identifies staple', () => {
      const res = parseIngredientString('2 EL Olivenöl');
      expect(res.amount).toBe(2);
      expect(res.unit).toBe('EL');
      expect(res.displayName).toBe('Olivenöl');
      expect(res.isStaple).toBe(true);
      expect(res.category).toBe('Gewürze & Öle');
    });

    it('parses pinch and garlic cloves', () => {
      const pinch = parseIngredientString('1 Prise Salz');
      expect(pinch.amount).toBe(1);
      expect(pinch.unit).toBe('Prise(n)');
      expect(pinch.displayName).toBe('Salz');
      expect(pinch.isStaple).toBe(true);

      const garlic = parseIngredientString('2 Zehen Knoblauch');
      expect(garlic.amount).toBe(2);
      expect(garlic.unit).toBe('Zehe(n)');
      expect(garlic.displayName).toBe('Knoblauch');
      expect(garlic.category).toBe('Obst & Gemüse');
    });

    it('handles items without explicit unit like 2 Zwiebeln', () => {
      const onions = parseIngredientString('2 Zwiebeln');
      expect(onions.amount).toBe(2);
      expect(onions.unit).toBe('Stk.');
      expect(onions.displayName).toBe('Zwiebeln');
    });
  });

  describe('enrichIngredient', () => {
    it('fills in missing attributes with defaults and canonical id', () => {
      const ing = enrichIngredient({
        displayName: 'Bio-Spinat',
        amount: 200,
        unit: 'g',
      });
      expect(ing.canonicalId).toBe('bio-spinat');
      expect(ing.category).toBe('Obst & Gemüse');
      expect(ing.isStaple).toBe(false);
    });
  });
});
