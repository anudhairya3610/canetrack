'use client';
import { useLanguage } from '@/context/LanguageContext';

export default function LanguageToggle() {
  const { language, toggleLanguage } = useLanguage();
  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center gap-1 px-3 py-1.5 rounded-xl font-semibold text-sm transition-all active:scale-95"
      style={{
        background: 'var(--green-pale)',
        color: 'var(--green-primary)',
        border: '1.5px solid var(--border-color)',
      }}
      aria-label="Toggle language"
    >
      <span className={language === 'en' ? 'font-bold' : 'opacity-50'}>EN</span>
      <span className="opacity-40">|</span>
      <span className={language === 'hi' ? 'font-bold' : 'opacity-50'}>हि</span>
    </button>
  );
}
