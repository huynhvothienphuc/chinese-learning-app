import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Roles that count as a logged-in member for gating purposes (streak/write
// mode eligibility, dashboard access, etc.) — kept in one place since this
// exact check was independently copy-pasted across Navbar/LearnPage/
// StudentDashboard/MyQuizPage.
const MEMBER_ROLES = ['member', 'teacher', 'admin', 'superadmin'];

export function isMemberRole(role) {
  return MEMBER_ROLES.includes(role);
}

export function shuffleArray(items) {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
}

// Index of the Nth (1-based) occurrence of `needle` in `haystack`, or -1.
// Used to disambiguate a repeated word so blanking/bracket-redisplay logic
// targets the specific occurrence an admin marked, not always the first.
export function nthIndexOf(haystack, needle, n) {
  if (!needle) return -1;
  let idx = -1;
  for (let i = 0; i < n; i += 1) {
    idx = haystack.indexOf(needle, idx + 1);
    if (idx === -1) return -1;
  }
  return idx;
}

function pickByLanguage(primary, fallback, fallbackLabel) {
  const p = String(primary || '').trim();
  if (p) return p;
  const f = String(fallback || '').trim();
  return f ? `${fallbackLabel}: ${f}` : '';
}

export function matchesVocabQuery(item, query) {
  if (!item || !query) return true;
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [
    item.chinese,
    item.pinyin,
    item.english,
    item.vietnamese || item.vi || item.meaning?.vi,
    item.sentenceChinese,
    item.sentencePinyin,
    item.sentenceEnglish,
    item.sentenceVietnamese,
  ].some((v) => (v ?? '').toLowerCase().includes(q));
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
        ...(item.simplified ? { simplified: String(item.simplified).trim() } : {}),
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

// Word bank for fill-in-the-blank: correct word + up to `count` other words
// from the same pool, sized down when the pool itself is small.
export function buildFillBlankChoices(vocabulary, currentItem, count = 14) {
  const seen = new Set([currentItem.chinese]);
  const deduped = vocabulary.filter((item) => {
    if (item.id === currentItem.id) return false;
    if (seen.has(item.chinese)) return false;
    seen.add(item.chinese);
    return true;
  });

  const wrongChoices = shuffleArray(deduped).slice(0, Math.min(count, deduped.length));
  return shuffleArray([currentItem, ...wrongChoices]);
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
