import { NextResponse } from 'next/server';
import { supabaseAdmin, supabase } from '@/lib/supabase';
import { DEFAULT_KELIME_PATLAT_WORDS, WordPair } from '@/lib/kelime-patlat-words';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const GAME_SLUG = '__game_kelime_patlat__';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('classes')
      .select('id, description')
      .eq('slug', GAME_SLUG)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.warn('Kelime Patlat fetch warning:', error);
    }

    if (data?.description) {
      try {
        const parsed = JSON.parse(data.description);
        if (Array.isArray(parsed.words) && parsed.words.length > 0) {
          return NextResponse.json({ words: parsed.words });
        }
      } catch (parseErr) {
        console.warn('JSON parse warning:', parseErr);
      }
    }

    // Default fallback
    return NextResponse.json({ words: DEFAULT_KELIME_PATLAT_WORDS });
  } catch (error: any) {
    console.error('Kelime Patlat GET error:', error);
    return NextResponse.json({ words: DEFAULT_KELIME_PATLAT_WORDS, error: error.message });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, words } = body;

    let targetWords: WordPair[] = DEFAULT_KELIME_PATLAT_WORDS;

    if (action === 'reset') {
      targetWords = DEFAULT_KELIME_PATLAT_WORDS;
    } else if (action === 'save') {
      if (!Array.isArray(words)) {
        return NextResponse.json({ error: 'Geçersiz kelime listesi.' }, { status: 400 });
      }
      targetWords = words;
    } else {
      return NextResponse.json({ error: 'Geçersiz işlem.' }, { status: 400 });
    }

    // Check existing
    const { data: existing } = await supabaseAdmin
      .from('classes')
      .select('id')
      .eq('slug', GAME_SLUG)
      .maybeSingle();

    const payload = JSON.stringify({ words: targetWords, updatedAt: new Date().toISOString() });

    if (existing?.id) {
      const { error: updateErr } = await supabaseAdmin
        .from('classes')
        .update({ description: payload })
        .eq('id', existing.id);

      if (updateErr) throw updateErr;
    } else {
      const { error: insertErr } = await supabaseAdmin
        .from('classes')
        .insert({
          name: 'Kelime Patlat Oyunu',
          slug: GAME_SLUG,
          description: payload,
          order_index: -998,
        });

      if (insertErr) throw insertErr;
    }

    return NextResponse.json({ success: true, count: targetWords.length, words: targetWords });
  } catch (error: any) {
    console.error('Kelime Patlat POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
