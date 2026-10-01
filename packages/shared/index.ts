import { z } from 'zod';

// ==========================================
// 1. ENUMS & CONSTANTS
// ==========================================

export const HouseholdRoleEnum = z.enum(['owner', 'member']);
export type HouseholdRole = z.infer<typeof HouseholdRoleEnum>;

export const RecipeVisibilityEnum = z.enum(['private', 'friends', 'public']);
export type RecipeVisibility = z.infer<typeof RecipeVisibilityEnum>;

export const ShoppingListSourceEnum = z.enum(['plan', 'manual']);
export type ShoppingListSource = z.infer<typeof ShoppingListSourceEnum>;

export const DayOfWeekEnum = z.enum([
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]);
export type DayOfWeek = z.infer<typeof DayOfWeekEnum>;

export const MealSlotTypeEnum = z.enum(['lunch', 'dinner']);
export type MealSlotType = z.infer<typeof MealSlotTypeEnum>;

export const STANDARD_INGREDIENT_CATEGORIES = [
  'Obst & Gemüse',
  'Kühlung & Milchprodukte',
  'Fleisch & Fisch',
  'Trockenwaren & Getreide',
  'Gewürze & Öle',
  'Konserven & Fertigprodukte',
  'Tiefkühl',
  'Getränke',
  'Drogerie & Haushalt',
  'Sonstiges',
] as const;

export type StandardIngredientCategory = (typeof STANDARD_INGREDIENT_CATEGORIES)[number];

// ==========================================
// 2. USER MODEL
// ==========================================

export const UserSchema = z.object({
  uid: z.string().min(1),
  email: z.string().email(),
  displayName: z.string().nullable().optional(),
  photoURL: z.string().url().nullable().optional(),
  currentHouseholdId: z.string().nullable().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().nullable().optional(),
});
export type User = z.infer<typeof UserSchema>;

// ==========================================
// 3. HOUSEHOLD MODEL
// ==========================================

export const HouseholdMemberSchema = z.object({
  role: HouseholdRoleEnum,
  displayName: z.string().min(1),
  email: z.string().email().optional(),
  joinedAt: z.string().optional(),
});
export type HouseholdMember = z.infer<typeof HouseholdMemberSchema>;

export const HouseholdSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  members: z.record(z.string(), HouseholdMemberSchema),
  pantryStaples: z.array(z.string()).default([]),
  friendHouseholdIds: z.array(z.string()).default([]),
  inviteCode: z.string().length(6).optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().nullable().optional(),
});
export type Household = z.infer<typeof HouseholdSchema>;

// ==========================================
// 4. INGREDIENT & RECIPE MODELS
// ==========================================

export const IngredientSchema = z.object({
  canonicalId: z.string().min(1),
  displayName: z.string().min(1),
  amount: z.number().nonnegative(),
  unit: z.string(),
  category: z.string().default('Sonstiges'),
  isStaple: z.boolean().default(false),
});
export type Ingredient = z.infer<typeof IngredientSchema>;

export const RecipeSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  sourceUrl: z.string().url().optional().or(z.literal('')),
  prepTimeMinutes: z.number().int().nonnegative().default(0),
  cookTimeMinutes: z.number().int().nonnegative().default(0),
  servings: z.number().int().positive().default(4),
  isLunch: z.boolean().default(false),
  isDinner: z.boolean().default(true),
  categories: z.array(z.string()).default([]),
  visibility: RecipeVisibilityEnum.default('private'),
  lastCookedAt: z.string().nullable().optional(),
  photoUrl: z.string().url().nullable().optional().or(z.literal('')),
  ingredients: z.array(IngredientSchema).default([]),
  instructions: z.array(z.string()).default([]),
  createdAt: z.string().optional(),
  updatedAt: z.string().nullable().optional(),
});
export type Recipe = z.infer<typeof RecipeSchema>;

// ==========================================
// 5. MEAL PLAN MODELS
// ==========================================

export const MealPlanSlotSchema = z.object({
  recipeId: z.string().min(1),
  title: z.string().min(1),
  isLocked: z.boolean().default(false),
});
export type MealPlanSlot = z.infer<typeof MealPlanSlotSchema>;

export const MealPlanDaySchema = z.object({
  lunch: MealPlanSlotSchema.nullable().default(null),
  dinner: MealPlanSlotSchema.nullable().default(null),
});
export type MealPlanDay = z.infer<typeof MealPlanDaySchema>;

export const MealPlanSchema = z.object({
  weekId: z.string().regex(/^\d{4}-W\d{2}$/, 'Must follow ISO week format e.g. 2026-W40'),
  days: z.record(z.string(), MealPlanDaySchema),
  updatedAt: z.string(),
  createdAt: z.string().optional(),
});
export type MealPlan = z.infer<typeof MealPlanSchema>;

// ==========================================
// 6. SHOPPING LIST MODEL
// ==========================================

export const ShoppingListItemSchema = z.object({
  id: z.string().min(1),
  canonicalId: z.string().min(1),
  name: z.string().min(1),
  amount: z.number().nonnegative(),
  unit: z.string(),
  category: z.string().default('Sonstiges'),
  checked: z.boolean().default(false),
  source: ShoppingListSourceEnum.default('manual'),
  linkedRecipeId: z.string().optional(),
  addedBy: z.string().min(1),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ShoppingListItem = z.infer<typeof ShoppingListItemSchema>;

// ==========================================
// 7. INGREDIENTS KNOWLEDGE (GLOBAL CACHE)
// ==========================================

export const IngredientsKnowledgeSchema = z.object({
  canonicalId: z.string().min(1),
  name: z.string().min(1),
  healthBenefits: z.string(),
  vitaminsAndMinerals: z.array(z.string()).default([]),
  nutritionalHighlights: z.string(),
  imageUrl: z.string().default(''),
  disclaimer: z
    .string()
    .default(
      'Kein medizinischer Ratschlag. Die Angaben dienen ausschließlich der allgemeinen Information.',
    ),
  updatedAt: z.string().optional(),
});
export type IngredientsKnowledge = z.infer<typeof IngredientsKnowledgeSchema>;

// ==========================================
// 8. API CONTRACT DTOs (BFF Endpoints)
// ==========================================

export const ScrapeRecipeRequestSchema = z.object({
  url: z.string().url(),
});
export type ScrapeRecipeRequest = z.infer<typeof ScrapeRecipeRequestSchema>;

export const ParseDictationRequestSchema = z.object({
  rawText: z.string().min(1),
});
export type ParseDictationRequest = z.infer<typeof ParseDictationRequestSchema>;

export const NutritionKnowledgeRequestSchema = z.object({
  canonicalIngredientId: z.string().min(1),
});
export type NutritionKnowledgeRequest = z.infer<typeof NutritionKnowledgeRequestSchema>;

// ==========================================
// 9. PLANNER & SHOPPING LOGIC
// ==========================================

export * from './planner.js';
export * from './shopping.js';

