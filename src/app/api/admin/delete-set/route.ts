import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { set_id } = body;

    if (!set_id) {
      return NextResponse.json({ error: 'set_id gereklidir.' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('sets')
      .delete()
      .eq('id', set_id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete set error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
