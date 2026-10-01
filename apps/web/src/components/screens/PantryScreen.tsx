import React, { useState } from 'react';
import {
  Archive,
  Plus,
  Trash2,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  Info,
} from 'lucide-react';
import { useHousehold } from '../../context/HouseholdContext';

interface PantryScreenProps {
  onNavigateToShopping: () => void;
}

export const PantryScreen: React.FC<PantryScreenProps> = ({ onNavigateToShopping }) => {
  const { pantryItems, togglePantryItem, addPantryItem, removePantryItem } = useHousehold();
  const [newStapleName, setNewStapleName] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const inStockCount = pantryItems.filter((p) => p.inStock).length;
  const depletedCount = pantryItems.length - inStockCount;

  const handleAddStaple = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStapleName.trim()) return;

    setIsAdding(true);
    try {
      await addPantryItem(newStapleName.trim());
      setNewStapleName('');
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto pb-20">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
            Never Out of Stock
          </span>
          <h1 className="text-2xl font-black text-slate-800">Vorratskammer (Pantry)</h1>
          <p className="text-xs text-slate-500 mt-1">
            Basis-Zutaten, die immer im Haus sein sollten und beim Kochen vorausgesetzt werden.
          </p>
        </div>

        {/* Counter */}
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100">
            <CheckCircle className="w-4 h-4" />
            <span>{inStockCount} Vorhanden</span>
          </span>
          {depletedCount > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-50 text-amber-700 text-xs font-bold border border-amber-100">
              <AlertTriangle className="w-4 h-4" />
              <span>{depletedCount} Aufgebraucht</span>
            </span>
          )}
        </div>
      </div>

      {/* Explanation Banner */}
      <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-100/80 flex items-start gap-3 text-xs text-emerald-900">
        <Info className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold">Automatischer Einkaufslisten-Abgleich:</p>
          <p>
            Wenn du einen Vorratsartikel als &ldquo;Aufgebraucht&rdquo; markierst, wird er
            automatisch auf deine Live-Einkaufsliste gesetzt. Bei der Generierung des Wochenplans
            werden diese Basics als vorhanden angenommen, solange sie hier grün markiert sind.
          </p>
        </div>
      </div>

      {/* Add Custom Staple Bar */}
      <form
        onSubmit={handleAddStaple}
        className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex gap-2"
      >
        <input
          type="text"
          placeholder="Eigenen Basis-Vorrat ergänzen (z.B. Sojasauce, Senf)..."
          value={newStapleName}
          onChange={(e) => setNewStapleName(e.target.value)}
          className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
        />
        <button
          type="submit"
          disabled={isAdding || !newStapleName.trim()}
          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5 shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Hinzufügen</span>
        </button>
      </form>

      {/* Pantry Items Grid */}
      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-2xs">
        <div className="p-4 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
          <span className="font-bold text-xs uppercase tracking-wider text-slate-700">
            Deine Vorrats-Basics ({pantryItems.length})
          </span>
          <button
            onClick={onNavigateToShopping}
            className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1"
          >
            <span>Zur Einkaufsliste</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {pantryItems.map((item) => (
            <div
              key={item.id}
              className="p-3.5 sm:px-5 flex items-center justify-between hover:bg-slate-50/70 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    item.inStock
                      ? 'bg-emerald-50 text-emerald-600'
                      : 'bg-amber-50 text-amber-600'
                  }`}
                >
                  <Archive className="w-4 h-4" />
                </div>
                <div>
                  <h4
                    className={`text-sm font-bold ${
                      item.inStock ? 'text-slate-800' : 'text-slate-500 line-through'
                    }`}
                  >
                    {item.name}
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    {item.inStock ? 'Im Haushalt vorrätig' : 'Aufgebraucht (steht auf Einkaufsliste)'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Toggle Button: Vorhanden vs Aufgebraucht */}
                <button
                  onClick={() => togglePantryItem(item.id, true)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    item.inStock
                      ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                      : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                  }`}
                >
                  {item.inStock ? 'Vorhanden' : 'Aufgebraucht'}
                </button>

                <button
                  onClick={() => removePantryItem(item.id)}
                  className="p-1.5 text-slate-300 hover:text-red-500 rounded-lg opacity-80 sm:opacity-0 sm:group-hover:opacity-100 transition-colors"
                  title="Aus Vorratskammer entfernen"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
