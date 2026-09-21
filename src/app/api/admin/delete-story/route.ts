import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { story_id } = body;

    if (!story_id) {
      return NextResponse.json({ error: 'story_id gereklidir.' }, { status: 400 });
    }

    // First delete all pages for this story
    await supabaseAdmin
      .from('story_pages')
      .delete()
      .eq('story_id', story_id);

    // Then delete the story itself
    const { error } = await supabaseAdmin
      .from('stories')
      .delete()
      .eq('id', story_id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete story error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
