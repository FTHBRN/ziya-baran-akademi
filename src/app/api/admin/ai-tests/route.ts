import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const DATA_FILE = path.join(process.cwd(), 'src', 'data', 'ai_practice_tests.json');

function getLocalTests() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error('Error reading local AI tests file:', err);
  }
  return [];
}

function saveLocalTests(tests: any[]) {
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(tests, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving local AI tests file:', err);
  }
}

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// GET: list all or fetch single by ?slug=...
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get('slug');

  const supabase = getSupabaseClient();
  let useSupabase = false;

  if (supabase) {
    try {
      const { data: testRows, error } = await supabase
        .from('ai_practice_tests')
        .select('*')
        .limit(1);

      if (!error) {
        useSupabase = true;
      }
    } catch {
      useSupabase = false;
    }
  }

  if (useSupabase && supabase) {
    try {
      if (slug) {
        const { data: test, error: tErr } = await supabase
          .from('ai_practice_tests')
          .select('*')
          .eq('slug', slug)
          .single();

        if (tErr || !test) {
          return NextResponse.json({ error: 'Test bulunamadı.' }, { status: 404 });
        }

        const { data: items } = await supabase
          .from('ai_practice_items')
          .select('*')
          .eq('test_id', test.id)
          .order('order_index', { ascending: true });

        return NextResponse.json({
          test: {
            ...test,
            items: items || [],
          },
        });
      } else {
        const { data: tests, error } = await supabase
          .from('ai_practice_tests')
          .select('*, items:ai_practice_items(count)')
          .order('created_at', { ascending: false });

        return NextResponse.json({ tests: tests || [] });
      }
    } catch (e: any) {
      console.warn('Supabase query error, falling back to local JSON:', e.message);
    }
  }

  // Fallback to local JSON
  const allTests = getLocalTests();
  if (slug) {
    const found = allTests.find((t: any) => t.slug === slug || t.id === slug);
    if (!found) {
      return NextResponse.json({ error: 'Test bulunamadı.' }, { status: 404 });
    }
    return NextResponse.json({ test: found });
  }

  return NextResponse.json({ tests: allTests });
}

// POST: create new test with items
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, slug, description, items } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Test başlığı zorunludur.' }, { status: 400 });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'En az bir cümle eklemelisiniz.' }, { status: 400 });
    }

    const testSlug = (slug || title)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9ğüşıöç]+/g, '-')
      .replace(/^-+|-+$/g, '')
      + '-' + Math.floor(100 + Math.random() * 900);

    const newTestId = 'test-' + Date.now();
    const formattedItems = items.map((item: any, idx: number) => ({
      id: item.id || `item-${Date.now()}-${idx}`,
      order_index: idx + 1,
      turkish_sentence: (item.turkish_sentence || '').trim(),
      target_hint: (item.target_hint || '').trim(),
      image_url: (item.image_url || '').trim(),
    })).filter((it: any) => it.turkish_sentence);

    const newTest = {
      id: newTestId,
      title: title.trim(),
      slug: testSlug,
      description: (description || '').trim(),
      is_active: true,
      created_at: new Date().toISOString(),
      items: formattedItems,
    };

    // Try Supabase first
    const supabase = getSupabaseClient();
    let savedToSupabase = false;

    if (supabase) {
      try {
        const { data: dbTest, error: tErr } = await supabase
          .from('ai_practice_tests')
          .insert({
            title: newTest.title,
            slug: newTest.slug,
            description: newTest.description,
            is_active: true,
          })
          .select()
          .single();

        if (!tErr && dbTest) {
          const dbItems = formattedItems.map((it: any) => ({
            test_id: dbTest.id,
            order_index: it.order_index,
            turkish_sentence: it.turkish_sentence,
            target_hint: it.target_hint || null,
            image_url: it.image_url || null,
          }));

          await supabase.from('ai_practice_items').insert(dbItems);
          savedToSupabase = true;
          newTest.id = dbTest.id;
        }
      } catch (err: any) {
        console.warn('Could not save to Supabase directly:', err.message);
      }
    }

    // Always update local JSON as well for instant reliability
    const localTests = getLocalTests();
    localTests.unshift(newTest);
    saveLocalTests(localTests);

    return NextResponse.json({
      success: true,
      test: newTest,
      savedToSupabase,
    });
  } catch (error: any) {
    console.error('Error creating AI test:', error);
    return NextResponse.json({ error: error.message || 'Test kaydedilemedi.' }, { status: 500 });
  }
}

// DELETE: delete test by ?id=...
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Test ID zorunludur.' }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('ai_practice_tests').delete().eq('id', id);
      } catch {}
    }

    const localTests = getLocalTests().filter((t: any) => t.id !== id);
    saveLocalTests(localTests);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
