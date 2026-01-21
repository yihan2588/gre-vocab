import React, { useState } from 'react';
import { AppView, ExploredWord } from '../types';
import { fetchWordDetails } from '../services/geminiService';
import SparklesIcon from './icons/SparklesIcon';
import { HAS_API_KEY } from '../services/apiConfig';


interface ExploreWordProps {
  setView: (view: AppView, params?: Record<string, any>) => void;
}

const ExploreWord: React.FC<ExploreWordProps> = ({ setView }) => {
  const [wordQuery, setWordQuery] = useState('');
  const [exploredWord, setExploredWord] = useState<ExploredWord | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFetchWord = async () => {
    if (!wordQuery.trim()) {
      setError('Please enter a word.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setExploredWord(null);
    try {
      const details = await fetchWordDetails(wordQuery.trim());
      setExploredWord(details);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred.');
      }
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold text-pink-400 flex items-center">
          <SparklesIcon className="w-8 h-8 mr-2" /> Explore Word with Gemini
        </h2>
        <button
          onClick={() => setView('dashboard')}
          className="bg-cyan-600 hover:bg-cyan-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-150"
        >
          Back to Dashboard
        </button>
      </div>

      <div className="mb-6 p-6 bg-slate-800 rounded-lg shadow-lg border border-slate-700">
        <p className="text-slate-300 mb-4">
          Enter any English word below to get its definition, an example sentence, synonyms, and antonyms, powered by Gemini.
          Note: The Gemini API key must be configured in your environment variables (`process.env.API_KEY`) for this feature to work.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={wordQuery}
            onChange={(e) => setWordQuery(e.target.value)}
            placeholder="Enter a word (e.g., ubiquitous)"
            className="flex-grow p-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none"
            onKeyDown={(e) => e.key === 'Enter' && handleFetchWord()}
          />
          <button
            onClick={handleFetchWord}
            disabled={isLoading || !HAS_API_KEY}
            className="bg-pink-600 hover:bg-pink-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isLoading ? (
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : <SparklesIcon className="w-5 h-5 mr-2" />}
            {isLoading ? 'Fetching...' : 'Explore Word'}
          </button>
        </div>
        {!HAS_API_KEY && (
          <p className="text-xs text-yellow-400 mt-2">Gemini API key not configured. This feature is disabled.</p>
        )}
      </div>

      {error && (
        <div className="bg-red-800 border border-red-700 text-red-100 px-4 py-3 rounded-lg relative mb-6" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      {exploredWord && (
        <div className="bg-slate-800 p-6 rounded-lg shadow-xl border border-slate-700 animate-fadeIn">
          <h3 className="text-3xl font-semibold text-pink-400 mb-4">{exploredWord.text}</h3>
          <div className="space-y-3">
            <p><strong className="text-slate-100">Definition:</strong> {exploredWord.definition}</p>
            <p className="italic"><strong className="text-slate-100 not-italic">Example:</strong> {exploredWord.exampleSentence}</p>
            {exploredWord.synonyms && exploredWord.synonyms.length > 0 && (
              <p><strong className="text-slate-100">Synonyms:</strong> {exploredWord.synonyms.join(', ')}</p>
            )}
            {exploredWord.antonyms && exploredWord.antonyms.length > 0 && (
              <p><strong className="text-slate-100">Antonyms:</strong> {exploredWord.antonyms.join(', ')}</p>
            )}
          </div>
        </div>
      )}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.5s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default ExploreWord;