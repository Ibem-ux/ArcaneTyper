import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// If env vars are missing (not yet configured), export null so Leaderboard falls back gracefully
export const supabase = (supabaseUrl && supabaseKey && !supabaseUrl.includes('your-project'))
    ? createClient(supabaseUrl, supabaseKey)
    : null;
