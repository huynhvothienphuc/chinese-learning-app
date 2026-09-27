import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useSettingsStore = create(
  persist(
    (set) => ({
      showSimplified: false,
      setShowSimplified: (v) => set({ showSimplified: v }),
      // Default true — Flashcard mode used to hide pinyin/meaning on every
      // single card until manually re-revealed each time, which was pure
      // friction for beginners who don't know the reading yet. This makes
      // the card's own toggle a persisted, global default instead.
      showAllPinyin: true,
      setShowAllPinyin: (v) => set({ showAllPinyin: v }),
    }),
    { name: 'app-settings' },
  ),
);
