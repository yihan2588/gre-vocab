
export interface Word {
  id: string;
  text: string;
  definition?: string; // Will be fetched dynamically
  exampleSentence?: string; // Will be fetched dynamically
  synonyms?: string[]; // Optional
  synonymNuances?: string;
  mnemonic?: string;
  antonyms?: string[]; // Optional
}

export enum WordStatus {
  NEW = 'new',
  LEARNING = 'learning',
  REVIEWING = 'reviewing',
  MASTERED = 'mastered',
}

export interface LearnedWordEntry {
  wordId: string;
  status: WordStatus;
  lastReviewedDate: string | null; // ISO string
  nextReviewDate: string | null; // ISO string
  currentIntervalIndex: number; // Index in EBBINGHAUS_INTERVALS
  timesCorrectStraight: number; // Number of times answered correctly in a row
  totalTimesReviewed: number;
}

// Details fetched from Gemini for exploration or initial learning
export interface ExploredWord {
  text: string;
  definition: string;
  exampleSentence: string;
  synonyms: string[];
  synonymNuances?: string;
  mnemonic?: string;
  antonyms: string[]; // Keeping antonyms in type for compatibility, but may be empty
}

export interface GeminiEvaluationResult {
  isCorrect: boolean;
  feedback: string;
  confidence?: number;
  synonymNuances?: string; // Content to help if incorrect
  mnemonic?: string; // Content to help if incorrect
}

export type AppView = 'dashboard' | 'learn' | 'review' | 'explore' | 'all_words';
