/**
 * Pilot seed: inserts book1 + section1 into Supabase.
 * Run: node scripts/seed-book1-section1.mjs
 *
 * Requires in .env:
 *   VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY   ← from Supabase dashboard > Settings > API
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env manually (no dotenv dependency needed)
const envPath = join(__dirname, '../.env');
const env = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.startsWith('#'))
    .map((l) => l.split('=').map((s) => s.trim())),
);

const supabaseUrl = env.VITE_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

// Service role key bypasses RLS — safe for one-off seed scripts
const supabase = createClient(supabaseUrl, serviceRoleKey);

function read(path) {
  return JSON.parse(readFileSync(join(__dirname, path), 'utf8'));
}

const books      = read('../public/data/books.json');
const sections   = read('../public/data/books/book1/sections.json');
const section1   = read('../public/data/books/book1/section1.json');

const book       = books.find((b) => b.id === 'book1');
const sectionMeta = sections.find((s) => s.id === 'section1');

// ── 1. Upsert book ────────────────────────────────────────────────────────────

const { error: bookErr } = await supabase.from('books').upsert({
  id:          book.id,
  title:       book.title,
  short_title: book.shortTitle,
  description: book.description,
  language:    book.language,
  order:       1,
  enabled:     true,
});

if (bookErr) { console.error('book upsert failed:', bookErr.message); process.exit(1); }
console.log('✓ book1 upserted');

// ── 2. Upsert section1 as lesson ──────────────────────────────────────────────

const { error: lessonErr } = await supabase.from('lessons').upsert({
  id:       'book1_section1',
  book_id:  'book1',
  title:    sectionMeta.title,
  order:    sectionMeta.order,
  theme:    sectionMeta.theme ?? null,
  verified: sectionMeta.verified ?? false,
  enabled:  sectionMeta.enabled ?? true,
  is_free:  true,             // lesson 1 → free for guests
  words:    section1.items,
});

if (lessonErr) { console.error('lesson upsert failed:', lessonErr.message); process.exit(1); }
console.log('✓ book1/section1 upserted (is_free: true, words:', section1.items.length, 'items)');
console.log('\nDone. Verify in Supabase dashboard > Table Editor > lessons');
