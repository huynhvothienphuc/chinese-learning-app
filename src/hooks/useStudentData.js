import { useQuery } from '@tanstack/react-query';
import { loadLessonStats, loadWordStats, loadStudentSets } from '@/lib/supabase';

// ── Lesson stats ─────────────────────────────────────────────────────────────

export function useLessonStats(userId) {
  return useQuery({
    queryKey: ['lessonStats', userId],
    queryFn: () => loadLessonStats(userId),
    enabled: !!userId,
    staleTime: 0, // always re-fetch so dashboard reflects latest quiz results
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
  });
}

