import React, { useState, useMemo } from 'react';
import { X, ShoppingBag, Check, CheckCircle2 } from 'lucide-react';
import { useHousehold } from '../../context/HouseholdContext';
import { generateShoppingListFromMealPlan } from '@essensplaner/shared';

interface GenerateShoppingListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (count: number) => void;
}

export const GenerateShoppingListModal: React.FC<GenerateShoppingListModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { mealPlan, recipes, generateShoppingList } = useHousehold();
  const [alreadyAtHome, setAlreadyAtHome] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Preview ingredients required by current meal plan
  const previewItems = useMemo(() => {
    if (!isOpen) return [];
    return generateShoppingListFromMealPlan(mealPlan, recipes, [], [], {
      excludeStaples: true,
      userId: 'preview',
    });
  }, [mealPlan, recipes, isOpen]);

  if (!isOpen) return null;

  const toggleAtHome = (canonicalId: string) => {
    setAlreadyAtHome((prev) => {
      const next = new Set(prev);
      if (next.has(canonicalId)) {
        next.delete(canonicalId);
      } else {
        next.add(canonicalId);
      }
      return next;
    });
  };

  const handleGenerate = async () => {
    setIsSubmitting(true);
    try {
      const count = await generateShoppingList(Array.from(alreadyAtHome));
      onSuccess(count);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const neededCount = previewItems.length - alreadyAtHome.size;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg">Einkaufsliste generieren</h3>
              <p className="text-xs text-slate-500">
                Wochenplan-Zutaten mit deinem Vorrat abgleichen
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-200/60 transition-colors text-slate-400 hover:text-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Prompt */}
        <div className="p-5 border-b border-slate-100 bg-emerald-50/50">
          <p className="text-sm text-emerald-950 font-medium">
            Folgende Zutaten werden für deinen Wochenplan benötigt. Hast du davon schon etwas da?
          </p>
          <p className="text-xs text-emerald-700 mt-1">
            Tippe auf Artikel, die du bereits im Haus hast, damit sie nicht doppelt gekauft werden.
          </p>
        </div>

        {/* Items List */}
        <div className="p-4 overflow-y-auto divide-y divide-slate-100 space-y-1">
          {previewItems.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">
              Aktuell sind keine Gerichte mit Zutaten im Wochenplan hinterlegt.
            </div>
          ) : (
            previewItems.map((item) => {
              const isChecked = alreadyAtHome.has(item.canonicalId);
              return (
                <div
                  key={item.id}
                  onClick={() => toggleAtHome(item.canonicalId)}
                  className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors ${
                    isChecked
                      ? 'bg-slate-50 text-slate-400'
                      : 'hover:bg-emerald-50/40 text-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                        isChecked
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                    <span
                      className={`text-sm font-medium ${
                        isChecked ? 'line-through text-slate-400' : 'text-slate-800'
                      }`}
                    >
                      {item.amount} {item.unit} {item.name}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400">
                    {isChecked ? 'bereits da' : item.category}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500">
            {Math.max(0, neededCount)} neue Artikel auf die Liste
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-100 text-sm font-medium rounded-xl transition-colors"
            >
              Abbrechen
            </button>
            <button
              onClick={handleGenerate}
              disabled={isSubmitting || previewItems.length === 0}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors shadow-xs flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Wird erstellt...' : 'Liste erstellen'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
