import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { encodePageTexts } from '@/lib/story-utils';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    let { story_id, folder_id, title, cover_image_url, pages } = body;

    if (!story_id) {
      return NextResponse.json({ error: 'Hikâye ID zorunludur.' }, { status: 400 });
    }

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

    // 2. Update Story record
    const { data: updatedStory, error: storyError } = await supabaseAdmin
      .from('stories')
      .update({
        title: title.trim(),
        folder_id,
        cover_image_url: cover_image_url || null,
      })
      .eq('id', story_id)
      .select()
      .single();

    if (storyError) {
      console.error('Update story error:', storyError);
      return NextResponse.json({ error: storyError.message }, { status: 500 });
    }

    // 3. Delete existing pages
    const { error: deletePagesError } = await supabaseAdmin
      .from('story_pages')
      .delete()
      .eq('story_id', story_id);

    if (deletePagesError) {
      console.error('Delete pages error:', deletePagesError);
      return NextResponse.json({ error: deletePagesError.message }, { status: 500 });
    }

    // 4. Re-insert updated pages
    const validPages = pages.filter((p: any) => p.english_text && p.english_text.trim());
    const pagesToInsert = validPages.map((p: any, idx: number) => ({
      story_id,
      page_number: idx + 1,
      english_text: p.english_text.trim(),
      turkish_text: encodePageTexts(p.turkish_text || '', p.pronunciation),
      image_url: p.image_url || null,
      audio_url: p.audio_url || null,
    }));

    const { error: insertPagesError } = await supabaseAdmin
      .from('story_pages')
      .insert(pagesToInsert);

    if (insertPagesError) {
      console.error('Insert pages error:', insertPagesError);
      return NextResponse.json({ error: insertPagesError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      story: updatedStory,
      shareUrl: `/story/${updatedStory.slug}`,
    });
  } catch (error: any) {
    console.error('Update story exception:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
