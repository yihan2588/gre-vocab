import React, { createContext, useState, useEffect, useCallback, useRef, ReactNode, useContext } from 'react';
import { Word, LearnedWordEntry, WordStatus, ExploredWord, AppView } from '../types';
import { INITIAL_GRE_WORDS, LOCAL_STORAGE_KEY, LEARN_BATCH_SIZE } from '../constants';
import { getInitialLearnedWordEntry, updateLearnedWordEntry } from '../services/ebbinghaus';
import { fetchWordDetails as fetchWordDetailsFromAPI, fetchMultipleWordDetails, WordDetailsResponseItem, evaluateUserExplanation as evaluateUserExplanationAPI } from '../services/geminiService';

type BareWord = Pick<Word, 'id' | 'text'>;
type FullWord = Required<Word>;
type WordDetail = Pick<ExploredWord, 'definition' | 'exampleSentence' | 'synonymNuances' | 'mnemonic'> & { synonyms?: string[] };

// Exporting the type for use in hooks/useVocabulary.ts or other places.
export interface VocabularyContextType {
  allWords: BareWord[];
  learnedWords: Record<string, LearnedWordEntry>;
  wordDetailsCache: Record<string, WordDetail>;
  getWordWithDetails: (wordId: string) => Promise<FullWord | null>;
  getDetailsForWordBatch: (wordIds: string[]) => Promise<Record<string, WordDetail>>;
  wordsToLearn: BareWord[];
  wordsToReview: BareWord[];
  markAsLearned: (wordId: string) => void;
  recordReviewOutcome: (wordId: string, rememberedCorrectly: boolean) => void;
  recordReviewOutcomeForPractice: (wordId: string, rememberedCorrectly: boolean) => void;
  evaluateUserExplanation: typeof evaluateUserExplanationAPI;
  getProgressStats: () => { totalWords: number; learnedCount: number; masteredCount: number };
  getBareWordById: (id: string) => BareWord | undefined;
  resetWordProgress: (wordId: string) => void;
  resetAllProgress: () => void;
}

// Export the context itself so it can be imported by hooks/useVocabulary.ts
export const VocabularyContext = createContext<VocabularyContextType | undefined>(undefined);

export const VocabularyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [allWordsState] = useState<BareWord[]>(INITIAL_GRE_WORDS.map(w => ({ id: w.id, text: w.text })));
  const [learnedWords, setLearnedWords] = useState<Record<string, LearnedWordEntry>>({});
  const [wordDetailsCache, setWordDetailsCache] = useState<Record<string, WordDetail>>({});

  const requestsInFlightRef = useRef<Record<string, Promise<WordDetail | null>>>({});
  const batchRequestInFlightRef = useRef<Promise<Record<string, WordDetail>> | null>(null);

  useEffect(() => {
    const storedProgress = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (storedProgress) {
      try {
        const parsedProgress = JSON.parse(storedProgress);
        setLearnedWords(parsedProgress.learnedWords || {});
        setWordDetailsCache(parsedProgress.wordDetailsCache || {});
      } catch (error) {
        console.error("Failed to parse stored vocabulary progress:", error);
        localStorage.removeItem(LOCAL_STORAGE_KEY);
      }
    }
  }, []);

  const saveProgress = useCallback((
    updatedLearnedWords: Record<string, LearnedWordEntry>,
    newWordDetailsToCache?: Record<string, WordDetail | undefined>
  ) => {
    let finalCache = { ...wordDetailsCache };
    if (newWordDetailsToCache) {
      for (const wordId in newWordDetailsToCache) {
        const detail = newWordDetailsToCache[wordId];
        if (detail === undefined) { // Check for explicit undefined to remove from cache
          delete finalCache[wordId];
        } else {
          finalCache[wordId] = detail;
        }
      }
      setWordDetailsCache(finalCache);
    }

    const dataToStore = {
      learnedWords: updatedLearnedWords,
      wordDetailsCache: newWordDetailsToCache ? finalCache : wordDetailsCache,
    };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(dataToStore));
    setLearnedWords(updatedLearnedWords);
  }, [wordDetailsCache]);

  const getBareWordById = useCallback((id: string): BareWord | undefined => {
    return allWordsState.find(w => w.id === id);
  }, [allWordsState]);

  const getWordWithDetails = useCallback(async (wordId: string): Promise<FullWord | null> => {
    const bareWord = getBareWordById(wordId);
    if (!bareWord) return null;

    if (wordDetailsCache[wordId]) {
      const cachedDetail = wordDetailsCache[wordId];
      return {
        ...bareWord,
        definition: cachedDetail.definition,
        exampleSentence: cachedDetail.exampleSentence,
        synonyms: [], // Batch fetch currently doesn't get these, provide empty
        antonyms: []  // Batch fetch currently doesn't get these, provide empty
      };
    }

    if (requestsInFlightRef.current[wordId]) {
      const detailsFromInFlight = await requestsInFlightRef.current[wordId];
      if (detailsFromInFlight) {
        return {
          ...bareWord,
          definition: detailsFromInFlight.definition,
          exampleSentence: detailsFromInFlight.exampleSentence,
          synonyms: [],
          antonyms: []
        };
      }
      // Fallback if in-flight promise resolves to null or error state from within promise
      return { ...bareWord, definition: "Loading error (in-flight)...", exampleSentence: "Please try again.", synonyms: [], antonyms: [] };
    }

    if (!import.meta.env.VITE_API_KEY) {
      console.warn("API_KEY not found, cannot fetch word details for single word.");
      const apiKeyMissingDetail = { definition: "API key not configured.", exampleSentence: "Please configure API key." };
      // Cache this specific error state to prevent re-fetches if API key is missing
      setWordDetailsCache(prevCache => ({ ...prevCache, [wordId]: apiKeyMissingDetail }));
      return { ...bareWord, ...apiKeyMissingDetail, synonyms: [], antonyms: [] };
    }

    const fetchPromise = (async (): Promise<WordDetail | null> => {
      try {
        const apiDetailsExplored = await fetchWordDetailsFromAPI(bareWord.text);
        if (apiDetailsExplored) {
          // We need the full ExploredWord for synonyms/antonyms if available from single fetch
          const newDetail: WordDetail = {
            definition: apiDetailsExplored.definition,
            exampleSentence: apiDetailsExplored.exampleSentence,
            synonymNuances: apiDetailsExplored.synonymNuances,
            mnemonic: apiDetailsExplored.mnemonic,
            synonyms: apiDetailsExplored.synonyms,
          };
          const newFullDetail: FullWord = {
            ...bareWord,
            definition: apiDetailsExplored.definition,
            exampleSentence: apiDetailsExplored.exampleSentence,
            synonyms: apiDetailsExplored.synonyms || [],
            antonyms: apiDetailsExplored.antonyms || [],
            synonymNuances: apiDetailsExplored.synonymNuances,
            mnemonic: apiDetailsExplored.mnemonic,
          }
          // Update cache with extended details
          setWordDetailsCache(prevCache => {
            const updatedCache = { ...prevCache, [wordId]: newDetail };
            // Trigger saveProgress with the main learnedWords state and the new cache entry
            // This call uses the main 'learnedWords' state variable from the provider's scope.
            saveProgress(learnedWords, { [wordId]: newDetail });
            return updatedCache;
          });
          return newDetail; // Returns the WordDetail for consistency with cache type
        }
        return null;
      } catch (error) {
        console.error(`Direct error in getWordWithDetails for ${bareWord.text}:`, error);
        const errorDetail: WordDetail = { definition: "Error fetching details.", exampleSentence: "Please try again." };
        setWordDetailsCache(prevCache => ({ ...prevCache, [wordId]: errorDetail }));
        return errorDetail;
      } finally {
        delete requestsInFlightRef.current[wordId];
      }
    })();

    requestsInFlightRef.current[wordId] = fetchPromise;
    const details = await fetchPromise;

    if (details) {
      // If single fetchWordDetailsFromAPI was used, it might have synonyms/antonyms.
      // However, the cache stores WordDetail. Re-fetch full for immediate return if needed, or adjust.
      // For now, stick to WordDetail structure for return from cache/simple fetch.
      // The `ExploredWord` type from `fetchWordDetailsFromAPI` should be used if we want to return more.
      // This part needs care: current design caches WordDetail (def+ex only).
      // If WordCard expects FullWord with synonyms/antonyms, this needs adjustment or WordCard needs to handle missing ones.
      // Let's assume for now that getWordWithDetails primarily ensures definition & example.
      return {
        ...bareWord,
        definition: details.definition,
        exampleSentence: details.exampleSentence,
        synonyms: [], // Keep consistent, full details with syn/ant might need separate logic or type adjustment
        antonyms: []
      };
    }
    const fallbackDetail: WordDetail = { definition: "Could not load definition (fallback).", exampleSentence: "Could not load example (fallback)." };
    return { ...bareWord, ...fallbackDetail, synonyms: [], antonyms: [] };
  }, [getBareWordById, wordDetailsCache, saveProgress, learnedWords]);


  const getDetailsForWordBatch = useCallback(async (wordIds: string[]): Promise<Record<string, WordDetail>> => {
    const results: Record<string, WordDetail> = {};
    const wordsToFetchTexts: string[] = [];
    const wordIdToTextMap: Record<string, string> = {}; // map text to ID for parsing response

    for (const id of wordIds) {
      if (wordDetailsCache[id]) {
        results[id] = wordDetailsCache[id];
      } else {
        const bareWord = getBareWordById(id);
        if (bareWord) {
          wordsToFetchTexts.push(bareWord.text);
          wordIdToTextMap[bareWord.text] = id;
        }
      }
    }

    if (wordsToFetchTexts.length === 0) return results;

    if (!import.meta.env.VITE_API_KEY) {
      console.warn("API_KEY not found, cannot fetch batch word details.");
      const errorDetailsToCache: Record<string, WordDetail> = {};
      wordsToFetchTexts.forEach(text => {
        const id = wordIdToTextMap[text];
        const errorDetail = { definition: "API key not configured.", exampleSentence: "Cannot fetch batch." };
        results[id] = errorDetail;
        errorDetailsToCache[id] = errorDetail; // Prepare for caching
      });
      if (Object.keys(errorDetailsToCache).length > 0) {
        // Use the main learnedWords state here
        saveProgress(learnedWords, errorDetailsToCache);
      }
      return results;
    }

    if (batchRequestInFlightRef.current) {
      console.log("Batch request already in flight, awaiting its completion.");
      try {
        // Await the existing promise
        const inflightResultsByText = await batchRequestInFlightRef.current;
        // The in-flight promise resolves to Record<string(text), WordDetail> based on current design.
        // We need to map these back to IDs.
        for (const textKey in inflightResultsByText) {
          const wordId = wordIdToTextMap[textKey]; // Get ID from text
          if (wordId && !results[wordId] && inflightResultsByText[textKey]) {
            results[wordId] = inflightResultsByText[textKey];
          }
        }
        // Fill any remaining from cache that weren't part of the in-flight call's scope
        for (const id of wordIds) {
          if (!results[id] && wordDetailsCache[id]) {
            results[id] = wordDetailsCache[id];
          }
        }

      } catch (e) {
        console.error("Error awaiting in-flight batch request:", e);
        wordsToFetchTexts.forEach(text => { // These are the words the *current* call intended to fetch
          const id = wordIdToTextMap[text];
          if (id && !results[id]) { // If not already resolved by in-flight or cache
            results[id] = { definition: "Error awaiting previous batch.", exampleSentence: "Please try again." };
          }
        });
      }
      return results;
    }

    const currentBatchPromiseBuilder = async (): Promise<Record<string, WordDetail>> => { // This promise should resolve to Record<string(ID), WordDetail>
      const rawBatchDetailsByText = await fetchMultipleWordDetails(wordsToFetchTexts); // API returns Record<string(text), WordDetailsResponseItem>
      const transformedDetailsById: Record<string, WordDetail> = {};
      for (const wordText in rawBatchDetailsByText) {
        if (Object.prototype.hasOwnProperty.call(rawBatchDetailsByText, wordText)) {
          const wordId = wordIdToTextMap[wordText]; // Map text back to ID
          if (wordId) { // Ensure we have an ID for this text
            transformedDetailsById[wordId] = { // Store by ID
              definition: rawBatchDetailsByText[wordText].definition,
              exampleSentence: rawBatchDetailsByText[wordText].example_sentence,
              synonymNuances: rawBatchDetailsByText[wordText].synonymNuances,
              mnemonic: rawBatchDetailsByText[wordText].mnemonic,
              synonyms: rawBatchDetailsByText[wordText].synonyms,
            };
          }
        }
      }
      // Ensure all originally requested words (by ID) that were sent to API have an entry, even if API didn't return them
      wordsToFetchTexts.forEach(text => {
        const id = wordIdToTextMap[text];
        if (id && !transformedDetailsById[id]) { // If an ID'd word wasn't in the response
          transformedDetailsById[id] = {
            definition: "Details not returned by API for this word.",
            exampleSentence: "Example not returned by API for this word."
          };
        }
      });
      return transformedDetailsById; // Return Record<string(ID), WordDetail>
    };

    const currentBatchPromise = currentBatchPromiseBuilder();
    batchRequestInFlightRef.current = currentBatchPromise; // Store the promise that resolves to Record<string(ID), WordDetail>

    try {
      const fetchedBatchDetailsById = await currentBatchPromise; // This is Record<string(ID), WordDetail>
      const newCacheEntries: Record<string, WordDetail> = {};
      for (const wordId in fetchedBatchDetailsById) { // Iterate by ID
        if (Object.prototype.hasOwnProperty.call(fetchedBatchDetailsById, wordId)) {
          results[wordId] = fetchedBatchDetailsById[wordId]; // Populate results by ID
          newCacheEntries[wordId] = fetchedBatchDetailsById[wordId]; // Prepare cache entries by ID
        }
      }
      if (Object.keys(newCacheEntries).length > 0) {
        // Use the main learnedWords state here
        saveProgress(learnedWords, newCacheEntries);
      }
    } catch (error) {
      console.error("Error processing batch details:", error);
      const errorCacheEntries: Record<string, WordDetail> = {};
      // Populate results and cache for words that were intended for THIS batch fetch
      wordsToFetchTexts.forEach(text => {
        const id = wordIdToTextMap[text];
        if (id && !results[id]) { // If not already in results (e.g. from cache check earlier)
          const errorDetail = { definition: "Error in batch fetch.", exampleSentence: "Please try again." };
          results[id] = errorDetail;
          errorCacheEntries[id] = errorDetail;
        }
      });
      if (Object.keys(errorCacheEntries).length > 0) {
        // Use the main learnedWords state here
        saveProgress(learnedWords, errorCacheEntries);
      }
    } finally {
      batchRequestInFlightRef.current = null;
    }
    return results; // Should be Record<string(ID), WordDetail>
  }, [getBareWordById, wordDetailsCache, saveProgress, learnedWords]);

  const wordsToLearn = allWordsState.filter(word => !learnedWords[word.id] || learnedWords[word.id].status === WordStatus.NEW);

  const wordsToReview = Object.values(learnedWords)
    .filter(entry =>
      entry.status !== WordStatus.MASTERED &&
      entry.status !== WordStatus.NEW &&
      entry.nextReviewDate && new Date(entry.nextReviewDate) <= new Date()
    )
    .map(entry => getBareWordById(entry.wordId))
    .filter((word): word is BareWord => !!word);

  const markAsLearned = useCallback((wordId: string) => {
    const newEntry = getInitialLearnedWordEntry(wordId);
    const updatedLearnedWords = { ...learnedWords, [wordId]: newEntry };
    saveProgress(updatedLearnedWords); // wordDetailsCache remains unchanged here
  }, [learnedWords, saveProgress]);

  const recordReviewOutcome = useCallback((wordId: string, rememberedCorrectly: boolean) => {
    const entry = learnedWords[wordId];
    if (entry) {
      const updatedEntry = updateLearnedWordEntry(entry, rememberedCorrectly);
      const updatedLearnedWords = { ...learnedWords, [wordId]: updatedEntry };
      saveProgress(updatedLearnedWords); // wordDetailsCache remains unchanged
    }
  }, [learnedWords, saveProgress]);

  const recordReviewOutcomeForPractice = useCallback((wordId: string, rememberedCorrectly: boolean) => {
    const entry = learnedWords[wordId];
    if (entry) {
      if (!rememberedCorrectly) {
        // If incorrect during practice, penalize as a normal review
        const updatedEntry = updateLearnedWordEntry(entry, false);
        const updatedLearnedWords = { ...learnedWords, [wordId]: updatedEntry };
        saveProgress(updatedLearnedWords);
      } else {
        // If correct, just update last reviewed date and count, don't advance schedule
        const now = new Date().toISOString();
        const updatedEntry: LearnedWordEntry = {
          ...entry,
          lastReviewedDate: now, // Update last review time
          totalTimesReviewed: entry.totalTimesReviewed + 1, // Increment review count
          // currentIntervalIndex and nextReviewDate remain unchanged for correct practice
        };
        const updatedLearnedWords = { ...learnedWords, [wordId]: updatedEntry };
        saveProgress(updatedLearnedWords);
      }
    }
  }, [learnedWords, saveProgress]);

  const getProgressStats = useCallback(() => {
    const totalWords = allWordsState.length;
    const learnedCount = Object.values(learnedWords).filter(e => e.status !== WordStatus.NEW).length;
    const masteredCount = Object.values(learnedWords).filter(e => e.status === WordStatus.MASTERED).length;
    return { totalWords, learnedCount, masteredCount };
  }, [allWordsState.length, learnedWords]);

  const resetWordProgress = useCallback((wordId: string) => {
    const updatedLearnedWords = { ...learnedWords };
    delete updatedLearnedWords[wordId];
    // Mark for cache removal by passing undefined for the wordId
    saveProgress(updatedLearnedWords, { [wordId]: undefined });
  }, [learnedWords, saveProgress]);

  const resetAllProgress = useCallback(() => {
    const allWordIdsToClearFromCache = allWordsState.reduce((acc, word) => {
      acc[word.id] = undefined; // Mark all existing words for cache removal
      return acc;
    }, {} as Record<string, undefined>);
    saveProgress({}, allWordIdsToClearFromCache); // Reset learnedWords to empty, clear cache for all initial words
  }, [saveProgress, allWordsState]);


  const value: VocabularyContextType = {
    allWords: allWordsState,
    learnedWords,
    wordDetailsCache,
    getWordWithDetails,
    getDetailsForWordBatch,
    wordsToLearn,
    wordsToReview,
    markAsLearned,
    recordReviewOutcome,
    recordReviewOutcomeForPractice,
    evaluateUserExplanation: evaluateUserExplanationAPI,
    getProgressStats,
    getBareWordById,
    resetWordProgress,
    resetAllProgress,
  };

  return <VocabularyContext.Provider value={value}>{children}</VocabularyContext.Provider>;
};

// This is the hook that components should use.
export const useVocabulary = (): VocabularyContextType => {
  const context = useContext(VocabularyContext);
  if (context === undefined) {
    throw new Error('useVocabulary must be used within a VocabularyProvider');
  }
  return context;
};
