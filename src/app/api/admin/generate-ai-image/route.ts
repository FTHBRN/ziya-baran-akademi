import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { decodeSetDescription, encodeSetDescription } from '@/lib/set-utils';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

/**
 * Builds an optimized cartoon illustration prompt according to user requirements:
 * 1. Single Word / Concept (1-3 words, e.g. "Apple", "Happy", "Run"):
 *    Close-up centered flashcard illustration, large bold subject, simple clean background, no distant elements.
 * 2. Full Sentence / Action (4+ words or sentence structure, e.g. "I wash my hands."):
 *    Medium close-up shot emphasizing the action, character close to camera, clear focal point, simple background.
 */
function buildPrompt(englishText: string, turkishText?: string): { prompt: string; isSentence: boolean } {
  const cleanEn = englishText
    .replace(/\s*\([^)]*\)/g, '') // remove parentheticals like (v.), (koşmak)
    .replace(/["']/g, '')
    .trim();

  const words = cleanEn.split(/\s+/).filter(Boolean);

  const hasSentenceEnd = /[.!?]$/.test(cleanEn);
  const startsWithPronoun = /^(I|You|He|She|It|We|They|My|Our|Their|His|Her|This|That|There)\b/i.test(cleanEn);
  const isSentence = words.length >= 4 || hasSentenceEnd || (words.length >= 3 && startsWithPronoun);

  if (!isSentence) {
    // VOCABULARY / CONCEPT CARD (Flashcard close-up)
    const prompt = `Clean 2D vector cartoon educational illustration, modern cute flat art style, close-up centered shot: A bold, vibrant, large ${cleanEn} right in the center of the frame, simple minimalist clean solid pastel background, no distant landscape, front and center, highly clear and instantly recognizable flashcard clip art, bright cheerful colors, high contrast, centered composition, no tiny distant figures, no wide shot`;
    return { prompt, isSentence: false };
  } else {
    // SENTENCE / STORY ACTION CARD (Medium close-up on action)
    const cleanAction = cleanEn.replace(/[.!?]+$/, '');
    const prompt = `Clean and colorful modern cartoon educational vector illustration, vibrant flat colors, friendly rounded art style, focused medium close-up shot emphasizing the action: A cheerful cute character ${cleanAction}, clear bold focal point, close to camera, bold and easily recognizable emotion and action, simple clean background, no wide distant panoramas, no far away figures, child-friendly storybook style, centered framing`;
    return { prompt, isSentence: true };
  }
}

async function generateImageBuffer(prompt: string): Promise<Buffer> {
  // Provider 1: fal.ai FLUX (if FAL_KEY is present)
  if (process.env.FAL_KEY) {
    try {
      const res = await fetch('https://fal.run/fal-ai/flux/schnell', {
        method: 'POST',
        headers: {
          Authorization: `Key ${process.env.FAL_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          image_size: { width: 600, height: 600 },
          num_images: 1,
          enable_safety_checker: false,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const imageUrl = data.images?.[0]?.url;
        if (imageUrl) {
          const imgRes = await fetch(imageUrl);
          if (imgRes.ok) {
            return Buffer.from(await imgRes.arrayBuffer());
          }
        }
      }
    } catch (err: any) {
      console.warn('fal.ai error, falling back to Pollinations:', err.message);
    }
  }

  // Provider 2: Pollinations with API key (if POLLINATIONS_API_KEY is present)
  const polliKey = process.env.POLLINATIONS_API_KEY;
  if (polliKey) {
    try {
      const res = await fetch(
        `https://gen.pollinations.ai/image/${encodeURIComponent(prompt)}?width=600&height=600&model=flux&key=${polliKey}`
      );
      if (res.ok) {
        return Buffer.from(await res.arrayBuffer());
      }
    } catch (err: any) {
      console.warn('Pollinations keyed API error:', err.message);
    }
  }

  // Provider 3: Free Pollinations (Zero-config default)
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const seed = Math.floor(Math.random() * 1000000);
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=600&height=600&seed=${seed}&model=flux&nologo=true`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
          Accept: 'image/jpeg,image/png,image/*;q=0.8',
        },
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const arrayBuf = await res.arrayBuffer();
        if (arrayBuf.byteLength > 1000) {
          return Buffer.from(arrayBuf);
        }
      } else if (res.status === 429) {
        console.warn(`Pollinations 429 rate limit (attempt ${attempt}/${maxAttempts}). Waiting...`);
        if (attempt < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 4000 * attempt));
          continue;
        }
      }
    } catch (e: any) {
      console.warn(`Pollinations fetch attempt ${attempt} error:`, e.message);
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        continue;
      }
    }
  }

  throw new Error('Görsel servisi şu an yoğun. Lütfen birkaç saniye sonra tekrar deneyin.');
}

async function saveToSupabase(buffer: Buffer, text: string): Promise<string> {
  const safeSlug =
    text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 25) || 'image';

  const fileName = `ai-generated/${safeSlug}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}.jpg`;

  const { error } = await supabaseAdmin.storage.from('media').upload(fileName, buffer, {
    contentType: 'image/jpeg',
    upsert: true,
  });

  if (error) {
    console.error('Supabase upload error:', error);
    throw new Error('Supabase depolama hatası: ' + error.message);
  }

  const { data: publicUrlData } = supabaseAdmin.storage.from('media').getPublicUrl(fileName);

  return publicUrlData.publicUrl;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action = 'single', text, turkishText, setId, cardId, onlyMissing = false } = body;

    // ACTION 1: Generate a single image from text
    if (action === 'single') {
      if (!text || !text.trim()) {
        return NextResponse.json({ error: 'Çizilecek metin belirtilmedi.' }, { status: 400 });
      }

      const { prompt, isSentence } = buildPrompt(text, turkishText);
      const buffer = await generateImageBuffer(prompt);
      const imageUrl = await saveToSupabase(buffer, text);

      // If cardId was provided, update it in the database directly
      if (cardId) {
        await supabaseAdmin.from('set_cards').update({ image_url: imageUrl }).eq('id', cardId);
      }

      return NextResponse.json({
        success: true,
        imageUrl,
        prompt,
        isSentence,
      });
    }

    // ACTION 2: Generate images for an entire Set
    if (action === 'set') {
      if (!setId) {
        return NextResponse.json({ error: 'setId belirtilmedi.' }, { status: 400 });
      }

      // Fetch cards
      const { data: cards, error: cardsError } = await supabaseAdmin
        .from('set_cards')
        .select('*')
        .eq('set_id', setId)
        .order('order_index');

      if (cardsError) {
        return NextResponse.json({ error: cardsError.message }, { status: 500 });
      }

      if (!cards || cards.length === 0) {
        return NextResponse.json({ error: 'Bu sette kart bulunamadı.' }, { status: 400 });
      }

      // Fetch current set info
      const { data: setInfo, error: setErr } = await supabaseAdmin
        .from('sets')
        .select('*')
        .eq('id', setId)
        .single();

      if (setErr) {
        return NextResponse.json({ error: setErr.message }, { status: 500 });
      }

      const { description, coverImageUrl, studyNotes, storyMeta } = decodeSetDescription(setInfo.description);

      const targetCards = onlyMissing ? cards.filter((c) => !c.image_url) : cards;

      const results = [];
      let updatedCoverUrl = coverImageUrl;

      // Sequential generation to avoid rate limits
      for (let i = 0; i < targetCards.length; i++) {
        const card = targetCards[i];
        try {
          const { prompt, isSentence } = buildPrompt(card.english_text, card.turkish_text);
          const buffer = await generateImageBuffer(prompt);
          const imageUrl = await saveToSupabase(buffer, card.english_text);

          await supabaseAdmin.from('set_cards').update({ image_url: imageUrl }).eq('id', card.id);

          results.push({ cardId: card.id, englishText: card.english_text, imageUrl, isSentence });

          // Update cover if needed (or if first card)
          if ((!updatedCoverUrl || card.order_index === 1) && i === 0) {
            updatedCoverUrl = imageUrl;
          }

          // Small 1s breather between cards to avoid rate limit spikes
          if (i < targetCards.length - 1) {
            await new Promise((r) => setTimeout(r, 1200));
          }
        } catch (cardErr: any) {
          console.error(`Error generating image for card ${card.id}:`, cardErr.message);
          results.push({ cardId: card.id, englishText: card.english_text, error: cardErr.message });
        }
      }

      // Update set cover image in database
      if (updatedCoverUrl && updatedCoverUrl !== coverImageUrl) {
        const newDescription = encodeSetDescription(description, updatedCoverUrl, studyNotes, storyMeta);
        await supabaseAdmin.from('sets').update({ description: newDescription }).eq('id', setId);
      }

      return NextResponse.json({
        success: true,
        total: targetCards.length,
        results,
        coverImageUrl: updatedCoverUrl,
      });
    }

    return NextResponse.json({ error: 'Geçersiz action.' }, { status: 400 });
  } catch (error: any) {
    console.error('generate-ai-image error:', error);
    return NextResponse.json({ error: error.message || 'Görsel üretilemedi.' }, { status: 500 });
  }
}
