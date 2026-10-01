import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Link,
  Mic,
  PenTool,
  Sparkles,
  Loader2,
  CheckCircle2,
  Plus,
  Trash2,
  Clock,
  Users,
} from 'lucide-react';
import type { Recipe, Ingredient } from '@essensplaner/shared';
import { scrapeRecipeFromUrl, parseRecipeDictation } from '../../services/api';
import { useHousehold } from '../../context/HouseholdContext';

// Web Speech API interface declarations
interface SpeechRecognitionEventLike {
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
    };
  };
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: (event: SpeechRecognitionEventLike) => void;
  onerror: (event: { error: string }) => void;
  onend: () => void;
}

interface SmartIngestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRecipeSaved: (recipeId: string) => void;
}

export const SmartIngestionModal: React.FC<SmartIngestionModalProps> = ({
  isOpen,
  onClose,
  onRecipeSaved,
}) => {
  const { addRecipe } = useHousehold();
  const [activeTab, setActiveTab] = useState<'url' | 'voice' | 'manual'>('url');

  // URL Tab state
  const [urlInput, setUrlInput] = useState('');

  // Voice Tab state
  const [isRecording, setIsRecording] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [speechSupported] = useState(() => {
    if (typeof window === 'undefined') return false;
    return Boolean(
      (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition,
    );
  });
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  // Status & loading
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Editable Recipe Draft
  const [draft, setDraft] = useState<Partial<Recipe>>({
    title: '',
    prepTimeMinutes: 15,
    cookTimeMinutes: 20,
    servings: 4,
    isLunch: true,
    isDinner: true,
    categories: ['Alltag'],
    ingredients: [
      {
        canonicalId: 'hauptzutat',
        displayName: '',
        amount: 1,
        unit: 'Stück',
        category: 'Sonstiges',
        isStaple: false,
      },
    ],
    instructions: [''],
    visibility: 'public',
  });

  const [hasPreview, setHasPreview] = useState(false);

  // Speech Recognition Setup
  useEffect(() => {
    if (!speechSupported) return;

    const speechAPI =
      (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike }).webkitSpeechRecognition;

    if (speechAPI) {
      try {
        const recognition = new speechAPI();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'de-DE';

        recognition.onresult = (event: SpeechRecognitionEventLike) => {
          let current = '';
          for (let i = 0; i < Object.keys(event.results).length; i++) {
            current += event.results[i][0].transcript + ' ';
          }
          setVoiceTranscript(current);
        };

        recognition.onerror = (e: { error: string }) => {
          console.warn('[SpeechRecognition] Error:', e.error);
          setIsRecording(false);
        };

        recognition.onend = () => {
          setIsRecording(false);
        };

        recognitionRef.current = recognition;
      } catch (err) {
        console.warn('[SpeechRecognition] Init error:', err);
      }
    }
  }, [speechSupported]);

  if (!isOpen) return null;

  // Toggle voice recording
  const handleToggleRecord = () => {
    if (!speechSupported || !recognitionRef.current) {
      setError('Spracherkennung wird in diesem Browser leider nicht unterstützt.');
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      setVoiceTranscript('');
      setError(null);
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (err) {
        console.warn('Recognition start failed:', err);
      }
    }
  };

  // Process URL Scrape
  const handleScrapeUrl = async () => {
    if (!urlInput.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const parsed = await scrapeRecipeFromUrl(urlInput.trim());
      setDraft((prev) => ({
        ...prev,
        ...parsed,
        sourceUrl: urlInput.trim(),
        ingredients: parsed.ingredients?.length ? parsed.ingredients : prev.ingredients,
        instructions: parsed.instructions?.length ? parsed.instructions : prev.instructions,
      }));
      setHasPreview(true);
    } catch (err) {
      setError(
        (err as Error).message ||
          'Rezept konnte von dieser URL nicht automatisch importiert werden.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Process Voice Dictation with LLM backend
  const handleParseVoice = async () => {
    if (!voiceTranscript.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const parsed = await parseRecipeDictation(voiceTranscript.trim());
      setDraft((prev) => ({
        ...prev,
        ...parsed,
        ingredients: parsed.ingredients?.length ? parsed.ingredients : prev.ingredients,
        instructions: parsed.instructions?.length ? parsed.instructions : prev.instructions,
      }));
      setHasPreview(true);
    } catch (err) {
      setError(
        (err as Error).message || 'Sprachtext konnte nicht in ein Rezept umgewandelt werden.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Save recipe
  const handleSaveRecipe = async () => {
    if (!draft.title?.trim()) {
      setError('Bitte gib dem Rezept einen Namen.');
      return;
    }

    const cleanIngredients: Ingredient[] = (draft.ingredients || [])
      .filter((i) => i.displayName.trim())
      .map((i) => ({
        ...i,
        canonicalId:
          i.canonicalId || i.displayName.toLowerCase().replace(/[^a-z0-9]/g, '_'),
      }));

    const cleanInstructions = (draft.instructions || []).filter((s) => s.trim());

    const recipeToSave: Omit<Recipe, 'id'> = {
      title: draft.title.trim(),
      sourceUrl: draft.sourceUrl || '',
      prepTimeMinutes: Number(draft.prepTimeMinutes) || 15,
      cookTimeMinutes: Number(draft.cookTimeMinutes) || 20,
      servings: Number(draft.servings) || 4,
      isLunch: Boolean(draft.isLunch),
      isDinner: Boolean(draft.isDinner),
      categories: draft.categories?.length ? draft.categories : ['Alltag'],
      visibility: draft.visibility || 'public',
      photoUrl: draft.photoUrl || '',
      ingredients: cleanIngredients,
      instructions: cleanInstructions.length ? cleanInstructions : ['Zubereiten und genießen.'],
    };

    const newId = await addRecipe(recipeToSave);
    onRecipeSaved(newId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-100 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-600 to-teal-700 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 rounded-xl">
              <Sparkles className="w-5 h-5 text-emerald-100" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Smart Ingestion (Multimodal)</h3>
              <p className="text-xs text-emerald-100">
                URL scannen, Rezept einsprechen oder manuell erfassen
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 transition-colors text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3 Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-5 pt-3 gap-2">
          <button
            onClick={() => {
              setActiveTab('url');
              setHasPreview(false);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-xl transition-colors border-b-2 ${
              activeTab === 'url'
                ? 'bg-white text-emerald-700 border-emerald-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent'
            }`}
          >
            <Link className="w-4 h-4" />
            <span>URL importieren</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('voice');
              setHasPreview(false);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-xl transition-colors border-b-2 ${
              activeTab === 'voice'
                ? 'bg-white text-emerald-700 border-emerald-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent'
            }`}
          >
            <Mic className="w-4 h-4" />
            <span>Einsprechen (Diktat)</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('manual');
              setHasPreview(true);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-xl transition-colors border-b-2 ${
              activeTab === 'manual'
                ? 'bg-white text-emerald-700 border-emerald-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent'
            }`}
          >
            <PenTool className="w-4 h-4" />
            <span>Manuell</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
              {error}
            </div>
          )}

          {/* TAB 1: URL SCRAPING */}
          {activeTab === 'url' && !hasPreview && (
            <div className="space-y-4 py-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Rezept-Webseite (Chefkoch, Lecker, EatBetter etc.)
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://www.eatbetter.de/rezepte/..."
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                  />
                  <button
                    onClick={handleScrapeUrl}
                    disabled={loading || !urlInput.trim()}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors flex items-center gap-2 shadow-xs"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    <span>Extrahieren</span>
                  </button>
                </div>
              </div>

              <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100 text-xs text-emerald-800 space-y-1">
                <p className="font-semibold">Automatische KI & Schema.org Erkennung:</p>
                <p>
                  Liest Zutaten, Mengenangaben, Zeiten und Zubereitungsschritte direkt aus und
                  bereitet sie für deinen Speiseplan auf.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: VOICE DICTATION */}
          {activeTab === 'voice' && !hasPreview && (
            <div className="space-y-5 py-2 text-center">
              <div className="flex flex-col items-center justify-center space-y-3">
                <button
                  onClick={handleToggleRecord}
                  className={`p-6 rounded-full transition-all shadow-lg ${
                    isRecording
                      ? 'bg-red-600 text-white animate-mic-pulse'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700'
                  }`}
                  aria-label="Mikrofon umschalten"
                >
                  <Mic className="w-8 h-8" />
                </button>
                <span className="text-sm font-semibold text-slate-700">
                  {isRecording ? 'Höre zu... Sprich frei dein Rezept!' : 'Tippe zum Aufnehmen'}
                </span>
                <p className="text-xs text-slate-400 max-w-sm">
                  z.B. &quot;Rezept für Zitronen-Pasta mit Spinat: 400g Spaghetti, 2 Zitronen,
                  Knoblauch und Parmesan...&quot;
                </p>
              </div>

              {/* Transcript Display */}
              <div className="text-left bg-slate-50 border border-slate-200 rounded-xl p-4 min-h-[90px] text-sm text-slate-700">
                {voiceTranscript ? (
                  <p className="italic">&ldquo;{voiceTranscript}&rdquo;</p>
                ) : (
                  <p className="text-slate-400">Transkription erscheint hier in Echtzeit...</p>
                )}
              </div>

              <button
                onClick={handleParseVoice}
                disabled={loading || !voiceTranscript.trim()}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-xs"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                <span>In Rezept umwandeln</span>
              </button>
            </div>
          )}

          {/* EDITABLE LIVE PREVIEW / MANUAL TAB */}
          {(hasPreview || activeTab === 'manual') && (
            <div className="space-y-5 animate-fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                  Vorschau & Feinschliff
                </span>
                {activeTab !== 'manual' && (
                  <button
                    onClick={() => setHasPreview(false)}
                    className="text-xs text-slate-500 hover:text-slate-800 underline"
                  >
                    Neu einlesen
                  </button>
                )}
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Rezeptname
                </label>
                <input
                  type="text"
                  value={draft.title || ''}
                  onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))}
                  placeholder="z.B. Cremige Zitronen-Pasta"
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                />
              </div>

              {/* Times & Servings */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> Vorbereitung
                  </label>
                  <input
                    type="number"
                    value={draft.prepTimeMinutes || 0}
                    onChange={(e) =>
                      setDraft((p) => ({ ...p, prepTimeMinutes: parseInt(e.target.value, 10) || 0 }))
                    }
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> Kochzeit
                  </label>
                  <input
                    type="number"
                    value={draft.cookTimeMinutes || 0}
                    onChange={(e) =>
                      setDraft((p) => ({ ...p, cookTimeMinutes: parseInt(e.target.value, 10) || 0 }))
                    }
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" /> Portionen
                  </label>
                  <input
                    type="number"
                    value={draft.servings || 4}
                    onChange={(e) =>
                      setDraft((p) => ({ ...p, servings: parseInt(e.target.value, 10) || 1 }))
                    }
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
              </div>

              {/* Ingredients List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Zutaten ({draft.ingredients?.length || 0})
                  </label>
                  <button
                    onClick={() =>
                      setDraft((p) => ({
                        ...p,
                        ingredients: [
                          ...(p.ingredients || []),
                          {
                            canonicalId: `ing_${Date.now()}`,
                            displayName: '',
                            amount: 1,
                            unit: 'Stück',
                            category: 'Sonstiges',
                            isStaple: false,
                          },
                        ],
                      }))
                    }
                    className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Zutat hinzufügen
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {draft.ingredients?.map((ing, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <input
                        type="number"
                        placeholder="Menge"
                        value={ing.amount}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setDraft((p) => {
                            const copy = [...(p.ingredients || [])];
                            copy[idx] = { ...copy[idx], amount: val };
                            return { ...p, ingredients: copy };
                          });
                        }}
                        className="w-20 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-center"
                      />
                      <input
                        type="text"
                        placeholder="Einheit"
                        value={ing.unit}
                        onChange={(e) => {
                          const val = e.target.value;
                          setDraft((p) => {
                            const copy = [...(p.ingredients || [])];
                            copy[idx] = { ...copy[idx], unit: val };
                            return { ...p, ingredients: copy };
                          });
                        }}
                        className="w-20 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-center"
                      />
                      <input
                        type="text"
                        placeholder="Name der Zutat"
                        value={ing.displayName}
                        onChange={(e) => {
                          const val = e.target.value;
                          setDraft((p) => {
                            const copy = [...(p.ingredients || [])];
                            copy[idx] = { ...copy[idx], displayName: val };
                            return { ...p, ingredients: copy };
                          });
                        }}
                        className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                      />
                      <button
                        onClick={() =>
                          setDraft((p) => ({
                            ...p,
                            ingredients: p.ingredients?.filter((_, i) => i !== idx),
                          }))
                        }
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Instructions */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Zubereitungsschritte
                  </label>
                  <button
                    onClick={() =>
                      setDraft((p) => ({
                        ...p,
                        instructions: [...(p.instructions || []), ''],
                      }))
                    }
                    className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Schritt hinzufügen
                  </button>
                </div>

                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {draft.instructions?.map((inst, idx) => (
                    <div key={idx} className="flex gap-2 items-start">
                      <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-center shrink-0 mt-1">
                        {idx + 1}
                      </span>
                      <textarea
                        rows={2}
                        value={inst}
                        onChange={(e) => {
                          const val = e.target.value;
                          setDraft((p) => {
                            const copy = [...(p.instructions || [])];
                            copy[idx] = val;
                            return { ...p, instructions: copy };
                          });
                        }}
                        className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                      />
                      <button
                        onClick={() =>
                          setDraft((p) => ({
                            ...p,
                            instructions: p.instructions?.filter((_, i) => i !== idx),
                          }))
                        }
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg mt-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-100 text-sm font-medium rounded-xl transition-colors"
          >
            Abbrechen
          </button>

          {(hasPreview || activeTab === 'manual') && (
            <button
              onClick={handleSaveRecipe}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-xs flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>In Rezeptkatalog speichern</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
