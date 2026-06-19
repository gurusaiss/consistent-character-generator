import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// Whether the app has valid Supabase credentials configured.
export const isSupabaseConfigured = Boolean(url && key && url.startsWith('http'));

if (!isSupabaseConfigured) {
  // Surface a clear, actionable message instead of a cryptic blank page.
  console.error(
    '[ConsistentAI] Supabase is not configured. Set VITE_SUPABASE_URL and ' +
    'VITE_SUPABASE_ANON_KEY in your .env file. See .env.example.'
  );
}

// Use safe placeholders when unconfigured so createClient never throws at import.
// All API calls will fail clearly at runtime, and the UI shows a config screen.
export const supabase = createClient(
  url || 'http://localhost:54321',
  key || 'public-anon-key-placeholder'
);
