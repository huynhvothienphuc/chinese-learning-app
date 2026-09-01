import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { updateStreak, loadStreakProfile } from '@/lib/supabase';

const STREAK_KEY = 'study-streak';
// Matches the app's global default staleTime (src/main.jsx) — long enough to
// avoid every Navbar/Dashboard/Learn/MyQuiz mount re-fetching within the same
// browsing session, short enough that a streak changed in another tab/device
// self-heals within minutes instead of staying stale for up to a full day.
const STREAK_PROFILE_STALE_TIME = 1000 * 60 * 5;

function getTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getYesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function readLocal() {
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    if (!raw) return { streak: 0, lastDate: null };
    return JSON.parse(raw);
  } catch {
    return { streak: 0, lastDate: null };
  }
}

function writeLocal(streak, lastDate) {
  localStorage.setItem(STREAK_KEY, JSON.stringify({ streak, lastDate }));
}

export function useStreak({ userId, isMember } = {}) {
  const queryClient = useQueryClient();
  const [streak, setStreak] = useState(() => {
    const { streak: s, lastDate } = readLocal();
    if (!lastDate || lastDate < getYesterdayStr()) return 0;
    return s;
  });
  const [toast, setToast] = useState(null);
  const seenCardIds = useRef(new Set());
  const triggeredToday = useRef(readLocal().lastDate === getTodayStr());

  // Sync streak across all hook instances on the same page
  useEffect(() => {
    function onStreakUpdated(e) { setStreak(e.detail.streak); }
    window.addEventListener('streak-updated', onStreakUpdated);
    return () => window.removeEventListener('streak-updated', onStreakUpdated);
  }, []);

  // Shared across every useStreak instance (Navbar/Dashboard/Learn/MyQuiz) via
  // the same query key — fetched once per staleTime window, not once per mount.
  const { data: dbProfile } = useQuery({
    queryKey: ['streakProfile', userId],
    queryFn: loadStreakProfile,
    enabled: !!userId && !!isMember,
    staleTime: STREAK_PROFILE_STALE_TIME,
  });

  // Sync DB streak to localStorage (fixes new device / cleared cache)
  useEffect(() => {
    if (!dbProfile) return;
    const dbStreak = dbProfile.current_streak ?? 0;
    const dbLastDate = dbProfile.last_streak_date ?? '';
    const today = getTodayStr();
    triggeredToday.current = dbLastDate === today;
    const isExpired = dbLastDate < getYesterdayStr();
    const displayStreak = isExpired ? 0 : dbStreak;
    writeLocal(displayStreak, dbLastDate);
    setStreak(displayStreak);
    window.dispatchEvent(new CustomEvent('streak-updated', { detail: { streak: displayStreak } }));
    // If triggeredToday is true but dbLastDate !== today: triggerStreak is
    // in-flight or just completed — don't overwrite its result
  }, [dbProfile]);

  function dismissToast() { setToast(null); }

  // Called when section changes to reset unique-card counter
  function resetCardTracking() {
    seenCardIds.current = new Set();
  }

  // Called on every flashcard flip — tracks unique cards
  function trackFlip(cardId) {
    if (!cardId) return;
    seenCardIds.current.add(cardId);
    if (seenCardIds.current.size >= 10) {
      triggerStreak();
    }
  }

  // Core: update streak — DB is the source of truth for members
  const triggerStreak = useCallback(async () => {
    if (triggeredToday.current) return;
    triggeredToday.current = true;

    if (userId && isMember) {
      const result = await updateStreak(userId).catch(() => null);
      if (!result) {
        triggeredToday.current = false; // allow retry on next flip
        return;
      }
      setToast({ streak: result.current_streak });
      // Patch the shared cache rather than also calling writeLocal/setStreak/
      // dispatchEvent directly here — the [dbProfile] effect below already
      // reacts to this and is the single place that syncs localStorage,
      // local state, and the cross-instance event. Doing both was firing
      // every mounted useStreak instance twice per trigger.
      queryClient.setQueryData(['streakProfile', userId], (old) => ({
        ...old,
        current_streak: result.current_streak,
        last_streak_date: getTodayStr(),
      }));
    } else {
      // Guest: local-only calculation (no DB to validate against)
      const today = getTodayStr();
      const { streak: s, lastDate } = readLocal();
      const next = lastDate === getYesterdayStr() ? s + 1 : 1;
      writeLocal(next, today);
      setStreak(next);
      setToast({ streak: next });
      window.dispatchEvent(new CustomEvent('streak-updated', { detail: { streak: next } }));
    }
  }, [userId, isMember, queryClient]);

  return { streak, trackFlip, triggerStreak, resetCardTracking, toast, dismissToast };
}
