import { useCallback, useEffect, useRef, useState } from 'react';
import { updateStreak } from '@/lib/supabase';

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

  // Core: update streak locally + Supabase (members only), show toast once per day
  const triggerStreak = useCallback(async () => {
    if (triggeredToday.current) return;
    triggeredToday.current = true;

    const today = getTodayStr();
    const { streak: s, lastDate } = readLocal();
    const next = lastDate === getYesterdayStr() ? s + 1 : 1;
    writeLocal(next, today);
    setStreak(next);
    setToast({ streak: next });
    window.dispatchEvent(new CustomEvent('streak-updated', { detail: { streak: next } }));

    if (userId && isMember) {
      updateStreak(userId).catch(() => {});
    }
  }, [userId, isMember]);

  return { streak, trackFlip, triggerStreak, resetCardTracking, toast, dismissToast };
}
