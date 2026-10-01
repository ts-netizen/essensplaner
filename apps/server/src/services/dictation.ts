import { type Recipe, type Ingredient } from '@essensplaner/shared';
import {
  parseIngredientString,
  enrichIngredient,
} from './ingredientParser.js';
import { generateStructuredJson, isGeminiAvailable } from './gemini.js';

interface DictationParsedOutput {
  title?: string;
  servings?: number;
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  isLunch?: boolean;
  isDinner?: boolean;
  categories?: string[];
  ingredients?: Array<{
    displayName?: string;
    amount?: number;
    unit?: string;
  }>;
  instructions?: string[];
}

/**
 * Parses spoken voice memos / dictations into a structured Recipe object.
 * Utilizes Gemini 1.5 Flash if available, with a resilient rule-based heuristic fallback.
 */
export async function parseDictation(rawText: string): Promise<Recipe> {
  const text = rawText.trim();
  if (!text) {
    throw new Error('Der Diktat-Text darf nicht leer sein.');
  }

  // 1. Try Gemini 1.5 Flash
  if (isGeminiAvailable()) {
    const systemPrompt = `Du bist ein hochpräziser kulinarischer Assistent für einen smarten Essensplaner.
Wandle gesprochene Diktate oder Sprachnotizen in ein perfekt strukturiertes Rezept um.
Zerlege Zutaten in genaue Mengen, Einheiten und Namen.
Unterteile die Zubereitung in verständliche, chronologisch nummerierte Einzelschritte.
Antworte zwingend im folgenden JSON-Format:
{
  "title": "Spaghetti Carbonara",
  "servings": 4,
  "prepTimeMinutes": 10,
  "cookTimeMinutes": 15,
  "isLunch": false,
  "isDinner": true,
  "categories": ["Pasta", "Schnelle Küche"],
  "ingredients": [
    { "displayName": "Spaghetti", "amount": 400, "unit": "g" },
    { "displayName": "Guanciale", "amount": 150, "unit": "g" }
  ],
  "instructions": [
    "Schritt 1: Einen großen Topf mit Salzwasser aufsetzen...",
    "Schritt 2: Guanciale in Streifen schneiden und in einer Pfanne knusprig auslassen..."
  ]
}`;

    const prompt = `Hier ist die Sprachnotiz des Nutzers:\n"""\n${text}\n"""`;

    const result = await generateStructuredJson<DictationParsedOutput>(
      systemPrompt,
      prompt,
    );

    if (result && result.title) {
      const ingredients: Ingredient[] = (result.ingredients || []).map((item) =>
        enrichIngredient(item),
      );

      const prepTime = result.prepTimeMinutes ?? 15;
      const cookTime = result.cookTimeMinutes ?? 20;

      return {
        id: `recipe-dictated-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        title: result.title,
        sourceUrl: '',
        prepTimeMinutes: prepTime,
        cookTimeMinutes: cookTime,
        servings: result.servings ?? 4,
        isLunch: result.isLunch ?? prepTime + cookTime <= 30,
        isDinner: result.isDinner ?? true,
        categories:
          result.categories && result.categories.length > 0
            ? result.categories
            : ['Hauptgericht'],
        visibility: 'private',
        photoUrl: '',
        ingredients:
          ingredients.length > 0
            ? ingredients
            : [parseIngredientString('Zutaten nach Wunsch')],
        instructions:
          result.instructions && result.instructions.length > 0
            ? result.instructions
            : ['Nach Wunsch zubereiten.'],
        createdAt: new Date().toISOString(),
      };
    }
  }

  // 2. Resilient Rule-Based Heuristic Fallback
  return parseDictationHeuristically(text);
}

/**
 * Heuristically parses spoken text using regex patterns and German language cues.
 */
export function parseDictationHeuristically(text: string): Recipe {
  // Title detection
  let title = 'Gesprochenes Rezept';
  const titleMatch = text.match(
    /(?:rezept\s+für|wir\s+kochen\s+heute|gericht\s*:?|heute\s+gibt\s+es|machen\s+wir)\s+([^,.;\n]+)/i,
  );
  if (titleMatch && titleMatch[1]) {
    title = titleMatch[1].trim();
  } else {
    // First line or sentence
    const firstLine = text.split(/[\n.;]/)[0]?.trim();
    if (firstLine && firstLine.length < 50) {
      title = firstLine;
    }
  }

  // Capitalize title
  title = title.charAt(0).toUpperCase() + title.slice(1);

  // Servings detection (e.g. "für 4 Personen", "4 Portionen")
  let servings = 4;
  const servingsMatch = text.match(
    /(?:für\s+)?(\d+)\s*(?:personen|portionen|leute|teller)/i,
  );
  if (servingsMatch && servingsMatch[1]) {
    servings = parseInt(servingsMatch[1], 10);
  }

  // Time detection
  let prepTimeMinutes = 15;
  let cookTimeMinutes = 20;
  const timeMatches = text.match(/(\d+)\s*(?:minuten|min)/gi);
  if (timeMatches && timeMatches.length > 0) {
    const firstTime = parseInt(timeMatches[0], 10);
    if (!isNaN(firstTime)) {
      cookTimeMinutes = firstTime;
    }
    if (timeMatches.length > 1) {
      const secondTime = parseInt(timeMatches[1], 10);
      if (!isNaN(secondTime)) {
        prepTimeMinutes = secondTime;
      }
    }
  }

  // Split into sentences / segments
  // Check if there is an explicit Zubereitung / Schritte division
  const zubereitungSplit = text.split(/(?:zubereitung|schritte|anleitung)\s*:?/i);
  let ingredientSegment = text;
  let instructionSegment = '';

  if (zubereitungSplit.length > 1) {
    ingredientSegment = zubereitungSplit[0];
    instructionSegment = zubereitungSplit.slice(1).join(' ');
  }

  // Extract ingredients
  const sentences = ingredientSegment
    .split(/[,;\n]|\bund\b/i)
    .map((s) => s.trim())
    .filter((s) => s.length > 2);

  const ingredients: Ingredient[] = [];
  const candidateInstructions: string[] = [];

  const cookingActionVerbs = /(anbraten|braten|kochen|zugeben|hinzufügen|schneiden|hacken|köcheln|mischen|verrühren|backen|würzen|abschmecken|ziehen lassen|erhitzen|schwenken)/i;

  for (const sentence of sentences) {
    // Clean fillers like "wir brauchen", "dazu", "außerdem", "etwas"
    const cleaned = sentence
      .replace(
        /^(wir brauchen|dafür brauchen wir|dazu|außerdem|nimm|nehmen|benötigt werden)\s*/i,
        '',
      )
      .trim();

    // If it clearly contains a cooking action verb, it's an instruction
    if (cookingActionVerbs.test(cleaned)) {
      candidateInstructions.push(cleaned);
      continue;
    }

    // If it has amounts, units or looks like an ingredient
    const ing = parseIngredientString(cleaned);
    if (ing.displayName.length > 1 && !cookingActionVerbs.test(ing.displayName)) {
      ingredients.push(ing);
    }
  }

  // Extract instructions
  const instructions: string[] = [];
  if (instructionSegment) {
    const stepSentences = instructionSegment
      .split(/(?<=[.!?])\s+|\n+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 4);
    instructions.push(...stepSentences);
  }

  if (instructions.length === 0 && candidateInstructions.length > 0) {
    instructions.push(...candidateInstructions);
  }

  if (instructions.length === 0) {
    // Look in whole text for step sentences
    const allSteps = text
      .split(/(?<=[.!?])\s+|\n+/)
      .map((s) => s.trim())
      .filter((s) => cookingActionVerbs.test(s));
    if (allSteps.length > 0) {
      instructions.push(...allSteps);
    } else {
      instructions.push('Zutaten vorbereiten und nach eigenem Geschmack zubereiten.');
    }
  }

  // Format steps nicely (Schritt 1, Schritt 2...)
  const formattedInstructions = instructions.map((step, idx) => {
    const cleaned = step.replace(/^(\d+\.|\sschritt\s*\d+:?)\s*/i, '').trim();
    return `Schritt ${idx + 1}: ${cleaned.charAt(0).toUpperCase() + cleaned.slice(1)}`;
  });

  return {
    id: `recipe-dictated-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    title,
    sourceUrl: '',
    prepTimeMinutes,
    cookTimeMinutes,
    servings,
    isLunch: prepTimeMinutes + cookTimeMinutes <= 30,
    isDinner: true,
    categories: ['Selbstgekocht'],
    visibility: 'private',
    photoUrl: '',
    ingredients:
      ingredients.length > 0
        ? ingredients
        : [
            enrichIngredient({
              displayName: 'Zutaten nach Wunsch',
              amount: 1,
              unit: 'Portion',
            }),
          ],
    instructions: formattedInstructions,
    createdAt: new Date().toISOString(),
  };
}
