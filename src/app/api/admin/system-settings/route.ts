import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getActiveAdminPassword, getAdminToken } from '@/lib/admin-auth';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('classes')
      .select('description')
      .eq('slug', '__system_settings__')
      .single();

    let studentPasscode = 'ZB2025';

    if (data?.description) {
      try {
        const parsed = JSON.parse(data.description);
        if (parsed.student_passcode) {
          studentPasscode = parsed.student_passcode;
        }
      } catch {}
    }

    return NextResponse.json({ studentPasscode });
  } catch (error: any) {
    console.error('get system-settings error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, studentPasscode, currentPassword, newPassword } = body;

    // ACTION: UPDATE ADMIN PASSWORD
    if (action === 'update_admin_password') {
      if (!currentPassword || !newPassword) {
        return NextResponse.json({ error: 'Lütfen tüm alanları doldurun.' }, { status: 400 });
      }

      if (newPassword.trim().length < 4) {
        return NextResponse.json({ error: 'Yeni şifre en az 4 karakter olmalıdır.' }, { status: 400 });
      }

      const activePassword = await getActiveAdminPassword();

      if (currentPassword.trim() !== activePassword) {
        return NextResponse.json({ error: 'Mevcut yönetici şifreniz hatalı.' }, { status: 401 });
      }

      const cleanNewPassword = newPassword.trim();

      // Read existing settings
      const { data: existing } = await supabaseAdmin
        .from('classes')
        .select('id, description')
        .eq('slug', '__system_settings__')
        .single();

      let newPayload: any = { admin_password: cleanNewPassword };

      if (existing) {
        try {
          const currentObj = JSON.parse(existing.description || '{}');
          newPayload = { ...currentObj, admin_password: cleanNewPassword };
        } catch {}

        const { error: updateErr } = await supabaseAdmin
          .from('classes')
          .update({ description: JSON.stringify(newPayload) })
          .eq('id', existing.id);

        if (updateErr) throw updateErr;
      } else {
        const { error: insertErr } = await supabaseAdmin
          .from('classes')
          .insert({
            name: 'System Settings',
            slug: '__system_settings__',
            description: JSON.stringify(newPayload),
            order_index: -999,
          });

        if (insertErr) throw insertErr;
      }

      const newToken = getAdminToken(cleanNewPassword);
      return NextResponse.json({ success: true, newToken });
    }

    // ACTION: UPDATE STUDENT PASSCODE
    if (!studentPasscode || typeof studentPasscode !== 'string' || !studentPasscode.trim()) {
      return NextResponse.json({ error: 'Geçerli bir şifre giriniz.' }, { status: 400 });
    }

    const cleanPasscode = studentPasscode.trim();

    // Check if __system_settings__ row exists
    const { data: existing } = await supabaseAdmin
      .from('classes')
      .select('id, description')
      .eq('slug', '__system_settings__')
      .single();

    let newPayload = { student_passcode: cleanPasscode };

    if (existing) {
      try {
        const currentObj = JSON.parse(existing.description || '{}');
        newPayload = { ...currentObj, student_passcode: cleanPasscode };
      } catch {}

      const { error: updateErr } = await supabaseAdmin
        .from('classes')
        .update({ description: JSON.stringify(newPayload) })
        .eq('id', existing.id);

      if (updateErr) throw updateErr;
    } else {
      const { error: insertErr } = await supabaseAdmin
        .from('classes')
        .insert({
          name: 'System Settings',
          slug: '__system_settings__',
          description: JSON.stringify(newPayload),
          order_index: -999,
        });

      if (insertErr) throw insertErr;
    }

    return NextResponse.json({ success: true, studentPasscode: cleanPasscode });
  } catch (error: any) {
    console.error('update system-settings error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
