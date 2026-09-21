import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

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
    let { folder_id, title, description, questions } = body;

    // 1. Fallback folder if not specified
    if (!folder_id) {
      const { data: generalFolder } = await supabaseAdmin
        .from('folders')
        .select('id')
        .eq('slug', 'genel-setler')
        .maybeSingle();

      if (generalFolder) {
        folder_id = generalFolder.id;
      } else {
        const { data: anyFolder } = await supabaseAdmin
          .from('folders')
          .select('id')
          .limit(1)
          .single();
        if (anyFolder) folder_id = anyFolder.id;
      }
    }

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Lütfen test için bir başlık girin.' }, { status: 400 });
    }

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json({ error: 'Lütfen teste en az 1 soru ekleyin.' }, { status: 400 });
    }

    const slug = generateSlug(title);

    // 2. Insert into manual_tests
    const { data: testData, error: testError } = await supabaseAdmin
      .from('manual_tests')
      .insert({
        folder_id,
        title: title.trim(),
        slug,
        description: (description || '').trim() || null,
        is_published: true,
        order_index: 0,
      })
      .select()
      .single();

    if (testError) {
      console.error('Test insert error:', testError);
      return NextResponse.json({ error: testError.message }, { status: 500 });
    }

    // 3. Prepare and insert questions
    const validQuestions = questions
      .filter((q: any) => q.question_text && q.question_text.trim())
      .map((q: any, index: number) => {
        let correct = (q.correct_option || 'A').toString().trim().toUpperCase();
        if (!['A', 'B', 'C', 'D'].includes(correct)) {
          // If correct answer was provided as option text, match it
          const optA = (q.option_a || '').trim().toLowerCase();
          const optB = (q.option_b || '').trim().toLowerCase();
          const optC = (q.option_c || '').trim().toLowerCase();
          const optD = (q.option_d || '').trim().toLowerCase();
          const val = correct.toLowerCase();

          if (val === optA) correct = 'A';
          else if (val === optB) correct = 'B';
          else if (val === optC) correct = 'C';
          else if (val === optD) correct = 'D';
          else correct = 'A';
        }

        return {
          test_id: testData.id,
          question_text: q.question_text.trim(),
          image_url: q.image_url && q.image_url.trim() ? q.image_url.trim() : null,
          option_a: (q.option_a || '').trim() || 'A',
          option_b: (q.option_b || '').trim() || 'B',
          option_c: (q.option_c || '').trim() || 'C',
          option_d: (q.option_d || '').trim() || 'D',
          correct_option: correct,
          explanation: q.explanation && q.explanation.trim() ? q.explanation.trim() : null,
          order_index: index,
        };
      });

    if (validQuestions.length === 0) {
      // rollback test
      await supabaseAdmin.from('manual_tests').delete().eq('id', testData.id);
      return NextResponse.json({ error: 'Geçerli bir soru bulunamadı.' }, { status: 400 });
    }

    const { error: questionsError } = await supabaseAdmin
      .from('test_questions')
      .insert(validQuestions);

    if (questionsError) {
      console.error('Test questions insert error:', questionsError);
      // rollback
      await supabaseAdmin.from('manual_tests').delete().eq('id', testData.id);
      return NextResponse.json({ error: questionsError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      test: testData,
      shareUrl: `/test/${testData.slug}`,
      totalQuestions: validQuestions.length,
    });
  } catch (err: any) {
    console.error('API /admin/create-test error:', err);
    return NextResponse.json({ error: err.message || 'Bilinmeyen hata' }, { status: 500 });
  }
}
