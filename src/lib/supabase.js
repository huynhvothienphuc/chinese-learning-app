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

// ── Feedback ─────────────────────────────────────────────────────────────────

export async function loadFeedback() {
  const { data, error } = await supabase
    .from('feedback')
    .select('id, message, created_at, resolved')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function deleteFeedback(id) {
  const { error } = await supabase.from('feedback').delete().eq('id', id);
  if (error) throw error;
}

export async function resolveFeedback(id, resolved) {
  const { error } = await supabase.from('feedback').update({ resolved }).eq('id', id);
  if (error) throw error;
}

const FEEDBACK_COOLDOWN_KEY = 'feedback_last_submitted';
const FEEDBACK_COOLDOWN_MS = 60_000; // 1 minute between submissions
const FEEDBACK_MAX_LENGTH = 1000;
const FEEDBACK_MIN_LENGTH = 5;

function sanitizeMessage(raw) {
  return raw
    .trim()
    .replace(/<[^>]*>/g, '')       // strip any HTML tags
    .replace(/[\u0000-\u001F\u007F]/g, '') // strip control characters
    .slice(0, FEEDBACK_MAX_LENGTH);
}

export async function submitFeedback(rawMessage) {
  const message = sanitizeMessage(rawMessage);

  if (message.length < FEEDBACK_MIN_LENGTH) {
    throw new Error(`Message must be at least ${FEEDBACK_MIN_LENGTH} characters.`);
  }

  // Client-side rate limit
  const last = Number(localStorage.getItem(FEEDBACK_COOLDOWN_KEY) ?? 0);
  if (Date.now() - last < FEEDBACK_COOLDOWN_MS) {
    const wait = Math.ceil((FEEDBACK_COOLDOWN_MS - (Date.now() - last)) / 1000);
    throw new Error(`Please wait ${wait}s before submitting again.`);
  }

  const { error } = await supabase.from('feedback').insert({ message });
  if (error) throw error;

  localStorage.setItem(FEEDBACK_COOLDOWN_KEY, String(Date.now()));
}
