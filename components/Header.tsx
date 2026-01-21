
import React from 'react';
import AcademicCapIcon from './icons/AcademicCapIcon';
import { useLanguage } from '../contexts/LanguageContext';
import { t } from '../translations';

const Header: React.FC = () => {
  const { language, toggleLanguage } = useLanguage();

  return (
    <header className="bg-slate-800 p-4 shadow-md">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center">
          <AcademicCapIcon className="w-8 h-8 text-cyan-400 mr-3" />
          <h1 className="text-2xl font-bold text-white">{t('appTitle', language)}</h1>
        </div>
        <button
          onClick={toggleLanguage}
          className="bg-cyan-600 hover:bg-cyan-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-150 flex items-center gap-2"
          aria-label="Toggle language"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
          </svg>
          <span className="hidden sm:inline">{language === 'en' ? '中文' : 'English'}</span>
        </button>
      </div>
    </header>
  );
};

export default Header;
