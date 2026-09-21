import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { encodeCardTurkish } from '@/lib/card-utils';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { set_id, title, description, folder_id, cards } = body;

    if (!set_id || !title || !cards || cards.length === 0) {
      return NextResponse.json(
        { error: 'set_id, başlık ve en az 1 kart gereklidir.' },
        { status: 400 }
      );
    }

    // 1. Update set metadata
    const updatePayload: any = {
      title: title.trim(),
      description: (description || '').trim(),
    };
    if (folder_id) {
      updatePayload.folder_id = folder_id;
    }

    const { data: updatedSet, error: setErr } = await supabaseAdmin
      .from('sets')
      .update(updatePayload)
      .eq('id', set_id)
      .select()
      .single();

    if (setErr) throw setErr;

    // 2. Refresh cards: delete old cards and insert updated list
    const { error: delErr } = await supabaseAdmin
      .from('set_cards')
      .delete()
      .eq('set_id', set_id);

    if (delErr) throw delErr;

    const cardsToInsert = cards
      .filter((c: any) => c.english_text && c.english_text.trim())
      .map((card: any, index: number) => ({
        set_id,
        english_text: card.english_text.trim(),
        turkish_text: encodeCardTurkish(card.turkish_text || '', card.hint),
        image_url: card.image_url || null,
        pronunciation: card.pronunciation || null,
        audio_url: card.audio_url || null,
        order_index: index + 1,
      }));

    if (cardsToInsert.length > 0) {
      const { error: insErr } = await supabaseAdmin
        .from('set_cards')
        .insert(cardsToInsert);
      if (insErr) throw insErr;
    }

    return NextResponse.json({ success: true, set: updatedSet });
  } catch (error: any) {
    console.error('Update set error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
