/**
 * Full migration: upserts all books + lessons from local JSON into Supabase.
 * Local JSON files are kept as-is — Supabase becomes the source of truth.
 *
 * Run: node scripts/seed-all.mjs
 *
 * Requires in .env:
 *   VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY   ← Supabase dashboard > Settings > API
 *
 * Freemium: section1 + section2 of every book get is_free = true.
 * Existing rows are upserted (safe to re-run).
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

// ── Load .env ─────────────────────────────────────────────────────────────────

const envPath = join(root, '.env');
const env = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.startsWith('#'))
    .map((l) => {
      const idx = l.indexOf('=');
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
    }),
);

const supabaseUrl     = env.VITE_SUPABASE_URL;
const serviceRoleKey  = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

function readJson(path) {
  const full = join(root, path);
  if (!existsSync(full)) return null;
  return JSON.parse(readFileSync(full, 'utf8'));
}

// ── Load books.json ───────────────────────────────────────────────────────────

const books = readJson('public/data/books.json');
if (!books) { console.error('public/data/books.json not found'); process.exit(1); }

let totalLessons = 0;
let totalWords   = 0;

for (const [bookIdx, book] of books.entries()) {
  const bookOrder = bookIdx + 1;

  // ── Upsert book ─────────────────────────────────────────────────────────────
  const { error: bookErr } = await supabase.from('books').upsert({
    id:          book.id,
    title:       book.title,
    short_title: book.shortTitle ?? null,
    description: book.description ?? null,
    language:    book.language ?? 'zh-Hant',
    order:       bookOrder,
    enabled:     true,
  });

  if (bookErr) {
    console.error(`✗ ${book.id} upsert failed:`, bookErr.message);
    continue;
  }
  console.log(`✓ ${book.id} (${book.shortTitle ?? book.title})`);

  // ── Load sections.json ───────────────────────────────────────────────────────
  const sections = readJson(`public/data/books/${book.id}/sections.json`);
  if (!sections) {
    console.warn(`  ⚠ no sections.json for ${book.id}, skipping`);
    continue;
  }

  for (const section of sections) {
    const lessonId = `${book.id}_${section.file.replace('.json', '')}`;
    const isFree   = section.order <= 2;

    // Read vocab words
    const vocabFile = readJson(`public/data/books/${book.id}/${section.file}`);
    const words = vocabFile?.items ?? (Array.isArray(vocabFile) ? vocabFile : []);

    const { error: lessonErr } = await supabase.from('lessons').upsert({
      id:         lessonId,
      book_id:    book.id,
      title:      section.title,
      order:      section.order,
      theme:      section.theme ?? null,
      verified:   section.verified ?? false,
      enabled:    section.enabled ?? true,
      is_free:    isFree,
      words:      words,
      updated_at: new Date().toISOString(),
    });

    if (lessonErr) {
      console.error(`  ✗ ${lessonId} failed:`, lessonErr.message);
    } else {
      console.log(`  ✓ ${lessonId} (${words.length} words, is_free: ${isFree})`);
      totalLessons++;
      totalWords += words.length;
    }
  }
}

console.log(`\nDone. ${books.length} books, ${totalLessons} lessons, ${totalWords} words total.`);
