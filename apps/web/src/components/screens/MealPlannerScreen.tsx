import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Dices,
  Lock,
  Unlock,
  ShoppingBag,
  Clock,
  Plus,
  Trash2,
  Calendar,
} from 'lucide-react';
import { useHousehold } from '../../context/HouseholdContext';
import { DAYS_OF_WEEK } from '@essensplaner/shared';
import type { DayOfWeek, MealSlotType, Recipe } from '@essensplaner/shared';
import { GenerateShoppingListModal } from '../modals/GenerateShoppingListModal';
import { SelectRecipeModal } from '../modals/SelectRecipeModal';

interface MealPlannerScreenProps {
  onNavigate: (screen: string, params?: { recipeId?: string }) => void;
}

export const MealPlannerScreen: React.FC<MealPlannerScreenProps> = ({ onNavigate }) => {
  const {
    currentWeekId,
    mealPlan,
    recipes,
    goToPreviousWeek,
    goToNextWeek,
    goToCurrentWeek,
    toggleSlotLock,
    shuffleSlot,
    reRollUnlockedSlots,
    setMealSlot,
  } = useHousehold();

  // Slot filter: Both, Lunch only, or Dinner only
  const [slotFilter, setSlotFilter] = useState<'both' | 'lunch' | 'dinner'>('both');

  // Modals state
  const [isShoppingModalOpen, setIsShoppingModalOpen] = useState(false);
  const [shoppingSuccessToast, setShoppingSuccessToast] = useState<string | null>(null);

  // Manual Select Recipe Modal
  const [selectModalTarget, setSelectModalTarget] = useState<{
    day: DayOfWeek;
    slot: MealSlotType;
  } | null>(null);

  const [isRolling, setIsRolling] = useState(false);

  const dayLabelsGerman: Record<DayOfWeek, { name: string; short: string }> = {
    monday: { name: 'Montag', short: 'Mo' },
    tuesday: { name: 'Dienstag', short: 'Di' },
    wednesday: { name: 'Mittwoch', short: 'Mi' },
    thursday: { name: 'Donnerstag', short: 'Do' },
    friday: { name: 'Freitag', short: 'Fr' },
    saturday: { name: 'Samstag', short: 'Sa' },
    sunday: { name: 'Sonntag', short: 'So' },
  };

  const handleReRollAll = async () => {
    setIsRolling(true);
    try {
      await reRollUnlockedSlots({
        lunch: slotFilter === 'both' || slotFilter === 'lunch',
        dinner: slotFilter === 'both' || slotFilter === 'dinner',
      });
    } finally {
      setTimeout(() => setIsRolling(false), 300);
    }
  };

  const handleManualRecipePicked = (recipe: Recipe) => {
    if (selectModalTarget) {
      setMealSlot(selectModalTarget.day, selectModalTarget.slot, recipe.id);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto pb-16">
      {/* Top Header & Calendar Week Navigation */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
            Intelligenter Wochenplan
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800">
            Wochenplaner & Essensroutine
          </h1>
        </div>

        {/* Week Switcher & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Week Navigation */}
          <div className="flex items-center bg-slate-100 rounded-xl p-1 text-xs font-semibold">
            <button
              onClick={goToPreviousWeek}
              className="p-1.5 hover:bg-white rounded-lg transition-colors text-slate-700"
              aria-label="Vorherige Woche"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-slate-800 font-bold whitespace-nowrap">
              {currentWeekId.replace('-W', ' • KW ')}
            </span>
            <button
              onClick={goToNextWeek}
              className="p-1.5 hover:bg-white rounded-lg transition-colors text-slate-700"
              aria-label="Nächste Woche"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={goToCurrentWeek}
            className="px-3 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors flex items-center gap-1.5"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Heute</span>
          </button>

          {/* Re-Roll Unlocked */}
          <button
            onClick={handleReRollAll}
            disabled={isRolling}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold transition-all shadow-xs flex items-center gap-2"
          >
            <Dices className={`w-4 h-4 text-emerald-400 ${isRolling ? 'animate-spin' : ''}`} />
            <span>Ungesperrte auswürfeln</span>
          </button>

          {/* Generate Shopping List Button */}
          <button
            onClick={() => setIsShoppingModalOpen(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-all shadow-xs flex items-center gap-2"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Einkaufsliste generieren</span>
          </button>
        </div>
      </div>

      {/* Success Notification Toast */}
      {shoppingSuccessToast && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center justify-between text-sm animate-fade-in shadow-xs">
          <span>{shoppingSuccessToast}</span>
          <button
            onClick={() => onNavigate('shopping')}
            className="text-xs font-bold underline text-emerald-900"
          >
            Zur Einkaufsliste →
          </button>
        </div>
      )}

      {/* Filter Switch for Slots (Lunch / Dinner / Both) */}
      <div className="flex items-center justify-between bg-white rounded-xl p-2 border border-slate-200/80 text-xs shadow-2xs">
        <span className="font-semibold text-slate-500 pl-2">Slots anzeigen:</span>
        <div className="flex gap-1">
          <button
            onClick={() => setSlotFilter('both')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              slotFilter === 'both'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Mittag & Abend
          </button>
          <button
            onClick={() => setSlotFilter('lunch')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              slotFilter === 'lunch'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Nur Mittag
          </button>
          <button
            onClick={() => setSlotFilter('dinner')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              slotFilter === 'dinner'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Nur Abend
          </button>
        </div>
      </div>

      {/* 7-Tage-Grid (Montag bis Sonntag) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3.5">
        {DAYS_OF_WEEK.map((dayKey) => {
          const dayPlan = mealPlan.days[dayKey] || { lunch: null, dinner: null };

          const lunchRecipe = dayPlan.lunch
            ? recipes.find((r) => r.id === dayPlan.lunch?.recipeId)
            : null;
          const dinnerRecipe = dayPlan.dinner
            ? recipes.find((r) => r.id === dayPlan.dinner?.recipeId)
            : null;

          return (
            <div
              key={dayKey}
              className="bg-white rounded-2xl border border-slate-200/80 p-3.5 shadow-2xs flex flex-col justify-between space-y-3"
            >
              {/* Day Header */}
              <div className="pb-2 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {dayLabelsGerman[dayKey].short}
                  </span>
                  <h3 className="font-bold text-slate-800 text-sm">
                    {dayLabelsGerman[dayKey].name}
                  </h3>
                </div>
              </div>

              {/* Slot Cards Container */}
              <div className="space-y-2.5 flex-1">
                {/* LUNCH SLOT */}
                {(slotFilter === 'both' || slotFilter === 'lunch') && (
                  <div className="p-2.5 rounded-xl border border-slate-200/70 bg-slate-50/60 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold mb-1">
                      <span>Mittag</span>
                      {dayPlan.lunch && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => toggleSlotLock(dayKey, 'lunch')}
                            className={`p-1 rounded-md transition-colors ${
                              dayPlan.lunch.isLocked
                                ? 'bg-amber-100 text-amber-700'
                                : 'text-slate-400 hover:text-slate-700'
                            }`}
                            title={dayPlan.lunch.isLocked ? 'Gesperrt' : 'Nicht gesperrt'}
                          >
                            {dayPlan.lunch.isLocked ? (
                              <Lock className="w-3.5 h-3.5" />
                            ) : (
                              <Unlock className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            onClick={() => shuffleSlot(dayKey, 'lunch')}
                            className="p-1 text-slate-400 hover:text-emerald-600 rounded-md transition-colors"
                            title="Einzel-Slot neu auswürfeln"
                          >
                            <Dices className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {dayPlan.lunch ? (
                      <div className="space-y-1.5">
                        <h4
                          onClick={() =>
                            onNavigate('recipe-detail', { recipeId: dayPlan.lunch?.recipeId })
                          }
                          className="font-bold text-xs text-slate-800 hover:text-emerald-700 cursor-pointer line-clamp-2 leading-tight"
                        >
                          {dayPlan.lunch.title}
                        </h4>
                        {lunchRecipe && (
                          <div className="flex items-center gap-1 text-[10px] text-slate-500">
                            <Clock className="w-3 h-3" />
                            <span>{lunchRecipe.prepTimeMinutes + lunchRecipe.cookTimeMinutes} Min.</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between pt-1">
                          <button
                            onClick={() =>
                              setSelectModalTarget({ day: dayKey, slot: 'lunch' })
                            }
                            className="text-[10px] text-emerald-600 hover:underline font-medium"
                          >
                            Ändern
                          </button>
                          <button
                            onClick={() => setMealSlot(dayKey, 'lunch', null)}
                            className="text-[10px] text-slate-400 hover:text-red-500"
                            title="Entfernen"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() =>
                          setSelectModalTarget({ day: dayKey, slot: 'lunch' })
                        }
                        className="w-full py-2 border border-dashed border-slate-300 hover:border-emerald-500 text-slate-400 hover:text-emerald-600 rounded-lg text-xs flex items-center justify-center gap-1 transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Rezept wählen</span>
                      </button>
                    )}
                  </div>
                )}

                {/* DINNER SLOT */}
                {(slotFilter === 'both' || slotFilter === 'dinner') && (
                  <div className="p-2.5 rounded-xl border border-slate-200/70 bg-slate-50/60 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold mb-1">
                      <span>Abend</span>
                      {dayPlan.dinner && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => toggleSlotLock(dayKey, 'dinner')}
                            className={`p-1 rounded-md transition-colors ${
                              dayPlan.dinner.isLocked
                                ? 'bg-amber-100 text-amber-700'
                                : 'text-slate-400 hover:text-slate-700'
                            }`}
                            title={dayPlan.dinner.isLocked ? 'Gesperrt' : 'Nicht gesperrt'}
                          >
                            {dayPlan.dinner.isLocked ? (
                              <Lock className="w-3.5 h-3.5" />
                            ) : (
                              <Unlock className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            onClick={() => shuffleSlot(dayKey, 'dinner')}
                            className="p-1 text-slate-400 hover:text-emerald-600 rounded-md transition-colors"
                            title="Einzel-Slot neu auswürfeln"
                          >
                            <Dices className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {dayPlan.dinner ? (
                      <div className="space-y-1.5">
                        <h4
                          onClick={() =>
                            onNavigate('recipe-detail', { recipeId: dayPlan.dinner?.recipeId })
                          }
                          className="font-bold text-xs text-slate-800 hover:text-emerald-700 cursor-pointer line-clamp-2 leading-tight"
                        >
                          {dayPlan.dinner.title}
                        </h4>
                        {dinnerRecipe && (
                          <div className="flex items-center gap-1 text-[10px] text-slate-500">
                            <Clock className="w-3 h-3" />
                            <span>
                              {dinnerRecipe.prepTimeMinutes + dinnerRecipe.cookTimeMinutes} Min.
                            </span>
                          </div>
                        )}
                        <div className="flex items-center justify-between pt-1">
                          <button
                            onClick={() =>
                              setSelectModalTarget({ day: dayKey, slot: 'dinner' })
                            }
                            className="text-[10px] text-emerald-600 hover:underline font-medium"
                          >
                            Ändern
                          </button>
                          <button
                            onClick={() => setMealSlot(dayKey, 'dinner', null)}
                            className="text-[10px] text-slate-400 hover:text-red-500"
                            title="Entfernen"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() =>
                          setSelectModalTarget({ day: dayKey, slot: 'dinner' })
                        }
                        className="w-full py-2 border border-dashed border-slate-300 hover:border-emerald-500 text-slate-400 hover:text-emerald-600 rounded-lg text-xs flex items-center justify-center gap-1 transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Rezept wählen</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Review Dialog for Shopping List Generation */}
      <GenerateShoppingListModal
        isOpen={isShoppingModalOpen}
        onClose={() => setIsShoppingModalOpen(false)}
        onSuccess={(count) => {
          setShoppingSuccessToast(
            `Erfolgreich! ${count} benötigte Zutaten wurden auf deine Einkaufsliste gesetzt.`
          );
          setTimeout(() => setShoppingSuccessToast(null), 8000);
        }}
      />

      {/* Manual Recipe Selection Modal */}
      <SelectRecipeModal
        isOpen={Boolean(selectModalTarget)}
        targetDay={selectModalTarget?.day || null}
        targetSlot={selectModalTarget?.slot || null}
        onClose={() => setSelectModalTarget(null)}
        onSelect={handleManualRecipePicked}
      />
    </div>
  );
};
