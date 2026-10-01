import { describe, it, expect } from 'vitest';
import {
  generateWeeklyMealPlan,
  shuffleSingleSlot,
  getISOWeekId,
  getDateFromWeekId,
  isWithinCooldown,
  hasCategoryOverlap,
  type Recipe,
  type MealPlan,
} from '../index.js';

// Helper function to create mock recipes
function createMockRecipe(partial: Partial<Recipe> & { id: string; title: string }): Recipe {
  return {
    sourceUrl: '',
    prepTimeMinutes: 15,
    cookTimeMinutes: 15,
    servings: 4,
    isLunch: false,
    isDinner: true,
    categories: ['Alltag'],
    visibility: 'private',
    ingredients: [],
    instructions: [],
    ...partial,
  };
}

describe('Planner Module: Helper Functions', () => {
  it('calculates correct ISO week IDs', () => {
    // 2026-10-01 is Thursday in week 40 of 2026
    const date = new Date(Date.UTC(2026, 9, 1));
    expect(getISOWeekId(date)).toBe('2026-W40');

    // 2026-01-01 is Thursday in week 1 of 2026
    const dateJan = new Date(Date.UTC(2026, 0, 1));
    expect(getISOWeekId(dateJan)).toBe('2026-W01');
  });

  it('calculates Monday date from ISO week ID', () => {
    const monday = getDateFromWeekId('2026-W40');
    // Monday of 2026-W40 is 2026-09-28
    expect(monday.getUTCFullYear()).toBe(2026);
    expect(monday.getUTCMonth()).toBe(8); // September (0-indexed)
    expect(monday.getUTCDate()).toBe(28);
  });

  it('detects 7-day cooldown properly', () => {
    const targetDate = new Date('2026-10-01T12:00:00Z');

    // Cooked 3 days ago -> on cooldown
    expect(isWithinCooldown('2026-09-28T12:00:00Z', targetDate, 7)).toBe(true);

    // Cooked 8 days ago -> NOT on cooldown
    expect(isWithinCooldown('2026-09-23T12:00:00Z', targetDate, 7)).toBe(false);

    // No lastCookedAt -> NOT on cooldown
    expect(isWithinCooldown(null, targetDate, 7)).toBe(false);
    expect(isWithinCooldown(undefined, targetDate, 7)).toBe(false);
  });

  it('detects category overlap case-insensitively', () => {
    expect(hasCategoryOverlap(['Pasta', 'Italienisch'], ['pasta'])).toBe(true);
    expect(hasCategoryOverlap(['Salat'], ['Auflauf', 'Suppe'])).toBe(false);
    expect(hasCategoryOverlap([], ['Pasta'])).toBe(false);
  });
});

describe('Planner Module: generateWeeklyMealPlan', () => {
  const recipesPool: Recipe[] = [
    createMockRecipe({
      id: 'rec_pasta_1',
      title: 'Spaghetti Carbonara',
      categories: ['Pasta'],
      isDinner: true,
      isLunch: false,
    }),
    createMockRecipe({
      id: 'rec_pasta_2',
      title: 'Penne Arrabiata',
      categories: ['Pasta'],
      isDinner: true,
      isLunch: false,
    }),
    createMockRecipe({
      id: 'rec_curry_1',
      title: 'Kichererbsen-Curry',
      categories: ['Curry'],
      isDinner: true,
      isLunch: false,
    }),
    createMockRecipe({
      id: 'rec_burger_1',
      title: 'Veggie Burger',
      categories: ['Burger'],
      isDinner: true,
      isLunch: false,
    }),
    createMockRecipe({
      id: 'rec_soup_1',
      title: 'Kürbissuppe',
      categories: ['Suppe'],
      isDinner: true,
      isLunch: true,
      prepTimeMinutes: 10,
      cookTimeMinutes: 15, // 25 min total -> quick lunch
    }),
    createMockRecipe({
      id: 'rec_bowl_1',
      title: 'Quinoa Bowl',
      categories: ['Bowl'],
      isDinner: true,
      isLunch: true,
      prepTimeMinutes: 10,
      cookTimeMinutes: 10, // 20 min total -> quick lunch
    }),
    createMockRecipe({
      id: 'rec_pizza_1',
      title: 'Pizza Margherita',
      categories: ['Pizza'],
      isDinner: true,
      isLunch: false,
    }),
    createMockRecipe({
      id: 'rec_slow_lunch',
      title: 'Sonntagsbraten Lunch',
      categories: ['Braten'],
      isDinner: false,
      isLunch: true,
      prepTimeMinutes: 30,
      cookTimeMinutes: 45, // 75 min total -> slow
    }),
  ];

  it('generates a complete 7-day dinner plan without errors', () => {
    const plan = generateWeeklyMealPlan(recipesPool, null, {
      weekId: '2026-W40',
      enabledSlots: { lunch: false, dinner: true },
    });

    expect(plan.weekId).toBe('2026-W40');
    expect(plan.days.monday.dinner).not.toBeNull();
    expect(plan.days.tuesday.dinner).not.toBeNull();
    expect(plan.days.wednesday.dinner).not.toBeNull();
    expect(plan.days.thursday.dinner).not.toBeNull();
    expect(plan.days.friday.dinner).not.toBeNull();
    expect(plan.days.saturday.dinner).not.toBeNull();
    expect(plan.days.sunday.dinner).not.toBeNull();

    // Lunch slots should be null since enabledSlots.lunch is false
    expect(plan.days.monday.lunch).toBeNull();
  });

  it('respects 7-day cooldown for recently cooked recipes', () => {
    const refDate = new Date('2026-09-28T12:00:00Z'); // Monday of W40

    // Mark rec_pasta_1 as cooked 2 days before Monday
    const poolWithCooldown: Recipe[] = [
      createMockRecipe({
        id: 'rec_pasta_1',
        title: 'Spaghetti Carbonara',
        categories: ['Pasta'],
        isDinner: true,
        lastCookedAt: '2026-09-26T18:00:00Z', // 2 days ago
      }),
      createMockRecipe({
        id: 'rec_curry_1',
        title: 'Kichererbsen-Curry',
        categories: ['Curry'],
        isDinner: true,
        lastCookedAt: '2026-09-10T18:00:00Z', // 18 days ago (cooldown expired)
      }),
      createMockRecipe({
        id: 'rec_burger_1',
        title: 'Veggie Burger',
        categories: ['Burger'],
        isDinner: true,
      }),
    ];

    // If we plan just Monday, rec_pasta_1 must not be selected if alternatives are available
    const plan = generateWeeklyMealPlan(poolWithCooldown, null, {
      weekId: '2026-W40',
      referenceDate: refDate,
      enabledSlots: { lunch: false, dinner: true },
    });

    expect(plan.days.monday.dinner?.recipeId).not.toBe('rec_pasta_1');
  });

  it('preserves locked slots (Pinning/Locking protection) during re-roll', () => {
    const initialPlan: MealPlan = {
      weekId: '2026-W40',
      days: {
        monday: {
          lunch: null,
          dinner: {
            recipeId: 'rec_locked_custom',
            title: 'Fest verplantes Rezept',
            isLocked: true,
          },
        },
        tuesday: {
          lunch: null,
          dinner: {
            recipeId: 'rec_old_unlocked',
            title: 'Altes Rezept',
            isLocked: false,
          },
        },
        wednesday: { lunch: null, dinner: null },
        thursday: { lunch: null, dinner: null },
        friday: { lunch: null, dinner: null },
        saturday: { lunch: null, dinner: null },
        sunday: { lunch: null, dinner: null },
      },
      updatedAt: '2026-09-20T00:00:00Z',
    };

    const newPlan = generateWeeklyMealPlan(recipesPool, initialPlan, {
      weekId: '2026-W40',
      enabledSlots: { lunch: false, dinner: true },
    });

    // Monday dinner MUST remain identical and locked
    expect(newPlan.days.monday.dinner?.recipeId).toBe('rec_locked_custom');
    expect(newPlan.days.monday.dinner?.title).toBe('Fest verplantes Rezept');
    expect(newPlan.days.monday.dinner?.isLocked).toBe(true);

    // Tuesday dinner was unlocked and should have been re-rolled
    expect(newPlan.days.tuesday.dinner).not.toBeNull();
    expect(newPlan.days.tuesday.dinner?.isLocked).toBe(false);
  });

  it('enforces diversity protection (no consecutive identical categories)', () => {
    // Only two pasta recipes and one curry recipe
    const pool = [
      createMockRecipe({
        id: 'p1',
        title: 'Pasta 1',
        categories: ['Pasta'],
        isDinner: true,
      }),
      createMockRecipe({
        id: 'p2',
        title: 'Pasta 2',
        categories: ['Pasta'],
        isDinner: true,
      }),
      createMockRecipe({
        id: 'c1',
        title: 'Curry 1',
        categories: ['Curry'],
        isDinner: true,
      }),
      createMockRecipe({
        id: 'b1',
        title: 'Burger 1',
        categories: ['Burger'],
        isDinner: true,
      }),
      createMockRecipe({
        id: 's1',
        title: 'Suppe 1',
        categories: ['Suppe'],
        isDinner: true,
      }),
    ];

    const plan = generateWeeklyMealPlan(pool, null, {
      weekId: '2026-W40',
      enabledSlots: { lunch: false, dinner: true },
    });

    const recipeMap = new Map(pool.map((r) => [r.id, r]));
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

    for (let i = 1; i < days.length; i++) {
      const prevRecipeId = plan.days[days[i - 1]].dinner?.recipeId;
      const currRecipeId = plan.days[days[i]].dinner?.recipeId;

      if (prevRecipeId && currRecipeId) {
        const prevRec = recipeMap.get(prevRecipeId);
        const currRec = recipeMap.get(currRecipeId);
        if (prevRec && currRec) {
          const overlap = hasCategoryOverlap(prevRec.categories, currRec.categories);
          // With 5 recipes of distinct categories for 5 slots, no two adjacent days should share category
          if (i < 4) {
            expect(overlap).toBe(false);
          }
        }
      }
    }
  });

  it('enforces lunch slot suitability and weekday maxPrepTimeLunchMinutes', () => {
    const pool = [
      createMockRecipe({
        id: 'quick_lunch_1',
        title: 'Schneller Salat',
        isLunch: true,
        isDinner: false,
        prepTimeMinutes: 10,
        cookTimeMinutes: 10, // 20 min <= 30 min
        categories: ['Salat'],
      }),
      createMockRecipe({
        id: 'slow_lunch_1',
        title: 'Langsamer Schmorbraten',
        isLunch: true,
        isDinner: false,
        prepTimeMinutes: 30,
        cookTimeMinutes: 60, // 90 min > 30 min
        categories: ['Braten'],
      }),
      createMockRecipe({
        id: 'dinner_only',
        title: 'Abend-Lasagne',
        isLunch: false,
        isDinner: true,
        categories: ['Pasta'],
      }),
    ];

    const plan = generateWeeklyMealPlan(pool, null, {
      weekId: '2026-W40',
      enabledSlots: { lunch: true, dinner: true },
      maxPrepTimeLunchMinutes: 30,
    });

    // On Monday lunch (weekday), quick_lunch_1 must be chosen over slow_lunch_1
    expect(plan.days.monday.lunch?.recipeId).toBe('quick_lunch_1');

    // On Monday dinner, dinner_only is chosen
    expect(plan.days.monday.dinner?.recipeId).toBe('dinner_only');
  });

  it('allows slow lunch on weekend (Saturday / Sunday)', () => {
    const pool = [
      createMockRecipe({
        id: 'slow_weekend_lunch',
        title: 'Sonntagsbraten',
        isLunch: true,
        isDinner: false,
        prepTimeMinutes: 30,
        cookTimeMinutes: 60,
        categories: ['Braten'],
      }),
    ];

    const plan = generateWeeklyMealPlan(pool, null, {
      weekId: '2026-W40',
      enabledSlots: { lunch: true, dinner: false },
      maxPrepTimeLunchMinutes: 30,
    });

    // Saturday and Sunday allow lunch even if > 30 minutes
    expect(plan.days.saturday.lunch?.recipeId).toBe('slow_weekend_lunch');
    expect(plan.days.sunday.lunch?.recipeId).toBe('slow_weekend_lunch');
  });

  it('gracefully handles small or empty recipe pools without crashing', () => {
    // Empty recipe pool
    const emptyPlan = generateWeeklyMealPlan([], null, {
      weekId: '2026-W40',
      enabledSlots: { lunch: true, dinner: true },
    });
    expect(emptyPlan.days.monday.lunch).toBeNull();
    expect(emptyPlan.days.monday.dinner).toBeNull();

    // Pool with only 1 recipe
    const singleRecipe = [
      createMockRecipe({
        id: 'single_1',
        title: 'Einziges Rezept',
        isDinner: true,
      }),
    ];
    const plan = generateWeeklyMealPlan(singleRecipe, null, {
      weekId: '2026-W40',
      enabledSlots: { lunch: false, dinner: true },
    });
    // With graceful fallback, all days should be filled with this recipe
    expect(plan.days.monday.dinner?.recipeId).toBe('single_1');
    expect(plan.days.tuesday.dinner?.recipeId).toBe('single_1');
  });
});

describe('Planner Module: shuffleSingleSlot', () => {
  const recipesPool: Recipe[] = [
    createMockRecipe({
      id: 'rec_1',
      title: 'Pasta Arrabiata',
      categories: ['Pasta'],
      isDinner: true,
    }),
    createMockRecipe({
      id: 'rec_2',
      title: 'Kichererbsen Curry',
      categories: ['Curry'],
      isDinner: true,
    }),
    createMockRecipe({
      id: 'rec_3',
      title: 'Tofu Burger',
      categories: ['Burger'],
      isDinner: true,
    }),
  ];

  it('shuffles only the requested slot while keeping other slots intact', () => {
    const initialPlan: MealPlan = {
      weekId: '2026-W40',
      days: {
        monday: { lunch: null, dinner: { recipeId: 'rec_1', title: 'Pasta Arrabiata', isLocked: false } },
        tuesday: { lunch: null, dinner: { recipeId: 'rec_2', title: 'Kichererbsen Curry', isLocked: false } },
        wednesday: { lunch: null, dinner: { recipeId: 'rec_3', title: 'Tofu Burger', isLocked: false } },
        thursday: { lunch: null, dinner: null },
        friday: { lunch: null, dinner: null },
        saturday: { lunch: null, dinner: null },
        sunday: { lunch: null, dinner: null },
      },
      updatedAt: '2026-09-20T00:00:00Z',
    };

    // Shuffle Wednesday dinner
    const updatedPlan = shuffleSingleSlot('wednesday', 'dinner', initialPlan, recipesPool);

    // Monday and Tuesday remain unchanged
    expect(updatedPlan.days.monday.dinner?.recipeId).toBe('rec_1');
    expect(updatedPlan.days.tuesday.dinner?.recipeId).toBe('rec_2');

    // Wednesday dinner should still be defined
    expect(updatedPlan.days.wednesday.dinner).not.toBeNull();
  });

  it('respects force: false on locked slot', () => {
    const initialPlan: MealPlan = {
      weekId: '2026-W40',
      days: {
        monday: { lunch: null, dinner: { recipeId: 'rec_1', title: 'Pasta Arrabiata', isLocked: true } },
        tuesday: { lunch: null, dinner: null },
        wednesday: { lunch: null, dinner: null },
        thursday: { lunch: null, dinner: null },
        friday: { lunch: null, dinner: null },
        saturday: { lunch: null, dinner: null },
        sunday: { lunch: null, dinner: null },
      },
      updatedAt: '2026-09-20T00:00:00Z',
    };

    const result = shuffleSingleSlot('monday', 'dinner', initialPlan, recipesPool, { force: false });
    expect(result.days.monday.dinner?.recipeId).toBe('rec_1');
    expect(result.days.monday.dinner?.isLocked).toBe(true);
  });
});
