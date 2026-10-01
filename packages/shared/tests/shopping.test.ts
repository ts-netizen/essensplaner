import { describe, it, expect } from 'vitest';
import {
  generateShoppingListFromMealPlan,
  groupShoppingListByCategory,
  normalizeUnit,
  isPantryStaple,
  filterPantryStaples,
  ShoppingListItemSchema,
  type Recipe,
  type MealPlan,
  type ShoppingListItem,
  type Ingredient,
} from '../index.js';

function createMockRecipe(
  id: string,
  title: string,
  ingredients: Ingredient[],
): Recipe {
  return {
    id,
    title,
    prepTimeMinutes: 15,
    cookTimeMinutes: 15,
    servings: 4,
    isLunch: true,
    isDinner: true,
    categories: ['Alltag'],
    visibility: 'private',
    ingredients,
    instructions: [],
  };
}

describe('Shopping Module: Unit Normalization & Pantry Filter', () => {
  it('normalizes compatible units and scales correctly', () => {
    expect(normalizeUnit('g')).toEqual({ baseUnit: 'g', factor: 1 });
    expect(normalizeUnit('kg')).toEqual({ baseUnit: 'g', factor: 1000 });
    expect(normalizeUnit('ml')).toEqual({ baseUnit: 'ml', factor: 1 });
    expect(normalizeUnit('l')).toEqual({ baseUnit: 'ml', factor: 1000 });
    expect(normalizeUnit('stk')).toEqual({ baseUnit: 'Stück', factor: 1 });
    expect(normalizeUnit('EL')).toEqual({ baseUnit: 'EL', factor: 1 });
    expect(normalizeUnit('Dosen')).toEqual({ baseUnit: 'Dose', factor: 1 });
  });

  it('identifies pantry staples by flag and by household pantry list', () => {
    const pantryStaples = ['salz', 'pfeffer', 'olivenöl'];

    // By flag
    expect(
      isPantryStaple(
        { canonicalId: 'oregano', displayName: 'Oregano', isStaple: true },
        pantryStaples,
      ),
    ).toBe(true);

    // By canonicalId in pantry list
    expect(
      isPantryStaple(
        { canonicalId: 'salz', displayName: 'Meersalz', isStaple: false },
        pantryStaples,
      ),
    ).toBe(true);

    // By displayName in pantry list (case-insensitive)
    expect(
      isPantryStaple(
        { canonicalId: 'black_pepper', displayName: 'Pfeffer', isStaple: false },
        pantryStaples,
      ),
    ).toBe(true);

    // Not a staple
    expect(
      isPantryStaple(
        { canonicalId: 'pasta_penne', displayName: 'Penne Rigate', isStaple: false },
        pantryStaples,
      ),
    ).toBe(false);
  });

  it('filters pantry staples from ingredient lists', () => {
    const ingredients: Ingredient[] = [
      { canonicalId: 'salt', displayName: 'Salz', amount: 1, unit: 'TL', category: 'Gewürze & Öle', isStaple: true },
      { canonicalId: 'tomato', displayName: 'Tomaten', amount: 500, unit: 'g', category: 'Obst & Gemüse', isStaple: false },
    ];
    const filtered = filterPantryStaples(ingredients, []);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].canonicalId).toBe('tomato');
  });
});

describe('Shopping Module: generateShoppingListFromMealPlan', () => {
  const recipePasta = createMockRecipe('rec_pasta', 'Penne Bolognese', [
    {
      canonicalId: 'penne',
      displayName: 'Penne',
      amount: 250,
      unit: 'g',
      category: 'Trockenwaren & Getreide',
      isStaple: false,
    },
    {
      canonicalId: 'hackfleisch',
      displayName: 'Hackfleisch',
      amount: 400,
      unit: 'g',
      category: 'Fleisch & Fisch',
      isStaple: false,
    },
    {
      canonicalId: 'salz',
      displayName: 'Salz',
      amount: 1,
      unit: 'TL',
      category: 'Gewürze & Öle',
      isStaple: true, // staple by flag
    },
    {
      canonicalId: 'olivenoel',
      displayName: 'Olivenöl',
      amount: 2,
      unit: 'EL',
      category: 'Gewürze & Öle',
      isStaple: false, // will be matched via household pantryStaples
    },
  ]);

  const recipeSalad = createMockRecipe('rec_salad', 'Gemischter Salat', [
    {
      canonicalId: 'penne',
      displayName: 'Penne',
      amount: 150,
      unit: 'g',
      category: 'Trockenwaren & Getreide',
      isStaple: false,
    },
    {
      canonicalId: 'tomaten',
      displayName: 'Tomaten',
      amount: 3,
      unit: 'Stück',
      category: 'Obst & Gemüse',
      isStaple: false,
    },
  ]);

  const mockMealPlan: MealPlan = {
    weekId: '2026-W40',
    days: {
      monday: {
        lunch: null,
        dinner: { recipeId: 'rec_pasta', title: 'Penne Bolognese', isLocked: false },
      },
      tuesday: {
        lunch: { recipeId: 'rec_salad', title: 'Gemischter Salat', isLocked: false },
        dinner: null,
      },
      wednesday: { lunch: null, dinner: null },
      thursday: { lunch: null, dinner: null },
      friday: { lunch: null, dinner: null },
      saturday: { lunch: null, dinner: null },
      sunday: { lunch: null, dinner: null },
    },
    updatedAt: '2026-09-28T10:00:00Z',
  };

  it('consolidates quantities for identical ingredients with compatible units', () => {
    const list = generateShoppingListFromMealPlan(
      mockMealPlan,
      [recipePasta, recipeSalad],
      [],
      [],
    );

    // Penne: 250g (Pasta) + 150g (Salad) = 400g
    const penneItem = list.find((item) => item.canonicalId === 'penne');
    expect(penneItem).toBeDefined();
    expect(penneItem?.amount).toBe(400);
    expect(penneItem?.unit).toBe('g');
    expect(penneItem?.linkedRecipeId).toContain('rec_pasta');
    expect(penneItem?.linkedRecipeId).toContain('rec_salad');
  });

  it('converts units when aggregating (e.g. kg to g)', () => {
    const recipeWithKg = createMockRecipe('rec_kg', 'Große Pasta', [
      {
        canonicalId: 'penne',
        displayName: 'Penne',
        amount: 0.5, // 0.5 kg = 500 g
        unit: 'kg',
        category: 'Trockenwaren & Getreide',
        isStaple: false,
      },
    ]);

    const plan: MealPlan = {
      weekId: '2026-W40',
      days: {
        monday: { lunch: null, dinner: { recipeId: 'rec_pasta', title: 'Penne Bolognese', isLocked: false } },
        tuesday: { lunch: null, dinner: { recipeId: 'rec_kg', title: 'Große Pasta', isLocked: false } },
        wednesday: { lunch: null, dinner: null },
        thursday: { lunch: null, dinner: null },
        friday: { lunch: null, dinner: null },
        saturday: { lunch: null, dinner: null },
        sunday: { lunch: null, dinner: null },
      },
      updatedAt: '2026-09-28T10:00:00Z',
    };

    const list = generateShoppingListFromMealPlan(plan, [recipePasta, recipeWithKg]);
    const penneItem = list.find((item) => item.canonicalId === 'penne');
    // 250g + 500g = 750g
    expect(penneItem?.amount).toBe(750);
    expect(penneItem?.unit).toBe('g');
  });

  it('excludes pantry staples ("Never Out of Stock") by default', () => {
    const householdPantry = ['olivenoel'];

    const list = generateShoppingListFromMealPlan(
      mockMealPlan,
      [recipePasta, recipeSalad],
      householdPantry,
    );

    // Salz has isStaple: true -> excluded
    const saltItem = list.find((item) => item.canonicalId === 'salz');
    expect(saltItem).toBeUndefined();

    // Olivenöl is in householdPantry -> excluded
    const oilItem = list.find((item) => item.canonicalId === 'olivenoel');
    expect(oilItem).toBeUndefined();
  });

  it('includes pantry staples when excludeStaples is false', () => {
    const householdPantry = ['olivenoel'];

    const list = generateShoppingListFromMealPlan(
      mockMealPlan,
      [recipePasta, recipeSalad],
      householdPantry,
      [],
      { excludeStaples: false },
    );

    const saltItem = list.find((item) => item.canonicalId === 'salz');
    expect(saltItem).toBeDefined();

    const oilItem = list.find((item) => item.canonicalId === 'olivenoel');
    expect(oilItem).toBeDefined();
  });

  it('preserves existing manual items (Dual-Source)', () => {
    const existingList: ShoppingListItem[] = [
      {
        id: 'manual_kaffee',
        canonicalId: 'kaffee',
        name: 'Bio-Espressobohnen',
        amount: 1,
        unit: 'Packung',
        category: 'Trockenwaren & Getreide',
        checked: false,
        source: 'manual',
        addedBy: 'user_123',
        createdAt: '2026-09-25T10:00:00Z',
        updatedAt: '2026-09-25T10:00:00Z',
      },
    ];

    const list = generateShoppingListFromMealPlan(
      mockMealPlan,
      [recipePasta, recipeSalad],
      [],
      existingList,
    );

    const kaffeeItem = list.find((item) => item.id === 'manual_kaffee');
    expect(kaffeeItem).toBeDefined();
    expect(kaffeeItem?.source).toBe('manual');
    expect(kaffeeItem?.name).toBe('Bio-Espressobohnen');
    expect(kaffeeItem?.addedBy).toBe('user_123');
  });

  it('preserves checked state and id of previously checked plan items', () => {
    const existingList: ShoppingListItem[] = [
      {
        id: 'existing_penne_id',
        canonicalId: 'penne',
        name: 'Penne',
        amount: 250,
        unit: 'g',
        category: 'Trockenwaren & Getreide',
        checked: true, // Already checked off in the store!
        source: 'plan',
        addedBy: 'system',
        createdAt: '2026-09-27T10:00:00Z',
        updatedAt: '2026-09-27T10:00:00Z',
      },
    ];

    const list = generateShoppingListFromMealPlan(
      mockMealPlan,
      [recipePasta, recipeSalad],
      [],
      existingList,
    );

    const penneItem = list.find((item) => item.canonicalId === 'penne');
    expect(penneItem).toBeDefined();
    expect(penneItem?.id).toBe('existing_penne_id');
    expect(penneItem?.checked).toBe(true); // Checked state preserved!
    expect(penneItem?.amount).toBe(400); // Amount updated to current plan
  });

  it('sorts shopping list according to supermarket walking route categories', () => {
    const list = generateShoppingListFromMealPlan(
      mockMealPlan,
      [recipePasta, recipeSalad],
      [],
      [],
    );

    // Categories in order: Obst & Gemüse (Tomaten) -> Fleisch & Fisch (Hackfleisch) -> Trockenwaren & Getreide (Penne)
    const tomatoIndex = list.findIndex((item) => item.canonicalId === 'tomaten');
    const meatIndex = list.findIndex((item) => item.canonicalId === 'hackfleisch');
    const pastaIndex = list.findIndex((item) => item.canonicalId === 'penne');

    expect(tomatoIndex).toBeLessThan(meatIndex);
    expect(meatIndex).toBeLessThan(pastaIndex);
  });

  it('validates every generated item against ShoppingListItemSchema', () => {
    const list = generateShoppingListFromMealPlan(
      mockMealPlan,
      [recipePasta, recipeSalad],
      [],
      [],
    );

    for (const item of list) {
      const parsed = ShoppingListItemSchema.safeParse(item);
      expect(parsed.success).toBe(true);
    }
  });

  it('groups shopping list items by category for UI view', () => {
    const list = generateShoppingListFromMealPlan(
      mockMealPlan,
      [recipePasta, recipeSalad],
      [],
      [],
    );

    const grouped = groupShoppingListByCategory(list);

    expect(grouped['Obst & Gemüse']).toBeDefined();
    expect(grouped['Obst & Gemüse'].some((i) => i.canonicalId === 'tomaten')).toBe(true);

    expect(grouped['Fleisch & Fisch']).toBeDefined();
    expect(grouped['Fleisch & Fisch'].some((i) => i.canonicalId === 'hackfleisch')).toBe(true);
  });
});
