export type DetectedLanguage = 'uz' | 'ru' | 'en';

export const LANGUAGE_POLICY = `LANGUAGE POLICY:
- Detect the user's language from their input (uz, ru, en).
- Always respond in the SAME language as the user's last message.
- If quoting a document in a different language, translate the quote and show the original in parentheses.
- Localize currency (UZS / so'm), dates, and numerals.`;

export function detectLanguage(input: string): DetectedLanguage {
  if (/[а-яё]/i.test(input)) return 'ru';
  if (/\b(the|and|is|are|what|how|where|when|why|please)\b/i.test(input)) return 'en';
  return 'uz';
}
