/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo, useState } from 'react';

export type Language = 'ru' | 'en';

interface I18nContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
}

const STORAGE_KEY = 'mse-mooc-language';
const I18nContext = createContext<I18nContextValue | undefined>(undefined);

function readStoredLanguage(): Language {
  const value = localStorage.getItem(STORAGE_KEY);
  if (value === 'ru' || value === 'en') {
    return value;
  }
  return 'ru';
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => readStoredLanguage());

  const value = useMemo<I18nContextValue>(
    () => ({
      language,
      setLanguage: (nextLanguage) => {
        setLanguageState(nextLanguage);
        localStorage.setItem(STORAGE_KEY, nextLanguage);
      },
    }),
    [language],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error('useI18n must be used inside I18nProvider');
  }

  return context;
}
