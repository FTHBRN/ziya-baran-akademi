export interface ClassItem {
  id: string;
  name: string;
  slug: string;
  description?: string;
  order_index: number;
  created_at?: string;
}

export interface FolderItem {
  id: string;
  class_id: string;
  name: string;
  slug: string;
  description?: string;
  order_index: number;
  created_at?: string;
}

export interface SetItem {
  id: string;
  folder_id: string;
  title: string;
  slug: string;
  description?: string;
  is_published: boolean;
  order_index: number;
  created_at?: string;
  set_cards?: SetCardItem[];
}

export interface SetCardItem {
  id?: string;
  set_id?: string;
  english_text: string;
  turkish_text: string;
  pronunciation?: string;
  image_url?: string;
  audio_url?: string;
  order_index?: number;
}

export interface ManualTestItem {
  id: string;
  folder_id: string;
  title: string;
  slug: string;
  description?: string;
  is_published: boolean;
  order_index: number;
  test_questions?: TestQuestionItem[];
}

export interface TestQuestionItem {
  id?: string;
  test_id?: string;
  question_text: string;
  image_url?: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: 'A' | 'B' | 'C' | 'D';
  explanation?: string;
  order_index?: number;
}

export interface StoryItem {
  id: string;
  folder_id: string;
  title: string;
  slug: string;
  cover_image_url?: string;
  is_published: boolean;
  order_index: number;
  story_pages?: StoryPageItem[];
}

export interface StoryPageItem {
  id?: string;
  story_id?: string;
  page_number: number;
  english_text: string;
  turkish_text: string;
  pronunciation?: string;
  image_url?: string;
  audio_url?: string;
}
