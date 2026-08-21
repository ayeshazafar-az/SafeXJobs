/**
 * Admin-only Supabase client that uses the SERVICE ROLE key.
 * This completely bypasses Row Level Security (RLS) policies.
 * 
 * ONLY use this client inside admin screens — never in candidate or company screens!
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseServiceKey) {
    console.warn(
        '[ADMIN] Missing EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY. Admin dashboard will fall back to the anon key, which may be blocked by RLS.'
    );
}

export const adminSupabase = createClient(supabaseUrl, supabaseServiceKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '', {
    auth: {
        persistSession: false,   // Admin client should NOT persist sessions
        autoRefreshToken: false,
    },
});
