import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type {
  Household,
  Recipe,
  MealPlan,
  ShoppingListItem,
  DayOfWeek,
  MealSlotType,
} from '@essensplaner/shared';
import {
  generateWeeklyMealPlan,
  shuffleSingleSlot,
  generateShoppingListFromMealPlan,
  getISOWeekId,
} from '@essensplaner/shared';
import { db, isFirebaseConfigured } from '../services/firebase';
import {
  doc,
  collection,
  onSnapshot,
  setDoc,
  deleteDoc,
} from 'firebase/firestore';
import {
  INITIAL_HOUSEHOLD,
  INITIAL_RECIPES,
  INITIAL_MEAL_PLAN,
  INITIAL_SHOPPING_LIST,
  FRIEND_HOUSEHOLDS,
} from '../data/mockData';

export interface PantryItemState {
  id: string;
  name: string;
  inStock: boolean;
}

export interface HouseholdContextValue {
  isOnline: boolean;
  isDemo: boolean;
  household: Household;
  recipes: Recipe[];
  currentWeekId: string;
  mealPlan: MealPlan;
  shoppingList: ShoppingListItem[];
  pantryItems: PantryItemState[];
  friendHouseholds: typeof FRIEND_HOUSEHOLDS;
  
  // Week navigation
  setCurrentWeekId: (weekId: string) => void;
  goToPreviousWeek: () => void;
  goToNextWeek: () => void;
  goToCurrentWeek: () => void;

  // Recipe actions
  addRecipe: (recipe: Omit<Recipe, 'id'>) => Promise<string>;
  updateRecipe: (recipe: Recipe) => Promise<void>;
  deleteRecipe: (recipeId: string) => Promise<void>;
  forkRecipe: (recipe: Recipe) => Promise<void>;

  // Meal Planner actions
  setMealSlot: (day: DayOfWeek, slot: MealSlotType, recipeId: string | null) => Promise<void>;
  toggleSlotLock: (day: DayOfWeek, slot: MealSlotType) => Promise<void>;
  shuffleSlot: (day: DayOfWeek, slot: MealSlotType) => Promise<void>;
  reRollUnlockedSlots: (enabledSlots?: { lunch: boolean; dinner: boolean }) => Promise<void>;
  generateShoppingList: (selectedIngredients?: string[]) => Promise<number>;

  // Shopping List actions (Optimistic UI)
  addShoppingItem: (name: string, amount: number, unit: string, category: string) => Promise<void>;
  toggleShoppingItem: (itemId: string) => Promise<void>;
  removeShoppingItem: (itemId: string) => Promise<void>;
  clearCompletedShoppingItems: () => Promise<void>;
  updateShoppingItem: (item: ShoppingListItem) => Promise<void>;

  // Pantry actions
  togglePantryItem: (itemId: string, addToListIfDepleted?: boolean) => Promise<void>;
  addPantryItem: (name: string) => Promise<void>;
  removePantryItem: (itemId: string) => Promise<void>;

  // Household & Collaboration
  updateHouseholdName: (name: string) => Promise<void>;
  addFriendByCode: (code: string) => Promise<boolean>;
}

const HouseholdContext = createContext<HouseholdContextValue | null>(null);

const STORAGE_KEY_PREFIX = 'essensplaner_v1_';

export const HouseholdProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState<boolean>(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
  const [currentWeekId, setCurrentWeekId] = useState<string>(() => getISOWeekId(new Date()));

  // Listen to browser online/offline events
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 1. Initial State Loaders (with localStorage persistence fallback)
  const [household, setHousehold] = useState<Household>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}household`);
      return saved ? JSON.parse(saved) : INITIAL_HOUSEHOLD;
    } catch {
      return INITIAL_HOUSEHOLD;
    }
  });

  const [recipes, setRecipes] = useState<Recipe[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}recipes`);
      return saved ? JSON.parse(saved) : INITIAL_RECIPES;
    } catch {
      return INITIAL_RECIPES;
    }
  });

  const [mealPlan, setMealPlan] = useState<MealPlan>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}meal_plan_${currentWeekId}`);
      if (saved) return JSON.parse(saved);
      return { ...INITIAL_MEAL_PLAN, weekId: currentWeekId };
    } catch {
      return { ...INITIAL_MEAL_PLAN, weekId: currentWeekId };
    }
  });

  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}shopping_list`);
      return saved ? JSON.parse(saved) : INITIAL_SHOPPING_LIST;
    } catch {
      return INITIAL_SHOPPING_LIST;
    }
  });

  const [pantryItems, setPantryItems] = useState<PantryItemState[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}pantry`);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return INITIAL_HOUSEHOLD.pantryStaples.map((staple, idx) => ({
      id: `pantry_${idx}`,
      name: staple,
      inStock: true,
    }));
  });

  const [friendHouseholds, setFriendHouseholds] = useState(FRIEND_HOUSEHOLDS);

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}household`, JSON.stringify(household));
  }, [household]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}recipes`, JSON.stringify(recipes));
  }, [recipes]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}meal_plan_${currentWeekId}`, JSON.stringify(mealPlan));
  }, [mealPlan, currentWeekId]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}shopping_list`, JSON.stringify(shoppingList));
  }, [shoppingList]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}pantry`, JSON.stringify(pantryItems));
  }, [pantryItems]);

  // 2. Real Firestore Real-time Sync (when Firebase is initialized)
  useEffect(() => {
    if (!db || !isFirebaseConfigured || !household.id) {
      return;
    }

    const householdRef = doc(db, 'households', household.id);
    const unsubHousehold = onSnapshot(householdRef, (snapshot) => {
      if (snapshot.exists()) {
        setHousehold(snapshot.data() as Household);
      }
    });

    const recipesCol = collection(db, 'households', household.id, 'recipes');
    const unsubRecipes = onSnapshot(recipesCol, (snapshot) => {
      if (!snapshot.empty) {
        const loaded: Recipe[] = [];
        snapshot.forEach((d) => loaded.push({ ...d.data(), id: d.id } as Recipe));
        setRecipes(loaded);
      }
    });

    const mealPlanDoc = doc(db, 'households', household.id, 'meal_plans', currentWeekId);
    const unsubMealPlan = onSnapshot(mealPlanDoc, (snapshot) => {
      if (snapshot.exists()) {
        setMealPlan(snapshot.data() as MealPlan);
      }
    });

    const shoppingCol = collection(db, 'households', household.id, 'shopping_list');
    const unsubShopping = onSnapshot(shoppingCol, (snapshot) => {
      if (!snapshot.empty) {
        const items: ShoppingListItem[] = [];
        snapshot.forEach((d) => items.push({ ...d.data(), id: d.id } as ShoppingListItem));
        setShoppingList(items);
      }
    });

    return () => {
      unsubHousehold();
      unsubRecipes();
      unsubMealPlan();
      unsubShopping();
    };
  }, [household.id, currentWeekId]);

  // Week Navigation helpers
  const goToPreviousWeek = useCallback(() => {
    const [yearStr, weekStr] = currentWeekId.split('-W');
    const year = parseInt(yearStr, 10);
    const week = parseInt(weekStr, 10);
    const newWeek = week > 1 ? week - 1 : 52;
    const newYear = week > 1 ? year : year - 1;
    setCurrentWeekId(`${newYear}-W${String(newWeek).padStart(2, '0')}`);
  }, [currentWeekId]);

  const goToNextWeek = useCallback(() => {
    const [yearStr, weekStr] = currentWeekId.split('-W');
    const year = parseInt(yearStr, 10);
    const week = parseInt(weekStr, 10);
    const newWeek = week < 52 ? week + 1 : 1;
    const newYear = week < 52 ? year : year + 1;
    setCurrentWeekId(`${newYear}-W${String(newWeek).padStart(2, '0')}`);
  }, [currentWeekId]);

  const goToCurrentWeek = useCallback(() => {
    setCurrentWeekId(getISOWeekId(new Date()));
  }, []);

  // Recipe Actions
  const addRecipe = useCallback(
    async (recipeData: Omit<Recipe, 'id'>): Promise<string> => {
      const newId = `rec_${Date.now()}`;
      const newRecipe: Recipe = {
        ...recipeData,
        id: newId,
        createdAt: new Date().toISOString(),
      };

      setRecipes((prev) => [newRecipe, ...prev]);

      if (db && isFirebaseConfigured) {
        try {
          await setDoc(doc(db, 'households', household.id, 'recipes', newId), newRecipe);
        } catch (err) {
          console.warn('[Firestore] Error adding recipe:', err);
        }
      }
      return newId;
    },
    [household.id]
  );

  const updateRecipe = useCallback(
    async (updated: Recipe): Promise<void> => {
      setRecipes((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));

      if (db && isFirebaseConfigured) {
        try {
          await setDoc(doc(db, 'households', household.id, 'recipes', updated.id), updated);
        } catch (err) {
          console.warn('[Firestore] Error updating recipe:', err);
        }
      }
    },
    [household.id]
  );

  const deleteRecipe = useCallback(
    async (recipeId: string): Promise<void> => {
      setRecipes((prev) => prev.filter((r) => r.id !== recipeId));

      if (db && isFirebaseConfigured) {
        try {
          await deleteDoc(doc(db, 'households', household.id, 'recipes', recipeId));
        } catch (err) {
          console.warn('[Firestore] Error deleting recipe:', err);
        }
      }
    },
    [household.id]
  );

  const forkRecipe = useCallback(
    async (sourceRecipe: Recipe): Promise<void> => {
      const forked: Recipe = {
        ...sourceRecipe,
        id: `rec_fork_${Date.now()}`,
        title: `${sourceRecipe.title} (Kopie)`,
        visibility: 'private',
        createdAt: new Date().toISOString(),
      };
      setRecipes((prev) => [forked, ...prev]);
    },
    []
  );

  // Meal Plan Actions
  const setMealSlot = useCallback(
    async (day: DayOfWeek, slot: MealSlotType, recipeId: string | null) => {
      setMealPlan((prev) => {
        const dayPlan = prev.days[day] || { lunch: null, dinner: null };
        const foundRecipe = recipeId ? recipes.find((r) => r.id === recipeId) : null;
        const newSlot = foundRecipe
          ? { recipeId: foundRecipe.id, title: foundRecipe.title, isLocked: false }
          : null;

        const updated: MealPlan = {
          ...prev,
          days: {
            ...prev.days,
            [day]: {
              ...dayPlan,
              [slot]: newSlot,
            },
          },
          updatedAt: new Date().toISOString(),
        };

        if (db && isFirebaseConfigured) {
          setDoc(doc(db, 'households', household.id, 'meal_plans', prev.weekId), updated).catch(
            console.warn
          );
        }
        return updated;
      });
    },
    [recipes, household.id]
  );

  const toggleSlotLock = useCallback(
    async (day: DayOfWeek, slot: MealSlotType) => {
      setMealPlan((prev) => {
        const currentSlot = prev.days[day]?.[slot];
        if (!currentSlot) return prev;

        const updated: MealPlan = {
          ...prev,
          days: {
            ...prev.days,
            [day]: {
              ...prev.days[day],
              [slot]: {
                ...currentSlot,
                isLocked: !currentSlot.isLocked,
              },
            },
          },
          updatedAt: new Date().toISOString(),
        };

        if (db && isFirebaseConfigured) {
          setDoc(doc(db, 'households', household.id, 'meal_plans', prev.weekId), updated).catch(
            console.warn
          );
        }
        return updated;
      });
    },
    [household.id]
  );

  const shuffleSlot = useCallback(
    async (day: DayOfWeek, slot: MealSlotType) => {
      setMealPlan((prev) => {
        const updated = shuffleSingleSlot(day, slot, prev, recipes, { force: true });

        if (db && isFirebaseConfigured) {
          const firestoreDb = db;
          setDoc(doc(firestoreDb, 'households', household.id, 'meal_plans', prev.weekId), updated).catch(
            console.warn
          );
        }
        return updated;
      });
    },
    [recipes, household.id]
  );

  const reRollUnlockedSlots = useCallback(
    async (enabledSlots = { lunch: true, dinner: true }) => {
      setMealPlan((prev) => {
        const generated = generateWeeklyMealPlan(recipes, prev, {
          weekId: prev.weekId,
          enabledSlots,
          maxPrepTimeLunchMinutes: 30,
        });

        if (db && isFirebaseConfigured) {
          const firestoreDb = db;
          setDoc(doc(firestoreDb, 'households', household.id, 'meal_plans', prev.weekId), generated).catch(
            console.warn
          );
        }
        return generated;
      });
    },
    [recipes, household.id]
  );

  const generateShoppingList = useCallback(
    async (excludedCanonicalIds?: string[]): Promise<number> => {
      const pantryStapleNames = pantryItems.filter((p) => p.inStock).map((p) => p.name);
      const generated = generateShoppingListFromMealPlan(
        mealPlan,
        recipes,
        pantryStapleNames,
        shoppingList,
        {
          excludeStaples: true,
          userId: 'tim_meyer',
        }
      );

      // Filter out items user already marked as available in review modal
      const filtered = excludedCanonicalIds
        ? generated.filter((item) => !excludedCanonicalIds.includes(item.canonicalId))
        : generated;

      setShoppingList((prev) => {
        // Keep existing manual items, replace or merge plan items
        const manualItems = prev.filter((i) => i.source === 'manual');
        const updated = [...manualItems, ...filtered];

        if (db && isFirebaseConfigured) {
          const firestoreDb = db;
          filtered.forEach((item) => {
            setDoc(doc(firestoreDb, 'households', household.id, 'shopping_list', item.id), item).catch(
              console.warn
            );
          });
        }
        return updated;
      });

      return filtered.length;
    },
    [mealPlan, recipes, pantryItems, shoppingList, household.id]
  );

  // Shopping List Actions (Optimistic UI)
  const addShoppingItem = useCallback(
    async (name: string, amount: number, unit: string, category: string) => {
      const newItem: ShoppingListItem = {
        id: `shop_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        canonicalId: name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
        name: name.trim(),
        amount: amount || 1,
        unit: unit || 'Stück',
        category: category || 'Sonstiges',
        checked: false,
        source: 'manual',
        addedBy: 'tim_meyer',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setShoppingList((prev) => [newItem, ...prev]);

      if (db && isFirebaseConfigured) {
        setDoc(doc(db, 'households', household.id, 'shopping_list', newItem.id), newItem).catch(
          console.warn
        );
      }
    },
    [household.id]
  );

  const toggleShoppingItem = useCallback(
    async (itemId: string) => {
      setShoppingList((prev) =>
        prev.map((item) => {
          if (item.id === itemId) {
            const nextChecked = !item.checked;
            const updated = {
              ...item,
              checked: nextChecked,
              updatedAt: new Date().toISOString(),
            };
            if (db && isFirebaseConfigured) {
              setDoc(doc(db, 'households', household.id, 'shopping_list', itemId), updated).catch(
                console.warn
              );
            }
            return updated;
          }
          return item;
        })
      );
    },
    [household.id]
  );

  const removeShoppingItem = useCallback(
    async (itemId: string) => {
      setShoppingList((prev) => prev.filter((i) => i.id !== itemId));

      if (db && isFirebaseConfigured) {
        const firestoreDb = db;
        deleteDoc(doc(firestoreDb, 'households', household.id, 'shopping_list', itemId)).catch(console.warn);
      }
    },
    [household.id]
  );

  const clearCompletedShoppingItems = useCallback(async () => {
    const toRemove = shoppingList.filter((i) => i.checked);
    setShoppingList((prev) => prev.filter((i) => !i.checked));

    if (db && isFirebaseConfigured) {
      const firestoreDb = db;
      toRemove.forEach((item) => {
        deleteDoc(doc(firestoreDb, 'households', household.id, 'shopping_list', item.id)).catch(console.warn);
      });
    }
  }, [shoppingList, household.id]);

  const updateShoppingItem = useCallback(
    async (item: ShoppingListItem) => {
      setShoppingList((prev) => prev.map((i) => (i.id === item.id ? item : i)));

      if (db && isFirebaseConfigured) {
        const firestoreDb = db;
        setDoc(doc(firestoreDb, 'households', household.id, 'shopping_list', item.id), item).catch(
          console.warn
        );
      }
    },
    [household.id]
  );

  // Pantry Actions
  const togglePantryItem = useCallback(
    async (itemId: string, addToListIfDepleted = true) => {
      setPantryItems((prev) =>
        prev.map((p) => {
          if (p.id === itemId) {
            const nextStock = !p.inStock;
            if (!nextStock && addToListIfDepleted) {
              // Automatically put depleted pantry item on shopping list
              addShoppingItem(p.name, 1, 'Packung', 'Gewürze & Öle');
            }
            return { ...p, inStock: nextStock };
          }
          return p;
        })
      );
    },
    [addShoppingItem]
  );

  const addPantryItem = useCallback(async (name: string) => {
    const newItem: PantryItemState = {
      id: `pantry_${Date.now()}`,
      name: name.trim(),
      inStock: true,
    };
    setPantryItems((prev) => [...prev, newItem]);
  }, []);

  const removePantryItem = useCallback(async (itemId: string) => {
    setPantryItems((prev) => prev.filter((i) => i.id !== itemId));
  }, []);

  // Household & Settings
  const updateHouseholdName = useCallback(async (name: string) => {
    setHousehold((prev) => {
      const updated = { ...prev, name: name.trim(), updatedAt: new Date().toISOString() };
      if (db && isFirebaseConfigured) {
        setDoc(doc(db, 'households', prev.id), updated).catch(console.warn);
      }
      return updated;
    });
  }, []);

  const addFriendByCode = useCallback(async (code: string): Promise<boolean> => {
    const found = FRIEND_HOUSEHOLDS.find(
      (f) => f.household.inviteCode?.toUpperCase() === code.trim().toUpperCase()
    );
    if (found) {
      setFriendHouseholds((prev) => {
        if (prev.some((p) => p.household.id === found.household.id)) return prev;
        return [...prev, found];
      });
      return true;
    }
    return false;
  }, []);

  const value = useMemo<HouseholdContextValue>(
    () => ({
      isOnline,
      isDemo: !isFirebaseConfigured,
      household,
      recipes,
      currentWeekId,
      mealPlan,
      shoppingList,
      pantryItems,
      friendHouseholds,
      setCurrentWeekId,
      goToPreviousWeek,
      goToNextWeek,
      goToCurrentWeek,
      addRecipe,
      updateRecipe,
      deleteRecipe,
      forkRecipe,
      setMealSlot,
      toggleSlotLock,
      shuffleSlot,
      reRollUnlockedSlots,
      generateShoppingList,
      addShoppingItem,
      toggleShoppingItem,
      removeShoppingItem,
      clearCompletedShoppingItems,
      updateShoppingItem,
      togglePantryItem,
      addPantryItem,
      removePantryItem,
      updateHouseholdName,
      addFriendByCode,
    }),
    [
      isOnline,
      household,
      recipes,
      currentWeekId,
      mealPlan,
      shoppingList,
      pantryItems,
      friendHouseholds,
      goToPreviousWeek,
      goToNextWeek,
      goToCurrentWeek,
      addRecipe,
      updateRecipe,
      deleteRecipe,
      forkRecipe,
      setMealSlot,
      toggleSlotLock,
      shuffleSlot,
      reRollUnlockedSlots,
      generateShoppingList,
      addShoppingItem,
      toggleShoppingItem,
      removeShoppingItem,
      clearCompletedShoppingItems,
      updateShoppingItem,
      togglePantryItem,
      addPantryItem,
      removePantryItem,
      updateHouseholdName,
      addFriendByCode,
    ]
  );

  return <HouseholdContext.Provider value={value}>{children}</HouseholdContext.Provider>;
};

export function useHousehold(): HouseholdContextValue {
  const ctx = useContext(HouseholdContext);
  if (!ctx) {
    throw new Error('useHousehold must be used within a HouseholdProvider');
  }
  return ctx;
}
