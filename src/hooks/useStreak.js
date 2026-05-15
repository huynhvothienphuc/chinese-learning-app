import { useCallback, useEffect, useRef, useState } from 'react';
import { updateStreak, loadStreakProfile } from '@/lib/supabase';

const STREAK_KEY = 'study-streak';

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

  // Sync DB streak to localStorage on mount (fixes new device / cleared cache)
  useEffect(() => {
    if (!userId || !isMember) return;
    loadStreakProfile().then((profile) => {
      if (!profile) return;
      const dbStreak = profile.current_streak ?? 0;
      const dbLastDate = profile.last_streak_date ?? '';
      const today = getTodayStr();
      if (dbLastDate === today) {
        triggeredToday.current = true;
        writeLocal(dbStreak, today);
      } else if (!triggeredToday.current) {
        writeLocal(dbStreak, dbLastDate);
      }
      // Always sync display from DB regardless of local state
      setStreak(dbStreak);
      window.dispatchEvent(new CustomEvent('streak-updated', { detail: { streak: dbStreak } }));
      // If triggeredToday is true but dbLastDate !== today: triggerStreak is
      // in-flight or just completed — don't overwrite its result
    }).catch(() => {});
  }, [userId, isMember]);

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
      const today = getTodayStr();
      writeLocal(result.current_streak, today);
      setStreak(result.current_streak);
      setToast({ streak: result.current_streak });
      window.dispatchEvent(new CustomEvent('streak-updated', { detail: { streak: result.current_streak } }));
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
  }, [userId, isMember]);

  return { streak, trackFlip, triggerStreak, resetCardTracking, toast, dismissToast };
}
