/**
 * generate-sentences.mjs
 * Generates natural example sentences for book3 (fix broken) and book4 (add missing).
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-... node scripts/generate-sentences.mjs
 *
 * Optional: process only specific books or sections
 *   ANTHROPIC_API_KEY=sk-... node scripts/generate-sentences.mjs --books=3 --dry-run
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../public/data/books');

const DRY_RUN = process.argv.includes('--dry-run');
const BOOKS_ARG = process.argv.find((a) => a.startsWith('--books='));
const TARGET_BOOKS = BOOKS_ARG
  ? BOOKS_ARG.replace('--books=', '').split(',').map((b) => `book${b.trim()}`)
  : ['book3', 'book4'];

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Book 3 has flat structure: { bookId, sectionId, sectionTitle, items }
// Book 4 has nested structure: { bookId, sections: [{ sectionId, sectionTitle, items }] }

function getSectionFiles(bookDir) {
  return fs
    .readdirSync(bookDir)
    .filter((f) => f.match(/^section\d+\.json$/))
    .sort((a, b) => {
      const n = (s) => parseInt(s.match(/\d+/)[0]);
      return n(a) - n(b);
    })
    .map((f) => path.join(bookDir, f));
}

function getItems(data) {
  // flat structure
  if (Array.isArray(data.items)) return { items: data.items, nested: false };
  // nested structure
  if (Array.isArray(data.sections)) {
    return { items: data.sections.flatMap((s) => s.items ?? []), nested: true, sections: data.sections };
  }
  return { items: [], nested: false };
}

function needsSentence(item) {
  // Missing sentences
  if (!item.sentenceChinese) return true;
  // Broken sentences: template-only patterns or English words leaked in
  const s = item.sentenceChinese;
  if (/今天很/.test(s) && s.length < 12) return true;
  if (/這是/.test(s) && s.length < 10) return true;
  if (/她是/.test(s) && s.length < 10) return true;
  // English leaked into Chinese sentence
  if (/[a-zA-Z]{3,}/.test(s)) return true;
  return false;
}

async function generateSentence(word, sectionTitle) {
  const prompt = `You are a Chinese language teacher creating example sentences for a vocabulary learning app.
The target learners are Vietnamese adults studying Traditional Chinese (繁體中文).

Word: ${word.chinese} (${word.pinyin}) — ${word.english} / ${word.vietnamese}
Lesson topic: "${sectionTitle}"

Write ONE natural example sentence using this word. Requirements:
- Use Traditional Chinese characters (繁體字)
- The sentence must be grammatically correct Mandarin Chinese
- Use a VARIED sentence pattern — avoid always starting with 今天, 這是, 她是, 我是
- The sentence should feel natural, like something a real person would say
- Appropriate difficulty for intermediate learners (B1-B2)
- Length: 8–20 characters preferred

Return ONLY a JSON object with these four fields, nothing else:
{
  "sentenceChinese": "...",
  "sentencePinyin": "...",
  "sentenceEnglish": "...",
  "sentenceVietnamese": "..."
}

Rules:
- sentencePinyin: proper tone-marked pinyin matching the Chinese exactly
- sentenceEnglish: natural English, not word-for-word translation
- sentenceVietnamese: natural Vietnamese, not word-for-word translation
- No language mixing: the Vietnamese translation must be fully in Vietnamese`;

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].text.trim();
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error(`No JSON in response: ${text}`);
  return JSON.parse(match[0]);
}

async function processItems(items, sectionTitle) {
  let updated = 0;
  for (const item of items) {
    if (!needsSentence(item)) continue;
    if (DRY_RUN) {
      console.log(`  [DRY] Would fix: ${item.chinese} — ${item.sentenceChinese ?? '(no sentence)'}`);
      updated++;
      continue;
    }
    try {
      console.log(`  Generating for: ${item.chinese} (${item.english})`);
      const sentence = await generateSentence(item, sectionTitle);
      item.sentenceChinese = sentence.sentenceChinese;
      item.sentencePinyin = sentence.sentencePinyin;
      item.sentenceEnglish = sentence.sentenceEnglish;
      item.sentenceVietnamese = sentence.sentenceVietnamese;
      updated++;
      // Small delay to avoid rate limiting
      await new Promise((r) => setTimeout(r, 200));
    } catch (err) {
      console.error(`  ERROR for ${item.chinese}: ${err.message}`);
    }
  }
  return updated;
}

async function processFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(raw);
  let totalUpdated = 0;

  if (Array.isArray(data.items)) {
    // Flat structure (book3)
    const updated = await processItems(data.items, data.sectionTitle ?? '');
    totalUpdated += updated;
  } else if (Array.isArray(data.sections)) {
    // Nested structure (book4)
    for (const section of data.sections) {
      if (!Array.isArray(section.items)) continue;
      const updated = await processItems(section.items, section.sectionTitle ?? '');
      totalUpdated += updated;
    }
  }

  if (!DRY_RUN && totalUpdated > 0) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  }

  return totalUpdated;
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('Error: ANTHROPIC_API_KEY is not set.');
    process.exit(1);
  }

  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
  console.log(`Target books: ${TARGET_BOOKS.join(', ')}\n`);

  let grandTotal = 0;

  for (const book of TARGET_BOOKS) {
    const bookDir = path.join(DATA_DIR, book);
    if (!fs.existsSync(bookDir)) {
      console.warn(`Skipping ${book} — directory not found`);
      continue;
    }

    const files = getSectionFiles(bookDir);
    console.log(`\n=== ${book.toUpperCase()} (${files.length} sections) ===`);

    for (const file of files) {
      const name = path.basename(file);
      console.log(`\n${name}`);
      const updated = await processFile(file);
      console.log(`  -> ${updated} sentence(s) updated`);
      grandTotal += updated;
    }
  }

  console.log(`\nDone. Total sentences ${DRY_RUN ? 'to fix' : 'updated'}: ${grandTotal}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
