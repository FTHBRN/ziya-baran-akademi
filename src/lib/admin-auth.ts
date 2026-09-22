import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

export const DEFAULT_ADMIN_PASSWORD = 'ziyabaran2026';

export function getAdminToken(password: string): string {
  return crypto.createHash('sha256').update(password + '_zb_admin_salt_2026').digest('hex');
}

export async function getActiveAdminPassword(): Promise<string> {
  try {
    const { data } = await supabaseAdmin
      .from('classes')
      .select('description')
      .eq('slug', '__system_settings__')
      .single();

    if (data?.description) {
      const parsed = JSON.parse(data.description);
      if (parsed.admin_password && typeof parsed.admin_password === 'string' && parsed.admin_password.trim()) {
        return parsed.admin_password.trim();
      }
    }
  } catch (err) {
    console.warn('Error reading admin_password from settings:', err);
  }

  return (process.env.ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD).trim();
}
