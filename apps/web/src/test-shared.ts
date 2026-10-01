import {
  type Household,
  type Ingredient,
  type IngredientsKnowledge,
  type MealPlan,
  type Recipe,
  type ShoppingListItem,
  type User,
  UserSchema,
} from '@essensplaner/shared';

export function testSharedImports(): {
  user: User;
  recipe: Recipe;
  ingredient: Ingredient;
  mealPlan: MealPlan;
  shoppingListItem: ShoppingListItem;
  household: Household;
  knowledge: IngredientsKnowledge;
} {
  const user: User = {
    uid: 'u-123',
    email: 'chef@essensplaner.app',
    displayName: 'Chef Meister',
  };

  UserSchema.parse(user);

  const ingredient: Ingredient = {
    canonicalId: 'tomate',
    displayName: 'Tomaten',
    amount: 3,
    unit: 'Stk',
    category: 'Obst & Gemüse',
    isStaple: false,
  };

  const recipe: Recipe = {
    id: 'rec-1',
    title: 'Tomatensuppe',
    prepTimeMinutes: 10,
    cookTimeMinutes: 20,
    servings: 2,
    isLunch: true,
    isDinner: true,
    categories: ['Suppen', 'Veggie'],
    visibility: 'public',
    ingredients: [ingredient],
    instructions: ['Tomaten schneiden', 'Kochen und pürieren'],
  };

  const mealPlan: MealPlan = {
    weekId: '2026-W40',
    days: {
      monday: {
        lunch: { recipeId: recipe.id, title: recipe.title, isLocked: true },
        dinner: null,
      },
    },
    updatedAt: new Date().toISOString(),
  };

  const shoppingListItem: ShoppingListItem = {
    id: 'item-1',
    canonicalId: ingredient.canonicalId,
    name: ingredient.displayName,
    amount: 3,
    unit: 'Stk',
    category: ingredient.category,
    checked: false,
    source: 'plan',
    linkedRecipeId: recipe.id,
    addedBy: user.uid,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const household: Household = {
    id: 'h-1',
    name: 'WG Sonnenschein',
    members: {
      [user.uid]: {
        role: 'owner',
        displayName: user.displayName ?? 'Chef',
      },
    },
    pantryStaples: ['Salz', 'Pfeffer'],
    friendHouseholdIds: [],
  };

  const knowledge: IngredientsKnowledge = {
    canonicalId: ingredient.canonicalId,
    name: ingredient.displayName,
    healthBenefits: 'Reich an Lycopin und Vitamin C.',
    vitaminsAndMinerals: ['Vitamin C', 'Kalium'],
    nutritionalHighlights: 'Sekundäre Pflanzenstoffe',
    imageUrl: '',
    disclaimer: 'Kein medizinischer Ratschlag.',
  };

  return {
    user,
    recipe,
    ingredient,
    mealPlan,
    shoppingListItem,
    household,
    knowledge,
  };
}
