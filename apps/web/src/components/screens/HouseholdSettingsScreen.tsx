import React, { useState } from 'react';
import {
  Users,
  Copy,
  Check,
  Save,
  UserPlus,
  Share2,
  Heart,
} from 'lucide-react';
import { useHousehold } from '../../context/HouseholdContext';

export const HouseholdSettingsScreen: React.FC = () => {
  const { household, updateHouseholdName, addFriendByCode } = useHousehold();
  const [name, setName] = useState(household.name);
  const [isSaved, setIsSaved] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const [friendCode, setFriendCode] = useState('');
  const [friendStatus, setFriendStatus] = useState<string | null>(null);

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await updateHouseholdName(name.trim());
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const inviteCode = household.inviteCode || 'MEY742';
  const inviteLink = `${window.location.origin}/join?code=${inviteCode}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(inviteCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 3000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const handleAddFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!friendCode.trim()) return;
    const ok = await addFriendByCode(friendCode.trim());
    if (ok) {
      setFriendStatus('Freund-Haushalt erfolgreich verbunden!');
      setFriendCode('');
    } else {
      setFriendStatus('Fehler: Code nicht gefunden.');
    }
    setTimeout(() => setFriendStatus(null), 4000);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl mx-auto pb-20">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
        <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
          Kollaboration & Verwaltung
        </span>
        <h1 className="text-2xl font-black text-slate-800">Haushalts-Einstellungen</h1>
        <p className="text-xs text-slate-500 mt-1">
          Verwalte euren gemeinsamen Haushalt, lade deine/n Partner/in ein und vernetze dich mit
          Freunden.
        </p>
      </div>

      {/* Household Name Form */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
        <h2 className="font-bold text-slate-800 text-base">Haushaltsname</h2>
        <form onSubmit={handleSaveName} className="flex gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
          />
          <button
            type="submit"
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5 shadow-xs"
          >
            {isSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            <span>{isSaved ? 'Gespeichert' : 'Speichern'}</span>
          </button>
        </form>
      </div>

      {/* Invite Partner Section */}
      <div className="bg-gradient-to-br from-emerald-50/70 to-teal-50/40 rounded-2xl border border-emerald-200/80 p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-600 text-white rounded-xl">
            <Heart className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-slate-800 text-base">Partner/in zum Haushalt einladen</h2>
            <p className="text-xs text-slate-500">
              Teilt Einkaufsliste, Wochenplan und Rezepte in Echtzeit miteinander.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {/* Invite Code Box */}
          <div className="bg-white p-4 rounded-xl border border-emerald-200/70 space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              6-stelliger Haushalts-Code
            </span>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-black font-mono tracking-widest text-emerald-800">
                {inviteCode}
              </span>
              <button
                onClick={handleCopyCode}
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? 'Kopiert' : 'Kopieren'}</span>
              </button>
            </div>
          </div>

          {/* Invite Link Box */}
          <div className="bg-white p-4 rounded-xl border border-emerald-200/70 space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Direkter Beitritts-Link
            </span>
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-slate-600 truncate max-w-[160px]">
                {inviteLink}
              </span>
              <button
                onClick={handleCopyLink}
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Kopiert' : 'Link teilen'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Household Members List */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-slate-600" />
            <h2 className="font-bold text-slate-800 text-base">Aktuelle Mitglieder</h2>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            {Object.keys(household.members).length} Personen
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {Object.entries(household.members).map(([userId, member]) => (
            <div key={userId} className="py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 font-black flex items-center justify-center text-sm">
                  {member.displayName.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-800">{member.displayName}</h4>
                  <span className="text-xs text-slate-400">{member.email}</span>
                </div>
              </div>

              <span
                className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  member.role === 'owner'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                {member.role === 'owner' ? 'Inhaber' : 'Mitglied'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Add Friends Box */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
        <h2 className="font-bold text-slate-800 text-base">Freunde hinzufügen</h2>
        <p className="text-xs text-slate-500">
          Gib den Einladungscode eines anderen Haushalts ein, um gegenseitig Wochenpläne und Rezepte
          zu sehen.
        </p>

        <form onSubmit={handleAddFriend} className="flex gap-2">
          <input
            type="text"
            placeholder="6-stelliger Code (z.B. SCH481)"
            value={friendCode}
            onChange={(e) => setFriendCode(e.target.value.toUpperCase())}
            maxLength={8}
            className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono uppercase tracking-wider"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1"
          >
            <UserPlus className="w-4 h-4" />
            <span>Verknüpfen</span>
          </button>
        </form>

        {friendStatus && (
          <p className="text-xs font-semibold text-emerald-700 pt-1">{friendStatus}</p>
        )}
      </div>
    </div>
  );
};
