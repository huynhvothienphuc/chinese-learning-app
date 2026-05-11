import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '../public/data');

function read(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

const books = read(join(dataDir, 'books.json'));

const viItems = [];
const enItems = [];

for (const book of books) {
  let sections;
  try {
    sections = read(join(dataDir, 'books', book.folder, 'sections.json'));
  } catch {
    continue;
  }

  for (const section of sections.filter((s) => s.enabled !== false)) {
    let data;
    try {
      data = read(join(dataDir, 'books', book.folder, section.file));
    } catch {
      continue;
    }

    for (const item of data.items || []) {
      if (!item.chinese) continue;

      const pinyin = item.pinyin || '';
      const pinyinPlain = pinyin.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

      const base = {
        chinese: item.chinese,
        pinyin,
        pinyinPlain,
        bookId: book.id,
        book: book.shortTitle || book.title,
        lesson: section.title,
        sectionFile: section.file,
      };

      viItems.push({ ...base, meaning: item.vi || item.en || '' });
      enItems.push({ ...base, meaning: item.en || item.vi || '' });
    }
  }
}

if (viItems.length === 0) {
  console.log('No items found — skipping index write (keeping existing files).');
  process.exit(0);
}

const outVi = join(dataDir, 'search-index-vi.json');
const outEn = join(dataDir, 'search-index-en.json');

writeFileSync(outVi, JSON.stringify(viItems));
writeFileSync(outEn, JSON.stringify(enItems));

console.log(`search-index-vi.json: ${viItems.length} items`);
console.log(`search-index-en.json: ${enItems.length} items`);
