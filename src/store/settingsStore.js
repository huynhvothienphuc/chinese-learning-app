import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useSettingsStore = create(
  persist(
    (set) => ({
      showSimplified: false,
      setShowSimplified: (v) => set({ showSimplified: v }),
    }),
    { name: 'app-settings' },
  ),
);
