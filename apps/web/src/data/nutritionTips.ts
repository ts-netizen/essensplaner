export interface DailyNutritionTip {
  id: string;
  title: string;
  ingredient: string;
  highlight: string;
  canonicalId: string;
  disclaimer: string;
}

export const DAILY_NUTRITION_TIPS: DailyNutritionTip[] = [
  {
    id: 'tip_lycopin',
    title: 'Zellschutz durch erhitzte Tomaten',
    ingredient: 'Tomaten & Olivenöl',
    highlight: 'Lycopin wird durch schonendes Erhitzen und in Kombination mit gesunden Fetten (wie Olivenöl) für den Körper bis zu viermal besser bioverfügbar.',
    canonicalId: 'tomate',
    disclaimer: 'Kein medizinischer Ratschlag. Die Angaben dienen ausschließlich der allgemeinen Information.',
  },
  {
    id: 'tip_omega3',
    title: 'Gehirnnahrung durch marine Omega-3-Fettsäuren',
    ingredient: 'Lachsforelle & Fisch',
    highlight: 'DHA und EPA tragen zur Erhaltung normaler Gehirnfunktionen und der Sehkraft bei. Eine Portion wöchentlich deckt den Grundbedarf optimal.',
    canonicalId: 'lachs',
    disclaimer: 'Kein medizinischer Ratschlag. Die Angaben dienen ausschließlich der allgemeinen Information.',
  },
  {
    id: 'tip_allicin',
    title: 'Die 10-Minuten-Knoblauch-Regel',
    ingredient: 'Knoblauch',
    highlight: 'Lässt man gehackten Knoblauch vor dem Anbraten 10 Minuten an der Luft ruhen, kann sich das wertvolle Enzym Alliinase voll entfalten und hitzestabiles Allicin bilden.',
    canonicalId: 'knoblauch',
    disclaimer: 'Kein medizinischer Ratschlag. Die Angaben dienen ausschließlich der allgemeinen Information.',
  },
  {
    id: 'tip_ballaststoffe',
    title: 'Darmgesundheit durch resistente Hülsenfrüchte',
    ingredient: 'Kichererbsen & Linsen',
    highlight: 'Präbiotische Ballaststoffe dienen den nützlichen Darmbakterien als Hauptnahrungsquelle und fördern die Bildung kurzkettiger Fettsäuren (Butyrat).',
    canonicalId: 'kichererbsen',
    disclaimer: 'Kein medizinischer Ratschlag. Die Angaben dienen ausschließlich der allgemeinen Information.',
  },
  {
    id: 'tip_vitamin_c',
    title: 'Synergie: Eisen und Vitamin C',
    ingredient: 'Zitrone & Spinat',
    highlight: 'Ein Spritzer frischer Zitronensaft über Spinat oder Linsengerichten verdoppelt bis verdreifacht die pflanzliche Eisenaufnahme im Dünndarm.',
    canonicalId: 'zitrone',
    disclaimer: 'Kein medizinischer Ratschlag. Die Angaben dienen ausschließlich der allgemeinen Information.',
  },
];

export function getTodayNutritionTip(): DailyNutritionTip {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24
  );
  return DAILY_NUTRITION_TIPS[dayOfYear % DAILY_NUTRITION_TIPS.length];
}
