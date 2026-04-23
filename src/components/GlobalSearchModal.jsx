import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { fetchJSON } from '@/lib/fetchCache';
import { normalizeVocabularyItems, matchesVocabQuery, getItemMeaning } from '@/lib/utils';

const indexState = { items: null, promise: null };

async function loadIndex() {
  if (indexState.items) return indexState.items;
  if (indexState.promise) return indexState.promise;

  indexState.promise = (async () => {
    const books = await fetchJSON('/data/books.json');
    const all = [];

    for (const book of books) {
      let sections;
      try {
        sections = await fetchJSON(`/data/books/${book.folder}/sections.json`);
      } catch {
        continue;
      }

      for (const section of sections.filter((s) => s.enabled !== false)) {
        let data;
        try {
          data = await fetchJSON(`/data/books/${book.folder}/${section.file}`);
        } catch {
          continue;
        }

        const items = normalizeVocabularyItems(data.items || []);
        for (const item of items) {
          all.push({
            ...item,
            bookId: book.id,
            bookLabel: book.shortTitle || book.title,
            sectionFile: section.file,
            sectionTitle: section.title,
          });
        }
      }
    }

    indexState.items = all;
    return all;
  })().catch((err) => {
    indexState.promise = null;
    throw err;
  });

  return indexState.promise;
}

const MAX_RESULTS = 60;

export default function GlobalSearchModal({ isOpen, onClose, onNavigate, language, t }) {
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    inputRef.current?.focus();
    if (indexState.items) {
      setIndex(indexState.items);
      return;
    }
    setIsLoading(true);
    loadIndex()
      .then((items) => {
        setIndex(items);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) setQuery('');
  }, [isOpen]);

  const results = useMemo(() => {
    if (!index || !query.trim()) return [];
    return index.filter((item) => matchesVocabQuery(item, query)).slice(0, MAX_RESULTS);
  }, [index, query]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-16 px-4 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-xl rounded-2xl border border-theme-border bg-theme-surface shadow-2xl overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-theme-border">
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <input
            ref={inputRef}
            type="search"
            aria-label={t.globalSearchInputLabel}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.globalSearchPlaceholder}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400 dark:text-white"
          />
          <button type="button" onClick={onClose} aria-label={t.globalSearchClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {isLoading && (
            <p className="px-4 py-6 text-center text-sm text-slate-400">{t.globalSearchLoading}</p>
          )}

          {!isLoading && query.trim() && results.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-slate-400">{t.globalSearchNoResults}</p>
          )}

          {!isLoading && !query.trim() && (
            <p className="px-4 py-6 text-center text-sm text-slate-400">{t.globalSearchEmptyState}</p>
          )}

          {results.map((item) => {
            const meaning = getItemMeaning(item, language);
            return (
              <button
                key={`${item.bookId}-${item.sectionFile}-${item.id}`}
                type="button"
                onClick={() => {
                  onNavigate(item.bookId, item.sectionFile);
                  onClose();
                }}
                className="w-full px-4 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors border-b border-slate-100 dark:border-slate-700/40 last:border-0"
              >
                <div className="flex items-baseline gap-2">
                  <span className="text-base font-bold text-slate-800 dark:text-slate-100">{item.chinese}</span>
                  <span className="text-xs text-slate-400">{item.pinyin}</span>
                </div>
                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <span className="text-sm text-slate-500 dark:text-slate-400 truncate">{meaning}</span>
                  <span className="shrink-0 text-xs text-slate-400 dark:text-slate-500">
                    {item.bookLabel} · {item.sectionTitle}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
