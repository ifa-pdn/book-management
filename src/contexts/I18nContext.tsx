"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Lang, dictionary } from '../lib/translations';

type I18nContextType = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: keyof typeof dictionary['id']) => string;
};

const I18nContext = createContext<I18nContextType | undefined>(undefined);

const defaultLang: Lang = 'id';

const getInitialLang = (): Lang => {
  if (typeof window === 'undefined') return defaultLang;

  try {
    const savedLang = localStorage.getItem('auc-lang');
    if (savedLang && ['id', 'en', 'ja'].includes(savedLang)) {
      return savedLang as Lang;
    }
  } catch (error) {
    console.error("Local storage access failed", error);
  }

  return defaultLang;
};

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>(getInitialLang);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  // 2. Buat fungsi baru untuk mengubah state DAN menyimpannya ke brankas browser
  const handleSetLang = (newLang: Lang) => {
    setLang(newLang);
    try {
      localStorage.setItem('auc-lang', newLang);
    } catch (error) {
      console.error("Local storage access failed", error);
    }
  };

  const t = (key: keyof typeof dictionary['id']) => {
    return dictionary[lang][key] ?? dictionary['id'][key];
  };

  return (
    <I18nContext.Provider value={{ lang, setLang: handleSetLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}

export { dictionary };
export type { Lang };
