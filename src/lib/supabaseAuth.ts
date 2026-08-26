import { supabase } from './supabase';

// This is a SEPARATE thing from src/components/PinGate.tsx. The PIN is a
// device-access gate that works fully offline and doesn't know who's
// using the phone. This module is about *identity* — attributing records
// to a specific health worker's Supabase account so supabase/rls.sql can
// actually scope access once applied. Signing in requires connectivity
// (once); after that, supabase-js caches the session locally, so reading
// "who's signed in" (getCurrentUserId) never itself needs the network —
// only the initial sign-in/sign-up does. No screening feature may depend
// on this being set — see offline-first rule in the README.

export interface AuthResult {
  ok: boolean;
  error?: string;
}

function requireClient(): { ok: true } | { ok: false; error: string } {
  if (!supabase) return { ok: false, error: 'No Supabase project configured — set VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY in .env.' };
  return { ok: true };
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  const check = requireClient();
  if (!check.ok) return check;
  const { error } = await supabase!.auth.signInWithPassword({ email, password });
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function signUp(email: string, password: string): Promise<AuthResult> {
  const check = requireClient();
  if (!check.ok) return check;
  const { error } = await supabase!.auth.signUp({ email, password });
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function signOut(): Promise<void> {
  if (!supabase) return;
  await supabase.auth.signOut();
}

/** Local read of the cached session — no network call, safe to use offline. */
export async function getCurrentUser(): Promise<{ id: string; email: string | null } | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;
  return user ? { id: user.id, email: user.email ?? null } : null;
}

export function isAuthConfigured(): boolean {
  return supabase !== null;
}

export function onAuthStateChange(callback: () => void): () => void {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange(() => callback());
  return () => data.subscription.unsubscribe();
}
