import { useQuery } from '@tanstack/react-query';
import { loadLessonStats, loadWordStats, loadStudentSets } from '@/lib/supabase';

// ── Lesson stats ─────────────────────────────────────────────────────────────

export function useLessonStats(userId) {
  return useQuery({
    queryKey: ['lessonStats', userId],
    queryFn: () => loadLessonStats(userId),
    enabled: !!userId,
    staleTime: 1000 * 30, // 30s — fresh enough after a quiz, avoids re-fetch on every tab focus
  });
}

// ── Word stats ────────────────────────────────────────────────────────────────

export function useWordStats(userId) {
  return useQuery({
    queryKey: ['wordStats', userId],
    queryFn: () => loadWordStats(userId),
    enabled: !!userId,
    staleTime: 0,
  });
}

// ── Student vocab sets ────────────────────────────────────────────────────────

export function useStudentSets(userId) {
  return useQuery({
    queryKey: ['studentSets', userId],
    queryFn: () => loadStudentSets(userId),
    enabled: !!userId,
    staleTime: 1000 * 60 * 10, // rarely changes; cut Supabase hits on tab refocus
  });
}

