import React, { useState } from 'react';
import {
  Users,
  Copy,
  Calendar,
  CheckCircle2,
  Clock,
  Shield,
  Plus,
} from 'lucide-react';
import { useHousehold } from '../../context/HouseholdContext';
import type { Recipe } from '@essensplaner/shared';

interface SocialFriendsScreenProps {
  onNavigateToRecipe: (recipeId: string) => void;
}

export const SocialFriendsScreen: React.FC<SocialFriendsScreenProps> = ({
  onNavigateToRecipe,
}) => {
  const { friendHouseholds, forkRecipe, addFriendByCode } = useHousehold();
  const [friendCodeInput, setFriendCodeInput] = useState('');
  const [forkSuccess, setForkSuccess] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [selectedFriendIndex, setSelectedFriendIndex] = useState<number>(0);
  const activeFriend = friendHouseholds[selectedFriendIndex];

  const handleFork = async (recipe: Recipe) => {
    await forkRecipe(recipe);
    setForkSuccess(`"${recipe.title}" wurde erfolgreich in deine Sammlung kopiert!`);
    setTimeout(() => setForkSuccess(null), 5000);
  };

  const handleAddFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!friendCodeInput.trim()) return;

    const ok = await addFriendByCode(friendCodeInput.trim());
    if (ok) {
      setAddSuccess(`Freundhaushalt erfolgreich hinzugefügt!`);
      setFriendCodeInput('');
      setTimeout(() => setAddSuccess(null), 4000);
    } else {
      setError('Haushalts-Code nicht gefunden. Bitte überprüfe den 6-stelligen Code.');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto pb-20">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
            Social Sharing & Inspiration
          </span>
          <h1 className="text-2xl font-black text-slate-800">Freunde & Community</h1>
          <p className="text-xs text-slate-500 mt-1">
            Lass dich von den Wochenplänen deiner Freunde inspirieren und kopiere leckere Rezepte.
          </p>
        </div>

        {/* Add Friend by Code */}
        <form onSubmit={handleAddFriend} className="flex gap-2 w-full sm:w-auto">
          <input
            type="text"
            placeholder="6-stelliger Code (z.B. SCH481)"
            value={friendCodeInput}
            onChange={(e) => setFriendCodeInput(e.target.value.toUpperCase())}
            maxLength={8}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono uppercase tracking-wider focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Verbinden</span>
          </button>
        </form>
      </div>

      {/* Notifications */}
      {forkSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-2 text-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{forkSuccess}</span>
        </div>
      )}

      {addSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-2 text-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{addSuccess}</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs">
          {error}
        </div>
      )}

      {/* Strict Privacy Notice Banner */}
      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/90 flex items-start gap-3 text-xs text-slate-600">
        <Shield className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-slate-800">Strikte Privatsphäre & Datentrennung: </span>
          Befreundete Haushalte sehen ausschließlich geteilte Rezepte und die Gerichtenamen deines
          Wochenplans. Deine persönliche Einkaufsliste und deine Vorratskammer sind zu 100%
          vertraulich und privat.
        </div>
      </div>

      {/* Friend Household Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-2 overflow-x-auto scrollbar-none">
        {friendHouseholds.map((friend, idx) => (
          <button
            key={friend.household.id}
            onClick={() => setSelectedFriendIndex(idx)}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors flex items-center gap-2 shrink-0 ${
              selectedFriendIndex === idx
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>{friend.household.name}</span>
          </button>
        ))}
      </div>

      {/* Friend's Profile & Content */}
      {activeFriend && (
        <div className="space-y-6">
          {/* Friend Meal Plan Section */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-800 text-base">
                    Was kocht {activeFriend.household.name} diese Woche?
                  </h2>
                  <p className="text-xs text-slate-400">
                    Aktueller Wochenplan ({activeFriend.mealPlan.weekId.replace('-W', ' KW ')})
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(activeFriend.mealPlan.days).map(([dayKey, dayPlan]) => {
                const dinner = dayPlan?.dinner;
                const lunch = dayPlan?.lunch;
                const germanDay =
                  dayKey === 'monday'
                    ? 'Montag'
                    : dayKey === 'tuesday'
                    ? 'Dienstag'
                    : dayKey === 'wednesday'
                    ? 'Mittwoch'
                    : dayKey === 'thursday'
                    ? 'Donnerstag'
                    : dayKey === 'friday'
                    ? 'Freitag'
                    : dayKey === 'saturday'
                    ? 'Samstag'
                    : 'Sonntag';

                return (
                  <div
                    key={dayKey}
                    className="p-3 bg-slate-50/70 border border-slate-200/70 rounded-xl space-y-1.5"
                  >
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {germanDay}
                    </span>
                    {dinner ? (
                      <div className="text-xs font-semibold text-slate-800 line-clamp-2">
                        {dinner.title}
                      </div>
                    ) : lunch ? (
                      <div className="text-xs font-semibold text-slate-800 line-clamp-2">
                        {lunch.title}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-400 italic">Nicht geplant</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Friend's Shared Recipes & 1-Click Fork Feature */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="font-bold text-slate-800 text-base">
                  Geteilte Rezepte von {activeFriend.household.name}
                </h2>
                <p className="text-xs text-slate-400">
                  Kopiere Rezepte mit 1 Klick in deine eigene Sammlung
                </p>
              </div>
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg">
                {activeFriend.recipes.length} Rezepte
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeFriend.recipes.map((rec) => (
                <div
                  key={rec.id}
                  className="p-4 rounded-xl border border-slate-200 hover:border-emerald-500 transition-colors flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {rec.categories.join(' • ')}
                      </span>
                      <span className="flex items-center gap-1 text-[11px] text-slate-500">
                        <Clock className="w-3 h-3" />
                        {rec.prepTimeMinutes + rec.cookTimeMinutes} Min.
                      </span>
                    </div>

                    <h3 className="font-bold text-sm text-slate-800 line-clamp-1">{rec.title}</h3>
                    <p className="text-xs text-slate-500 line-clamp-2">
                      Zutaten: {rec.ingredients.map((i) => i.displayName).join(', ')}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <button
                      onClick={() => onNavigateToRecipe(rec.id)}
                      className="text-xs text-slate-600 hover:text-slate-900 font-medium"
                    >
                      Ansehen
                    </button>

                    {/* 1-Click Fork Feature */}
                    <button
                      onClick={() => handleFork(rec)}
                      className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>In meine Sammlung kopieren</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
