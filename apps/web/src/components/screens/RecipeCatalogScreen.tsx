import React, { useState } from 'react';
import {
  Search,
  Plus,
  Clock,
  Users,
  Utensils,
  Sun,
  Moon,
  Sparkles,
} from 'lucide-react';
import { useHousehold } from '../../context/HouseholdContext';

interface RecipeCatalogScreenProps {
  onSelectRecipe: (recipeId: string) => void;
  onOpenImport: () => void;
}

export const RecipeCatalogScreen: React.FC<RecipeCatalogScreenProps> = ({
  onSelectRecipe,
  onOpenImport,
}) => {
  const { recipes } = useHousehold();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('Alle');

  const filterTags = [
    'Alle',
    'Quick',
    'Veggie',
    'Pasta',
    'Curry',
    'Fisch',
    'Geflügel',
    'Salat',
    'Klassiker',
    'Glutenfrei',
  ];

  const filtered = recipes.filter((r) => {
    const matchesSearch =
      r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.ingredients.some((i) => i.displayName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      r.categories.some((c) => c.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesTag =
      selectedTag === 'Alle' || r.categories.includes(selectedTag);

    return matchesSearch && matchesTag;
  });

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto pb-16">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
            Rezeptsammlung
          </span>
          <h1 className="text-2xl font-black text-slate-800">
            Rezeptkatalog ({recipes.length})
          </h1>
        </div>

        <button
          onClick={onOpenImport}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-xs flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Neues Rezept hinzufügen</span>
        </button>
      </div>

      {/* Search Bar & Tag Filters */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Rezepte oder Zutaten durchsuchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {filterTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl whitespace-nowrap transition-colors ${
                selectedTag === tag
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Recipe Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.length === 0 ? (
          <div className="col-span-full py-16 text-center bg-white rounded-2xl border border-slate-200/80 p-8 shadow-xs">
            <Utensils className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="font-bold text-slate-700 text-base">Keine Rezepte gefunden</h3>
            <p className="text-slate-400 text-sm mt-1">
              Passe deine Suche an oder importiere ein neues Rezept.
            </p>
          </div>
        ) : (
          filtered.map((recipe) => {
            const totalMinutes = recipe.prepTimeMinutes + recipe.cookTimeMinutes;
            return (
              <div
                key={recipe.id}
                onClick={() => onSelectRecipe(recipe.id)}
                className="group bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-2xs hover:shadow-md hover:border-emerald-500 transition-all cursor-pointer flex flex-col justify-between"
              >
                {/* Image Banner */}
                <div className="relative h-44 bg-slate-100 overflow-hidden">
                  {recipe.photoUrl ? (
                    <img
                      src={recipe.photoUrl}
                      alt={recipe.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-emerald-600 bg-emerald-50/50">
                      <Utensils className="w-10 h-10 mb-1 opacity-80" />
                      <span className="text-xs font-semibold">Kein Foto</span>
                    </div>
                  )}

                  {/* Slot Badges (Lunch/Dinner) */}
                  <div className="absolute top-3 left-3 flex gap-1.5">
                    {recipe.isLunch && (
                      <span className="px-2 py-0.5 rounded-md bg-white/90 backdrop-blur-xs text-[10px] font-bold text-amber-700 shadow-2xs flex items-center gap-1">
                        <Sun className="w-3 h-3 text-amber-500" />
                        <span>Mittag</span>
                      </span>
                    )}
                    {recipe.isDinner && (
                      <span className="px-2 py-0.5 rounded-md bg-white/90 backdrop-blur-xs text-[10px] font-bold text-indigo-700 shadow-2xs flex items-center gap-1">
                        <Moon className="w-3 h-3 text-indigo-500" />
                        <span>Abend</span>
                      </span>
                    )}
                  </div>

                  {/* Cooked Badge */}
                  {recipe.lastCookedAt && (
                    <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-slate-900/75 backdrop-blur-xs text-[10px] font-medium text-white shadow-2xs flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-emerald-400" />
                      <span>Bereits gekocht</span>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <h3 className="font-bold text-base text-slate-800 group-hover:text-emerald-700 transition-colors line-clamp-2">
                      {recipe.title}
                    </h3>

                    {/* Categories chips */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {recipe.categories.map((c) => (
                        <span
                          key={c}
                          className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[11px] font-medium"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Footer Meta */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1 font-medium">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {totalMinutes} Min.
                    </span>
                    <span className="flex items-center gap-1 font-medium">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      {recipe.servings} Portionen
                    </span>
                    <span className="text-emerald-600 font-semibold text-xs group-hover:translate-x-0.5 transition-transform">
                      Details →
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
