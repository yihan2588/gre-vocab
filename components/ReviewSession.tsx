
import React, { useState, useEffect, useCallback } from 'react';
import { Word as BareWord, AppView, Word as FullWordType, GeminiEvaluationResult } from '../types';
import { useVocabulary } from '../hooks/useVocabulary';
import WordCard from './WordCard';
import CheckIcon from './icons/CheckIcon';
import XMarkIcon from './icons/XMarkIcon';
import { evaluateUserExplanation } from '../services/geminiService';

// Define FullWord for clarity
type FullWord = Required<Pick<FullWordType, 'id' | 'text' | 'definition' | 'exampleSentence'>>;

interface ReviewSessionProps {
  setView: (view: AppView, params?: Record<string, any>) => void;
  practiceWordId?: string; // For practicing a single specific word
}

const ReviewSession: React.FC<ReviewSessionProps> = ({ setView, practiceWordId }) => {
  const {
    wordsToReview,
    recordReviewOutcome,
    recordReviewOutcomeForPractice,
    learnedWords,
    getWordWithDetails,
    getBareWordById
  } = useVocabulary();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [sessionWords, setSessionWords] = useState<BareWord[]>([]);

  const [currentFullWord, setCurrentFullWord] = useState<FullWord | null>(null);
  const [isLoadingWord, setIsLoadingWord] = useState(true);
  const [userExplanation, setUserExplanation] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<GeminiEvaluationResult | null>(null);

  const apiKeyAvailable = !!import.meta.env.VITE_API_KEY;
  const isPracticeMode = !!practiceWordId;

  // Effect to initialize or reset the session when wordsToReview, practiceWordId, or mode changes
  useEffect(() => {
    if (isPracticeMode && practiceWordId) {
      const practiceBareWord = getBareWordById(practiceWordId);
      if (practiceBareWord) {
        setSessionWords([practiceBareWord]);
      } else {
        setSessionWords([]); // Word not found, or handle error
      }
    } else {
      setSessionWords(wordsToReview); // Use all due words for the session
    }
    setCurrentIndex(0);
    setEvaluationResult(null); // Reset feedback for new session/word
    setUserExplanation('');    // Reset text area for new session/word
  }, [wordsToReview, practiceWordId, isPracticeMode, getBareWordById]);

  const loadWordDetails = useCallback(async (wordId: string) => {
    setIsLoadingWord(true);
    const details = await getWordWithDetails(wordId);
    if (details) {
      setCurrentFullWord(details);
    } else {
      setCurrentFullWord({
        id: wordId,
        text: "Error",
        definition: "Could not load word details.",
        exampleSentence: "Please try again."
      });
    }
    setIsLoadingWord(false);
  }, [getWordWithDetails]);

  // Effect to load details for the current word
  useEffect(() => {
    if (sessionWords.length > 0 && currentIndex < sessionWords.length) {
      const currentBareWord = sessionWords[currentIndex];
      loadWordDetails(currentBareWord.id);
      // DO NOT reset evaluationResult or userExplanation here, as it causes feedback to flash.
      // These are reset when the session initially loads (above) or when explicitly moving to next word.
    } else if (sessionWords.length > 0 && currentIndex >= sessionWords.length) {
      // Session finished
      setView(isPracticeMode ? 'all_words' : 'dashboard');
    }
  }, [sessionWords, currentIndex, loadWordDetails, setView, isPracticeMode]);

  const handleSubmitForEvaluation = async () => {
    if (!currentFullWord || !userExplanation.trim() || !apiKeyAvailable) return;

    setIsEvaluating(true);
    setEvaluationResult(null); // Clear previous evaluation before new one
    const result = await evaluateUserExplanation(
      currentFullWord.text,
      currentFullWord.definition,
      currentFullWord.exampleSentence,
      userExplanation
    );
    setEvaluationResult(result);
    setIsEvaluating(false);

    if (isPracticeMode) {
      recordReviewOutcomeForPractice(currentFullWord.id, result.isCorrect);
    } else {
      recordReviewOutcome(currentFullWord.id, result.isCorrect);
    }
  };

  const handleNextAfterFeedback = () => {
    setEvaluationResult(null); // Clear feedback before moving on
    setUserExplanation('');    // Clear explanation text area
    if (currentIndex < sessionWords.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setView(isPracticeMode ? 'all_words' : 'dashboard');
    }
  };

  const handleTraditionalOutcome = (correct: boolean) => {
    if (!currentFullWord) return;

    if (isPracticeMode) {
      recordReviewOutcomeForPractice(currentFullWord.id, correct);
    } else {
      recordReviewOutcome(currentFullWord.id, correct);
    }
    // Show simple feedback for traditional mode
    setEvaluationResult({ isCorrect: correct, feedback: correct ? "Marked as correct." : "Marked as incorrect." });
  };


  if (sessionWords.length === 0 && !isLoadingWord) { // Ensure not to show this while initially loading practice word
    const message = isPracticeMode
      ? "Could not load word for practice."
      : "No words to review right now!";
    const subMessage = isPracticeMode
      ? "Please try again or select another word."
      : "Excellent work! Come back later or learn some new words.";
    return (
      <div className="container mx-auto p-8 text-center">
        <h2 className="text-2xl font-semibold text-green-400 mb-4">{message}</h2>
        <p className="text-slate-300 mb-6">{subMessage}</p>
        <button
          onClick={() => setView(isPracticeMode ? 'all_words' : 'dashboard')}
          className="bg-cyan-600 hover:bg-cyan-700 text-white font-semibold py-2 px-6 rounded-lg transition duration-150"
        >
          {isPracticeMode ? 'Back to All Words' : 'Back to Dashboard'}
        </button>
      </div>
    );
  }

  if (evaluationResult) {
    return (
      <div className="container mx-auto p-4 md:p-8 flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        {evaluationResult.isCorrect ? (
          <CheckIcon className="w-24 h-24 text-green-500 mb-4" />
        ) : (
          <XMarkIcon className="w-24 h-24 text-red-500 mb-4" />
        )}
        <h3 className={`text-3xl font-bold mb-3 ${evaluationResult.isCorrect ? 'text-green-400' : 'text-red-400'}`}>
          {evaluationResult.isCorrect ? 'Correct!' : 'Needs Improvement'}
        </h3>
        <p className="text-slate-300 text-center mb-6 max-w-xl">{evaluationResult.feedback}</p>

        {!evaluationResult.isCorrect && (
          <div className="w-full max-w-xl space-y-4 mb-6">
            {evaluationResult.synonymNuances && (
              <div className="bg-slate-700 p-4 rounded-lg border-l-4 border-purple-500 text-left">
                <h4 className="font-bold text-purple-300 mb-1">Nuance & Usage:</h4>
                <p className="text-slate-300 text-sm">{evaluationResult.synonymNuances}</p>
              </div>
            )}
            {evaluationResult.mnemonic && (
              <div className="bg-slate-700 p-4 rounded-lg border-l-4 border-yellow-500 text-left">
                <h4 className="font-bold text-yellow-300 mb-1">Fun Fact / Mnemonic:</h4>
                <p className="text-slate-300 text-sm">{evaluationResult.mnemonic}</p>
              </div>
            )}
          </div>
        )}
        <button
          onClick={handleNextAfterFeedback}
          className="bg-cyan-600 hover:bg-cyan-700 text-white font-semibold py-2 px-6 rounded-lg transition duration-150"
        >
          {isPracticeMode || currentIndex >= sessionWords.length - 1 ? (isPracticeMode ? 'Back to All Words' : 'Finish Session') : 'Next Word'}
        </button>
      </div>
    );
  }

  const currentLearnedInfo = currentFullWord ? learnedWords[currentFullWord.id] : undefined;
  const sessionTitle = isPracticeMode
    ? `Practice Word: ${currentFullWord?.text || (isLoadingWord ? 'Loading...' : 'Error')}`
    : `Review Words (${sessionWords.length > 0 ? Math.min(currentIndex + 1, sessionWords.length) : 0}/${sessionWords.length})`;

  return (
    <div className="container mx-auto p-4 md:p-8 flex flex-col items-center">
      <h2 className="text-3xl font-bold text-amber-400 mb-8">
        {sessionTitle}
      </h2>

      {apiKeyAvailable ? (
        <WordCard
          word={currentFullWord}
          learnedInfo={currentLearnedInfo}
          isLoadingDetails={isLoadingWord}
          isReviewingDynamically={true}
          userExplanation={userExplanation}
          onUserExplanationChange={setUserExplanation}
          onSubmitForEvaluation={handleSubmitForEvaluation}
          isEvaluating={isEvaluating}
          className="w-full max-w-2xl mb-6"
        />
      ) : (
        <>
          <p className="text-yellow-400 bg-slate-800 p-3 rounded-md mb-4 text-sm border border-yellow-600">
            <strong className="font-semibold">Notice:</strong> Gemini API key not found. Falling back to manual review mode.
            Please check the word's definition and mark if you remembered it correctly.
          </p>
          <WordCard
            word={currentFullWord}
            learnedInfo={currentLearnedInfo}
            isLoadingDetails={isLoadingWord}
            isReviewingPredefined={true}
            showDetailsInitially={false}
            onMarkCorrect={() => handleTraditionalOutcome(true)}
            onMarkIncorrect={() => handleTraditionalOutcome(false)}
            className="w-full max-w-2xl mb-6"
          />
        </>
      )}
      <div className="flex space-x-4">
        {!isPracticeMode && (
          <button
            onClick={() => setView('dashboard')}
            className="bg-slate-600 hover:bg-slate-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-150"
            disabled={isEvaluating} // Disable if Gemini is evaluating
          >
            End Session
          </button>
        )}
        {isPracticeMode && !evaluationResult && ( // Only show if not already showing feedback screen for practice
          <button
            onClick={() => setView('all_words')}
            className="bg-slate-600 hover:bg-slate-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-150"
            disabled={isEvaluating} // Disable if Gemini is evaluating
          >
            Cancel Practice
          </button>
        )}
      </div>

    </div>
  );
};

export default ReviewSession;
