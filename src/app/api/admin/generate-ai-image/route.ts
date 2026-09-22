import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { decodeSetDescription, encodeSetDescription } from '@/lib/set-utils';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const DEFAULT_FAL_KEY = '58b1939e-a511-4732-87fd-76e9843348ac:1b52ef38d23559294e9ee053d3ea6227';

/**
 * Translates abstract concepts, mental states, and daily routines into vivid, concrete visual scenes.
 */
function enhanceScene(cleanEn: string): string {
  const lower = cleanEn.toLowerCase();

  // Mental states / realization / understanding
  if (/\b(understand|understood|comprehend|know|knowing|learn|learned|remember)\b/.test(lower)) {
    return 'A cute cheerful young student sitting at a school study desk with a glowing bright yellow lightbulb floating above head, pointing finger up with an aha expression of realization, joyful smile, books and pencil holder on table';
  }

  // Energy / excitement / happiness
  if (/\b(energetic|energy|excited|joyful|super happy|thrilled)\b/.test(lower)) {
    return 'A cute cheerful child jumping happily with arms wide open in a cozy sunlit bedroom, full of vibrant morning energy, big joyful smile, morning sun shining';
  }

  // Tired / sleepy
  if (/\b(tired|sleepy|sleep|exhausted|yawn|yawning)\b/.test(lower)) {
    return 'A cute child wearing soft cozy pajamas, yawning softly with one hand near mouth, holding a cute plush teddy bear, warm cozy bedroom with soft nightlight';
  }

  // Eating / breakfast / food
  if (/\b(eat|eating|ate|breakfast|lunch|dinner|cheese|bread|sandwich|cereal)\b/.test(lower)) {
    const foodItem = cleanEn.replace(/I eat|I'm eating|I am eating|eating|eat/i, '').trim() || 'delicious food';
    return `A cute cheerful child sitting at a wooden dining table happily holding ${foodItem}, taking a cheerful bite with big joyful eyes, warm morning kitchen setting`;
  }

  // Drinking milk / water / juice
  if (/\b(drink|drinking|drank|milk|water|juice|tea)\b/.test(lower)) {
    const drinkItem = cleanEn.replace(/I drink|I'm drinking|drinking|drink/i, '').trim() || 'cold milk';
    return `A cute cheerful child holding a glass of ${drinkItem} with both hands, drinking happily with a tiny cute milk mustache, big cheerful smile`;
  }

  // Teeth brushing
  if (/\b(brush|brushing|teeth|toothbrush)\b/.test(lower)) {
    return 'A cute child in a bright bathroom happily holding a colorful toothbrush to teeth with fluffy foamy bubbles, smiling proudly in front of a mirror';
  }

  // Washing hands
  if (/\b(wash|washing|clean hands|soap)\b/.test(lower)) {
    return 'A close-up shot of a cute child washing hands under a shiny water tap with foamy soap bubbles, bright clean bathroom, cheerful proud smile';
  }

  // Talking to family / parents
  if (/\b(family|mother|father|mom|dad|parents|talk to|chat with|chatting)\b/.test(lower)) {
    return 'A warm cozy kitchen scene where a happy cute child is sitting at a wooden breakfast table laughing and chatting happily with loving smiling parents';
  }

  // Reading books / stories
  if (/\b(read|reading|book|story|stories)\b/.test(lower)) {
    return 'A cute child holding an open colorful illustrated storybook close to camera with sparkling curious eyes and a big cheerful smile, cozy reading corner';
  }

  // Thinking / wondering
  if (/\b(think|thinking|thought|wonder|curious)\b/.test(lower)) {
    return 'A cute child with chin resting thoughtfully on hand, looking upward with a cute curious expression and tiny glowing idea sparkles';
  }

  // Helping
  if (/\b(help|helping|assist|tidy|clean kitchen|cleaning)\b/.test(lower)) {
    return 'A cute child happily helping in a bright kitchen, wiping table or carrying a plate with teamwork and a proud cheerful expression';
  }

  // Running / walking / sports
  if (/\b(run|running|ran|jog|jogging|fast)\b/.test(lower)) {
    return 'A cheerful young child happily running along a sunny outdoor path, wearing a colorful t-shirt and shorts, dynamic happy running pose, bright sunny day';
  }

  // Generic sentence fallback
  const cleanAction = cleanEn.replace(/[.!?]+$/, '');
  return `A cheerful cute character ${cleanAction}, clear bold focal point, close to camera, bold and easily recognizable emotion and action`;
}

/**
 * Builds an optimized prompt according to user requirements:
 * 1. Single Word / Concept (Clean 2D vector clipart flashcard: centered, bold, minimalist solid background)
 * 2. Full Sentence / Action (Clean 2D vector educational clipart textbook illustration)
 */
function buildPrompt(
  englishText: string,
  turkishText?: string
): { prompt: string; isSentence: boolean; defaultQuality: 'hd' | 'fast' } {
  const cleanEn = englishText
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/["']/g, '')
    .trim();

  const words = cleanEn.split(/\s+/).filter(Boolean);
  const hasSentenceEnd = /[.!?]$/.test(cleanEn);
  const startsWithPronoun = /^(I|You|He|She|It|We|They|My|Our|Their|His|Her|This|That|There)\b/i.test(cleanEn);
  const isSentence = words.length >= 4 || hasSentenceEnd || (words.length >= 3 && startsWithPronoun);

  if (!isSentence) {
    // SINGLE VOCABULARY CARD (Clean 2D vector clipart)
    const prompt = `Clean 2D vector cartoon educational clipart illustration, bold clean outlines, vibrant flat cel-shaded colors, educational storybook art, close-up centered shot: A bold, vibrant, large ${cleanEn} right in the center of the frame, simple minimalist clean solid pastel background, no distant landscape, front and center, highly clear and instantly recognizable flashcard clip art, bright cheerful colors, high contrast, centered composition, no tiny distant figures, no wide shot`;
    return { prompt, isSentence: false, defaultQuality: 'fast' };
  } else {
    // SENTENCE / STORY ACTION (Clean 2D vector clipart textbook illustration)
    const scene = enhanceScene(cleanEn);
    const prompt = `${scene}, clean 2D vector cartoon educational clipart illustration, bold clean outlines, vibrant flat cel-shaded colors, friendly children textbook art style, focused medium close-up shot, front and center, child-friendly storybook illustration, simple clean background, no wide distant panoramas, no far away tiny figures, high clarity`;
    return { prompt, isSentence: true, defaultQuality: 'fast' };
  }
}

async function generateImageBuffer(prompt: string, quality: 'hd' | 'fast' = 'fast'): Promise<Buffer> {
  const falKey = process.env.FAL_KEY || DEFAULT_FAL_KEY;

  // Provider 1: fal.ai FLUX (High-speed, dedicated GPU)
  if (falKey) {
    const endpoint =
      quality === 'fast'
        ? 'https://fal.run/fal-ai/flux/schnell'
        : 'https://fal.run/fal-ai/flux/dev';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Key ${falKey}`,
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
      } else {
        const errText = await res.text();
        console.warn(`fal.ai (${endpoint}) error ${res.status}: ${errText}`);
      }
    } catch (err: any) {
      console.warn('fal.ai error, falling back:', err.message);
    }
  }

  // Provider 2: Free Pollinations (Fallback)
  const maxAttempts = 2;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const seed = Math.floor(Math.random() * 1000000);
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=600&height=600&seed=${seed}&model=flux&nologo=true`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000);

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
      }
    } catch (e: any) {
      console.warn(`Pollinations fetch attempt ${attempt} error:`, e.message);
    }
  }

  throw new Error('Görsel servisi şu an meşgul. Lütfen birkaç saniye sonra tekrar deneyin.');
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
    const { action = 'single', text, turkishText, setId, cardId, onlyMissing = false, quality } = body;

    // ACTION 1: Generate a single image from text
    if (action === 'single') {
      if (!text || !text.trim()) {
        return NextResponse.json({ error: 'Çizilecek metin belirtilmedi.' }, { status: 400 });
      }

      const { prompt, isSentence, defaultQuality } = buildPrompt(text, turkishText);
      const chosenQuality = quality || defaultQuality;
      const buffer = await generateImageBuffer(prompt, chosenQuality);
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
        quality: chosenQuality,
      });
    }

    // ACTION 2: Generate images for an entire Set
    if (action === 'set') {
      if (!setId) {
        return NextResponse.json({ error: 'setId belirtilmedi.' }, { status: 400 });
      }

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

      for (let i = 0; i < targetCards.length; i++) {
        const card = targetCards[i];
        try {
          const { prompt, isSentence, defaultQuality } = buildPrompt(card.english_text, card.turkish_text);
          const chosenQuality = quality || defaultQuality;
          const buffer = await generateImageBuffer(prompt, chosenQuality);
          const imageUrl = await saveToSupabase(buffer, card.english_text);

          await supabaseAdmin.from('set_cards').update({ image_url: imageUrl }).eq('id', card.id);

          results.push({ cardId: card.id, englishText: card.english_text, imageUrl, isSentence });

          if ((!updatedCoverUrl || card.order_index === 1) && i === 0) {
            updatedCoverUrl = imageUrl;
          }

          // Small 300ms pause
          if (i < targetCards.length - 1) {
            await new Promise((r) => setTimeout(r, 300));
          }
        } catch (cardErr: any) {
          console.error(`Error generating image for card ${card.id}:`, cardErr.message);
          results.push({ cardId: card.id, englishText: card.english_text, error: cardErr.message });
        }
      }

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
