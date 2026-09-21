import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { encodeCardTurkish } from '@/lib/card-utils';

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
    let { folder_id, title, description, cards, bulk_text } = body;

    // 1. If no folder_id is provided, find or fallback to 'genel-setler' folder
    if (!folder_id) {
      const { data: generalFolder } = await supabaseAdmin
        .from('folders')
        .select('id')
        .eq('slug', 'genel-setler')
        .maybeSingle();

      if (generalFolder) {
        folder_id = generalFolder.id;
      } else {
        // Find any existing folder
        const { data: anyFolder } = await supabaseAdmin
          .from('folders')
          .select('id')
          .limit(1)
          .single();
        if (anyFolder) folder_id = anyFolder.id;
      }
    }

    // 2. Auto parse bulk_text if cards array is empty (supports 2 or 3 columns: EN | TR | HINT)
    if ((!cards || cards.length === 0) && bulk_text) {
      const lines = bulk_text.split('\n').filter((l: string) => l.trim().length > 0);
      cards = lines.map((line: string) => {
        let parts = line.split('|');
        if (parts.length < 2) parts = line.split('\t');
        if (parts.length < 2) parts = line.split(' - ');
        return {
          english_text: (parts[0] || '').trim(),
          turkish_text: (parts[1] || parts[0] || '').trim(),
          hint: (parts[2] || '').trim(),
          image_url: null,
        };
      });
    }

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Lütfen set için bir başlık yazın.' }, { status: 400 });
    }

    if (!cards || cards.length === 0) {
      return NextResponse.json({ error: 'Lütfen sete en az 1 kart ekleyin.' }, { status: 400 });
    }

    const slug = generateSlug(title);

    // 3. Insert Set
    const { data: setData, error: setError } = await supabaseAdmin
      .from('sets')
      .insert({
        folder_id,
        title: title.trim(),
        slug,
        description: (description || '').trim(),
        is_published: true,
        order_index: 1,
      })
      .select()
      .single();

    if (setError) {
      console.error('Set insert error:', setError);
      return NextResponse.json({ error: setError.message }, { status: 500 });
    }

    // 4. Insert Cards
    const cardsToInsert = cards
      .filter((c: any) => c.english_text && c.english_text.trim())
      .map((card: any, index: number) => ({
        set_id: setData.id,
        english_text: card.english_text.trim(),
        turkish_text: encodeCardTurkish(card.turkish_text || '', card.hint),
        pronunciation: card.pronunciation || null,
        image_url: card.image_url || null,
        audio_url: card.audio_url || null,
        order_index: index + 1,
      }));

    if (cardsToInsert.length > 0) {
      const { error: cardsError } = await supabaseAdmin
        .from('set_cards')
        .insert(cardsToInsert);

      if (cardsError) {
        console.error('Cards insert error:', cardsError);
        return NextResponse.json({ error: cardsError.message }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      set: setData,
      shareUrl: `/set/${setData.slug}`,
    });
  } catch (error: any) {
    console.error('Server error in create-set:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
