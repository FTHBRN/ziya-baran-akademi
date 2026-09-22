import { NextResponse } from 'next/server';
import { getAdminToken, getActiveAdminPassword } from '@/lib/admin-auth';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

export async function POST(request: Request) {
  try {
    const { password } = await request.json();

    if (!password || typeof password !== 'string') {
      return NextResponse.json({ success: false, error: 'Lütfen şifre girin.' }, { status: 400 });
    }

    const currentAdminPassword = await getActiveAdminPassword();

    if (password.trim() === currentAdminPassword) {
      const token = getAdminToken(currentAdminPassword);
      return NextResponse.json({ success: true, token });
    }

    return NextResponse.json({ success: false, error: 'Hatalı yönetici şifresi.' }, { status: 401 });
  } catch (error: any) {
    console.error('admin auth error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader ? authHeader.replace(/^Bearer\s+/i, '') : null;

    if (!token) {
      return NextResponse.json({ valid: false }, { status: 401 });
    }

    const currentAdminPassword = await getActiveAdminPassword();
    const expectedToken = getAdminToken(currentAdminPassword);

    const isValid = token === expectedToken;

    return NextResponse.json({ valid: isValid });
  } catch (error: any) {
    return NextResponse.json({ valid: false, error: error.message }, { status: 500 });
  }
}
