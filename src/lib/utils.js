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

export function parseVocabularyText(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line, index) => {
      const parts = line.split('|').map((part) => part.trim());
      if (parts.length < 5) {
        return null;
      }

      const [chinese, pinyinEnglishRaw, sentenceChinese, sentencePinyin, sentenceEnglish] = parts;
      const match = pinyinEnglishRaw.match(/^(.+?)\s*\((.+)\)$/);
      const pinyin = match ? match[1].trim() : pinyinEnglishRaw;
      const english = match ? match[2].trim() : '';

      return {
        id: `${chinese}-${index}`,
        chinese,
        pinyin,
        english,
        sentenceChinese,
        sentencePinyin,
        sentenceEnglish,
      };
    })
    .filter(Boolean);
}

export function formatSectionName(filename) {
  return filename
    .replace('.txt', '')
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function buildQuizChoices(vocabulary, currentItem) {
  const wrongPool = vocabulary.filter((item) => item.id !== currentItem.id);
  const shuffledWrong = shuffleArray(wrongPool).slice(0, 3);
  return shuffleArray([currentItem, ...shuffledWrong]);
}
