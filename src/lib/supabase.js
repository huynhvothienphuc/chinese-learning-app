import { createClient } from '@supabase/supabase-js';

const env = import.meta.env ?? {};
const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[Supabase] Missing env vars — teacher features will be unavailable.');
}

function unavailableResult() {
  return Promise.resolve({ data: null, error: new Error('Supabase is not configured.') });
}

function unavailableQuery() {
  const result = unavailableResult();
  const query = {};
  ['select', 'eq', 'order', 'insert', 'delete', 'update', 'single', 'maybeSingle'].forEach((method) => {
    query[method] = () => query;
  });
  query.then = result.then.bind(result);
  query.catch = result.catch.bind(result);
  query.finally = result.finally.bind(result);
  return query;
}

const unavailableSupabase = {
  auth: {
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    signInWithOAuth: () => unavailableResult(),
    signOut: () => Promise.resolve({ error: null }),
  },
  from: () => unavailableQuery(),
  rpc: () => unavailableResult(),
};

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : unavailableSupabase;

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

// ── Word & Lesson tracking ────────────────────────────────────────────────────

// Track a word seen in flashcard (isCorrect=null) or answered in quiz (true/false)
export async function trackWordStat(userId, { bookId, sectionId, itemId, isCorrect }) {
  await supabase.rpc('increment_word_stat', {
    p_user_id: userId,
    p_book_id: bookId,
    p_section_id: sectionId,
    p_item_id: itemId,
    p_correct: isCorrect === true,
  });
}

export async function updateStreak(userId) {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD local date
  const { data, error } = await supabase.rpc('update_streak', {
    p_user_id: userId,
    p_today: today,
  });
  if (error) throw error;
  return data; // { current_streak, longest_streak, updated }
}

// Track quiz completion for a lesson
export async function trackLessonStat(userId, { bookId, sectionId, sectionTitle, score, total }) {
  await supabase.rpc('upsert_lesson_stat', {
    p_user_id: userId,
    p_book_id: bookId,
    p_section_id: sectionId,
    p_section_title: sectionTitle,
    p_score: score,
    p_total: total,
  });
}

export async function loadWordStats(userId) {
  const { data, error } = await supabase
    .from('user_word_stats')
    .select('*')
    .eq('user_id', userId)
    .order('last_seen', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function loadLessonStats(userId) {
  const { data, error } = await supabase
    .from('user_lesson_stats')
    .select('*')
    .eq('user_id', userId)
    .order('last_attempt', { ascending: false })
    .limit(50);
  if (error) throw error;
  return data ?? [];
}

// ── Leaderboard ───────────────────────────────────────────────────────────────

export async function loadLeaderboard() {
  const { data, error } = await supabase.rpc('get_leaderboard', { p_limit: 20 });
  if (error) throw error;
  return data ?? [];
}

export async function loadMyRank() {
  const { data, error } = await supabase.rpc('get_my_rank');
  if (error) throw error;
  return data; // { username, current_streak, longest_streak, current_rank, alltime_rank }
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

// ── Word Feedback ─────────────────────────────────────────────────────────────

export async function submitWordFeedback({ message, bookId, sectionId, wordId, chinese }) {
  const clean = message.trim().replace(/<[^>]*>/g, '').replace(/[\u0000-\u001F\u007F]/g, '').slice(0, 500);
  if (clean.length < 2) throw new Error('Message too short.');

  const { error } = await supabase.from('word_feedback').insert({
    message: clean,
    book_id: bookId,
    section_id: sectionId,
    word_id: String(wordId),
    chinese,
  });
  if (error) throw error;
}

export async function loadWordFeedback() {
  const { data, error } = await supabase
    .from('word_feedback')
    .select('id, message, book_id, section_id, word_id, chinese, created_at, resolved')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function resolveWordFeedback(id, resolved) {
  const { error } = await supabase.from('word_feedback').update({ resolved }).eq('id', id);
  if (error) throw error;
}

export async function deleteWordFeedback(id) {
  const { error } = await supabase.from('word_feedback').delete().eq('id', id);
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
