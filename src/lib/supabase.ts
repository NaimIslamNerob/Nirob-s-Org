import { createClient } from '@supabase/supabase-js';

export const SUPABASE_PROJECT_ID = 'vvgxgtlaigfhfcbuafvg';
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || `https://${SUPABASE_PROJECT_ID}.supabase.co`;
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_7wXiOX3bjrYS1hETT1x9LA_qxqVldNz';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Checks if Supabase is reachable from the client.
 */
export async function testClientSupabaseConnection(): Promise<{ ok: boolean; message: string }> {
  try {
    const { error } = await supabase.from('app_state').select('id').limit(1);
    if (error && error.code === 'PGRST205') {
      return { ok: false, message: 'Table app_state not found in Supabase schema cache. Run the SQL setup script in Supabase SQL editor.' };
    }
    if (error) {
      return { ok: false, message: error.message };
    }
    return { ok: true, message: 'Supabase client connected successfully.' };
  } catch (err: any) {
    return { ok: false, message: err?.message || 'Failed to connect to Supabase.' };
  }
}
