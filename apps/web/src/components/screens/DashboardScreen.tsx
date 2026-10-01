import React, { useState, useMemo } from 'react';
import {
  CalendarDays,
  ShoppingBag,
  Sparkles,
  Plus,
  Clock,
  ArrowRight,
  ShieldCheck,
  Check,
  Utensils,
  BookOpen,
} from 'lucide-react';
import { useHousehold } from '../../context/HouseholdContext';
import { getTodayNutritionTip } from '../../data/nutritionTips';
import type { DayOfWeek } from '@essensplaner/shared';

interface DashboardScreenProps {
  onNavigate: (screen: string, params?: { recipeId?: string }) => void;
  onOpenImport: () => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  onNavigate,
  onOpenImport,
}) => {
  const { household, mealPlan, recipes, shoppingList, addShoppingItem, toggleShoppingItem } =
    useHousehold();
  const [quickItemText, setQuickItemText] = useState('');

  // Determine current day of week in English key
  const dayIndex = new Date().getDay(); // 0 is Sunday, 1 is Monday ...
  const dayKeyMap: DayOfWeek[] = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ];
  const todayKey: DayOfWeek = dayKeyMap[dayIndex];

  const todayMeals = mealPlan.days[todayKey] || { lunch: null, dinner: null };

  const lunchRecipe = todayMeals.lunch
    ? recipes.find((r) => r.id === todayMeals.lunch?.recipeId)
    : null;
  const dinnerRecipe = todayMeals.dinner
    ? recipes.find((r) => r.id === todayMeals.dinner?.recipeId)
    : null;

  const uncheckedItems = shoppingList.filter((i) => !i.checked);
  const nutritionTip = getTodayNutritionTip();

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickItemText.trim()) return;
    await addShoppingItem(quickItemText.trim(), 1, 'Stück', 'Sonstiges');
    setQuickItemText('');
  };

  const todayGermanFormatted = useMemo(() => {
    return new Intl.DateTimeFormat('de-DE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(new Date());
  }, []);

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto pb-12">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-800 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-emerald-100 text-xs font-semibold uppercase tracking-wider mb-3">
            <span>{household.name}</span> • <span>{todayGermanFormatted}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Was essen wir heute?
          </h1>
          <p className="text-emerald-100 text-sm mt-2 leading-relaxed">
            Dein intelligenter Essensplaner kombiniert Wochenroutine, Supermarkt-Sortierung und
            wissenschaftliches Ernährungswissen.
          </p>

          {/* Quick Action Badges */}
          <div className="flex flex-wrap gap-2.5 mt-5">
            <button
              onClick={() => onNavigate('planner')}
              className="px-4 py-2 bg-white text-emerald-800 hover:bg-emerald-50 text-xs sm:text-sm font-semibold rounded-xl transition-all shadow-xs flex items-center gap-2"
            >
              <CalendarDays className="w-4 h-4 text-emerald-600" />
              <span>Woche planen</span>
            </button>
            <button
              onClick={onOpenImport}
              className="px-4 py-2 bg-emerald-500/40 hover:bg-emerald-500/60 text-white border border-white/20 text-xs sm:text-sm font-semibold rounded-xl transition-all flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>Rezept importieren</span>
            </button>
            <button
              onClick={() => onNavigate('shopping')}
              className="px-4 py-2 bg-emerald-500/40 hover:bg-emerald-500/60 text-white border border-white/20 text-xs sm:text-sm font-semibold rounded-xl transition-all flex items-center gap-2"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Einkaufen ({uncheckedItems.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Grid: Meals Today & Shopping List Quick Access */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card: Heutige Mahlzeiten */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                <Utensils className="w-5 h-5" />
              </div>
              <h2 className="font-bold text-slate-800 text-base">Heutige Mahlzeiten</h2>
            </div>
            <button
              onClick={() => onNavigate('planner')}
              className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1"
            >
              <span>Wochenplan</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {/* Lunch Slot */}
            <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-50 transition-colors">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Mittagessen
                </span>
                {lunchRecipe && (
                  <span className="flex items-center gap-1 text-xs text-slate-500 font-medium">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {lunchRecipe.prepTimeMinutes + lunchRecipe.cookTimeMinutes} Min.
                  </span>
                )}
              </div>
              {lunchRecipe ? (
                <div className="flex items-center justify-between">
                  <div>
                    <h3
                      onClick={() => onNavigate('recipe-detail', { recipeId: lunchRecipe.id })}
                      className="font-semibold text-sm text-slate-800 hover:text-emerald-700 cursor-pointer"
                    >
                      {lunchRecipe.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {lunchRecipe.categories.slice(0, 3).join(' • ')}
                    </p>
                  </div>
                  <button
                    onClick={() => onNavigate('recipe-detail', { recipeId: lunchRecipe.id })}
                    className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                  >
                    Kochen
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between text-xs text-slate-400 py-1">
                  <span>Kein Mittagessen für heute eingeplant.</span>
                  <button
                    onClick={() => onNavigate('planner')}
                    className="text-emerald-600 hover:underline font-medium"
                  >
                    Planen
                  </button>
                </div>
              )}
            </div>

            {/* Dinner Slot */}
            <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-50 transition-colors">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Abendessen
                </span>
                {dinnerRecipe && (
                  <span className="flex items-center gap-1 text-xs text-slate-500 font-medium">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {dinnerRecipe.prepTimeMinutes + dinnerRecipe.cookTimeMinutes} Min.
                  </span>
                )}
              </div>
              {dinnerRecipe ? (
                <div className="flex items-center justify-between">
                  <div>
                    <h3
                      onClick={() => onNavigate('recipe-detail', { recipeId: dinnerRecipe.id })}
                      className="font-semibold text-sm text-slate-800 hover:text-emerald-700 cursor-pointer"
                    >
                      {dinnerRecipe.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {dinnerRecipe.categories.slice(0, 3).join(' • ')}
                    </p>
                  </div>
                  <button
                    onClick={() => onNavigate('recipe-detail', { recipeId: dinnerRecipe.id })}
                    className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                  >
                    Kochen
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between text-xs text-slate-400 py-1">
                  <span>Kein Abendessen für heute eingeplant.</span>
                  <button
                    onClick={() => onNavigate('planner')}
                    className="text-emerald-600 hover:underline font-medium"
                  >
                    Planen
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Card: Schnellzugriff Einkaufsliste */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-teal-50 text-teal-600">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-800 text-base">Einkaufsliste</h2>
                  <span className="text-xs text-slate-500 font-medium">
                    {uncheckedItems.length} offene Artikel
                  </span>
                </div>
              </div>
              <button
                onClick={() => onNavigate('shopping')}
                className="text-xs text-teal-600 hover:text-teal-700 font-semibold flex items-center gap-1"
              >
                <span>Öffnen</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Quick Add Line */}
            <form onSubmit={handleQuickAdd} className="mt-3 flex gap-2">
              <input
                type="text"
                placeholder="Schnell Artikel hinzufügen (z.B. Milch)..."
                value={quickItemText}
                onChange={(e) => setQuickItemText(e.target.value)}
                className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
              />
              <button
                type="submit"
                disabled={!quickItemText.trim()}
                className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                <span>Hinzufügen</span>
              </button>
            </form>

            {/* Top 3 Unchecked items preview */}
            <div className="mt-3 space-y-1.5">
              {uncheckedItems.slice(0, 3).map((item) => (
                <div
                  key={item.id}
                  onClick={() => toggleShoppingItem(item.id)}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 cursor-pointer text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-4 h-4 rounded border border-slate-300 flex items-center justify-center bg-white hover:border-teal-500">
                      {item.checked && <Check className="w-3 h-3 text-teal-600" />}
                    </div>
                    <span className="font-medium text-slate-700">
                      {item.amount} {item.unit} {item.name}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400">{item.category}</span>
                </div>
              ))}
              {uncheckedItems.length === 0 && (
                <p className="text-xs text-slate-400 py-3 text-center">
                  Super! Alles erledigt auf der Einkaufsliste.
                </p>
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Echtzeit-Synchronisiert mit Familie</span>
            <button
              onClick={() => onNavigate('shopping')}
              className="text-teal-600 font-semibold hover:underline"
            >
              Supermarkt-Modus starten →
            </button>
          </div>
        </div>
      </div>

      {/* Ernährungstipp des Tages */}
      <div className="bg-gradient-to-br from-amber-50/70 via-orange-50/50 to-white rounded-2xl border border-amber-200/70 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 bg-amber-500 text-white rounded-xl shadow-xs mt-0.5 sm:mt-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="space-y-1 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
                  Ernährungstipp des Tages
                </span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs font-medium text-slate-600">
                  {nutritionTip.ingredient}
                </span>
              </div>
              <h3 className="font-bold text-slate-800 text-sm sm:text-base">
                {nutritionTip.title}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {nutritionTip.highlight}
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigate('nutrition')}
            className="shrink-0 px-4 py-2 bg-white border border-amber-200 hover:bg-amber-100/50 text-amber-800 text-xs font-semibold rounded-xl transition-colors shadow-2xs flex items-center gap-1.5"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Mehr erfahren</span>
          </button>
        </div>

        <div className="mt-4 pt-3 border-t border-amber-200/50 flex items-center gap-2 text-[11px] text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>{nutritionTip.disclaimer}</span>
        </div>
      </div>
    </div>
  );
};
