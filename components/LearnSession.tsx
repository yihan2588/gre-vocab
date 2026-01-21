import React, { useState, useEffect, useCallback } from 'react';
import { Word as BareWord, AppView, Word as FullWordType } from '../types';
import { useVocabulary } from '../hooks/useVocabulary';
import WordCard from './WordCard';
import { LEARN_BATCH_SIZE } from '../constants';
import { useLanguage } from '../contexts/LanguageContext';
import { t } from '../translations';

type FullWord = Required<Pick<FullWordType, 'id' | 'text' | 'definition' | 'exampleSentence'>> & Pick<FullWordType, 'synonyms' | 'synonymNuances' | 'mnemonic'>;

interface LearnSessionProps {
  setView: (view: AppView, params?: Record<string, any>) => void;
}

const LearnSession: React.FC<LearnSessionProps> = ({ setView }) => {
  const { wordsToLearn, markAsLearned, getDetailsForWordBatch } = useVocabulary();
  const { language } = useLanguage();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [sessionWords, setSessionWords] = useState<BareWord[]>([]);
  const [detailsForSessionWords, setDetailsForSessionWords] = useState<Record<string, FullWord | null>>({});
  const [isLoadingBatchDetails, setIsLoadingBatchDetails] = useState(false);
  const [isSessionInitialized, setIsSessionInitialized] = useState(false);

  // Effect to reset session when language changes
  useEffect(() => {
    if (isSessionInitialized) {
      console.log('Language changed during learning session. Resetting session.');
      setIsSessionInitialized(false);
      setSessionWords([]);
      setDetailsForSessionWords({});
      setCurrentIndex(0);
    }
  }, [language]); // Only trigger on language change

  useEffect(() => {
    if (!isSessionInitialized && wordsToLearn.length > 0) {
      const newSessionWords = wordsToLearn.slice(0, Math.min(LEARN_BATCH_SIZE, wordsToLearn.length));
      setSessionWords(newSessionWords);
      setCurrentIndex(0);
      setDetailsForSessionWords({});
      setIsSessionInitialized(true);
    }
  }, [wordsToLearn, isSessionInitialized]);

  useEffect(() => {
    if (isSessionInitialized && sessionWords.length > 0 && Object.keys(detailsForSessionWords).length === 0) {
      const fetchAllDetailsForBatch = async () => {
        setIsLoadingBatchDetails(true);
        const wordIdsInBatch = sessionWords.map(sw => sw.id);

        const batchDetailsMap = await getDetailsForWordBatch(wordIdsInBatch);

        const fullWordDetailsBatch: Record<string, FullWord | null> = {};
        for (const bareWord of sessionWords) {
          const detail = batchDetailsMap[bareWord.id];
          if (detail) {
            fullWordDetailsBatch[bareWord.id] = {
              ...bareWord,
              definition: detail.definition,
              exampleSentence: detail.exampleSentence,
              synonyms: detail.synonyms,
              synonymNuances: detail.synonymNuances,
              mnemonic: detail.mnemonic,
            };
          } else {
            fullWordDetailsBatch[bareWord.id] = {
              ...bareWord,
              definition: "Could not load definition for this word (batch).",
              exampleSentence: "Could not load example for this word (batch).",
            };
          }
        }
        setDetailsForSessionWords(fullWordDetailsBatch);
        setIsLoadingBatchDetails(false);
      };
      fetchAllDetailsForBatch();
    }
  }, [isSessionInitialized, sessionWords, getDetailsForWordBatch, detailsForSessionWords]);

  const handleNextWord = () => {
    const currentWordId = sessionWords[currentIndex]?.id;
    if (currentWordId) {
      markAsLearned(currentWordId);
    }
    if (currentIndex < sessionWords.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setIsSessionInitialized(false);
      setView('dashboard');
    }
  };

  const handleEndSession = () => {
    setIsSessionInitialized(false);
    setView('dashboard');
  };

  useEffect(() => {
    return () => {
      setIsSessionInitialized(false);
    };
  }, []);

  if (wordsToLearn.length === 0 && !isSessionInitialized && sessionWords.length === 0) {
    return (
      <div className="container mx-auto p-8 text-center">
        <h2 className="text-2xl font-semibold text-green-400 mb-4">{t('allCaughtUp', language)}</h2>
        <p className="text-slate-300 mb-6">{t('allWordsLearned', language)}</p>
        <button
          onClick={() => setView('dashboard')}
          className="bg-cyan-600 hover:bg-cyan-700 text-white font-semibold py-2 px-6 rounded-lg transition duration-150"
        >
          {t('backToDashboard', language)}
        </button>
      </div>
    );
  }

  if (isLoadingBatchDetails || (!isSessionInitialized && wordsToLearn.length > 0)) {
    return (
      <div className="container mx-auto p-8 text-center flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-cyan-400 mb-4"></div>
        <h2 className="text-2xl font-semibold text-cyan-400 mb-2">{t('preparingSession', language)}</h2>
        <p className="text-slate-300">
          {t('fetchingDetails', language)} {Math.min(LEARN_BATCH_SIZE, wordsToLearn.length)} {t('words', language)}.
        </p>
        <p className="text-slate-400 text-sm mt-2">{t('loadingDuration', language)}</p>
      </div>
    );
  }

  const currentBareWord = sessionWords[currentIndex];
  const currentFullWord = currentBareWord ? detailsForSessionWords[currentBareWord.id] : null;

  if (!currentBareWord && isSessionInitialized && sessionWords.length > 0) {
    console.warn("LearnSession: Current bare word is undefined. Index:", currentIndex, "SessionWords:", sessionWords);
    return (
      <div className="container mx-auto p-8 text-center">
        <p className="text-red-400 mb-6">{t('error', language)} loading current word.</p>
        <button
          onClick={handleEndSession}
          className="bg-cyan-600 hover:bg-cyan-700 text-white font-semibold py-2 px-6 rounded-lg transition"
        >
          {t('backToDashboard', language)}
        </button>
      </div>
    );
  }
  if (!isSessionInitialized && wordsToLearn.length === 0) {
    return (
      <div className="container mx-auto p-8 text-center">
        <h2 className="text-2xl font-semibold text-green-400 mb-4">{t('allCaughtUp', language)}</h2>
        <p className="text-slate-300 mb-6">No new words to learn.</p>
        <button
          onClick={() => setView('dashboard')}
          className="bg-cyan-600 hover:bg-cyan-700 text-white font-semibold py-2 px-6 rounded-lg transition"
        >
          {t('backToDashboard', language)}
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8 flex flex-col items-center pb-28">
      <h2 className="text-3xl font-bold text-cyan-400 mb-8">
        {t('learnNewWordsTitle', language)} ({sessionWords.length > 0 ? Math.min(currentIndex + 1, sessionWords.length) : 0}/{sessionWords.length})
      </h2>

      <WordCard
        word={currentFullWord}
        isLoadingDetails={!currentFullWord && !!currentBareWord}
        showDetailsInitially={true}
        className="w-full max-w-2xl mb-8"
      />

      <div className="fixed bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-700 p-4 shadow-top-md">
        <div className="container mx-auto flex justify-center items-center space-x-4">
          <button
            onClick={handleEndSession}
            className="bg-slate-600 hover:bg-slate-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-150"
            disabled={isLoadingBatchDetails}
          >
            {t('endSession', language)}
          </button>
          <button
            onClick={handleNextWord}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-8 rounded-lg transition duration-150"
            disabled={isLoadingBatchDetails || !currentFullWord || !isSessionInitialized}
          >
            {currentIndex < sessionWords.length - 1 ? t('gotItNextWord', language) : t('finishSession', language)}
          </button>
        </div>
      </div>
      <style>{`
        .shadow-top-md {
          box-shadow: 0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 -2px 4px -1px rgba(0, 0, 0, 0.06);
        }
      `}</style>
    </div>
  );
};

export default LearnSession;
