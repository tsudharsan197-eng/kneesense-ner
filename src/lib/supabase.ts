import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// This client is ONLY used by the background sync worker (src/lib/sync.ts).
// No screening feature may depend on it directly — see offline-first rule.
// It's deliberately nullable: the app must run fully offline with no
// Supabase project configured at all (e.g. first run, field deployment
// before credentials are provisioned).
export const supabase: SupabaseClient | null = url && anonKey ? createClient(url, anonKey) : null;

if (!supabase) {
  // eslint-disable-next-line no-console
  console.warn('Supabase env vars missing — running offline-only, sync is disabled until configured.');
}
