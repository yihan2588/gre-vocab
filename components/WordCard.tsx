import React, { useState, useEffect } from 'react';
import { Word, LearnedWordEntry, WordStatus } from '../types'; // Word here means FullWord
import { EBBINGHAUS_INTERVALS_DAYS } from '../constants';

// Expect Word to have definition and exampleSentence, even if they are loading messages
type FullWord = Required<Pick<Word, 'id' | 'text' | 'definition' | 'exampleSentence'>> & Pick<Word, 'synonyms' | 'synonymNuances' | 'mnemonic'>;

interface WordCardProps {
  word: FullWord | null; // Can be null while loading
  learnedInfo?: LearnedWordEntry;
  showDetailsInitially?: boolean; // For learn session primarily

  // Props for new Gemini review
  isReviewingDynamically?: boolean;
  userExplanation?: string;
  onUserExplanationChange?: (text: string) => void;
  onSubmitForEvaluation?: () => void;
  isEvaluating?: boolean; // True when Gemini is checking

  // Props for old review (can be phased out or kept for non-Gemini path)
  onMarkCorrect?: () => void;
  onMarkIncorrect?: () => void;
  onReveal?: () => void;
  isReviewingPredefined?: boolean; // Old review mode

  className?: string;
  isLoadingDetails?: boolean;
}

import { HAS_API_KEY } from '../services/apiConfig';

const WordCard: React.FC<WordCardProps> = ({
  word,
  learnedInfo,
  showDetailsInitially = false,
  isReviewingDynamically = false,
  userExplanation,
  onUserExplanationChange,
  onSubmitForEvaluation,
  isEvaluating = false,
  onMarkCorrect,
  onMarkIncorrect,
  onReveal,
  isReviewingPredefined = false,
  className = "",
  isLoadingDetails = false,
}) => {
  const [detailsVisible, setDetailsVisible] = useState(showDetailsInitially);
  const apiKeyAvailable = HAS_API_KEY;

  useEffect(() => {
    // if it's not a review session, details are shown by default or if showDetailsInitially is true
    if (!isReviewingPredefined && !isReviewingDynamically) {
      setDetailsVisible(true);
    } else if (isReviewingPredefined) {
      setDetailsVisible(showDetailsInitially); // For old review, controlled by prop
    }
    // For dynamic review, details (definition/example of target word) are not shown unless explicitly toggled by a new mechanism if needed
  }, [showDetailsInitially, isReviewingPredefined, isReviewingDynamically]);


  const handleToggleDetails = () => {
    setDetailsVisible(!detailsVisible);
    if (!detailsVisible && onReveal) {
      onReveal();
    }
  };

  const getStatusColor = (status?: WordStatus) => {
    switch (status) {
      case WordStatus.MASTERED: return 'bg-green-500';
      case WordStatus.REVIEWING: return 'bg-yellow-500';
      case WordStatus.LEARNING: return 'bg-blue-500';
      default: return 'bg-slate-500';
    }
  };

  const formatDate = (isoDate: string | null | undefined) => {
    if (!isoDate) return 'N/A';
    return new Date(isoDate).toLocaleDateString();
  };

  if (isLoadingDetails || !word) {
    return (
      <div className={`bg-slate-800 p-6 rounded-lg shadow-xl border border-slate-700 ${className}`}>
        <div className="animate-pulse">
          <div className="h-8 bg-slate-700 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-slate-700 rounded w-full mb-2"></div>
          <div className="h-4 bg-slate-700 rounded w-5/6 mb-2"></div>
          <div className="h-4 bg-slate-700 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-slate-800 p-6 rounded-lg shadow-xl border border-slate-700 transition-all duration-300 ease-in-out hover:shadow-2xl ${className}`}>
      <h3 className="text-3xl font-semibold text-cyan-400 mb-3">{word.text}</h3>

      {learnedInfo && !isReviewingDynamically && ( // Hide status during active Gemini review input phase
        <div className="mb-4 text-xs text-slate-400">
          <span className={`px-2 py-1 rounded-full text-white text-xs font-semibold mr-2 ${getStatusColor(learnedInfo.status)}`}>
            {learnedInfo.status.toUpperCase()}
          </span>
          <span>Last Reviewed: {formatDate(learnedInfo.lastReviewedDate)}</span> |
          <span> Next Review: {learnedInfo.status !== WordStatus.MASTERED ? formatDate(learnedInfo.nextReviewDate) : 'Mastered!'}</span> |
          <span> Interval: {learnedInfo.status !== WordStatus.MASTERED ? `${EBBINGHAUS_INTERVALS_DAYS[learnedInfo.currentIntervalIndex]} days` : '-'}</span>
        </div>
      )}

      {/* Details for Learning or AllWordsView */}
      {(!isReviewingPredefined && !isReviewingDynamically && detailsVisible) && (
        <div className="space-y-3">
          <p className="text-slate-300"><strong className="text-slate-100">Definition:</strong> {word.definition}</p>
          <p className="text-slate-300 italic"><strong className="text-slate-100 not-italic">Example:</strong> {word.exampleSentence}</p>
          {word.synonyms && word.synonyms.length > 0 && (
            <p className="text-slate-300"><strong className="text-slate-100">Synonyms:</strong> {word.synonyms.join(', ')}</p>
          )}
          {word.synonymNuances && (
            <div className="mt-2 bg-slate-700 p-3 rounded-md border-l-4 border-purple-500">
              <p className="text-slate-300 text-sm"><strong className="text-purple-300">Nuance & Usage:</strong> {word.synonymNuances}</p>
            </div>
          )}
          {word.mnemonic && (
            <div className="mt-2 bg-slate-700 p-3 rounded-md border-l-4 border-yellow-500">
              <p className="text-slate-300 text-sm"><strong className="text-yellow-300">Fun Fact / Mnemonic:</strong> {word.mnemonic}</p>
            </div>
          )}
        </div>
      )}

      {/* Old Reviewing Logic (Predefined options) */}
      {isReviewingPredefined && !detailsVisible && (
        <button
          onClick={handleToggleDetails}
          className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-150 ease-in-out"
          aria-label="Show answer for the word"
        >
          Show Answer
        </button>
      )}

      {isReviewingPredefined && detailsVisible && (
        <div className="space-y-3 mb-4">
          <p className="text-slate-300"><strong className="text-slate-100">Definition:</strong> {word.definition}</p>
          <p className="text-slate-300 italic"><strong className="text-slate-100 not-italic">Example:</strong> {word.exampleSentence}</p>
        </div>
      )}


      {isReviewingPredefined && detailsVisible && onMarkCorrect && onMarkIncorrect && (
        <div className="mt-6 flex space-x-3">
          <button
            onClick={onMarkIncorrect}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-150 ease-in-out"
          >
            Incorrect
          </button>
          <button
            onClick={onMarkCorrect}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-150 ease-in-out"
          >
            Correct
          </button>
        </div>
      )}

      {/* New Gemini Reviewing Logic */}
      {isReviewingDynamically && (
        <div className="mt-4 space-y-4">
          <p className="text-slate-300">
            Explain the word <strong className="text-cyan-300">"{word.text}"</strong> in your own words, or use it in an example sentence.
          </p>
          <textarea
            value={userExplanation}
            onChange={(e) => onUserExplanationChange && onUserExplanationChange(e.target.value)}
            placeholder="Type your explanation or example here..."
            rows={4}
            className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none"
            aria-label={`Your explanation for ${word.text}`}
            disabled={isEvaluating}
          />
          <button
            onClick={onSubmitForEvaluation}
            disabled={isEvaluating || !userExplanation?.trim() || !apiKeyAvailable}
            className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-150 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isEvaluating ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Evaluating...
              </>
            ) : (
              "Submit for Gemini Review"
            )}
          </button>
          {!apiKeyAvailable && (
            <p className="text-xs text-yellow-400 mt-1 text-center">Gemini API key not configured. Review feature is limited.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default WordCard;