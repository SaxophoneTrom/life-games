'use client';

import { useLanguage } from '@/components/i18n/LanguageContext';
import { Language } from '@/components/i18n/translations';

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  const toggleLanguage = () => {
    const newLang: Language = language === 'en' ? 'ja' : 'en';
    setLanguage(newLang);
  };

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center gap-1 px-2 py-1 text-sm font-medium text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-md transition-colors"
    >
      <span>{language === 'en' ? 'EN' : 'JP'}</span>
      <svg
        className="w-3 h-3"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 9l-7 7-7-7"
        />
      </svg>
    </button>
  );
}
