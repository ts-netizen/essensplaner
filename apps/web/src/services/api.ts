import type { Recipe, IngredientsKnowledge } from '@essensplaner/shared';

const API_BASE = '/api';

export async function scrapeRecipeFromUrl(url: string): Promise<Partial<Recipe>> {
  try {
    const res = await fetch(`${API_BASE}/recipes/scrape`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || `Scrape failed with HTTP ${res.status}`);
    }

    return await res.json();
  } catch (err) {
    console.warn('[API] Scrape request error:', err);
    throw err;
  }
}

export async function parseRecipeDictation(rawText: string): Promise<Partial<Recipe>> {
  try {
    const res = await fetch(`${API_BASE}/recipes/parse-dictation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rawText }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || `Dictation parse failed with HTTP ${res.status}`);
    }

    return await res.json();
  } catch (err) {
    console.warn('[API] Dictation parse request error:', err);
    // Graceful client fallback parser if backend is unreachable
    return fallbackParseDictation(rawText);
  }
}

export async function fetchNutritionKnowledge(canonicalId: string): Promise<IngredientsKnowledge> {
  try {
    const res = await fetch(`${API_BASE}/nutrition/${encodeURIComponent(canonicalId)}`);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || `Nutrition fetch failed with HTTP ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    console.warn('[API] Nutrition fetch error, using local fallback:', err);
    return getLocalNutritionFallback(canonicalId);
  }
}

function fallbackParseDictation(text: string): Partial<Recipe> {
  const lines = text.split(/[.\n]/).map((l) => l.trim()).filter(Boolean);
  const title = lines[0] ? lines[0].replace(/^(rezept für|wir kochen|heute gibt es)\s+/i, '') : 'Neues Rezept';
  
  return {
    title: title.charAt(0).toUpperCase() + title.slice(1),
    prepTimeMinutes: 15,
    cookTimeMinutes: 20,
    servings: 4,
    isLunch: true,
    isDinner: true,
    categories: ['Alltag', 'Schnell'],
    ingredients: [
      { canonicalId: 'zutat_1', displayName: 'Hauptzutat nach Wunsch', amount: 400, unit: 'g', category: 'Sonstiges', isStaple: false },
      { canonicalId: 'olivenoel', displayName: 'Olivenöl', amount: 2, unit: 'EL', category: 'Gewürze & Öle', isStaple: true },
      { canonicalId: 'salz', displayName: 'Salz & Pfeffer', amount: 1, unit: 'Prise', category: 'Gewürze & Öle', isStaple: true },
    ],
    instructions: lines.length > 1 ? lines.slice(1) : ['Alle Zutaten bereitstellen und nach Geschmack zubereiten.'],
  };
}

function getLocalNutritionFallback(canonicalId: string): IngredientsKnowledge {
  const normalized = canonicalId.toLowerCase().trim();

  const knownMap: Record<string, Partial<IngredientsKnowledge>> = {
    tomate: {
      name: 'Tomaten',
      healthBenefits: 'Enthalten reichlich Lycopin, ein starkes Antioxidans, das Zellen vor oxidativem Stress schützt und das Herz-Kreislauf-System unterstützt.',
      vitaminsAndMinerals: ['Vitamin C', 'Kalium', 'Folsäure', 'Vitamin K1'],
      nutritionalHighlights: 'Hoher Wassergehalt (95%), kalorienarm und reich an sekundären Pflanzenstoffen.',
    },
    knoblauch: {
      name: 'Knoblauch',
      healthBenefits: 'Enthält Allicin mit natürlichen antibakteriellen und antiviralen Eigenschaften. Fördert die Gefäßgesundheit und kann den Blutdruck positiv beeinflussen.',
      vitaminsAndMinerals: ['Vitamin B6', 'Vitamin C', 'Mangan', 'Selen'],
      nutritionalHighlights: 'Schwefelhaltige Verbindungen mit intensiv bioaktiver Wirkung.',
    },
    olivenoel: {
      name: 'Olivenöl (nativ extra)',
      healthBenefits: 'Reich an einfach ungesättigten Fettsäuren (Ölsäure) und Polyphenolen, die entzündungshemmend wirken und das Cholesteringleichgewicht fördern.',
      vitaminsAndMinerals: ['Vitamin E', 'Vitamin K'],
      nutritionalHighlights: 'Ideale Basis der mediterranen Ernährung für Zell- und Gefäßschutz.',
    },
    zitrone: {
      name: 'Zitrone',
      healthBenefits: 'Hervorragende Quelle für bioverfügbares Vitamin C, stärkt die körpereigene Immunabwehr und fördert die Eisenaufnahme aus pflanzlichen Speisen.',
      vitaminsAndMinerals: ['Vitamin C', 'Zitronensäure', 'Kalium', 'Bioflavonoide'],
      nutritionalHighlights: 'Basenbildend im Stoffwechsel trotz des sauren Geschmacks.',
    },
    lachs: {
      name: 'Lachs / Forelle',
      healthBenefits: 'Liefert wertvolle marine Omega-3-Fettsäuren (EPA & DHA), die Gehirnfunktion und Herzgesundheit essenziell unterstützen.',
      vitaminsAndMinerals: ['Vitamin D', 'Vitamin B12', 'Selen', 'Jod'],
      nutritionalHighlights: 'Hochwertiges Protein mit optimaler biologischer Wertigkeit.',
    },
    kichererbsen: {
      name: 'Kichererbsen',
      healthBenefits: 'Reich an Ballaststoffen und pflanzlichem Eiweiß, stabilisiert den Blutzuckerspiegel und fördert eine gesunde Darmflora.',
      vitaminsAndMinerals: ['Eisen', 'Magnesium', 'Zink', 'Folsäure'],
      nutritionalHighlights: 'Sehr sättigend dank komplexer Kohlenhydrate und Ballaststoffe.',
    },
  };

  const item = knownMap[normalized] || {
    name: canonicalId.charAt(0).toUpperCase() + canonicalId.slice(1),
    healthBenefits: 'Liefert wertvolle Mikronährstoffe, Ballaststoffe und natürliche Pflanzenstoffe zur Unterstützung einer ausgewogenen Vitalstoffversorgung.',
    vitaminsAndMinerals: ['Vitamine', 'Mineralstoffe', 'Spurenelemente'],
    nutritionalHighlights: 'Frische, unverarbeitete Zutat für eine vitalstoffreiche Mahlzeit.',
  };

  return {
    canonicalId,
    name: item.name || canonicalId,
    healthBenefits: item.healthBenefits || '',
    vitaminsAndMinerals: item.vitaminsAndMinerals || [],
    nutritionalHighlights: item.nutritionalHighlights || '',
    imageUrl: '',
    disclaimer: 'Kein medizinischer Ratschlag. Die Angaben dienen ausschließlich der allgemeinen Information.',
  };
}
