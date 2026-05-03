import { useLocalStorageState } from '@/hooks/useLocalStorageState';
import { localeMap } from '@/locales';
import { LANGUAGE_KEY } from '@/lib/constants';

export function useLocale() {
  const [lang] = useLocalStorageState(LANGUAGE_KEY, 'vi');
  return localeMap[lang] || localeMap.en;
}
