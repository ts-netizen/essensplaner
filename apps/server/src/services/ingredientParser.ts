import {
  type Ingredient,
  type StandardIngredientCategory,
} from '@essensplaner/shared';

// Mapping of unicode and text fractions to decimal numbers
const UNICODE_FRACTIONS: Record<string, number> = {
  '½': 0.5,
  '¼': 0.25,
  '¾': 0.75,
  '⅓': 0.33,
  '⅔': 0.67,
  '⅛': 0.125,
  '⅜': 0.375,
  '⅝': 0.625,
  '⅞': 0.875,
  '⅕': 0.2,
  '⅖': 0.4,
  '⅗': 0.6,
  '⅘': 0.8,
  '⅙': 0.167,
  '⅚': 0.833,
};

// Common staple ingredients that are usually available at home
const STAPLE_KEYWORDS = [
  'salz',
  'speisesalz',
  'meersalz',
  'jodsalz',
  'pfeffer',
  'schwarzer pfeffer',
  'weisser pfeffer',
  'olivenöl',
  'olivenoel',
  'rapsöl',
  'rapsoel',
  'sonnenblumenöl',
  'sonnenblumenoel',
  'pflanzenöl',
  'pflanzenoel',
  'speiseöl',
  'speiseoel',
  'essig',
  'balsamico',
  'apfelessig',
  'weissweinessig',
  'zucker',
  'rohrzucker',
  'puderzucker',
  'weizenmehl',
  'mehl',
  'backpulver',
  'natron',
  'wasser',
  'leitungswasser',
];

// Unit normalization map
const UNIT_MAP: Record<string, string> = {
  g: 'g',
  gr: 'g',
  gramm: 'g',
  kg: 'kg',
  kilogramm: 'kg',
  ml: 'ml',
  milliliter: 'ml',
  l: 'l',
  liter: 'l',
  cl: 'cl',
  dl: 'dl',
  el: 'EL',
  esslöffel: 'EL',
  essloeffel: 'EL',
  tbsp: 'EL',
  tl: 'TL',
  teelöffel: 'TL',
  teeloeffel: 'TL',
  tsp: 'TL',
  prise: 'Prise(n)',
  prisen: 'Prise(n)',
  pinch: 'Prise(n)',
  msp: 'Msp.',
  messerspitze: 'Msp.',
  dose: 'Dose(n)',
  dosen: 'Dose(n)',
  can: 'Dose(n)',
  cans: 'Dose(n)',
  bund: 'Bund',
  bünde: 'Bund',
  buende: 'Bund',
  packung: 'Pck.',
  packungen: 'Pck.',
  pck: 'Pck.',
  pkg: 'Pck.',
  becher: 'Becher',
  glas: 'Glas',
  gläser: 'Glas',
  glaeser: 'Glas',
  zehe: 'Zehe(n)',
  zehen: 'Zehe(n)',
  knoblauchzehe: 'Zehe(n)',
  knoblauchzehen: 'Zehe(n)',
  clove: 'Zehe(n)',
  cloves: 'Zehe(n)',
  stück: 'Stk.',
  stueck: 'Stk.',
  stk: 'Stk.',
  scheibe: 'Scheibe(n)',
  scheiben: 'Scheibe(n)',
  slice: 'Scheibe(n)',
  slices: 'Scheibe(n)',
  stange: 'Stange(n)',
  stangen: 'Stange(n)',
  zweig: 'Zweig(e)',
  zweige: 'Zweig(e)',
  blatt: 'Blatt',
  blätter: 'Blatt',
  blaetter: 'Blatt',
  tropfen: 'Tropfen',
  schuss: 'Schuss',
  spritzer: 'Spritzer',
  tasse: 'Tasse(n)',
  tassen: 'Tasse(n)',
  cup: 'Cup(s)',
  cups: 'Cup(s)',
};

/**
 * Normalizes text containing fractions into decimal numbers.
 * E.g. "1 1/2" -> 1.5, "½" -> 0.5, "1,5" -> 1.5
 */
export function parseAmount(rawAmount: string): number {
  let cleaned = rawAmount.trim();

  // Replace unicode fractions
  for (const [char, val] of Object.entries(UNICODE_FRACTIONS)) {
    if (cleaned.includes(char)) {
      const rest = cleaned.replace(char, '').trim();
      const base = rest ? parseFloat(rest.replace(',', '.')) : 0;
      return base + val;
    }
  }

  // Handle mixed text fraction e.g. "1 1/2" or "1-1/2"
  const mixedMatch = cleaned.match(/^(\d+)\s+([0-9]+)\/([0-9]+)$/);
  if (mixedMatch) {
    const whole = parseInt(mixedMatch[1], 10);
    const num = parseInt(mixedMatch[2], 10);
    const denom = parseInt(mixedMatch[3], 10);
    if (denom !== 0) {
      return whole + num / denom;
    }
  }

  // Handle single text fraction e.g. "1/2"
  const fracMatch = cleaned.match(/^([0-9]+)\/([0-9]+)$/);
  if (fracMatch) {
    const num = parseInt(fracMatch[1], 10);
    const denom = parseInt(fracMatch[2], 10);
    if (denom !== 0) {
      return num / denom;
    }
  }

  // Handle ranges like "1-2" -> take average 1.5
  const rangeMatch = cleaned.match(/^(\d+(?:[.,]\d+)?)\s*-\s*(\d+(?:[.,]\d+)?)$/);
  if (rangeMatch) {
    const min = parseFloat(rangeMatch[1].replace(',', '.'));
    const max = parseFloat(rangeMatch[2].replace(',', '.'));
    return (min + max) / 2;
  }

  // Standard float with comma or dot
  const parsed = parseFloat(cleaned.replace(',', '.'));
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Converts a food item name into a clean, lowercased canonical ID.
 * Replaces German umlauts and special characters.
 */
export function generateCanonicalId(name: string): string {
  return name
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .trim() || 'item';
}

/**
 * Determines whether an ingredient is a typical pantry staple (salt, pepper, oil, etc.).
 */
export function checkIsStaple(name: string): boolean {
  const lower = name.toLowerCase();
  return STAPLE_KEYWORDS.some((kw) => {
    // Exact or substring match for staple keywords
    return lower === kw || lower.startsWith(kw + ' ') || lower.endsWith(' ' + kw) || lower.includes(` ${kw} `);
  });
}

/**
 * Categorizes an ingredient into one of the standard supermarket categories.
 */
export function detectCategory(name: string): StandardIngredientCategory {
  const lower = name.toLowerCase();

  // 1. Tiefkühl (e.g. TK-Erbsen, tiefgekühltes Fleisch)
  if (/\b(tk|tiefkuehl|tiefkühl|gefroren|tiefgefroren)\b|tk-/i.test(lower)) {
    return 'Tiefkühl';
  }

  // 2. Gewürze & Öle (salts, spices, oils, vinegars)
  if (
    /(öl|oel|olivenoel|olivenöl|rapsoel|rapsöl|sonnenblumenoel|sesamoel|kokosoel|essig|balsamico|salz|pfeffer|zucker|honig|ahornsirup|vanille|zimt|oregano|muskat|curry|kurkuma|kreuzkuemmel|paprikapulver|cayenne|senf|sojasauce)/i.test(
      lower,
    )
  ) {
    return 'Gewürze & Öle';
  }

  // 3. Konserven & Fertigprodukte (e.g. gehackte Tomaten in der Dose, Kichererbsen)
  if (
    /(dose|dosen|konserve|passierte tomaten|gehackte tomaten|tomatenmark|kokosmilch|kichererbsen|kidneybohnen|bohnen|mais|\boliven\b(?![\s-]*[öo]el)|kapern|bruehe|brühe|gemuesebruehe|huehnerbruehe|pesto)/i.test(
      lower,
    )
  ) {
    return 'Konserven & Fertigprodukte';
  }

  // 4. Fleisch & Fisch
  if (
    /(fleisch|hackfleisch|rinderhack|hack|hähnchen|haehnchen|huhn|hühner|haehnchenbrust|puten|pute|rind|rinder|gulasch|schwein|schweine|speck|bacon|guanciale|pancetta|schinken|wurst|lachs|thunfisch|garnelen|scampi|fisch|kabeljau|forelle|dorade)/i.test(
      lower,
    )
  ) {
    return 'Fleisch & Fisch';
  }

  // 5. Kühlung & Milchprodukte
  if (
    /(milch|butter|sahne|schmand|creme fraiche|crème fraîche|joghurt|quark|kaese|käse|parmesan|mozzarella|pecorino|gouda|cheddar|feta|ricotta|mascarpone|frischkaese|frischkäse|\bei\b|\beier\b|hühnerei|sojamilch|hafermilch|tofu)/i.test(
      lower,
    )
  ) {
    return 'Kühlung & Milchprodukte';
  }

  // 6. Obst & Gemüse
  if (
    /(tomate|gurke|paprika|zwiebel|knoblauch|karotte|moehre|kartoffel|suesskartoffel|kuerbis|zucchini|aubergine|brokkoli|blumenkohl|spinat|salat|rucola|feldsalat|pilz|champignon|lauch|porree|sellerie|ingwer|chili|kohl|rosenkohl|spargel|avocado|apfel|birne|banane|beere|erdbeere|heidelbeere|himbeere|zitrone|limette|orange|kraeuter|petersilie|basilikum|schnittlauch|dill|koriander|thymian|rosmarin)/i.test(
      lower,
    )
  ) {
    return 'Obst & Gemüse';
  }

  // 7. Trockenwaren & Getreide
  if (
    /(pasta|spaghetti|penne|fusilli|tagliatelle|nudel|nudeln|reis|basmati|jasmin|risotto|mehl|weizenmehl|dinkelmehl|haferflocken|quinoa|bulgur|couscous|linse|linsen|chia|semmelbroesel|hefe|staerke|stearke|backpulver)/i.test(
      lower,
    )
  ) {
    return 'Trockenwaren & Getreide';
  }

  // 8. Getränke
  if (/(wasser|mineralwasser|wein|weisswein|weißwein|rotwein|bier|saft|orangensaft|apfelsaft|tee|kaffee)/i.test(lower)) {
    return 'Getränke';
  }

  // 9. Drogerie & Haushalt
  if (/(backpapier|frischhaltefolie|alufolie|serviette|muellbeutel|spuelmittel)/i.test(lower)) {
    return 'Drogerie & Haushalt';
  }

  return 'Sonstiges';
}

/**
 * Parses a raw ingredient string into a structured Ingredient object.
 * Examples:
 *  - "500 g Spaghetti" -> { amount: 500, unit: "g", displayName: "Spaghetti", ... }
 *  - "2 EL Olivenöl" -> { amount: 2, unit: "EL", displayName: "Olivenöl", ... }
 *  - "1 Prise Salz" -> { amount: 1, unit: "Prise(n)", displayName: "Salz", ... }
 *  - "Salz und Pfeffer nach Geschmack" -> { amount: 0, unit: "", displayName: "Salz und Pfeffer", ... }
 */
export function parseIngredientString(raw: string): Ingredient {
  const trimmed = raw.trim();
  if (!trimmed) {
    return {
      canonicalId: 'unknown',
      displayName: '',
      amount: 0,
      unit: '',
      category: 'Sonstiges',
      isStaple: false,
    };
  }

  // Regex to match quantity, optional unit, and remaining name
  // Group 1: quantity (numbers, fractions, decimals, unicode)
  // Group 2: unit
  // Group 3: name
  const regex =
    /^([\d½¼¾⅓⅔⅛⅜⅝⅞⅕⅖⅗⅘⅙⅚\s/.,-]+)?\s*([a-zA-ZäöüÄÖÜß.]+)?\s+(.*)$/;

  let amount = 0;
  let unit = '';
  let displayName = trimmed;

  const match = trimmed.match(regex);
  if (match) {
    const rawAmt = match[1]?.trim();
    const rawUnit = match[2]?.trim().toLowerCase();
    const rawName = match[3]?.trim();

    if (rawAmt && UNIT_MAP[rawUnit || '']) {
      amount = parseAmount(rawAmt);
      unit = UNIT_MAP[rawUnit || ''];
      displayName = rawName || '';
    } else if (rawAmt && !UNIT_MAP[rawUnit || ''] && !isNaN(parseAmount(rawAmt))) {
      // Amount without special unit (e.g. "2 Zwiebeln")
      amount = parseAmount(rawAmt);
      unit = 'Stk.';
      displayName = `${match[2] || ''} ${rawName || ''}`.trim();
    }
  }

  // Fallback if no match or displayName empty
  if (!displayName) {
    displayName = trimmed;
  }

  // Clean trailing commas, parentheses descriptions e.g. "Tomaten (gewürfelt)" -> keep as displayName
  displayName = displayName.replace(/^[-*•]\s*/, '').trim();

  const canonicalId = generateCanonicalId(displayName);
  const category = detectCategory(displayName);
  const isStaple = checkIsStaple(displayName);

  return {
    canonicalId,
    displayName,
    amount: Math.round(amount * 100) / 100,
    unit,
    category,
    isStaple,
  };
}

/**
 * Enriches a partially structured ingredient object to ensure valid canonicalId, category, and isStaple.
 */
export function enrichIngredient(partial: {
  displayName?: string;
  amount?: number;
  unit?: string;
  category?: string;
  canonicalId?: string;
  isStaple?: boolean;
}): Ingredient {
  const name = (partial.displayName || 'Zutat').trim();
  const canonicalId = partial.canonicalId || generateCanonicalId(name);
  const category = (partial.category as StandardIngredientCategory) || detectCategory(name);
  const isStaple = partial.isStaple ?? checkIsStaple(name);
  const amount = typeof partial.amount === 'number' && !isNaN(partial.amount) ? Math.round(partial.amount * 100) / 100 : 0;
  const unit = partial.unit ? (UNIT_MAP[partial.unit.toLowerCase()] || partial.unit) : '';

  return {
    canonicalId,
    displayName: name,
    amount,
    unit,
    category,
    isStaple,
  };
}
