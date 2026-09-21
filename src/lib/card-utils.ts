export const CARD_HINT_SEPARATOR = '\n---HINT---\n';

/**
 * Encodes Turkish translation and optional hint/explanation into a single database-safe string.
 */
export function encodeCardTurkish(turkish: string, hint?: string): string {
  const cleanTr = (turkish || '').trim();
  const cleanHint = (hint || '').trim();
  if (!cleanHint) return cleanTr;
  return `${cleanTr}${CARD_HINT_SEPARATOR}${cleanHint}`;
}

/**
 * Decodes raw turkish text string back into clean Turkish text and optional hint/explanation.
 */
export function decodeCardTurkish(rawTurkish: string | null | undefined): {
  turkish: string;
  hint: string;
} {
  if (!rawTurkish) return { turkish: '', hint: '' };

  if (rawTurkish.includes(CARD_HINT_SEPARATOR)) {
    const parts = rawTurkish.split(CARD_HINT_SEPARATOR);
    return {
      turkish: parts[0] ? parts[0].trim() : '',
      hint: parts.slice(1).join(CARD_HINT_SEPARATOR).trim(),
    };
  }

  // Also check if [İpucu: ...] or [Açıklama: ...] format is present
  const match = rawTurkish.match(/^([\s\S]*?)(?:\[(?:İpucu|Açıklama|Hint):\s*([\s\S]*?)\])?$/);
  if (match && match[2]) {
    return {
      turkish: (match[1] || '').trim(),
      hint: (match[2] || '').trim(),
    };
  }

  return {
    turkish: rawTurkish.trim(),
    hint: '',
  };
}
