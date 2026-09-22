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

  let text = rawDescription;
  let studyNotes = '';
  let coverImageUrl = '';
  let storyMeta: StoryMetadata | undefined = undefined;

  // Extract Story Meta if present
  const storyMatch = text.match(/\n?---STORY_META---\n([\s\S]*?)(?=\n?---(?:COVER_IMAGE|STUDY_NOTES)---|$)/);
  if (storyMatch) {
    try {
      storyMeta = JSON.parse(storyMatch[1].trim());
    } catch (e) {
      console.error('Story metadata parse error:', e);
    }
    text = text.replace(storyMatch[0], '');
  }

  // Extract Cover Image if present
  const coverMatch = text.match(/\n?---COVER_IMAGE---\n([\s\S]*?)(?=\n?---(?:STORY_META|STUDY_NOTES)---|$)/);
  if (coverMatch) {
    coverImageUrl = coverMatch[1].trim();
    text = text.replace(coverMatch[0], '');
  }

  // Extract Study Notes if present
  const notesMatch = text.match(/\n?---STUDY_NOTES---\n([\s\S]*?)(?=\n?---(?:STORY_META|COVER_IMAGE)---|$)/);
  if (notesMatch) {
    studyNotes = notesMatch[1].trim();
    text = text.replace(notesMatch[0], '');
  }

  return {
    description: text.trim(),
    coverImageUrl,
    studyNotes,
    storyMeta,
  };
}
