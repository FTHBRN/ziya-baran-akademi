// Disable TLS rejection for local development on Windows
if (typeof process !== 'undefined' && process.env) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

import { createClient } from '@supabase/supabase-js';

const defaultUrl = 'https://wypjtmehdcqhyviqscbf.supabase.co';
const defaultAnonKey = 'sb_publishable_0drTRCl7jjuxEhjkmDsB-w_iqIrRQwY';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || defaultUrl;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || defaultAnonKey;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;

// Public client for student UI & reads
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client for server-side writes & actions
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
