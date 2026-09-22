import useSWR, { preload } from 'swr';
import { supabase } from '@/lib/supabase';

// Global SWR options optimized for mobile learning app
export const swrConfig = {
  revalidateOnFocus: false, // Don't re-query every time student switches apps
  revalidateIfStale: true,  // Silent background revalidation
  dedupingInterval: 120000, // 2 minutes deduping window for zero-latency instant cache
  keepPreviousData: true,
};

// 1. Home Page Modules Fetcher
export async function fetchHomeModules() {
  const { data, error } = await supabase
    .from('classes')
    .select('*, folders(*, sets(id), manual_tests(id), stories(id))')
    .neq('slug', '__system_settings__')
    .order('order_index', { ascending: true });

  if (error) throw error;
  return data || [];
}

export function useCachedHomeModules() {
  return useSWR('home:modules', fetchHomeModules, {
    ...swrConfig,
    dedupingInterval: 300000, // 5 minutes cache for home modules
  });
}

// 2. Module Detail Fetcher
export async function fetchModuleData(slug: string) {
  if (!slug) return null;

  // 1. Fetch class
  const { data: cls, error: clsErr } = await supabase
    .from('classes')
    .select('*')
    .eq('slug', slug)
    .single();

  if (clsErr || !cls) throw clsErr || new Error('Module not found');

  // 2. Fetch folders
  const { data: fList } = await supabase
    .from('folders')
    .select('*')
    .eq('class_id', cls.id)
    .order('order_index');

  const folders = fList || [];
  const folderIds = folders.map((f) => f.id);

  let sets: any[] = [];
  let tests: any[] = [];
  let stories: any[] = [];

  if (folderIds.length > 0) {
    const [setsRes, testsRes, storiesRes] = await Promise.all([
      supabase
        .from('sets')
        .select('*, set_cards(id), folders(name)')
        .in('folder_id', folderIds)
        .eq('is_published', true)
        .order('order_index'),
      supabase
        .from('manual_tests')
        .select('*, test_questions(id), folders(name)')
        .in('folder_id', folderIds)
        .eq('is_published', true)
        .order('order_index'),
      supabase
        .from('stories')
        .select('*, story_pages(id), folders(name)')
        .in('folder_id', folderIds)
        .eq('is_published', true)
        .order('created_at', { ascending: false }),
    ]);

    sets = setsRes.data || [];
    tests = testsRes.data || [];
    stories = storiesRes.data || [];
  }

  return {
    moduleData: cls,
    folders,
    sets,
    tests,
    stories,
  };
}

export function useCachedModule(slug: string) {
  return useSWR(slug ? `module:${slug}` : null, () => fetchModuleData(slug), swrConfig);
}

export function preloadModule(slug: string) {
  if (slug) preload(`module:${slug}`, () => fetchModuleData(slug));
}

// 3. Set Detail Fetcher
export async function fetchSetData(slug: string) {
  if (!slug) return null;

  const { data: setItem, error: setErr } = await supabase
    .from('sets')
    .select('*, folders(name, classes(name)), set_cards(*)')
    .eq('slug', slug)
    .single();

  if (setErr) throw setErr;
  if (!setItem) return null;

  let prevSet: { title: string; slug: string } | null = null;
  let nextSet: { title: string; slug: string } | null = null;

  if (setItem.folder_id) {
    const { data: siblings } = await supabase
      .from('sets')
      .select('id, title, slug, order_index')
      .eq('folder_id', setItem.folder_id)
      .eq('is_published', true)
      .order('order_index');

    if (siblings && siblings.length > 1) {
      const currentIdx = siblings.findIndex((s) => s.id === setItem.id);
      if (currentIdx > 0) prevSet = siblings[currentIdx - 1];
      if (currentIdx >= 0 && currentIdx < siblings.length - 1) nextSet = siblings[currentIdx + 1];
    }
  }

  return {
    setItem,
    prevSet,
    nextSet,
  };
}

export function useCachedSet(slug: string) {
  return useSWR(slug ? `set:${slug}` : null, () => fetchSetData(slug), swrConfig);
}

export function preloadSet(slug: string) {
  if (slug) preload(`set:${slug}`, () => fetchSetData(slug));
}

// 4. Test Detail Fetcher
export async function fetchTestData(slug: string) {
  if (!slug) return null;

  const { data: testItem, error: testErr } = await supabase
    .from('manual_tests')
    .select('*, folders(name, classes(name)), test_questions(*)')
    .eq('slug', slug)
    .single();

  if (testErr) throw testErr;
  if (!testItem) return null;

  let prevTest: { title: string; slug: string } | null = null;
  let nextTest: { title: string; slug: string } | null = null;

  if (testItem.folder_id) {
    const { data: siblings } = await supabase
      .from('manual_tests')
      .select('id, title, slug, order_index')
      .eq('folder_id', testItem.folder_id)
      .eq('is_published', true)
      .order('order_index');

    if (siblings && siblings.length > 1) {
      const currentIdx = siblings.findIndex((s) => s.id === testItem.id);
      if (currentIdx > 0) prevTest = siblings[currentIdx - 1];
      if (currentIdx >= 0 && currentIdx < siblings.length - 1) nextTest = siblings[currentIdx + 1];
    }
  }

  return {
    testItem,
    prevTest,
    nextTest,
  };
}

export function useCachedTest(slug: string) {
  return useSWR(slug ? `test:${slug}` : null, () => fetchTestData(slug), swrConfig);
}

export function preloadTest(slug: string) {
  if (slug) preload(`test:${slug}`, () => fetchTestData(slug));
}

// 5. Story Detail Fetcher
export async function fetchStoryData(slug: string) {
  if (!slug) return null;

  const { data: storyData, error: storyError } = await supabase
    .from('stories')
    .select('*, folders(name, classes(name)), story_pages(*)')
    .eq('slug', slug)
    .single();

  if (storyError) throw storyError;
  if (!storyData) return null;

  let prevStory: { title: string; slug: string } | null = null;
  let nextStory: { title: string; slug: string } | null = null;

  if (storyData.folder_id) {
    const { data: siblings } = await supabase
      .from('stories')
      .select('id, title, slug, order_index, created_at')
      .eq('folder_id', storyData.folder_id)
      .eq('is_published', true)
      .order('order_index')
      .order('created_at');

    if (siblings && siblings.length > 1) {
      const currentIdx = siblings.findIndex((s) => s.id === storyData.id);
      if (currentIdx > 0) prevStory = siblings[currentIdx - 1];
      if (currentIdx >= 0 && currentIdx < siblings.length - 1) nextStory = siblings[currentIdx + 1];
    }
  }

  return {
    storyData,
    prevStory,
    nextStory,
  };
}

export function useCachedStory(slug: string) {
  return useSWR(slug ? `story:${slug}` : null, () => fetchStoryData(slug), swrConfig);
}

export function preloadStory(slug: string) {
  if (slug) preload(`story:${slug}`, () => fetchStoryData(slug));
}
