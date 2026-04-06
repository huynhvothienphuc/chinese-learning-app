import { useState } from 'react';

const STREAK_KEY = 'study-streak';

function getTodayStr() {
  return new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'
}

function getYesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function readStreak() {
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    if (!raw) return { streak: 0, lastDate: null };
    return JSON.parse(raw);
  } catch {
    return { streak: 0, lastDate: null };
  }
}

export function useStreak() {
  const [streak, setStreak] = useState(() => {
    const { streak: s, lastDate } = readStreak();
    // Reset if more than 1 day ago
    if (!lastDate || lastDate < getYesterdayStr()) return 0;
    return s;
  });

  function markStudied() {
    const today = getTodayStr();
    const { streak: s, lastDate } = readStreak();

    if (lastDate === today) return; // already counted today

    const next = lastDate === getYesterdayStr() ? s + 1 : 1;
    localStorage.setItem(STREAK_KEY, JSON.stringify({ streak: next, lastDate: today }));
    setStreak(next);
  }

  return { streak, markStudied };
}
