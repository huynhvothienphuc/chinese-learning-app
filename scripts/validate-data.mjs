import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../public/data/books');

function numericSectionSort(a, b) {
  return Number(a.match(/\d+/)?.[0] || 0) - Number(b.match(/\d+/)?.[0] || 0);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function validateBook(bookDir) {
  const bookName = path.basename(bookDir);
  const issues = [];
  const files = fs.readdirSync(bookDir);
  const sectionFiles = files.filter((file) => /^section\d+\.json$/.test(file)).sort(numericSectionSort);
  const sectionsPath = path.join(bookDir, 'sections.json');

  if (!fs.existsSync(sectionsPath)) {
    issues.push('Missing sections.json');
  } else {
    const sections = readJson(sectionsPath);

    if (!Array.isArray(sections)) {
      issues.push('sections.json must be an array');
    } else {
      const listedFiles = sections.map((section) => section?.file).filter(Boolean);
      const missingFiles = listedFiles.filter((file) => !files.includes(file));
      const unlistedFiles = sectionFiles.filter((file) => !listedFiles.includes(file));
      const duplicateListedFiles = [...new Set(listedFiles.filter((file, index) => listedFiles.indexOf(file) !== index))];

      if (missingFiles.length > 0) issues.push(`Listed missing files: ${missingFiles.join(', ')}`);
      if (unlistedFiles.length > 0) issues.push(`Unlisted section files: ${unlistedFiles.join(', ')}`);
      if (duplicateListedFiles.length > 0) issues.push(`Duplicate file refs in sections.json: ${duplicateListedFiles.join(', ')}`);
    }
  }

  for (const sectionFile of sectionFiles) {
    const sectionPath = path.join(bookDir, sectionFile);
    const data = readJson(sectionPath);

    if (!Array.isArray(data.items)) {
      issues.push(`${sectionFile}: missing items array`);
      continue;
    }

    const itemIds = new Map();
    const malformedIndexes = [];

    data.items.forEach((item, index) => {
      if (!item || typeof item !== 'object' || !String(item.chinese || '').trim() || !String(item.pinyin || '').trim()) {
        malformedIndexes.push(index);
      }

      const itemId = String(item?.id ?? '').trim();
      if (itemId) itemIds.set(itemId, (itemIds.get(itemId) || 0) + 1);
    });

    const duplicateItemIds = [...itemIds.entries()].filter(([, count]) => count > 1).map(([id]) => id);

    if (duplicateItemIds.length > 0) issues.push(`${sectionFile}: duplicate item ids ${duplicateItemIds.join(', ')}`);
    if (malformedIndexes.length > 0) issues.push(`${sectionFile}: malformed items at indexes ${malformedIndexes.slice(0, 10).join(', ')}`);
  }

  return { bookName, issues };
}

function main() {
  const bookDirs = fs
    .readdirSync(DATA_DIR)
    .map((entry) => path.join(DATA_DIR, entry))
    .filter((entry) => fs.statSync(entry).isDirectory());

  const results = bookDirs.map(validateBook);
  const failing = results.filter((result) => result.issues.length > 0);

  if (failing.length === 0) {
    console.log('Data validation passed.');
    return;
  }

  for (const result of failing) {
    console.log(`\n[${result.bookName}]`);
    for (const issue of result.issues) console.log(`- ${issue}`);
  }

  process.exitCode = 1;
}

main();
