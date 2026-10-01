import type {
  Recipe,
  MealPlan,
  ShoppingListItem,
  Ingredient,
} from './index.js';
import {
  STANDARD_INGREDIENT_CATEGORIES,
  DAYS_OF_WEEK,
} from './index.js';

export interface GenerateShoppingListOptions {
  /** If true, excludes items marked as isStaple: true or present in pantryStaples. Default: true */
  excludeStaples?: boolean;
  /** User ID attributing added items. Defaults to "system". */
  userId?: string;
  /** Fixed timestamp string for testing or reproducibility. Defaults to new Date().toISOString() */
  now?: string;
}

export interface UnitNormalization {
  /** Standardized unit representation (e.g., 'g', 'ml', 'Stück', 'EL', 'TL') */
  baseUnit: string;
  /** Multiplier factor from original unit into base unit */
  factor: number;
}

/**
 * Standardizes common German culinary units and converts compatible scales
 * (e.g. kg -> g, l -> ml).
 */
export function normalizeUnit(unitStr: string): UnitNormalization {
  const clean = unitStr.trim().toLowerCase();

  switch (clean) {
    // Weights -> base unit: 'g'
    case 'g':
    case 'gr':
    case 'gramm':
      return { baseUnit: 'g', factor: 1 };
    case 'kg':
    case 'kilogramm':
      return { baseUnit: 'g', factor: 1000 };

    // Volumes -> base unit: 'ml'
    case 'ml':
    case 'milliliter':
      return { baseUnit: 'ml', factor: 1 };
    case 'l':
    case 'liter':
      return { baseUnit: 'ml', factor: 1000 };
    case 'cl':
    case 'zentiliter':
      return { baseUnit: 'ml', factor: 10 };
    case 'dl':
    case 'deziliter':
      return { baseUnit: 'ml', factor: 100 };

    // Pieces / Count -> base unit: 'Stück'
    case 'stk':
    case 'stk.':
    case 'stück':
    case 'stueck':
    case 'st':
    case '':
      return { baseUnit: 'Stück', factor: 1 };

    // Spoons
    case 'el':
    case 'el.':
    case 'esslöffel':
    case 'essloeffel':
      return { baseUnit: 'EL', factor: 1 };
    case 'tl':
    case 'tl.':
    case 'teelöffel':
    case 'teeloeffel':
      return { baseUnit: 'TL', factor: 1 };

    // Containers & Portions
    case 'dose':
    case 'dosen':
      return { baseUnit: 'Dose', factor: 1 };
    case 'prise':
    case 'prisen':
      return { baseUnit: 'Prise', factor: 1 };
    case 'bund':
    case 'bünde':
    case 'buende':
      return { baseUnit: 'Bund', factor: 1 };
    case 'zehe':
    case 'zehen':
    case 'knoblauchzehe':
    case 'knoblauchzehen':
      return { baseUnit: 'Zehe', factor: 1 };
    case 'packung':
    case 'packungen':
    case 'pkg':
    case 'pkg.':
    case 'pck':
    case 'pck.':
      return { baseUnit: 'Packung', factor: 1 };
    case 'scheibe':
    case 'scheiben':
      return { baseUnit: 'Scheibe', factor: 1 };
    case 'becher':
      return { baseUnit: 'Becher', factor: 1 };
    case 'glas':
    case 'gläser':
    case 'glaeser':
      return { baseUnit: 'Glas', factor: 1 };

    default:
      // Keep original unit name as base unit
      return { baseUnit: unitStr.trim(), factor: 1 };
  }
}

/**
 * Normalizes an identifier or name for case- and whitespace-insensitive matching.
 */
function normalizeKey(str: string): string {
  return str.trim().toLowerCase();
}

/**
 * Checks whether an ingredient is considered a staple based on its flag or household pantry staples.
 */
export function isPantryStaple(
  ingredient: Pick<Ingredient, 'canonicalId' | 'displayName' | 'isStaple'>,
  pantryStaples: readonly string[],
): boolean {
  if (ingredient.isStaple) return true;

  const staplesSet = new Set(pantryStaples.map(normalizeKey));
  if (staplesSet.has(normalizeKey(ingredient.canonicalId))) return true;
  if (staplesSet.has(normalizeKey(ingredient.displayName))) return true;

  return false;
}

/**
 * Filters out pantry staples from an array of ingredients.
 */
export function filterPantryStaples(
  ingredients: Ingredient[],
  pantryStaples: readonly string[],
): Ingredient[] {
  return ingredients.filter((ing) => !isPantryStaple(ing, pantryStaples));
}

/**
 * Internal accumulator for aggregating ingredients with compatible units.
 */
interface IngredientAccumulator {
  canonicalId: string;
  name: string;
  amount: number;
  unit: string;
  category: string;
  recipeIds: Set<string>;
}

/**
 * Generates an aggregated shopping list from a weekly meal plan.
 *
 * Requirements:
 * - Dual-Source: Existing manual items (`source: "manual"`) are retained completely.
 * - Plan Aggregation: All ingredients from recipes scheduled in the meal plan are gathered.
 * - Pantry Exclusion: Items marked `isStaple: true` or present in `pantryStaples` are skipped by default.
 * - Quantity Consolidation: Identical ingredients (`canonicalId`) with compatible units are summed up.
 * - State Preservation: If an item already existed in the shopping list (from a previous plan generation)
 *   and was marked `checked: true`, its checked state and id are preserved.
 * - Supermarket Route Ordering: Sorted primarily by supermarket category for optimal walking path.
 */
export function generateShoppingListFromMealPlan(
  mealPlan: MealPlan,
  recipes: Recipe[],
  pantryStaples: string[] = [],
  existingShoppingList: ShoppingListItem[] = [],
  options: GenerateShoppingListOptions = {},
): ShoppingListItem[] {
  const excludeStaples = options.excludeStaples ?? true;
  const userId = options.userId ?? 'system';
  const now = options.now ?? new Date().toISOString();

  // 1. DUAL-SOURCE: Extract and preserve manual items
  const manualItems: ShoppingListItem[] = existingShoppingList.filter(
    (item) => item.source === 'manual',
  );

  // Index existing plan items to preserve checked status, original ID, and createdAt
  const existingPlanItemsByGroupKey = new Map<string, ShoppingListItem>();
  for (const item of existingShoppingList) {
    if (item.source === 'plan') {
      const norm = normalizeUnit(item.unit);
      const groupKey = `${normalizeKey(item.canonicalId)}:::${normalizeKey(norm.baseUnit)}`;
      // Keep earliest or first checked
      if (!existingPlanItemsByGroupKey.has(groupKey) || item.checked) {
        existingPlanItemsByGroupKey.set(groupKey, item);
      }
    }
  }

  // 2. RECIPE LOOKUP: Map recipes by ID
  const recipeMap = new Map<string, Recipe>();
  for (const r of recipes) {
    recipeMap.set(r.id, r);
  }

  // 3. AGGREGATION & CONSOLIDATION: Group ingredients by canonicalId + baseUnit
  const aggregatedMap = new Map<string, IngredientAccumulator>();

  for (const dayKey of DAYS_OF_WEEK) {
    const day = mealPlan.days?.[dayKey];
    if (!day) continue;

    for (const slotType of ['lunch', 'dinner'] as const) {
      const slot = day[slotType];
      if (!slot?.recipeId) continue;

      const recipe = recipeMap.get(slot.recipeId);
      if (!recipe) continue;

      for (const ingredient of recipe.ingredients) {
        // Check Pantry Staples
        if (excludeStaples && isPantryStaple(ingredient, pantryStaples)) {
          continue;
        }

        const norm = normalizeUnit(ingredient.unit);
        const groupKey = `${normalizeKey(ingredient.canonicalId)}:::${normalizeKey(norm.baseUnit)}`;
        const convertedAmount = (ingredient.amount || 0) * norm.factor;

        const existingAcc = aggregatedMap.get(groupKey);
        if (existingAcc) {
          existingAcc.amount += convertedAmount;
          existingAcc.recipeIds.add(recipe.id);
          // If category was 'Sonstiges' and new one is more specific, update category
          if (existingAcc.category === 'Sonstiges' && ingredient.category && ingredient.category !== 'Sonstiges') {
            existingAcc.category = ingredient.category;
          }
        } else {
          aggregatedMap.set(groupKey, {
            canonicalId: ingredient.canonicalId,
            name: ingredient.displayName,
            amount: convertedAmount,
            unit: norm.baseUnit,
            category: ingredient.category || 'Sonstiges',
            recipeIds: new Set([recipe.id]),
          });
        }
      }
    }
  }

  // 4. BUILD NEW PLAN ITEMS WITH STATE PRESERVATION
  const generatedPlanItems: ShoppingListItem[] = [];

  for (const [groupKey, acc] of aggregatedMap.entries()) {
    const existing = existingPlanItemsByGroupKey.get(groupKey);
    const roundedAmount = Math.round(acc.amount * 100) / 100;
    const linkedRecipeId = Array.from(acc.recipeIds).join(', ');

    if (existing) {
      generatedPlanItems.push({
        ...existing,
        name: acc.name,
        amount: roundedAmount,
        unit: acc.unit,
        category: acc.category,
        checked: existing.checked, // preserve checked status!
        source: 'plan',
        linkedRecipeId,
        updatedAt: now,
      });
    } else {
      const uniqueId = `plan_${acc.canonicalId}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      generatedPlanItems.push({
        id: uniqueId,
        canonicalId: acc.canonicalId,
        name: acc.name,
        amount: roundedAmount,
        unit: acc.unit,
        category: acc.category,
        checked: false,
        source: 'plan',
        linkedRecipeId,
        addedBy: userId,
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  // 5. COMBINE DUAL-SOURCES & SORT FOR SUPERMARKET WALKING ROUTE
  const combinedList = [...generatedPlanItems, ...manualItems];

  const categoryOrderMap = new Map<string, number>();
  STANDARD_INGREDIENT_CATEGORIES.forEach((cat, index) => {
    categoryOrderMap.set(cat.toLowerCase(), index);
  });

  combinedList.sort((a, b) => {
    const catIndexA = categoryOrderMap.get(a.category.toLowerCase()) ?? 99;
    const catIndexB = categoryOrderMap.get(b.category.toLowerCase()) ?? 99;

    if (catIndexA !== catIndexB) {
      return catIndexA - catIndexB;
    }

    return a.name.localeCompare(b.name, 'de');
  });

  return combinedList;
}

/**
 * Groups shopping list items by their supermarket category for intuitive UI rendering.
 */
export function groupShoppingListByCategory(
  items: ShoppingListItem[],
): Record<string, ShoppingListItem[]> {
  const groups: Record<string, ShoppingListItem[]> = {};

  for (const cat of STANDARD_INGREDIENT_CATEGORIES) {
    groups[cat] = [];
  }

  for (const item of items) {
    const cat = item.category || 'Sonstiges';
    if (!groups[cat]) {
      groups[cat] = [];
    }
    groups[cat].push(item);
  }

  return groups;
}
