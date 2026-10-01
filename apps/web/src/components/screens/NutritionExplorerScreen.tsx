import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  HeartPulse,
  ShieldCheck,
  Search,
  BookOpen,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { fetchNutritionKnowledge } from '../../services/api';
import type { IngredientsKnowledge } from '@essensplaner/shared';

const POPULAR_INGREDIENTS = [
  { id: 'tomate', name: 'Tomate', category: 'Gemüse' },
  { id: 'lachs', name: 'Lachs / Lachsforelle', category: 'Fisch' },
  { id: 'knoblauch', name: 'Knoblauch', category: 'Gewürz' },
  { id: 'kichererbsen', name: 'Kichererbsen', category: 'Hülsenfrucht' },
  { id: 'zitrone', name: 'Zitrone', category: 'Obst' },
  { id: 'olivenoel', name: 'Olivenöl', category: 'Öl' },
  { id: 'spinat', name: 'Babyspinat', category: 'Gemüse' },
  { id: 'ingwer', name: 'Ingwer', category: 'Wurzel' },
];

export const NutritionExplorerScreen: React.FC = () => {
  const [selectedId, setSelectedId] = useState<string>('tomate');
  const [data, setData] = useState<IngredientsKnowledge | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    fetchNutritionKnowledge(selectedId)
      .then((res) => {
        if (isMounted) setData(res);
      })
      .catch((err) => {
        if (isMounted) setError(err.message || 'Fehler beim Laden');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedId]);

  const handleCustomSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    const canonical = searchTerm.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
    setSelectedId(canonical);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-700 via-emerald-700 to-emerald-800 rounded-3xl p-6 sm:p-8 text-white shadow-lg space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-emerald-100 text-xs font-semibold">
          <BookOpen className="w-3.5 h-3.5" />
          <span>Wissenschaftlich fundiert</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black">Zutaten-Wissen & Ernährung</h1>
        <p className="text-emerald-100 text-sm max-w-2xl leading-relaxed">
          Entdecke die physiologischen Wirkungen alltäglicher Lebensmittel auf Zellgesundheit,
          Herz-Kreislauf-System, Darmmikrobiom und Energiehaushalt.
        </p>
      </div>

      {/* Ingredient Selector / Chips Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-3">
        <form onSubmit={handleCustomSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Beliebige Zutat suchen (z.B. Brokkoli, Haferflocken, Heidelbeeren)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition-colors shadow-xs"
          >
            Suchen
          </button>
        </form>

        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {POPULAR_INGREDIENTS.map((item) => (
            <button
              key={item.id}
              onClick={() => setSelectedId(item.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedId === item.id
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {item.name}
            </button>
          ))}
        </div>
      </div>

      {/* Detail Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">
        {loading && (
          <div className="py-16 text-center text-slate-500 flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            <p className="text-sm">Analysiere Nährstoffprofil und physiologische Effekte...</p>
          </div>
        )}

        {error && (
          <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl flex items-center gap-2 text-sm">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!loading && data && (
          <>
            {/* Title & Badge */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                    Physiologisches Profil
                  </span>
                  <h2 className="text-2xl font-black text-slate-800">{data.name}</h2>
                </div>
              </div>
            </div>

            {/* Health Benefits Section */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                <HeartPulse className="w-4 h-4 text-emerald-600" />
                <span>Wirkung im menschlichen Körper</span>
              </div>
              <div className="bg-emerald-50/70 border border-emerald-100/90 rounded-2xl p-5 text-slate-700 leading-relaxed text-sm sm:text-base">
                {data.healthBenefits}
              </div>
            </div>

            {/* Nutritional Highlights */}
            {data.nutritionalHighlights && (
              <div className="space-y-2">
                <h3 className="font-bold text-slate-800 text-sm">Wichtige Nährstoff-Highlights</h3>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 text-sm text-slate-600 leading-relaxed">
                  {data.nutritionalHighlights}
                </div>
              </div>
            )}

            {/* Vitamins & Minerals Chips */}
            {data.vitaminsAndMinerals && data.vitaminsAndMinerals.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-bold text-slate-800 text-sm">Enthaltene Mikronährstoffe</h3>
                <div className="flex flex-wrap gap-2">
                  {data.vitaminsAndMinerals.map((vm, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200/70"
                    >
                      {vm}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Prominent Legal Disclaimer */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-start gap-3 text-xs text-slate-500">
              <ShieldCheck className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                <span className="font-bold text-slate-700">Wichtiger rechtlicher Hinweis: </span>
                {data.disclaimer ||
                  'Kein medizinischer Ratschlag. Die Angaben dienen ausschließlich der allgemeinen Information und ersetzen keine professionelle ärztliche oder ernährungstherapeutische Beratung.'}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
