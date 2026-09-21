import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { encodePageTexts } from '@/lib/story-utils';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

function generateSlug(text: string): string {
  const trMap: { [key: string]: string } = {
    ç: 'c', Ç: 'c', ğ: 'g', Ğ: 'g', ı: 'i', İ: 'i', ö: 'o', Ö: 'o', ş: 's', Ş: 's', ü: 'u', Ü: 'u'
  };
  let slug = text;
  for (const key in trMap) {
    slug = slug.replace(new RegExp(key, 'g'), trMap[key]);
  }
  return slug
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s-]+/g, '-')
    .replace(/^-+|-+$/g, '') + '-' + Math.floor(1000 + Math.random() * 9000);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    let { folder_id, title, cover_image_url, pages } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Hikâye başlığı zorunludur.' }, { status: 400 });
    }

    if (!pages || pages.length === 0) {
      return NextResponse.json({ error: 'Hikâyede en az 1 sayfa olmalıdır.' }, { status: 400 });
    }

    // 1. Fallback folder if not provided
    if (!folder_id) {
      const { data: generalFolder } = await supabaseAdmin
        .from('folders')
        .select('id')
        .eq('slug', 'genel-setler')
        .maybeSingle();

      if (generalFolder) {
        folder_id = generalFolder.id;
      } else {
        const { data: anyFolder } = await supabaseAdmin.from('folders').select('id').limit(1).single();
        if (anyFolder) folder_id = anyFolder.id;
      }
    }

    const slug = generateSlug(title);

    // 2. Insert Story
    const { data: storyData, error: storyError } = await supabaseAdmin
      .from('stories')
      .insert({
        folder_id,
        title: title.trim(),
        slug,
        cover_image_url: cover_image_url || null,
        is_published: true,
        order_index: 1,
      })
      .select()
      .single();

    if (storyError) {
      console.error('Story insert error:', storyError);
      return NextResponse.json({ error: storyError.message }, { status: 500 });
    }

    // 3. Insert Story Pages (encoded with pronunciation)
    const validPages = pages.filter((p: any) => p.english_text && p.english_text.trim());
    
    const pagesToInsert = validPages.map((p: any, idx: number) => ({
      story_id: storyData.id,
      page_number: idx + 1,
      english_text: p.english_text.trim(),
      turkish_text: encodePageTexts(p.turkish_text || '', p.pronunciation),
      image_url: p.image_url || null,
      audio_url: p.audio_url || null,
    }));

    const { error: pagesError } = await supabaseAdmin.from('story_pages').insert(pagesToInsert);

    if (pagesError) {
      console.error('Pages insert error:', pagesError);
      return NextResponse.json({ error: pagesError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      story: storyData,
      shareUrl: `/story/${storyData.slug}`,
    });
  } catch (error: any) {
    console.error('Create story error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
