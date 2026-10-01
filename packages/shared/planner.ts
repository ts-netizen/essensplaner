import type {
  Recipe,
  MealPlan,
  MealPlanDay,
  MealPlanSlot,
  DayOfWeek,
  MealSlotType,
} from './index.js';

export const DAYS_OF_WEEK: readonly DayOfWeek[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

export interface GenerateMealPlanOptions {
  /** ISO week identifier, e.g. "2026-W40". If omitted, calculated from referenceDate or current date. */
  weekId?: string;
  /** Reference date used for ISO week calculation and 7-day cooldown. Defaults to Monday of weekId or new Date(). */
  referenceDate?: Date;
  /** Whether lunch and/or dinner slots should be generated. Default: { lunch: false, dinner: true } */
  enabledSlots?: {
    lunch?: boolean;
    dinner?: boolean;
  };
  /** Maximum total time (prep + cook in minutes) for weekday lunches. Default: 30 */
  maxPrepTimeLunchMinutes?: number;
  /** Custom random number generator (0 to 1). Defaults to Math.random for deterministic testing. */
  rng?: () => number;
}

export interface ShuffleSlotOptions {
  /** Reference date used for 7-day cooldown calculations. */
  referenceDate?: Date;
  /** Maximum total time for weekday lunches in minutes. Default: 30 */
  maxPrepTimeLunchMinutes?: number;
  /** Custom random number generator (0 to 1). Defaults to Math.random. */
  rng?: () => number;
  /** If true, shuffles even if the slot is currently locked. Defaults to true. */
  force?: boolean;
}

/**
 * Calculates the ISO-8601 week string (e.g. "2026-W40") for a given Date.
 */
export function getISOWeekId(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

/**
 * Returns the Date of the Monday for a given ISO week ID ("YYYY-Www").
 */
export function getDateFromWeekId(weekId: string): Date {
  const match = weekId.match(/^(\d{4})-W(\d{2})$/);
  if (!match) {
    return new Date();
  }
  const year = parseInt(match[1], 10);
  const week = parseInt(match[2], 10);
  // Jan 4th is always in week 1 of any ISO year
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const day = jan4.getUTCDay() || 7;
  const mondayTime = jan4.getTime() - (day - 1) * 86400000 + (week - 1) * 7 * 86400000;
  return new Date(mondayTime);
}

/**
 * Checks if a recipe was cooked within `cooldownDays` (default 7) prior to `targetDate`.
 */
export function isWithinCooldown(
  lastCookedAt: string | null | undefined,
  targetDate: Date,
  cooldownDays = 7,
): boolean {
  if (!lastCookedAt) return false;
  const cookedDate = new Date(lastCookedAt);
  if (isNaN(cookedDate.getTime())) return false;

  const diffMs = targetDate.getTime() - cookedDate.getTime();
  if (diffMs < 0) return false; // In future, not previously cooked
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays < cooldownDays;
}

/**
 * Checks if two category lists have any common category (case-insensitive).
 */
export function hasCategoryOverlap(
  categoriesA: readonly string[],
  categoriesB: readonly string[],
): boolean {
  if (!categoriesA.length || !categoriesB.length) return false;
  const setB = new Set(categoriesB.map((c) => c.trim().toLowerCase()));
  return categoriesA.some((c) => setB.has(c.trim().toLowerCase()));
}

/**
 * Evaluates whether a recipe is suitable for a given slot type and day.
 */
function isSlotSuitable(
  recipe: Recipe,
  slotType: MealSlotType,
  day: DayOfWeek,
  maxPrepTimeLunchMinutes: number,
  relaxLunchTimeLimit = false,
): boolean {
  if (slotType === 'lunch') {
    if (!recipe.isLunch) return false;
    const isWeekday = day !== 'saturday' && day !== 'sunday';
    if (isWeekday && !relaxLunchTimeLimit) {
      const totalTime = (recipe.prepTimeMinutes || 0) + (recipe.cookTimeMinutes || 0);
      if (totalTime > maxPrepTimeLunchMinutes) return false;
    }
    return true;
  }

  if (slotType === 'dinner') {
    return recipe.isDinner;
  }

  return true;
}

/**
 * Candidate selector using a tiered fallback strategy to guarantee robust selection
 * even with small recipe catalogs.
 */
function selectCandidateRecipe(
  recipes: Recipe[],
  slotType: MealSlotType,
  day: DayOfWeek,
  slotDate: Date,
  usedRecipeIds: Set<string>,
  adjacentCategories: Set<string>,
  maxPrepTimeLunchMinutes: number,
  rng: () => number,
  excludeRecipeId?: string,
): Recipe | null {
  if (!recipes.length) return null;

  const adjacentCategoriesList = Array.from(adjacentCategories);

  // Tiers of relaxation:
  // Tier 0: Strict - Slot-suitable, unused this week, no 7-day cooldown, no adjacent category overlap
  // Tier 1: Relax diversity - allow adjacent category overlap
  // Tier 2: Relax lunch weekday time limit - allow > maxPrepTimeLunchMinutes
  // Tier 3: Relax 7-day cooldown - allow recently cooked recipes
  // Tier 4: Relax unused this week - allow reusing a recipe from earlier in the week
  // Tier 5: Relax slot suitability - any recipe in database
  const tiers: Array<{
    checkSlotSuitability: boolean;
    relaxLunchTime: boolean;
    checkCooldown: boolean;
    checkUsedThisWeek: boolean;
    checkDiversity: boolean;
  }> = [
    // Tier 0: Full strict
    {
      checkSlotSuitability: true,
      relaxLunchTime: false,
      checkCooldown: true,
      checkUsedThisWeek: true,
      checkDiversity: true,
    },
    // Tier 1: Relax diversity
    {
      checkSlotSuitability: true,
      relaxLunchTime: false,
      checkCooldown: true,
      checkUsedThisWeek: true,
      checkDiversity: false,
    },
    // Tier 2: Relax weekday lunch time
    {
      checkSlotSuitability: true,
      relaxLunchTime: true,
      checkCooldown: true,
      checkUsedThisWeek: true,
      checkDiversity: false,
    },
    // Tier 3: Relax cooldown
    {
      checkSlotSuitability: true,
      relaxLunchTime: true,
      checkCooldown: false,
      checkUsedThisWeek: true,
      checkDiversity: false,
    },
    // Tier 4: Relax unused this week
    {
      checkSlotSuitability: true,
      relaxLunchTime: true,
      checkCooldown: false,
      checkUsedThisWeek: false,
      checkDiversity: false,
    },
    // Tier 5: Complete fallback (any recipe except current excluded)
    {
      checkSlotSuitability: false,
      relaxLunchTime: true,
      checkCooldown: false,
      checkUsedThisWeek: false,
      checkDiversity: false,
    },
  ];

  for (const tier of tiers) {
    const candidates = recipes.filter((recipe) => {
      if (excludeRecipeId && recipe.id === excludeRecipeId) {
        return false;
      }

      if (
        tier.checkSlotSuitability &&
        !isSlotSuitable(recipe, slotType, day, maxPrepTimeLunchMinutes, tier.relaxLunchTime)
      ) {
        return false;
      }

      if (tier.checkUsedThisWeek && usedRecipeIds.has(recipe.id)) {
        return false;
      }

      if (tier.checkCooldown && isWithinCooldown(recipe.lastCookedAt, slotDate, 7)) {
        return false;
      }

      if (tier.checkDiversity && hasCategoryOverlap(recipe.categories, adjacentCategoriesList)) {
        return false;
      }

      return true;
    });

    if (candidates.length > 0) {
      const idx = Math.floor(rng() * candidates.length);
      return candidates[idx];
    }
  }

  // Absolute fallback if only excludeRecipeId was available
  return recipes[0] ?? null;
}

/**
 * Generates or updates a weekly meal plan (Monday to Sunday) using heuristic random distribution.
 *
 * Rules:
 * - 7-day matrix (lunch / dinner).
 * - Locked slots (`isLocked: true`) are never overwritten.
 * - 7-day cooldown: Recipes cooked within 7 days of slot date are excluded.
 * - Slot suitability: Lunch recipes require `isLunch: true`, and <= maxPrepTimeLunchMinutes on weekdays.
 *   Dinner recipes require `isDinner: true`.
 * - Diversity protection: Avoids adjacent days sharing categories (e.g. no 2x Pasta in a row).
 * - Graceful fallback when the recipe pool is small.
 */
export function generateWeeklyMealPlan(
  recipes: Recipe[],
  currentPlan?: MealPlan | null,
  options: GenerateMealPlanOptions = {},
): MealPlan {
  const rng = options.rng ?? Math.random;
  const maxPrepTimeLunchMinutes = options.maxPrepTimeLunchMinutes ?? 30;
  const enabledLunch = options.enabledSlots?.lunch ?? false;
  const enabledDinner = options.enabledSlots?.dinner ?? true;

  const weekId =
    options.weekId ??
    currentPlan?.weekId ??
    getISOWeekId(options.referenceDate ?? new Date());

  const mondayDate = options.referenceDate ?? getDateFromWeekId(weekId);

  const days: Record<string, MealPlanDay> = {};
  const usedRecipeIds = new Set<string>();
  const dayCategories: Record<string, string[]> = {};

  // Initialize day records
  for (const day of DAYS_OF_WEEK) {
    days[day] = { lunch: null, dinner: null };
    dayCategories[day] = [];
  }

  const recipeMap = new Map<string, Recipe>();
  for (const r of recipes) {
    recipeMap.set(r.id, r);
  }

  // 1st PASS: Retain existing locked slots and mark recipes/categories as used
  for (const day of DAYS_OF_WEEK) {
    const existingDay = currentPlan?.days?.[day];
    if (!existingDay) continue;

    for (const slotType of ['lunch', 'dinner'] as const) {
      const existingSlot = existingDay[slotType];
      if (existingSlot && existingSlot.isLocked) {
        days[day][slotType] = {
          recipeId: existingSlot.recipeId,
          title: existingSlot.title,
          isLocked: true,
        };
        usedRecipeIds.add(existingSlot.recipeId);

        const rec = recipeMap.get(existingSlot.recipeId);
        if (rec?.categories?.length) {
          dayCategories[day].push(...rec.categories);
        }
      }
    }
  }

  // 2nd PASS: Fill unlocked slots
  for (let i = 0; i < DAYS_OF_WEEK.length; i++) {
    const day = DAYS_OF_WEEK[i];
    const slotDate = new Date(mondayDate.getTime() + i * 86400000);

    // Categories from the previous day for diversity check
    const prevDay = i > 0 ? DAYS_OF_WEEK[i - 1] : null;
    const adjacentCategories = new Set<string>(prevDay ? dayCategories[prevDay] : []);

    for (const slotType of ['lunch', 'dinner'] as const) {
      const isEnabled = slotType === 'lunch' ? enabledLunch : enabledDinner;

      // If slot is already locked, preserve it
      if (days[day][slotType]?.isLocked) {
        continue;
      }

      // If slot is not enabled, leave as null
      if (!isEnabled) {
        days[day][slotType] = null;
        continue;
      }

      // Select candidate
      const candidate = selectCandidateRecipe(
        recipes,
        slotType,
        day,
        slotDate,
        usedRecipeIds,
        adjacentCategories,
        maxPrepTimeLunchMinutes,
        rng,
      );

      if (candidate) {
        days[day][slotType] = {
          recipeId: candidate.id,
          title: candidate.title,
          isLocked: false,
        };
        usedRecipeIds.add(candidate.id);

        if (candidate.categories?.length) {
          dayCategories[day].push(...candidate.categories);
          // Also avoid same category within same day for both lunch and dinner
          for (const cat of candidate.categories) {
            adjacentCategories.add(cat);
          }
        }
      } else {
        days[day][slotType] = null;
      }
    }
  }

  return {
    weekId,
    days,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Shuffles a single slot in an existing meal plan while keeping the rest of the plan intact.
 * Respects diversity against the previous and next day, cooldown, and slot suitability.
 */
export function shuffleSingleSlot(
  day: DayOfWeek,
  slotType: MealSlotType,
  currentPlan: MealPlan,
  recipes: Recipe[],
  options: ShuffleSlotOptions = {},
): MealPlan {
  const rng = options.rng ?? Math.random;
  const maxPrepTimeLunchMinutes = options.maxPrepTimeLunchMinutes ?? 30;
  const force = options.force ?? true;

  const currentSlot: MealPlanSlot | null = currentPlan.days?.[day]?.[slotType] ?? null;

  // If locked and not forced, return untouched plan
  if (currentSlot?.isLocked && !force) {
    return currentPlan;
  }

  const recipeMap = new Map<string, Recipe>();
  for (const r of recipes) {
    recipeMap.set(r.id, r);
  }

  // Calculate slot date
  const mondayDate = options.referenceDate ?? getDateFromWeekId(currentPlan.weekId);
  const dayIndex = DAYS_OF_WEEK.indexOf(day);
  const slotDate = new Date(mondayDate.getTime() + (dayIndex >= 0 ? dayIndex : 0) * 86400000);

  // Collect recipe IDs already in use in other slots of the plan
  const usedRecipeIds = new Set<string>();
  for (const d of DAYS_OF_WEEK) {
    const dayObj = currentPlan.days?.[d];
    if (!dayObj) continue;
    for (const st of ['lunch', 'dinner'] as const) {
      if (d === day && st === slotType) continue; // Skip current slot being shuffled
      const slot = dayObj[st];
      if (slot?.recipeId) {
        usedRecipeIds.add(slot.recipeId);
      }
    }
  }

  // Collect categories from previous day and next day for diversity protection
  const adjacentCategories = new Set<string>();

  if (dayIndex > 0) {
    const prevDay = DAYS_OF_WEEK[dayIndex - 1];
    const prevDayObj = currentPlan.days?.[prevDay];
    for (const st of ['lunch', 'dinner'] as const) {
      const id = prevDayObj?.[st]?.recipeId;
      if (id && recipeMap.has(id)) {
        for (const cat of recipeMap.get(id)!.categories) {
          adjacentCategories.add(cat);
        }
      }
    }
  }

  if (dayIndex < DAYS_OF_WEEK.length - 1) {
    const nextDay = DAYS_OF_WEEK[dayIndex + 1];
    const nextDayObj = currentPlan.days?.[nextDay];
    for (const st of ['lunch', 'dinner'] as const) {
      const id = nextDayObj?.[st]?.recipeId;
      if (id && recipeMap.has(id)) {
        for (const cat of recipeMap.get(id)!.categories) {
          adjacentCategories.add(cat);
        }
      }
    }
  }

  // Also include the other slot of the same day (e.g. if shuffling dinner, consider lunch)
  const otherSlotType: MealSlotType = slotType === 'lunch' ? 'dinner' : 'lunch';
  const otherSlotRecipeId = currentPlan.days?.[day]?.[otherSlotType]?.recipeId;
  if (otherSlotRecipeId && recipeMap.has(otherSlotRecipeId)) {
    for (const cat of recipeMap.get(otherSlotRecipeId)!.categories) {
      adjacentCategories.add(cat);
    }
  }

  // Exclude current recipe to guarantee a different recipe if alternatives exist
  const excludeRecipeId = currentSlot?.recipeId;

  const candidate = selectCandidateRecipe(
    recipes,
    slotType,
    day,
    slotDate,
    usedRecipeIds,
    adjacentCategories,
    maxPrepTimeLunchMinutes,
    rng,
    excludeRecipeId,
  );

  // Build immutable copy of days
  const updatedDays: Record<string, MealPlanDay> = {};
  for (const d of DAYS_OF_WEEK) {
    const existingDay = currentPlan.days?.[d];
    updatedDays[d] = {
      lunch: existingDay?.lunch ? { ...existingDay.lunch } : null,
      dinner: existingDay?.dinner ? { ...existingDay.dinner } : null,
    };
  }

  if (candidate) {
    updatedDays[day][slotType] = {
      recipeId: candidate.id,
      title: candidate.title,
      isLocked: false,
    };
  } else {
    updatedDays[day][slotType] = null;
  }

  return {
    ...currentPlan,
    days: updatedDays,
    updatedAt: new Date().toISOString(),
  };
}
