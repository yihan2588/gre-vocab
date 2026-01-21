import React from 'react';
import { AppView } from '../types';
import { useVocabulary } from '../hooks/useVocabulary';
import AcademicCapIcon from './icons/AcademicCapIcon';
import SparklesIcon from './icons/SparklesIcon';
import { LEARN_BATCH_SIZE } from '../constants';
import { useLanguage } from '../contexts/LanguageContext';
import { t } from '../translations';


interface DashboardProps {
  setView: (view: AppView, params?: Record<string, any>) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ setView }) => {
  const { wordsToLearn, wordsToReview, getProgressStats, allWords } = useVocabulary();
  const { language } = useLanguage();
  const stats = getProgressStats();
  const nextLearnSessionSize = Math.min(LEARN_BATCH_SIZE, wordsToLearn.length);

  const StatCard: React.FC<{title: string, value: string | number, color: string}> = ({title, value, color}) => (
    <div className={`bg-slate-800 p-6 rounded-lg shadow-lg border border-slate-700 transform hover:scale-105 transition-transform duration-300`}>
        <h3 className={`text-4xl font-bold ${color}`}>{value}</h3>
        <p className="text-slate-400 mt-1">{title}</p>
    </div>
  );

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="text-center mb-12">
        <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-teal-500 mb-2">
          {t('dashboardWelcome', language)}
        </h2>
        <p className="text-slate-300 text-lg">{t('dashboardSubtitle', language)}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {/* Updated value for "Words to Learn Today" stat card */}
        <StatCard title={t('wordsToLearnToday', language)} value={nextLearnSessionSize} color="text-sky-400" />
        <StatCard title={t('wordsToReviewToday', language)} value={wordsToReview.length} color="text-amber-400" />
        <StatCard title={t('wordsMastered', language)} value={`${stats.masteredCount} / ${stats.totalWords}`} color="text-green-400" />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <button
          onClick={() => setView('learn')}
          disabled={nextLearnSessionSize === 0}
          className="w-full bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600 text-white font-semibold py-4 px-6 rounded-lg shadow-md hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-lg"
        >
          <AcademicCapIcon className="w-6 h-6 mr-2" /> {t('learnNewWords', language)} ({nextLearnSessionSize})
        </button>
        <button
          onClick={() => setView('review')}
          disabled={wordsToReview.length === 0}
          className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white font-semibold py-4 px-6 rounded-lg shadow-md hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-lg"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {t('reviewDueWords', language)} ({wordsToReview.length})
        </button>
        <button
          onClick={() => setView('all_words')}
          className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-semibold py-4 px-6 rounded-lg shadow-md hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300 flex items-center justify-center text-lg"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
           {t('allWords', language)} ({allWords.length})
        </button>
        <button
          onClick={() => setView('explore')}
          className="w-full bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-semibold py-4 px-6 rounded-lg shadow-md hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300 flex items-center justify-center text-lg"
        >
          <SparklesIcon className="w-6 h-6 mr-2" /> {t('exploreWithGemini', language)}
        </button>
      </div>
    </div>
  );
};

export default Dashboard;
