import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function shuffleArray(items) {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
}

function pickByLanguage(primary, fallback, fallbackLabel) {
  const p = String(primary || '').trim();
  if (p) return p;
  const f = String(fallback || '').trim();
  return f ? `${fallbackLabel}: ${f}` : '';
}

export function getItemMeaning(item, language = 'en') {
  if (!item) return '';
  return language === 'vi'
    ? pickByLanguage(item.vietnamese || item.vi || item.meaning?.vi, item.english || item.en || item.meaning?.en, 'English')
    : pickByLanguage(item.english || item.en || item.meaning?.en, item.vietnamese || item.vi || item.meaning?.vi, 'Tiếng Việt');
}

export function getSentenceMeaning(item, language = 'en') {
  if (!item) return '';
  return language === 'vi'
    ? pickByLanguage(item.sentenceVietnamese || item.translation?.vi, item.sentenceEnglish || item.translation?.en, 'English')
    : pickByLanguage(item.sentenceEnglish || item.translation?.en, item.sentenceVietnamese || item.translation?.vi, 'Tiếng Việt');
}

export function normalizeVocabularyItems(items) {
  if (!Array.isArray(items)) return [];

  return items
    .map((item, index) => {
      if (!item || typeof item !== 'object') return null;

      const chinese = String(item.chinese || '').trim();
      const pinyin = String(item.pinyin || '').trim();
      const english = String(item.english || item.en || item.meaning?.en || '').trim();
      const vietnamese = String(item.vietnamese || item.vi || item.meaning?.vi || english).trim();
      const firstSample = Array.isArray(item.samples) && item.samples.length > 0 ? item.samples[0] : null;
      const sentenceChinese = String(item.sentenceChinese || firstSample?.sentence || '').trim();
      const sentencePinyin = String(item.sentencePinyin || firstSample?.pinyin || '').trim();
      const sentenceEnglish = String(item.sentenceEnglish || item.translation?.en || firstSample?.en || '').trim();
      const sentenceVietnamese = String(item.sentenceVietnamese || item.translation?.vi || firstSample?.vi || sentenceEnglish).trim();
      const rawId = item.id == null ? '' : String(item.id).trim();

      if (!chinese || !pinyin) return null;

      return {
        id: rawId || `${chinese}-${pinyin}-${index}`,
        chinese,
        pinyin,
        english,
        vietnamese,
        sentenceChinese,
        sentencePinyin,
        sentenceEnglish,
        sentenceVietnamese,
        ...(Array.isArray(item.samples) && item.samples.length > 0 ? { samples: item.samples } : {}),
        ...(item.notest === true ? { notest: true } : {}),
        meaning: {
          en: english,
          vi: vietnamese,
        },
        translation: {
          en: sentenceEnglish,
          vi: sentenceVietnamese,
        },
      };
    })
    .filter(Boolean);
}

export function parseVocabularyText(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line, index) => {
      const parts = line.split('|').map((part) => part.trim());
      if (parts.length < 5) return null;

      const [chinese, pinyinEnglishRaw, sentenceChinese, sentencePinyin, sentenceEnglish] = parts;
      const match = pinyinEnglishRaw.match(/^(.+?)\s*\((.+)\)$/);
      const pinyin = match ? match[1].trim() : pinyinEnglishRaw;
      const english = match ? match[2].trim() : '';

      if (!chinese || !pinyin || !sentenceChinese) return null;

      return normalizeVocabularyItems([
        {
          id: `${chinese}-${pinyin}-${index}`,
          chinese,
          pinyin,
          english,
          vietnamese: english,
          sentenceChinese,
          sentencePinyin,
          sentenceEnglish,
          sentenceVietnamese: sentenceEnglish,
        },
      ])[0];
    })
    .filter(Boolean);
}

export function formatSectionName(filename) {
  return filename
    .replace(/\.(txt|json|xlsx)$/i, '')
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function buildQuizChoices(vocabulary, currentItem) {
  const targetLen = (currentItem.chinese || '').length;

  // Exclude the correct answer itself, then deduplicate by chinese text
  const seen = new Set([currentItem.chinese]);
  const deduped = vocabulary.filter((item) => {
    if (item.id === currentItem.id) return false;
    if (seen.has(item.chinese)) return false;
    seen.add(item.chinese);
    return true;
  });

  // Prefer words with the same character count, fall back to full pool
  const sameLen = deduped.filter((item) => (item.chinese || '').length === targetLen);
  const fallback = deduped.filter((item) => (item.chinese || '').length !== targetLen);

  const shuffledSame = shuffleArray(sameLen);
  const shuffledFallback = shuffleArray(fallback);
  const wrongChoices = [...shuffledSame, ...shuffledFallback].slice(0, 3);

  return shuffleArray([currentItem, ...wrongChoices]);
}
