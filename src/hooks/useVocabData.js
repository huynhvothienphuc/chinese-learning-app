import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { formatSectionName, normalizeVocabularyItems } from '@/lib/utils';
import { USER_UPLOAD_BOOK_ID, SESSION_SELECTED_BOOK_KEY, SESSION_SELECTED_SECTION_KEY } from '@/lib/constants';

// ── Internal fetch helpers ────────────────────────────────────────────────────
// Direct fetch — bypasses fetchCache's in-memory Map so TanStack Query's
// stale-while-revalidate can hit the network and pick up daily JSON updates.
// Browser HTTP cache still handles 304 Not Modified for unchanged files.
async function fetchDirect(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}`);
  return res.json();
}

function parseSections(raw) {
  return raw.map((s) => ({
    ...s,
    title: s.title || formatSectionName(s.file),
    enabled: s.enabled !== false,
  }));
}

function parseVocab(raw) {
  return normalizeVocabularyItems(raw?.items || raw);
}

// ── Prefetch utilities (callable outside React) ───────────────────────────────

export function prefetchSections(queryClient, bookId) {
  return queryClient.prefetchQuery({
    queryKey: ['sections', bookId],
    queryFn: () => fetchDirect(`/data/books/${bookId}/sections.json`).then(parseSections),
    staleTime: 0,
  });
}

export function prefetchVocab(queryClient, bookId, sectionFile, source) {
  return queryClient.prefetchQuery({
    queryKey: ['vocab', bookId, sectionFile],
    queryFn: async () => {
      if (source === 'official') {
        const { data } = await supabase.from('lessons').select('words').eq('id', sectionFile).single();
        return normalizeVocabularyItems(data?.words ?? []);
      }
      return fetchDirect(`/data/books/${bookId}/${sectionFile}`).then(parseVocab);
    },
    staleTime: 0,
    gcTime: 1000 * 60 * 30,
  });
}

// Called once at startup (before React renders) to warm the cache from the
// user's last session — runs in parallel with auth, eliminating the waterfall.
export function prefetchFromSession(queryClient) {
  const savedBook = sessionStorage.getItem(SESSION_SELECTED_BOOK_KEY);
  if (!savedBook || savedBook === USER_UPLOAD_BOOK_ID) return;

  let savedSection;
  try {
    const savedSectionsByBook = JSON.parse(
      sessionStorage.getItem(SESSION_SELECTED_SECTION_KEY) || '{}',
    );
    savedSection = savedSectionsByBook[savedBook];
  } catch {
    // corrupted sessionStorage — skip vocab prefetch
  }

  // Fire sections + vocab in parallel — don't await, fire-and-forget
  prefetchSections(queryClient, savedBook);
  if (savedSection) prefetchVocab(queryClient, savedBook, savedSection);
}

// ── Books ─────────────────────────────────────────────────────────────────────

export function useBooks(userId, authReady) {
  return useQuery({
    queryKey: ['books', userId ?? null],
    queryFn: async () => {
      const [booksData, teacherResult, officialResult] = await Promise.all([
        fetchDirect('/data/books.json'),
        userId ? supabase.rpc('list_shared_books') : Promise.resolve({ data: [] }),
        supabase.from('books').select('id,title,short_title,description,language,order,enabled'),
      ]);
      const teacherBooks  = (teacherResult.data ?? []).map((b) => ({ ...b, source: 'teacher' }));
      const officialBooks = (officialResult.data ?? [])
        .sort((a, b) => a.order - b.order)
        .map((b) => ({
          id:          b.id,
          title:       b.title,
          shortTitle:  b.short_title,
          description: b.description,
          language:    b.language,
          folder:      b.id,
          source:      'official',
        }));
      const officialIds = new Set(officialBooks.map((b) => b.id));
      const staticBooks = booksData.filter((b) => !officialIds.has(b.id));
      return [...officialBooks, ...staticBooks, ...teacherBooks];
    },
    enabled: authReady,
    staleTime: 1000 * 60 * 30,
  });
}

// ── Sections ──────────────────────────────────────────────────────────────────

export function useSections(bookId, bookSource) {
  return useQuery({
    queryKey: ['sections', bookId],
    queryFn: async () => {
      if (bookSource === 'teacher') {
        const { data, error } = await supabase
          .from('user_sections')
          .select('id, title, order, words')
          .eq('book_id', bookId)
          .order('order');
        if (error) throw new Error(error.message);
        return (data ?? []).map((sec) => ({
          id:      sec.id,
          file:    sec.id,
          title:   sec.title,
          source:  'teacher',
          enabled: true,
          _words:  sec.words ?? [],
        }));
      }
      if (bookSource === 'official') {
        const { data, error } = await supabase
          .from('lessons')
          .select('id,book_id,title,order,theme,verified,enabled,is_free,updated_at')
          .eq('book_id', bookId);
        if (error) throw new Error(error.message);
        return (data ?? [])
          .sort((a, b) => a.order - b.order)
          .map((lesson) => ({
            id:       lesson.id,
            file:     lesson.id,
            title:    lesson.title,
            order:    lesson.order,
            theme:    lesson.theme,
            verified: lesson.verified,
            enabled:  lesson.enabled,
            is_free:  lesson.is_free,
            source:   'official',
          }));
      }
      return fetchDirect(`/data/books/${bookId}/sections.json`).then(parseSections);
    },
    enabled: !!bookId && bookSource !== 'upload',
    staleTime: 0,
  });
}

// ── Vocabulary ────────────────────────────────────────────────────────────────
// staleTime: 0 → stale-while-revalidate. Content updates daily so we always
// re-fetch in background. placeholderData prevents any blank flash.
// gcTime: 30 min → keeps visited sections in memory for the full session.

export function useVocabulary(bookId, sectionFile, section) {
  const { user } = useAuthStore();
  const userId = user?.id ?? null;
  // Guests cannot access locked official lessons — disable the query entirely
  // so no stale data leaks through after logout.
  const guestBlocked = section?.source === 'official' && !section.is_free && !userId;

  return useQuery({
    queryKey: ['vocab', bookId, sectionFile, userId],
    queryFn: async () => {
      if (section?.source === 'teacher') {
        return normalizeVocabularyItems(section._words ?? []);
      }
      if (section?.source === 'official') {
        const { data, error } = await supabase
          .from('lessons')
          .select('words')
          .eq('id', sectionFile)
          .single();
        if (error) throw new Error(error.message);
        return normalizeVocabularyItems(data?.words ?? []);
      }
      return fetchDirect(`/data/books/${bookId}/${sectionFile}`).then(parseVocab);
    },
    enabled: !!bookId && !!sectionFile && !!section && section.source !== 'upload' && !guestBlocked,
    staleTime: 0,
    gcTime: 1000 * 60 * 30,
    placeholderData: guestBlocked ? undefined : (prev) => prev,
  });
}

// ── Adjacent section prefetch ─────────────────────────────────────────────────
// When the user lands on a section, silently prefetch the previous and next
// sections so switching feels instant.

export function usePrefetchAdjacentSections(bookId, sectionFile, sections) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!bookId || !sectionFile || !sections.length || bookId === USER_UPLOAD_BOOK_ID) return;

    const idx = sections.findIndex((s) => s.file === sectionFile);
    [sections[idx - 1], sections[idx + 1]]
      .filter((s) => s && s.source !== 'teacher' && s.source !== 'upload')
      .forEach((s) => prefetchVocab(queryClient, bookId, s.file, s.source));
  }, [bookId, sectionFile, sections, queryClient]);
}
