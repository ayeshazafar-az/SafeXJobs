import { supabase } from '../../lib/supabase';
export async function GET() {
    const { data } = await supabase.from('profiles').select('*').limit(1);
    return Response.json({ keys: Object.keys(data?.[0] || {}) });
}
