import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

export async function POST(request: Request) {
  try {
    const { code } = await request.json();

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ valid: false, error: 'Şifre belirtilmedi.' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('classes')
      .select('description')
      .eq('slug', '__system_settings__')
      .single();

    if (error || !data) {
      // Default fallback passcode if settings row not found
      const fallbackCode = 'ZB2025';
      return NextResponse.json({ valid: code.trim() === fallbackCode });
    }

    let passcode = 'ZB2025';
    try {
      const parsed = JSON.parse(data.description || '{}');
      if (parsed.student_passcode) {
        passcode = parsed.student_passcode;
      }
    } catch {
      // Ignore JSON parse error
    }

    const isValid = code.trim().toLowerCase() === passcode.trim().toLowerCase();

    return NextResponse.json({ valid: isValid });
  } catch (error: any) {
    console.error('verify-code error:', error);
    return NextResponse.json({ valid: false, error: error.message }, { status: 500 });
  }
}
