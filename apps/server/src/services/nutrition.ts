import {
  type IngredientsKnowledge,
  IngredientsKnowledgeSchema,
} from '@essensplaner/shared';
import { getFirestoreDb } from './firebase.js';
import { generateStructuredJson, isGeminiAvailable } from './gemini.js';
import { generateCanonicalId, detectCategory } from './ingredientParser.js';

// In-Memory Fallback Cache (ensures server never crashes even without Firebase)
const inMemoryCache = new Map<string, IngredientsKnowledge>();

const STANDARD_DISCLAIMER =
  'Kein medizinischer Ratschlag. Die Angaben dienen ausschließlich der allgemeinen Information.';

// Curated high-precision scientific database of common culinary ingredients
const CURATED_KNOWLEDGE: Record<
  string,
  Omit<IngredientsKnowledge, 'canonicalId' | 'updatedAt'>
> = {
  knoblauch: {
    name: 'Knoblauch',
    healthBenefits:
      'Enthält die Schwefelverbindung Allicin, die antioxidativ und antibakteriell wirkt und die Gefäßgesundheit unterstützen kann.',
    vitaminsAndMinerals: ['Vitamin B6', 'Vitamin C', 'Mangan', 'Selen'],
    nutritionalHighlights:
      'Reich an sekundären Pflanzenstoffen (Allicin) mit gefäßschützender Wirkung.',
    imageUrl: '',
    disclaimer: STANDARD_DISCLAIMER,
  },
  spinat: {
    name: 'Spinat',
    healthBenefits:
      'Liefert wertvolle Antioxidantien wie Lutein und Zeaxanthin zum Schutz der Augengesundheit sowie Folat für die Zellteilung.',
    vitaminsAndMinerals: ['Vitamin K', 'Vitamin A', 'Folsäure', 'Eisen', 'Magnesium'],
    nutritionalHighlights:
      'Extrem hohe Nährstoffdichte bei minimalem Kaloriengehalt.',
    imageUrl: '',
    disclaimer: STANDARD_DISCLAIMER,
  },
  lachs: {
    name: 'Lachs',
    healthBenefits:
      'Exzellente Quelle für langkettige Omega-3-Fettsäuren (EPA & DHA), die zur normalen Herz- und Gehirnfunktion beitragen.',
    vitaminsAndMinerals: ['Vitamin D', 'Vitamin B12', 'Selen', 'Jod'],
    nutritionalHighlights:
      'Hochwertiges Protein kombiniert mit entzündungshemmenden Omega-3-Fettsäuren.',
    imageUrl: '',
    disclaimer: STANDARD_DISCLAIMER,
  },
  haferflocken: {
    name: 'Haferflocken',
    healthBenefits:
      'Enthalten den löslichen Ballaststoff Beta-Glucan, der nachweislich zur Aufrechterhaltung eines normalen Cholesterinspiegels beiträgt.',
    vitaminsAndMinerals: ['Vitamin B1', 'Eisen', 'Zink', 'Magnesium', 'Biotin'],
    nutritionalHighlights:
      'Langanhaltende Sättigung durch komplexe Kohlenhydrate und Beta-Glucan.',
    imageUrl: '',
    disclaimer: STANDARD_DISCLAIMER,
  },
  olivenoel: {
    name: 'Olivenöl',
    healthBenefits:
      'Besteht überwiegend aus einfach ungesättigter Ölsäure und bioaktiven Polyphenolen, die freie Radikale neutralisieren.',
    vitaminsAndMinerals: ['Vitamin E', 'Vitamin K'],
    nutritionalHighlights:
      'Grundpfeiler der mediterranen Ernährung mit nachgewiesenem kardioprotektivem Profil.',
    imageUrl: '',
    disclaimer: STANDARD_DISCLAIMER,
  },
  kurkuma: {
    name: 'Kurkuma',
    healthBenefits:
      'Der sekundäre Pflanzenstoff Curcumin besitzt starke entzündungshemmende Eigenschaften und unterstützt Verdauungsenzyme.',
    vitaminsAndMinerals: ['Eisen', 'Mangan', 'Kupfer'],
    nutritionalHighlights:
      'Hochwirksames Polyphenol Curcumin; am besten mit einer Prise schwarzem Pfeffer kombinieren.',
    imageUrl: '',
    disclaimer: STANDARD_DISCLAIMER,
  },
  brokkoli: {
    name: 'Brokkoli',
    healthBenefits:
      'Enthält Glucosinolate, insbesondere Sulforaphan, welche die körpereigenen Entgiftungs- und Schutzmechanismen anregen.',
    vitaminsAndMinerals: ['Vitamin C', 'Vitamin K', 'Folsäure', 'Kalium'],
    nutritionalHighlights:
      'Deckt bereits mit 100g den empfohlenen Tagesbedarf an Vitamin C.',
    imageUrl: '',
    disclaimer: STANDARD_DISCLAIMER,
  },
  tomate: {
    name: 'Tomate',
    healthBenefits:
      'Liefert den Carotinoid-Farbstoff Lycopin, der besonders in erhitzter Form zellschützend auf Gefäße und Haut wirkt.',
    vitaminsAndMinerals: ['Vitamin C', 'Kalium', 'Folat', 'Vitamin K'],
    nutritionalHighlights:
      'Sehr kalorienarm, feuchtigkeitsspendend und reich an Lycopin.',
    imageUrl: '',
    disclaimer: STANDARD_DISCLAIMER,
  },
  kartoffel: {
    name: 'Kartoffel',
    healthBenefits:
      'Liefert leicht verdauliche komplexe Kohlenhydrate, Kalium für die Muskelfunktion und sättigende resistente Stärke im abgekühlten Zustand.',
    vitaminsAndMinerals: ['Kalium', 'Vitamin C', 'Vitamin B6', 'Magnesium'],
    nutritionalHighlights:
      'Hoher Sättigungsindex und basischer Mineralstoffgehalt.',
    imageUrl: '',
    disclaimer: STANDARD_DISCLAIMER,
  },
  zitrone: {
    name: 'Zitrone',
    healthBenefits:
      'Fördert durch den hohen Vitamin-C-Gehalt die Eisenaufnahme aus pflanzlichen Lebensmitteln und unterstützt die Kollagensynthese.',
    vitaminsAndMinerals: ['Vitamin C', 'Kalium', 'Citronensäure'],
    nutritionalHighlights:
      'Natürlicher Frischekick mit starker antioxidativer Wirkung.',
    imageUrl: '',
    disclaimer: STANDARD_DISCLAIMER,
  },
  ingwer: {
    name: 'Ingwer',
    healthBenefits:
      'Die scharfen Inhaltsstoffe Gingerole und Shogaole regen die Magensaftsekretion an und wirken wärmend und krampflösend.',
    vitaminsAndMinerals: ['Vitamin C', 'Magnesium', 'Eisen', 'Kalzium'],
    nutritionalHighlights:
      'Bewährtes pflanzliches Hausmittel bei Magenverstimmungen und Erkältungen.',
    imageUrl: '',
    disclaimer: STANDARD_DISCLAIMER,
  },
  avocado: {
    name: 'Avocado',
    healthBenefits:
      'Reich an herzgesunden einfach ungesättigten Fettsäuren, die die Aufnahme fettlöslicher Vitamine aus Salaten und Gemüse vervielfachen.',
    vitaminsAndMinerals: ['Kalium', 'Folat', 'Vitamin E', 'Vitamin B6'],
    nutritionalHighlights:
      'Enthält mehr Kalium als Bananen sowie viele Ballaststoffe.',
    imageUrl: '',
    disclaimer: STANDARD_DISCLAIMER,
  },
  kichererbsen: {
    name: 'Kichererbsen',
    healthBenefits:
      'Hervorragende pflanzliche Proteinquelle mit hohem Anteil präbiotischer Ballaststoffe zur Förderung eines gesunden Darmmikrobioms.',
    vitaminsAndMinerals: ['Folat', 'Eisen', 'Zink', 'Phosphor', 'Mangan'],
    nutritionalHighlights:
      'Stabile Blutzuckerregulierung durch langsamen glykämischen Anstieg.',
    imageUrl: '',
    disclaimer: STANDARD_DISCLAIMER,
  },
  zwiebel: {
    name: 'Zwiebel',
    healthBenefits:
      'Liefert Quercetin und Schwefelverbindungen, die Entzündungen hemmen und das Immunsystem stärken können.',
    vitaminsAndMinerals: ['Vitamin C', 'Vitamin B6', 'Folat', 'Kalium'],
    nutritionalHighlights:
      'Klassische aromatische Heil- und Würzpflanze mit präbiotischem Inulin.',
    imageUrl: '',
    disclaimer: STANDARD_DISCLAIMER,
  },
  spaghetti: {
    name: 'Spaghetti',
    healthBenefits:
      'Bieten als Hartweizengrieß-Produkt komplexe Kohlenhydrate für eine gleichmäßige Energiebereitstellung während des Tages.',
    vitaminsAndMinerals: ['Vitamin B1', 'Niacin', 'Eisen', 'Magnesium'],
    nutritionalHighlights:
      'Optimaler Energielieferant für sportliche und geistige Aktivität.',
    imageUrl: '',
    disclaimer: STANDARD_DISCLAIMER,
  },
  ei: {
    name: 'Ei',
    healthBenefits:
      'Besitzt die höchste biologische Wertigkeit aller Proteine und enthält Cholin zur Unterstützung der Gedächtnisfunktion.',
    vitaminsAndMinerals: ['Vitamin B12', 'Vitamin A', 'Cholin', 'Selen', 'Lutein'],
    nutritionalHighlights:
      'Perfektes Aminosäurenprofil und essentielle Mikronährstoffe.',
    imageUrl: '',
    disclaimer: STANDARD_DISCLAIMER,
  },
  rinderhackfleisch: {
    name: 'Rinderhackfleisch',
    healthBenefits:
      'Liefert hoch bioverfügbares Häm-Eisen gegen Müdigkeit sowie Zink für die Wundheilung und das Immunsystem.',
    vitaminsAndMinerals: ['Vitamin B12', 'Eisen', 'Zink', 'Phosphor'],
    nutritionalHighlights:
      'Klassischer Nährstoffträger für essentielle B-Vitamine und vollständige Proteine.',
    imageUrl: '',
    disclaimer: STANDARD_DISCLAIMER,
  },
};

/**
 * Generates nutritional profile using Gemini 1.5 Flash.
 */
async function generateNutritionWithGemini(
  canonicalId: string,
  name: string,
): Promise<IngredientsKnowledge | null> {
  if (!isGeminiAvailable()) return null;

  const systemPrompt = `Du bist ein promovierter Ernährungswissenschaftler.
Erstelle ein fundiertes physiologisches Nährwertprofil für das Lebensmittel auf Deutsch.
Konzentriere dich auf physiologische Wirkungen im menschlichen Körper, Vitamine, Mineralien und Highlights.
Antworte zwingend im folgenden JSON-Format:
{
  "name": "${name}",
  "healthBenefits": "Ausführliche physiologische Wirkung...",
  "vitaminsAndMinerals": ["Vitamin C", "Kalium", "Folat"],
  "nutritionalHighlights": "Prägnante Zusammenfassung der wichtigsten Nährwerteigenschaften"
}`;

  const prompt = `Erstelle das Profil für: "${name}" (ID: ${canonicalId}).`;

  interface GeminiNutritionResponse {
    name?: string;
    healthBenefits?: string;
    vitaminsAndMinerals?: string[];
    nutritionalHighlights?: string;
  }

  const result = await generateStructuredJson<GeminiNutritionResponse>(
    systemPrompt,
    prompt,
  );

  if (result && result.healthBenefits) {
    return {
      canonicalId,
      name: result.name || name,
      healthBenefits: result.healthBenefits,
      vitaminsAndMinerals: result.vitaminsAndMinerals || ['Mineralstoffe', 'Vitamine'],
      nutritionalHighlights:
        result.nutritionalHighlights || 'Wertvoller Bestandteil einer ausgewogenen Ernährung.',
      imageUrl: '',
      disclaimer: STANDARD_DISCLAIMER,
      updatedAt: new Date().toISOString(),
    };
  }

  return null;
}

/**
 * Algorithmic fallback generator based on food categories.
 */
function generateHeuristicNutrition(
  canonicalId: string,
  name: string,
): IngredientsKnowledge {
  const category = detectCategory(name);

  let healthBenefits =
    'Liefert essentielle Makro- und Mikronährstoffe zur Unterstützung der täglichen Körperfunktionen.';
  let vitaminsAndMinerals = ['Spurenelemente', 'Vitamine'];
  let nutritionalHighlights =
    'Trägt zu einer abwechslungsreichen und ausgewogenen Ernährung bei.';

  switch (category) {
    case 'Obst & Gemüse':
      healthBenefits =
        'Reich an sekundären Pflanzenstoffen, Ballaststoffen und zellschützenden Antioxidantien.';
      vitaminsAndMinerals = ['Vitamin C', 'Kalium', 'Folat', 'Beta-Carotin'];
      nutritionalHighlights =
        'Hohe Mikronährstoffdichte bei geringem Kaloriengehalt.';
      break;
    case 'Kühlung & Milchprodukte':
      healthBenefits =
        'Unterstützt den Erhalt gesunder Knochen und Muskeln durch hochwertige Proteine und Kalzium.';
      vitaminsAndMinerals = ['Kalzium', 'Vitamin B2', 'Vitamin B12', 'Phosphor'];
      nutritionalHighlights =
        'Hervorragende Quelle für bioverfügbares Kalzium und Proteine.';
      break;
    case 'Fleisch & Fisch':
      healthBenefits =
        'Liefert vollständige Proteine für den Muskelaufbau sowie gut absorbierbares Häm-Eisen.';
      vitaminsAndMinerals = ['Vitamin B12', 'Eisen', 'Zink', 'Selen'];
      nutritionalHighlights =
        'Sehr hoher Proteingehalt und essentielle Aminosäuren.';
      break;
    case 'Trockenwaren & Getreide':
      healthBenefits =
        'Sorgt für kontinuierliche Energiebereitstellung und fördert die Darmtätigkeit durch Ballaststoffe.';
      vitaminsAndMinerals = ['B-Vitamine', 'Eisen', 'Magnesium', 'Ballaststoffe'];
      nutritionalHighlights =
        'Komplexe Kohlenhydrate für eine stabile Leistungsfähigkeit.';
      break;
    case 'Gewürze & Öle':
      healthBenefits =
        'Enthält konzentrierte ätherische Öle oder Fettsäuren mit antioxidativen Begleitstoffen.';
      vitaminsAndMinerals = ['Vitamin E', 'Polyphenole', 'Flavonoide'];
      nutritionalHighlights =
        'Geschmacksträger und Lieferant fettlöslicher Schutzstoffe.';
      break;
    case 'Konserven & Fertigprodukte':
      healthBenefits =
        'Praktische Nährstoffversorgung; vorzugsweise auf schonende Zubereitung achten.';
      vitaminsAndMinerals = ['Mineralstoffe', 'Ballaststoffe'];
      nutritionalHighlights =
        'Haltbare Basis für vielseitige vollwertige Mahlzeiten.';
      break;
  }

  return {
    canonicalId,
    name,
    healthBenefits,
    vitaminsAndMinerals,
    nutritionalHighlights,
    imageUrl: '',
    disclaimer: STANDARD_DISCLAIMER,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Fetches nutritional knowledge for a canonical ingredient ID.
 * Hierarchy:
 * 1. In-memory cache
 * 2. Firestore collection 'ingredients_knowledge'
 * 3. Curated database
 * 4. Gemini 1.5 Flash generation
 * 5. Heuristic physiological category generator
 * Saves results to both Firestore (if available) and in-memory cache.
 */
export async function getNutritionKnowledge(
  rawId: string,
): Promise<IngredientsKnowledge> {
  const canonicalId = generateCanonicalId(rawId);
  const cleanName = rawId
    .replace(/[-_]+/g, ' ')
    .trim()
    .replace(/^./, (c) => c.toUpperCase());

  // 1. In-Memory Cache check
  if (inMemoryCache.has(canonicalId)) {
    return inMemoryCache.get(canonicalId)!;
  }

  // 2. Firestore check
  const db = getFirestoreDb();
  if (db) {
    try {
      const docSnap = await db
        .collection('ingredients_knowledge')
        .doc(canonicalId)
        .get();

      if (docSnap.exists) {
        const data = docSnap.data();
        const parsed = IngredientsKnowledgeSchema.safeParse(data);
        if (parsed.success) {
          inMemoryCache.set(canonicalId, parsed.data);
          return parsed.data;
        }
      }
    } catch (err) {
      console.warn(
        `[NutritionService] Firestore read failed for ${canonicalId}, falling back:`,
        (err as Error).message,
      );
    }
  }

  // 3. Curated Database Check
  let knowledge: IngredientsKnowledge | null = null;
  if (CURATED_KNOWLEDGE[canonicalId]) {
    knowledge = {
      canonicalId,
      ...CURATED_KNOWLEDGE[canonicalId],
      updatedAt: new Date().toISOString(),
    };
  }

  // 4. Gemini 1.5 Flash generation
  if (!knowledge) {
    knowledge = await generateNutritionWithGemini(canonicalId, cleanName);
  }

  // 5. Heuristic fallback
  if (!knowledge) {
    knowledge = generateHeuristicNutrition(canonicalId, cleanName);
  }

  // Save to In-Memory cache
  inMemoryCache.set(canonicalId, knowledge);

  // Save to Firestore asynchronously
  if (db) {
    try {
      await db
        .collection('ingredients_knowledge')
        .doc(canonicalId)
        .set(knowledge, { merge: true });
    } catch (err) {
      console.warn(
        `[NutritionService] Firestore write failed for ${canonicalId}:`,
        (err as Error).message,
      );
    }
  }

  return knowledge;
}
