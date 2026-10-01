import { GoogleGenerativeAI } from '@google/generative-ai';

let genAI: GoogleGenerativeAI | null = null;

export function getGeminiClient(): GoogleGenerativeAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!genAI) {
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

export function isGeminiAvailable(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

/**
 * Calls Gemini 1.5 Flash to generate structured JSON.
 * Returns null if Gemini is unavailable or parsing fails.
 */
export async function generateStructuredJson<T>(
  systemPrompt: string,
  userPrompt: string,
): Promise<T | null> {
  const client = getGeminiClient();
  if (!client) {
    return null;
  }

  try {
    const model = client.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
      systemInstruction: systemPrompt,
    });

    const result = await model.generateContent(userPrompt);
    const text = result.response.text();
    if (!text) {
      return null;
    }

    return JSON.parse(text) as T;
  } catch (error) {
    console.warn('[Gemini] Error generating structured content:', (error as Error).message);
    return null;
  }
}
