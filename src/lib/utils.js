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

export function getItemMeaning(item, language = 'en') {
  if (!item) return '';
  if (language === 'vi') {
    return String(item.vietnamese || item.meaning?.vi || item.english || item.meaning?.en || '').trim();
  }
  return String(item.english || item.meaning?.en || item.vietnamese || item.meaning?.vi || '').trim();
}

export function getSentenceMeaning(item, language = 'en') {
  if (!item) return '';
  if (language === 'vi') {
    return String(item.sentenceVietnamese || item.translation?.vi || item.sentenceEnglish || item.translation?.en || '').trim();
  }
  return String(item.sentenceEnglish || item.translation?.en || item.sentenceVietnamese || item.translation?.vi || '').trim();
}

export function normalizeVocabularyItems(items) {
  if (!Array.isArray(items)) return [];

  return items
    .map((item, index) => {
      if (!item || typeof item !== 'object') return null;

      const chinese = String(item.chinese || '').trim();
      const pinyin = String(item.pinyin || '').trim();
      const english = String(item.english || item.meaning?.en || '').trim();
      const vietnamese = String(item.vietnamese || item.meaning?.vi || english).trim();
      const sentenceChinese = String(item.sentenceChinese || '').trim();
      const sentencePinyin = String(item.sentencePinyin || '').trim();
      const sentenceEnglish = String(item.sentenceEnglish || item.translation?.en || '').trim();
      const sentenceVietnamese = String(item.sentenceVietnamese || item.translation?.vi || sentenceEnglish).trim();

      if (!chinese || !pinyin) return null;

      return {
        id: item.id || `${chinese}-${pinyin}-${index}`,
        chinese,
        pinyin,
        english,
        vietnamese,
        sentenceChinese,
        sentencePinyin,
        sentenceEnglish,
        sentenceVietnamese,
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
  const wrongPool = vocabulary.filter((item) => item.id !== currentItem.id);
  const wrongCount = Math.min(3, wrongPool.length);
  const shuffledWrong = shuffleArray(wrongPool).slice(0, wrongCount);
  return shuffleArray([currentItem, ...shuffledWrong]);
}
