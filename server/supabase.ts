import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error(
    '[ConsistentAI] FATAL: Missing env vars — set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Render → Environment, then redeploy.'
  );
}

// Service role client — bypasses RLS; auth enforcement done in middleware
// Safe placeholders prevent a crash when env vars are missing at startup.
export const supabase = createClient(
  url || 'http://localhost:54321',
  key || 'service-role-key-placeholder',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export function storagePublicUrl(bucket: string, path: string): string {
  return `${url}/storage/v1/object/public/${bucket}/${path}`;
}

export function storagePathFromUrl(url: string, bucket: string): string | null {
  const marker = `/storage/v1/object/public/${bucket}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return url.slice(idx + marker.length);
}
