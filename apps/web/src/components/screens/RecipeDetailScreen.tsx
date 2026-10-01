import React, { useState, useRef } from 'react';
import {
  ArrowLeft,
  Clock,
  Users,
  Camera,
  Trash2,
  CalendarPlus,
  Share2,
  Info,
  CheckCircle2,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { useHousehold } from '../../context/HouseholdContext';
import { uploadRecipePhoto } from '../../services/storage';
import { IngredientNutritionModal } from '../modals/IngredientNutritionModal';
import type { DayOfWeek, MealSlotType } from '@essensplaner/shared';

interface RecipeDetailScreenProps {
  recipeId: string;
  onBack: () => void;
  onNavigateToPlanner: () => void;
}

export const RecipeDetailScreen: React.FC<RecipeDetailScreenProps> = ({
  recipeId,
  onBack,
  onNavigateToPlanner,
}) => {
  const { recipes, updateRecipe, deleteRecipe, setMealSlot } = useHousehold();
  const recipe = recipes.find((r) => r.id === recipeId);

  // Scaler for servings
  const baseServings = recipe?.servings || 4;
  const [servings, setServings] = useState<number>(baseServings);

  // Nutrition Modal
  const [selectedIngredient, setSelectedIngredient] = useState<{
    canonicalId: string;
    name: string;
  } | null>(null);

  // Photo Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [cookedSuccess, setCookedSuccess] = useState(false);

  // Set in planner popover / quick pick
  const [showPlanPicker, setShowPlanPicker] = useState(false);
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>('monday');
  const [selectedSlot, setSelectedSlot] = useState<MealSlotType>('dinner');
  const [planSuccess, setPlanSuccess] = useState(false);

  if (!recipe) {
    return (
      <div className="py-16 text-center space-y-4">
        <p className="text-slate-500">Rezept nicht gefunden.</p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold"
        >
          Zurück zum Katalog
        </button>
      </div>
    );
  }

  // Portion multiplier
  const ratio = servings / (baseServings || 1);

  // Handle Photo Upload with Client-Side WebP Compression
  const handlePhotoSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    try {
      const photoUrl = await uploadRecipePhoto(file);
      const updated = {
        ...recipe,
        photoUrl,
        lastCookedAt: new Date().toISOString(),
      };
      await updateRecipe(updated);
      setCookedSuccess(true);
      setTimeout(() => setCookedSuccess(false), 5000);
    } catch (err) {
      console.warn('Upload error:', err);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleSetInPlan = async () => {
    await setMealSlot(selectedDay, selectedSlot, recipe.id);
    setShowPlanPicker(false);
    setPlanSuccess(true);
    setTimeout(() => setPlanSuccess(false), 4000);
  };

  const handleDelete = async () => {
    if (window.confirm(`Möchtest du "${recipe.title}" wirklich löschen?`)) {
      await deleteRecipe(recipe.id);
      onBack();
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: recipe.title,
          text: `Schau dir dieses Rezept an: ${recipe.title}`,
          url: window.location.href,
        })
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link in die Zwischenablage kopiert!');
    }
  };

  const dayGermanNames: Record<DayOfWeek, string> = {
    monday: 'Montag',
    tuesday: 'Dienstag',
    wednesday: 'Mittwoch',
    thursday: 'Donnerstag',
    friday: 'Freitag',
    saturday: 'Samstag',
    sunday: 'Sonntag',
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto pb-20">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs sm:text-sm font-semibold transition-colors shadow-2xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Zurück</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={handleShare}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 transition-colors"
            title="Teilen"
          >
            <Share2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleDelete}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-red-600 transition-colors"
            title="Rezept löschen"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Hero Image & Cooking Status */}
      <div className="relative rounded-3xl overflow-hidden bg-slate-900 shadow-lg min-h-[260px] sm:min-h-[340px] flex items-end">
        {recipe.photoUrl ? (
          <img
            src={recipe.photoUrl}
            alt={recipe.title}
            className="absolute inset-0 w-full h-full object-cover opacity-85"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-tr from-emerald-800 to-teal-950" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent" />

        {/* Hero Overlay Content */}
        <div className="relative z-10 p-6 sm:p-8 text-white w-full space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {recipe.categories.map((c) => (
              <span
                key={c}
                className="px-2.5 py-0.5 rounded-md bg-white/20 backdrop-blur-xs text-xs font-semibold text-emerald-100"
              >
                {c}
              </span>
            ))}
            {recipe.sourceUrl && (
              <a
                href={recipe.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-emerald-300 hover:underline bg-black/40 px-2 py-0.5 rounded-md backdrop-blur-xs"
              >
                <span>Originalquelle</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight">
            {recipe.title}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-slate-200 pt-1">
            <span className="flex items-center gap-1.5 font-medium">
              <Clock className="w-4 h-4 text-emerald-400" />
              {recipe.prepTimeMinutes + recipe.cookTimeMinutes} Min. Gesamtzeit ({recipe.prepTimeMinutes}m Vorb. + {recipe.cookTimeMinutes}m Kochen)
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <Users className="w-4 h-4 text-emerald-400" />
              {baseServings} Basis-Portionen
            </span>
          </div>
        </div>

        {/* Cooked Photo Upload Button */}
        <div className="absolute top-4 right-4 z-20">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handlePhotoSelected}
            accept="image/*"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingPhoto}
            className="px-3.5 py-2 bg-slate-900/80 hover:bg-slate-900 text-white backdrop-blur-md rounded-xl text-xs font-semibold border border-white/20 flex items-center gap-1.5 transition-all shadow-md"
          >
            {isUploadingPhoto ? (
              <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
            ) : (
              <Camera className="w-4 h-4 text-emerald-400" />
            )}
            <span>{isUploadingPhoto ? 'Komprimiere...' : 'Gekocht! Foto hochladen'}</span>
          </button>
        </div>
      </div>

      {/* Success Messages */}
      {cookedSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-2 text-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <span>Großartig! Dein WebP-Foto wurde gespeichert und das Rezept als gekocht markiert.</span>
        </div>
      )}

      {planSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>Rezept wurde in deinen Wochenplan eingetragen!</span>
          </div>
          <button
            onClick={onNavigateToPlanner}
            className="text-xs font-bold underline text-emerald-900"
          >
            Zum Wochenplan →
          </button>
        </div>
      )}

      {/* Action Buttons: Set in Plan */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex items-center justify-between">
        <div>
          <h3 className="font-bold text-sm text-slate-800">Mahlzeiten-Planung</h3>
          <p className="text-xs text-slate-500">Plane dieses Gericht für eine bestimmte Mahlzeit ein</p>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowPlanPicker(!showPlanPicker)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold rounded-xl transition-all shadow-xs flex items-center gap-2"
          >
            <CalendarPlus className="w-4 h-4" />
            <span>In Wochenplan setzen</span>
          </button>

          {/* Plan Picker Dropdown */}
          {showPlanPicker && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 z-30 space-y-3 animate-fade-in">
              <span className="text-xs font-bold text-slate-700 block">Tag & Mahlzeit wählen</span>
              <div>
                <label className="text-[11px] text-slate-500 block mb-1">Tag</label>
                <select
                  value={selectedDay}
                  onChange={(e) => setSelectedDay(e.target.value as DayOfWeek)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                >
                  {(Object.keys(dayGermanNames) as DayOfWeek[]).map((d) => (
                    <option key={d} value={d}>
                      {dayGermanNames[d]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] text-slate-500 block mb-1">Slot</label>
                <select
                  value={selectedSlot}
                  onChange={(e) => setSelectedSlot(e.target.value as MealSlotType)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                >
                  <option value="lunch">Mittagessen</option>
                  <option value="dinner">Abendessen</option>
                </select>
              </div>

              <button
                onClick={handleSetInPlan}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl"
              >
                Bestätigen
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Grid: Ingredients with Dynamic Portion Scaler & Instructions */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left Column: Ingredients with Portion Scaler */}
        <div className="md:col-span-5 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="font-bold text-slate-800 text-base">Zutaten</h2>
              <p className="text-[11px] text-slate-400">Tippe auf eine Zutat für Nährstoffwissen</p>
            </div>

            {/* Dynamic Portion Calculator */}
            <div className="flex items-center bg-slate-100 rounded-xl p-1 text-xs">
              <button
                onClick={() => setServings((s) => Math.max(1, s - 1))}
                className="w-6 h-6 rounded-lg bg-white shadow-2xs font-bold text-slate-700 hover:bg-slate-50 flex items-center justify-center"
              >
                -
              </button>
              <span className="px-2.5 font-bold text-slate-800">{servings} Port.</span>
              <button
                onClick={() => setServings((s) => s + 1)}
                className="w-6 h-6 rounded-lg bg-white shadow-2xs font-bold text-slate-700 hover:bg-slate-50 flex items-center justify-center"
              >
                +
              </button>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {recipe.ingredients.map((ing, idx) => {
              const scaledAmount = ing.amount ? Math.round(ing.amount * ratio * 10) / 10 : null;
              return (
                <div
                  key={idx}
                  onClick={() =>
                    setSelectedIngredient({
                      canonicalId: ing.canonicalId,
                      name: ing.displayName,
                    })
                  }
                  className="py-2.5 flex items-center justify-between cursor-pointer hover:bg-emerald-50/30 px-2 -mx-2 rounded-lg transition-colors group"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                    <span className="text-xs sm:text-sm font-semibold text-slate-800 group-hover:text-emerald-700">
                      {ing.displayName}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-bold text-emerald-700">
                      {scaledAmount !== null && `${scaledAmount} `}
                      {ing.unit}
                    </span>
                    <Info className="w-3.5 h-3.5 text-slate-300 group-hover:text-emerald-500 transition-colors" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Numbered Instructions */}
        <div className="md:col-span-7 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
          <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-bold text-slate-800 text-base">Zubereitungsschritte</h2>
            <span className="text-xs text-slate-400 font-medium">
              {recipe.instructions.length} Schritte
            </span>
          </div>

          <div className="space-y-4">
            {recipe.instructions.map((step, idx) => (
              <div key={idx} className="flex items-start gap-3.5 group">
                <span className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 border border-emerald-100 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  {idx + 1}
                </span>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed pt-0.5">
                  {step}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Ingredient Nutrition Knowledge Modal */}
      <IngredientNutritionModal
        canonicalId={selectedIngredient?.canonicalId || null}
        ingredientName={selectedIngredient?.name}
        onClose={() => setSelectedIngredient(null)}
      />
    </div>
  );
};
