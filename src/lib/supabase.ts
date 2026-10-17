import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase in the browser with the public anon key. Everything is protected by Row Level Security
 * in the database (supabase/lab.sql), so the key is meant to be public. Never put the service_role
 * key in this app.
 *
 * Until NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are set in Vercel, Lab runs in open
 * mode: every tool works, only "log in" and "save" are hidden.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let client: SupabaseClient | null = null;
export function supabase(): SupabaseClient | null {
  if (!url || !key) return null;
  client ??= createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  return client;
}

export const authEnabled = Boolean(url && key);
