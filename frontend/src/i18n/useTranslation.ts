// Yatri AI — useTranslation Hook
import { useCallback } from 'react';
import { useUIStore } from '../stores';
import { translations } from './translations';
import type { Language } from './translations';

/**
 * Returns a `t(key)` function that looks up the translation
 * for the current language. Falls back to English if missing.
 */
export function useTranslation() {
  const language = useUIStore((s) => s.language) as Language;

  const t = useCallback(
    (key: string): string => {
      const entry = translations[key];
      if (!entry) return key; // key not found → show raw key
      return entry[language] ?? entry['en'] ?? key;
    },
    [language],
  );

  return { t, language };
}
