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
  // ... (props are same)
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
  // ... (rest is same until line 182)
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
  {
    !apiKeyAvailable && (
      <p className="text-xs text-yellow-400 mt-1 text-center">Gemini API key not configured. Review feature is limited.</p>
    )
  }
        </div >
      )}
    </div >
  );
};

export default WordCard;