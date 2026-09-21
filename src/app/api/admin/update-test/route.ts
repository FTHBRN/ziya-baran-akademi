import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { test_id, title, description, folder_id, questions } = body;

    if (!test_id || !title || !questions || questions.length === 0) {
      return NextResponse.json(
        { error: 'test_id, başlık ve en az 1 soru gereklidir.' },
        { status: 400 }
      );
    }

    // 1. Update test metadata
    const updatePayload: any = {
      title: title.trim(),
      description: (description || '').trim() || null,
    };
    if (folder_id) {
      updatePayload.folder_id = folder_id;
    }

    const { data: updatedTest, error: testErr } = await supabaseAdmin
      .from('manual_tests')
      .update(updatePayload)
      .eq('id', test_id)
      .select()
      .single();

    if (testErr) throw testErr;

    // 2. Refresh questions: delete old questions and insert updated list
    const { error: delErr } = await supabaseAdmin
      .from('test_questions')
      .delete()
      .eq('test_id', test_id);

    if (delErr) throw delErr;

    const questionsToInsert = questions
      .filter((q: any) => q.question_text && q.question_text.trim())
      .map((q: any, index: number) => {
        let correct = (q.correct_option || 'A').toString().trim().toUpperCase();
        if (!['A', 'B', 'C', 'D'].includes(correct)) {
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
          test_id,
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

    if (questionsToInsert.length > 0) {
      const { error: insErr } = await supabaseAdmin
        .from('test_questions')
        .insert(questionsToInsert);
      if (insErr) throw insErr;
    }

    return NextResponse.json({ success: true, test: updatedTest });
  } catch (err: any) {
    console.error('API /admin/update-test error:', err);
    return NextResponse.json(
      { error: err.message || 'Güncelleme hatası' },
      { status: 500 }
    );
  }
}
