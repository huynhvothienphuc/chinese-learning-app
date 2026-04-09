import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[Supabase] Missing env vars — teacher features will be unavailable.');
}

export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '');

// ── Student vocab sets (max 3 per user, 100 words each) ──────────────────────

export async function loadStudentSets(userId) {
  const { data, error } = await supabase
    .from('user_vocab_sets')
    .select('id, title, items, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function saveStudentSet(userId, { title, items }) {
  // enforce 3-set limit server-side via RLS policy, but check client-side first
  const existing = await loadStudentSets(userId);
  if (existing.length >= 3) throw new Error('SET_LIMIT_REACHED');

  const { data, error } = await supabase
    .from('user_vocab_sets')
    .insert({ user_id: userId, title, items: items.slice(0, 100) })
    .select('id, title, items, created_at')
    .single();
  if (error) throw error;
  return data;
}

export async function deleteStudentSet(setId) {
  const { error } = await supabase
    .from('user_vocab_sets')
    .delete()
    .eq('id', setId);
  if (error) throw error;
}
