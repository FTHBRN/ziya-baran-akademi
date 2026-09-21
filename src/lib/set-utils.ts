export const SET_COVER_SEPARATOR = '\n---COVER_IMAGE---\n';
export const SET_NOTES_SEPARATOR = '\n---STUDY_NOTES---\n';
export const SET_STORY_SEPARATOR = '\n---STORY_META---\n';

export interface StoryMetadata {
  isStory: boolean;
  subtitle?: string;
  quote?: string;
}

/**
 * Encodes set description, optional cover image URL, optional study notes, and optional story metadata into a database string.
 */
export function encodeSetDescription(
  description: string,
  coverImageUrl?: string,
  studyNotes?: string,
  storyMeta?: StoryMetadata
): string {
  let result = (description || '').trim();
  const cleanImg = (coverImageUrl || '').trim();
  const cleanNotes = (studyNotes || '').trim();

  if (storyMeta && storyMeta.isStory) {
    result += `${SET_STORY_SEPARATOR}${JSON.stringify(storyMeta)}`;
  }
  if (cleanImg) {
    result += `${SET_COVER_SEPARATOR}${cleanImg}`;
  }
  if (cleanNotes) {
    result += `${SET_NOTES_SEPARATOR}${cleanNotes}`;
  }
  return result;
}

/**
 * Decodes the raw description string back into clean description, cover image URL, study notes, and story metadata.
 */
export function decodeSetDescription(rawDescription: string | null | undefined): {
  description: string;
  coverImageUrl: string;
  studyNotes: string;
  storyMeta?: StoryMetadata;
} {
  if (!rawDescription) {
    return { description: '', coverImageUrl: '', studyNotes: '' };
  }

  let remaining = rawDescription;
  let studyNotes = '';
  let coverImageUrl = '';
  let storyMeta: StoryMetadata | undefined = undefined;

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

  if (remaining.includes(SET_STORY_SEPARATOR)) {
    const parts = remaining.split(SET_STORY_SEPARATOR);
    remaining = parts[0];
    try {
      storyMeta = JSON.parse(parts.slice(1).join(SET_STORY_SEPARATOR).trim());
    } catch (e) {
      console.error('Story metadata parse error:', e);
    }
  }

  return {
    description: remaining.trim(),
    coverImageUrl,
    studyNotes,
    storyMeta,
  };
}
