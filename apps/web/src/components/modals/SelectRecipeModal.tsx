import React, { useState } from 'react';
import { X, Search, Clock, Users, Utensils, Check } from 'lucide-react';
import { useHousehold } from '../../context/HouseholdContext';
import type { DayOfWeek, MealSlotType, Recipe } from '@essensplaner/shared';

interface SelectRecipeModalProps {
  isOpen: boolean;
  targetDay: DayOfWeek | null;
  targetSlot: MealSlotType | null;
  onClose: () => void;
  onSelect: (recipe: Recipe) => void;
}

export const SelectRecipeModal: React.FC<SelectRecipeModalProps> = ({
  isOpen,
  targetDay,
  targetSlot,
  onClose,
  onSelect,
}) => {
  const { recipes } = useHousehold();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Alle');

  if (!isOpen || !targetDay || !targetSlot) return null;

  const categories = ['Alle', 'Pasta', 'Veggie', 'Quick', 'Curry', 'Fisch', 'Salat', 'Klassiker'];

  const filteredRecipes = recipes.filter((r) => {
    const matchesSearch =
      r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.categories.some((c) => c.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory =
      selectedCategory === 'Alle' || r.categories.includes(selectedCategory);
    return matchesSearch && matchesCategory;
  });

  const slotTitle = targetSlot === 'lunch' ? 'Mittagessen' : 'Abendessen';
  const dayNameGerman: Record<DayOfWeek, string> = {
    monday: 'Montag',
    tuesday: 'Dienstag',
    wednesday: 'Mittwoch',
    thursday: 'Donnerstag',
    friday: 'Freitag',
    saturday: 'Samstag',
    sunday: 'Sonntag',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="font-bold text-slate-800 text-lg">Rezept auswählen</h3>
            <p className="text-xs text-slate-500">
              Für {dayNameGerman[targetDay]}, {slotTitle}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-200/60 transition-colors text-slate-400 hover:text-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="p-4 border-b border-slate-100 space-y-3 bg-white">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Rezept suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
            />
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 text-xs rounded-full whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? 'bg-emerald-600 text-white font-medium'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Recipe List */}
        <div className="p-4 overflow-y-auto space-y-2">
          {filteredRecipes.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              Keine passenden Rezepte gefunden.
            </div>
          ) : (
            filteredRecipes.map((recipe) => (
              <div
                key={recipe.id}
                onClick={() => {
                  onSelect(recipe);
                  onClose();
                }}
                className="group p-3 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/20 cursor-pointer transition-all flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {recipe.photoUrl ? (
                    <img
                      src={recipe.photoUrl}
                      alt={recipe.title}
                      className="w-14 h-14 rounded-lg object-cover shrink-0 border border-slate-200"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                      <Utensils className="w-6 h-6" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <h4 className="font-semibold text-sm text-slate-800 group-hover:text-emerald-700 truncate">
                      {recipe.title}
                    </h4>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {recipe.prepTimeMinutes + recipe.cookTimeMinutes} Min.
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {recipe.servings} Port.
                      </span>
                      {recipe.categories.slice(0, 2).map((c) => (
                        <span
                          key={c}
                          className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px]"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <button className="p-2 rounded-lg bg-slate-100 text-slate-500 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <Check className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
