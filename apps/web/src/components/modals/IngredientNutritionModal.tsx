import React, { useEffect, useState } from 'react';
import { X, Sparkles, AlertCircle, ShieldCheck, HeartPulse, Loader2 } from 'lucide-react';
import type { IngredientsKnowledge } from '@essensplaner/shared';
import { fetchNutritionKnowledge } from '../../services/api';

interface IngredientNutritionModalProps {
  canonicalId: string | null;
  ingredientName?: string;
  onClose: () => void;
}

export const IngredientNutritionModal: React.FC<IngredientNutritionModalProps> = ({
  canonicalId,
  ingredientName,
  onClose,
}) => {
  const [data, setData] = useState<IngredientsKnowledge | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canonicalId) {
      setData(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    fetchNutritionKnowledge(canonicalId)
      .then((result) => {
        if (isMounted) setData(result);
      })
      .catch((err) => {
        if (isMounted) setError(err.message || 'Ernährungsdaten konnten nicht geladen werden.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [canonicalId]);

  if (!canonicalId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <Sparkles className="w-5 h-5 text-emerald-100" />
            </div>
            <div>
              <span className="text-xs font-medium uppercase tracking-wider text-emerald-200">
                Ernährungswissen & Physiologie
              </span>
              <h3 className="text-xl font-bold">
                {ingredientName || data?.name || canonicalId}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 transition-colors text-white"
            aria-label="Schließen"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {loading && (
            <div className="py-12 flex flex-col items-center justify-center text-slate-500 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
              <p className="text-sm">Analysiere physiologische Nährstoffwirkungen...</p>
            </div>
          )}

          {error && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Hinweis</p>
                <p>{error}</p>
              </div>
            </div>
          )}

          {!loading && data && (
            <>
              {/* Health Benefits */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-emerald-800 font-semibold text-sm">
                  <HeartPulse className="w-4 h-4 text-emerald-600" />
                  <span>Wirkung im Körper</span>
                </div>
                <div className="bg-emerald-50/70 border border-emerald-100/80 rounded-xl p-4 text-slate-700 leading-relaxed text-sm">
                  {data.healthBenefits}
                </div>
              </div>

              {/* Highlights */}
              {data.nutritionalHighlights && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-slate-800 text-sm">Nährstoff-Highlights</h4>
                  <p className="text-slate-600 text-sm bg-slate-50 p-3.5 rounded-xl border border-slate-200/70">
                    {data.nutritionalHighlights}
                  </p>
                </div>
              )}

              {/* Vitamins & Minerals Chips */}
              {data.vitaminsAndMinerals && data.vitaminsAndMinerals.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-slate-800 text-sm">Vitamine & Mineralstoffe</h4>
                  <div className="flex flex-wrap gap-2">
                    {data.vitaminsAndMinerals.map((item, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-teal-50 text-teal-700 border border-teal-200/60"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Prominent Legal Disclaimer */}
              <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl flex items-start gap-2.5 text-xs text-slate-500">
                <ShieldCheck className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <p className="leading-normal">
                  <span className="font-semibold text-slate-700">Wichtiger rechtlicher Hinweis: </span>
                  {data.disclaimer ||
                    'Kein medizinischer Ratschlag. Die Angaben dienen ausschließlich der allgemeinen Information.'}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-medium text-sm rounded-xl transition-colors shadow-xs"
          >
            Verstanden
          </button>
        </div>
      </div>
    </div>
  );
};
