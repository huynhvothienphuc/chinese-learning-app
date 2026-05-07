import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { normalizeVocabularyItems } from '@/lib/utils';
import { USER_UPLOAD_BOOK_ID, SESSION_SELECTED_BOOK_KEY, SESSION_SELECTED_SECTION_KEY } from '@/lib/constants';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (s) => UUID_RE.test(s);

// ── Prefetch utilities (callable outside React) ───────────────────────────────

export function prefetchSections(queryClient, bookId) {
  return queryClient.prefetchQuery({
    queryKey: ['sections', bookId],
    queryFn: async () => {
      const { data } = await supabase
        .from('lessons_preview')
        .select('id,book_id,title,order,theme,verified,enabled,is_free,updated_at')
        .eq('book_id', bookId);
      return (data ?? [])
        .sort((a, b) => a.order - b.order)
        .map((l) => ({
          id: l.id, file: l.id, title: l.title, order: l.order,
          theme: l.theme, verified: l.verified, enabled: l.enabled,
          is_free: l.is_free, source: 'official',
        }));
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function prefetchVocab(queryClient, bookId, sectionFile, userId = null) {
  return queryClient.prefetchQuery({
    queryKey: ['vocab', bookId, sectionFile, userId],
    queryFn: async () => {
      if (!isUuid(sectionFile)) return [];
      const { data } = await supabase.rpc('get_lesson_words', { p_lesson_id: sectionFile });
      return normalizeVocabularyItems(data ?? []);
    },
    staleTime: 1000 * 60 * 5,
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
    const saved = JSON.parse(sessionStorage.getItem(SESSION_SELECTED_SECTION_KEY) || '{}');
    savedSection = saved[savedBook];
  } catch {
    // corrupted sessionStorage — skip vocab prefetch
  }

  prefetchSections(queryClient, savedBook);
  if (savedSection) prefetchVocab(queryClient, savedBook, savedSection);
}

// ── Books ─────────────────────────────────────────────────────────────────────

export function useBooks(userId, authReady) {
  return useQuery({
    queryKey: ['books', userId ?? null],
    queryFn: async () => {
      const [teacherResult, officialResult] = await Promise.all([
        userId ? supabase.rpc('list_shared_books') : Promise.resolve({ data: [] }),
        supabase.from('books').select('id,title,short_title,description,language,order,enabled'),
      ]);
      const teacherBooks = (teacherResult.data ?? []).map((b) => ({ ...b, source: 'teacher' }));
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
          enabled:     b.enabled,
        }));
      return [...officialBooks, ...teacherBooks];
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
      const { data, error } = await supabase
        .from('lessons_preview')
        .select('id,book_id,title,order,theme,verified,enabled,is_free,updated_at')
        .eq('book_id', bookId);
      if (error) throw new Error(error.message);
      return (data ?? [])
        .sort((a, b) => a.order - b.order)
        .map((l) => ({
          id:       l.id,
          file:     l.id,
          title:    l.title,
          order:    l.order,
          theme:    l.theme,
          verified: l.verified,
          enabled:  l.enabled,
          is_free:  l.is_free,
          source:   'official',
        }));
    },
    enabled: !!bookId && bookSource !== 'upload',
    staleTime: 1000 * 60 * 5,
  });
}

// ── Vocabulary ────────────────────────────────────────────────────────────────
// staleTime: 5 min — content doesn't change mid-session.
// gcTime: 30 min — keeps visited lessons in memory for the full session.

export function useVocabulary(bookId, sectionFile, section) {
  const { user } = useAuthStore();
  const userId = user?.id ?? null;
  const guestBlocked = section?.source === 'official' && !section.is_free && !userId;

  return useQuery({
    queryKey: ['vocab', bookId, sectionFile, userId],
    queryFn: async () => {
      if (section?.source === 'teacher') {
        return normalizeVocabularyItems(section._words ?? []);
      }
      if (!isUuid(sectionFile)) return [];
      const { data, error } = await supabase.rpc('get_lesson_words', { p_lesson_id: sectionFile });
      if (error) throw new Error(error.message);
      return normalizeVocabularyItems(data ?? []);
    },
    enabled: !!bookId && !!sectionFile && !!section && section.source !== 'upload' && !guestBlocked,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    placeholderData: guestBlocked ? undefined : (prev) => prev,
  });
}

// ── Adjacent section prefetch ─────────────────────────────────────────────────
// When the user lands on a section, silently prefetch the previous and next
// sections so switching feels instant.

export function usePrefetchAdjacentSections(bookId, sectionFile, sections) {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const userId = user?.id ?? null;

  useEffect(() => {
    if (!bookId || !sectionFile || !sections.length || bookId === USER_UPLOAD_BOOK_ID) return;

    const idx = sections.findIndex((s) => s.file === sectionFile);
    [sections[idx - 1], sections[idx + 1]]
      .filter((s) => s && s.source !== 'teacher' && s.source !== 'upload')
      .forEach((s) => prefetchVocab(queryClient, bookId, s.file, userId));
  }, [bookId, sectionFile, sections, queryClient, userId]);
}
