import React, { useState, useMemo } from 'react';
import {
  Check,
  Plus,
  Trash2,
  Wifi,
  WifiOff,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';
import { useHousehold } from '../../context/HouseholdContext';
import { STANDARD_INGREDIENT_CATEGORIES } from '@essensplaner/shared';
import type { StandardIngredientCategory } from '@essensplaner/shared';

const AISLE_ORDER: readonly StandardIngredientCategory[] = STANDARD_INGREDIENT_CATEGORIES;

export const ShoppingListScreen: React.FC = () => {
  const {
    shoppingList,
    isOnline,
    addShoppingItem,
    toggleShoppingItem,
    removeShoppingItem,
    clearCompletedShoppingItems,
  } = useHousehold();

  // Quick add inputs
  const [name, setName] = useState('');
  const [amount, setAmount] = useState<number>(1);
  const [unit, setUnit] = useState('Stück');
  const [category, setCategory] = useState<string>('Obst & Gemüse');
  const [isAdding, setIsAdding] = useState(false);

  // Group items by supermarket aisle
  const groupedItems = useMemo(() => {
    const map = new Map<string, typeof shoppingList>();

    // Initialize all aisles in order
    AISLE_ORDER.forEach((aisle) => map.set(aisle, []));
    map.set('Sonstiges', []);

    // Fill with actual items
    shoppingList.forEach((item) => {
      const targetCategory = map.has(item.category) ? item.category : 'Sonstiges';
      map.get(targetCategory)?.push(item);
    });

    // Return only groups that have items
    const result: { aisle: string; items: typeof shoppingList }[] = [];
    map.forEach((items, aisle) => {
      if (items.length > 0) {
        // Sort unchecked first, then checked
        const sorted = [...items].sort((a, b) => Number(a.checked) - Number(b.checked));
        result.push({ aisle, items: sorted });
      }
    });

    return result;
  }, [shoppingList]);

  const totalCount = shoppingList.length;
  const completedCount = shoppingList.filter((i) => i.checked).length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsAdding(true);
    try {
      await addShoppingItem(name.trim(), Number(amount) || 1, unit.trim() || 'Stück', category);
      setName('');
      setAmount(1);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto pb-20">
      {/* Header with Offline / Online Badge */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
              Supermarkt-Modus
            </span>
            <span className="text-slate-300">•</span>
            {isOnline ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <Wifi className="w-3 h-3 text-emerald-600" />
                <span>Echtzeit synchronisiert</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                <WifiOff className="w-3 h-3 text-amber-600" />
                <span>Offline – Gespeichert</span>
              </span>
            )}
          </div>
          <h1 className="text-2xl font-black text-slate-800">Einkaufsliste</h1>
        </div>

        {/* Progress & Clear Completed */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <div className="text-right">
            <div className="text-xs font-bold text-slate-700">
              {completedCount} von {totalCount} erledigt
            </div>
            <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden mt-1">
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {completedCount > 0 && (
            <button
              onClick={clearCompletedShoppingItems}
              className="px-3 py-1.5 bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-600 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Erledigte aufräumen</span>
            </button>
          )}
        </div>
      </div>

      {/* Quick Add Form Bar */}
      <form
        onSubmit={handleAddItem}
        className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-3"
      >
        <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Artikel schnell hinzufügen
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
          {/* Amount */}
          <div className="sm:col-span-2">
            <input
              type="number"
              step="any"
              min="0.1"
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 1)}
              placeholder="Menge"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-center focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
            />
          </div>

          {/* Unit */}
          <div className="sm:col-span-2">
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
            >
              <option value="Stück">Stück</option>
              <option value="g">g</option>
              <option value="kg">kg</option>
              <option value="ml">ml</option>
              <option value="Liter">Liter</option>
              <option value="Packung">Packung</option>
              <option value="Bund">Bund</option>
              <option value="Dose">Dose</option>
              <option value="Glas">Glas</option>
            </select>
          </div>

          {/* Item Name */}
          <div className="sm:col-span-5">
            <input
              type="text"
              placeholder="z.B. Hafermilch, Tomaten, Lachs..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
            />
          </div>

          {/* Category */}
          <div className="sm:col-span-3 flex gap-2">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
            >
              {AISLE_ORDER.map((aisle) => (
                <option key={aisle} value={aisle}>
                  {aisle}
                </option>
              ))}
            </select>

            <button
              type="submit"
              disabled={isAdding || !name.trim()}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center shadow-xs"
              aria-label="Artikel hinzufügen"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </form>

      {/* Supermarket Aisles List */}
      <div className="space-y-4">
        {groupedItems.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-xs">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
              <ShoppingBag className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-slate-800 text-lg">Einkaufsliste ist leer</h3>
            <p className="text-slate-500 text-sm max-w-sm mx-auto mt-1">
              Füge oben neue Artikel hinzu oder generiere die Liste automatisch aus deinem
              Wochenplan.
            </p>
          </div>
        ) : (
          groupedItems.map(({ aisle, items }) => (
            <div
              key={aisle}
              className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-2xs"
            >
              {/* Aisle Title */}
              <div className="px-5 py-3 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
                <span className="font-bold text-xs uppercase tracking-wider text-slate-700">
                  {aisle}
                </span>
                <span className="text-xs font-semibold text-slate-400">
                  {items.filter((i) => !i.checked).length} offen
                </span>
              </div>

              {/* Items in this aisle */}
              <div className="divide-y divide-slate-100">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between p-3.5 sm:px-5 transition-colors group ${
                      item.checked
                        ? 'bg-slate-50/60 text-slate-400'
                        : 'hover:bg-emerald-50/20 text-slate-800'
                    }`}
                  >
                    <div
                      onClick={() => toggleShoppingItem(item.id)}
                      className="flex items-center gap-3.5 flex-1 cursor-pointer select-none"
                    >
                      {/* Checkbox with click animation */}
                      <div
                        className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                          item.checked
                            ? 'bg-emerald-600 border-emerald-600 text-white shadow-2xs scale-95'
                            : 'border-slate-300 bg-white hover:border-emerald-500'
                        }`}
                      >
                        {item.checked && <Check className="w-4 h-4 stroke-[3]" />}
                      </div>

                      <div className="min-w-0">
                        <span
                          className={`text-sm font-semibold transition-all ${
                            item.checked ? 'line-through text-slate-400' : 'text-slate-800'
                          }`}
                        >
                          {item.amount > 0 && `${item.amount} `}
                          {item.unit && item.unit !== 'Stück' && `${item.unit} `}
                          {item.name}
                        </span>

                        {item.source === 'plan' && (
                          <span className="ml-2 inline-flex items-center gap-0.5 text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                            <Sparkles className="w-2.5 h-2.5" /> Aus Plan
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => removeShoppingItem(item.id)}
                      className="p-1.5 text-slate-300 hover:text-red-500 rounded-lg transition-colors opacity-80 sm:opacity-0 sm:group-hover:opacity-100"
                      aria-label="Artikel löschen"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
