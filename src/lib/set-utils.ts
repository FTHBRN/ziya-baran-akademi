export const SET_COVER_SEPARATOR = '\n---COVER_IMAGE---\n';
export const SET_NOTES_SEPARATOR = '\n---STUDY_NOTES---\n';

/**
 * Encodes set description, optional cover image URL, and optional study notes into a database string.
 */
export function encodeSetDescription(
  description: string,
  coverImageUrl?: string,
  studyNotes?: string
): string {
  let result = (description || '').trim();
  const cleanImg = (coverImageUrl || '').trim();
  const cleanNotes = (studyNotes || '').trim();

  if (cleanImg) {
    result += `${SET_COVER_SEPARATOR}${cleanImg}`;
  }
  if (cleanNotes) {
    result += `${SET_NOTES_SEPARATOR}${cleanNotes}`;
  }
  return result;
}

/**
 * Decodes the raw description string back into clean description, cover image URL, and study notes.
 */
export function decodeSetDescription(rawDescription: string | null | undefined): {
  description: string;
  coverImageUrl: string;
  studyNotes: string;
} {
  if (!rawDescription) {
    return { description: '', coverImageUrl: '', studyNotes: '' };
  }

  let remaining = rawDescription;
  let studyNotes = '';
  let coverImageUrl = '';

  if (remaining.includes(SET_NOTES_SEPARATOR)) {
    const parts = remaining.split(SET_NOTES_SEPARATOR);
    remaining = parts[0];
    studyNotes = parts.slice(1).join(SET_NOTES_SEPARATOR).trim();
  }

  if (remaining.includes(SET_COVER_SEPARATOR)) {
    const parts = remaining.split(SET_COVER_SEPARATOR);
    remaining = parts[0];
    coverImageUrl = parts.slice(1).join(SET_COVER_SEPARATOR).trim();
  }

  return {
    description: remaining.trim(),
    coverImageUrl,
    studyNotes,
  };
}
