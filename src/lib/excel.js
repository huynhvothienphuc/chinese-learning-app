import { normalizeVocabularyItems } from '@/lib/utils';

const SHEETJS_CDN = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js';
let sheetJsLoader = null;

function normalizeHeader(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
}

function readField(row, aliases) {
  for (const alias of aliases) {
    if (row[alias] !== undefined && row[alias] !== null) {
      return String(row[alias]).trim();
    }
  }
  return '';
}

export function ensureSheetJS() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('SheetJS requires a browser environment.'));
  }

  if (window.XLSX) {
    return Promise.resolve(window.XLSX);
  }

  if (sheetJsLoader) {
    return sheetJsLoader;
  }

  sheetJsLoader = new Promise((resolve, reject) => {
    const existing = document.getElementById('sheetjs-cdn-script');

    if (existing) {
      existing.addEventListener('load', () => resolve(window.XLSX));
      existing.addEventListener('error', () => reject(new Error('Unable to load SheetJS.')));
      return;
    }

    const script = document.createElement('script');
    script.id = 'sheetjs-cdn-script';
    script.async = true;
    script.src = SHEETJS_CDN;
    script.onload = () => {
      if (window.XLSX) {
        resolve(window.XLSX);
      } else {
        reject(new Error('SheetJS did not initialize.'));
      }
    };
    script.onerror = () => reject(new Error('Unable to load SheetJS.'));
    document.head.appendChild(script);
  });

  return sheetJsLoader;
}

export async function parseVocabularyWorkbook(file) {
  const XLSX = await ensureSheetJS();
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames?.[0];

  if (!firstSheetName) {
    return [];
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: false });

  const mappedRows = rows.map((row, index) => {
    const normalizedRow = Object.fromEntries(
      Object.entries(row).map(([key, value]) => [normalizeHeader(key), value]),
    );

    return {
      id: `upload-${Date.now()}-${index + 1}`,
      chinese: readField(normalizedRow, ['chinese']),
      pinyin: readField(normalizedRow, ['pinyin']),
      vietnamese: readField(normalizedRow, ['vietnamese', 'meaning_vietnamese', 'vi']),
      english: readField(normalizedRow, ['english', 'meaning_english', 'en']),
      sentenceChinese: readField(normalizedRow, ['sentence_chinese']),
      sentencePinyin: readField(normalizedRow, ['sentence_pinyin']),
      sentenceVietnamese: readField(normalizedRow, ['sentence_vietnamese']),
      sentenceEnglish: readField(normalizedRow, ['sentence_english']),
    };
  });

  const validRows = mappedRows.filter((item) => item.chinese && item.pinyin && item.vietnamese);
  return normalizeVocabularyItems(validRows);
}
