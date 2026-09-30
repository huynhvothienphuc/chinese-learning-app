import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useSettingsStore = create(
  persist(
    (set) => ({
      showSimplified: false,
      setShowSimplified: (v) => set({ showSimplified: v }),
      // Flashcard pinyin/meaning mode:
      //   'off'  — always hidden
      //   'card' — hidden until revealed on the current card (resets per card)
      //   'all'  — always shown (default; beginners don't know the reading yet)
      pinyinMode: 'all',
      setPinyinMode: (v) => set({ pinyinMode: v }),
    }),
    {
      name: 'app-settings',
      version: 1,
      // v0 stored a boolean `showAllPinyin`; map it onto the new mode.
      migrate: (state, version) => {
        if (version < 1 && state) {
          const { showAllPinyin, ...rest } = state;
          return { ...rest, pinyinMode: showAllPinyin === false ? 'off' : 'all' };
        }
        return state;
      },
    },
  ),
);
