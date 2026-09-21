export const PRONUNCIATION_SEPARATOR = '\n---PRONUNCIATION---\n';

/**
 * Encodes Turkish translation and pronunciation into a single database-safe string
 * if the database schema does not have a separate pronunciation column.
 */
export function encodePageTexts(turkish: string, pronunciation?: string): string {
  const cleanTr = (turkish || '').trim();
  const cleanPr = (pronunciation || '').trim();
  if (!cleanPr) return cleanTr;
  return `${cleanTr}${PRONUNCIATION_SEPARATOR}${cleanPr}`;
}

/**
 * Decodes the raw turkish_text string back into clean Turkish text and pronunciation guide.
 */
export function decodePageTexts(rawTurkishText: string | null | undefined): { turkish: string; pronunciation: string } {
  if (!rawTurkishText) return { turkish: '', pronunciation: '' };
  
  if (rawTurkishText.includes(PRONUNCIATION_SEPARATOR)) {
    const parts = rawTurkishText.split(PRONUNCIATION_SEPARATOR);
    return {
      turkish: parts[0] ? parts[0].trim() : '',
      pronunciation: parts[1] ? parts[1].trim() : '',
    };
  }
  
  // Also check if [Okunuş: ...] format is present
  const match = rawTurkishText.match(/^([\s\S]*?)(?:\[Okunuş:\s*([\s\S]*?)\])?$/);
  if (match && match[2]) {
    return {
      turkish: (match[1] || '').trim(),
      pronunciation: (match[2] || '').trim(),
    };
  }
  
  return {
    turkish: rawTurkishText.trim(),
    pronunciation: '',
  };
}
