import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { set_id, folder_id } = body;

    if (!set_id || !folder_id) {
      return NextResponse.json(
        { error: 'set_id ve folder_id gereklidir.' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('sets')
      .update({ folder_id })
      .eq('id', set_id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, set: data });
  } catch (error: any) {
    console.error('Move set error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
