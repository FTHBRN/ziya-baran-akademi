import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { test_id } = body;

    if (!test_id) {
      return NextResponse.json({ error: 'test_id gereklidir.' }, { status: 400 });
    }

    // 1. Delete questions first
    await supabaseAdmin
      .from('test_questions')
      .delete()
      .eq('test_id', test_id);

    // 2. Delete test
    const { error } = await supabaseAdmin
      .from('manual_tests')
      .delete()
      .eq('id', test_id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete test error:', error);
    return NextResponse.json({ error: error.message || 'Silme hatası' }, { status: 500 });
  }
}
