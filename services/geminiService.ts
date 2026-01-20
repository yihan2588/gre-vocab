
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { ExploredWord, GeminiEvaluationResult } from "../types";
import { GEMINI_MODEL_TEXT } from "../constants";

const API_KEY = import.meta.env.VITE_API_KEY || "";

const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

// Renaming to reflect it's an internal type for the service
export interface WordDetailsResponseItem {
  definition: string;
  example_sentence: string;
  synonymNuances?: string;
  mnemonic?: string;
  synonyms?: string[];
}

interface BatchWordDetailsResponse {
  [word: string]: WordDetailsResponseItem;
}

interface WordDetailsResponse { // For single word fetch
  word: string;
  definition: string;
  example_sentence: string;
  synonyms?: string[];
  // antonyms?: string[]; // Removed per user request
  synonymNuances?: string; // New field
  mnemonic?: string; // New field
}

interface GeminiEvaluationResponseInternal {
  is_correct: boolean;
  feedback: string;
  confidence?: number;
  synonymNuances?: string;
  mnemonic?: string;
}


export async function fetchWordDetails(word: string): Promise<ExploredWord | null> {
  if (!ai) {
    console.error("Gemini API client is not initialized in fetchWordDetails. API_KEY might be missing or became invalid.");
    return {
      text: word,
      definition: "API client not initialized. Check API Key.",
      exampleSentence: "Unable to fetch details.",
      synonyms: [],
      antonyms: [],
      synonymNuances: "API Key missing.",
      mnemonic: "API Key missing.",
    };
  }

  const prompt = `
    For the word "${word}", provide the following information in JSON format:
    1. The word itself (key: "word").
    2. A concise definition (key: "definition").
    3. An example sentence using the word (key: "example_sentence").
    4. A list of 2-3 common synonyms if applicable (key: "synonyms", array of strings).
    5. A brief explanation of the nuanced similarity and differences between these synonyms, and when to use which (key: "synonymNuances").
    6. A short joke or fun fact to help memorizing this word (key: "mnemonic").

    Ensure the output is a single JSON object. If you cannot find information, provide empty strings for values or empty arrays for lists, rather than omitting keys.
  `;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GEMINI_MODEL_TEXT,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.5,
      }
    });

    if (!response.text) {
      throw new Error("Gemini API response text is undefined.");
    }
    let jsonStr = response.text.trim();
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[2]) {
      jsonStr = match[2].trim();
    }

    const parsedData = JSON.parse(jsonStr) as WordDetailsResponse;

    return {
      text: parsedData.word || word,
      definition: parsedData.definition || "No definition provided by API.",
      exampleSentence: parsedData.example_sentence || "No example sentence provided by API.",
      synonyms: parsedData.synonyms || [],
      antonyms: [], // Removed antonyms
      synonymNuances: parsedData.synonymNuances,
      mnemonic: parsedData.mnemonic,
    };

  } catch (error) {
    console.error(`Error fetching word details for "${word}" from Gemini API:`, error);
    let defMessage = "Error fetching definition.";
    let exMessage = "Error fetching example sentence.";

    if (error instanceof Error) {
      if (error.message.includes("429") || error.message.includes("RESOURCE_EXHAUSTED")) {
        defMessage = "API rate limit hit for this word. Please try again after some time.";
        exMessage = "Details unavailable due to rate limit.";
      } else if (error.message.includes("API key not valid")) {
        defMessage = "Invalid API Key. Please check your configuration.";
        exMessage = "Cannot fetch details due to API key issue.";
      } else {
        defMessage = "Could not load definition for this word.";
        exMessage = "Could not load example for this word.";
      }
    }

    return {
      text: word,
      definition: defMessage,
      exampleSentence: exMessage,
      synonyms: [],
      antonyms: [],
      synonymNuances: "Error loading content.",
      mnemonic: "Error loading content.",
    };
  }
}

export async function fetchMultipleWordDetails(words: string[]): Promise<Record<string, WordDetailsResponseItem>> {
  if (!ai) {
    console.error("Gemini API client is not initialized in fetchMultipleWordDetails. API_KEY might be missing.");
    const errorResult: Record<string, WordDetailsResponseItem> = {};
    words.forEach(word => {
      errorResult[word] = {
        definition: "API client not initialized. Check API Key.",
        example_sentence: "Unable to fetch details for batch.",
        synonymNuances: "API Key missing.",
        mnemonic: "API Key missing.",
        synonyms: [],
      };
    });
    return errorResult;
  }
  if (words.length === 0) {
    return {};
  }

  const prompt = `
    For each word in the following list, provide a JSON object containing its definition, example sentence, synonyms, a nuance guide for synonyms, and a mnemonic (joke/fun fact).
    The main response should be a single JSON object where each key is one of the input words, and its value is an object with the following keys: 
    - "definition"
    - "example_sentence"
    - "synonyms" (array of strings, just the words)
    - "synonymNuances" (string, explaining differences/usage)
    - "mnemonic" (string, a joke or fun fact to help remember)

    If you cannot find information for a specific word, provide standard placeholders.
    
    Input words:
    ${JSON.stringify(words)}
  `;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GEMINI_MODEL_TEXT,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.4,
      }
    });

    if (!response.text) {
      throw new Error("Gemini API response text is undefined.");
    }
    let jsonStr = response.text.trim();
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[2]) {
      jsonStr = match[2].trim();
    }

    const parsedData = JSON.parse(jsonStr) as BatchWordDetailsResponse;

    // Ensure all requested words have an entry, even if API omits some
    const result: Record<string, WordDetailsResponseItem> = {};
    words.forEach(word => {
      if (parsedData[word]) {
        result[word] = {
          definition: parsedData[word].definition || "No definition provided by API.",
          example_sentence: parsedData[word].example_sentence || "No example sentence provided by API.",
          synonymNuances: parsedData[word].synonymNuances || "No nuance guide provided.",
          mnemonic: parsedData[word].mnemonic || "No mnemonic provided.",
          synonyms: parsedData[word].synonyms || []
        };
      } else {
        // Fallback if a word was in the request but missing in the response
        result[word] = {
          definition: "Details not found in API response for this word.",
          example_sentence: "Example not found in API response for this word.",
          synonymNuances: "Details missing.",
          mnemonic: "Details missing.",
          synonyms: [],
        };
      }
    });
    return result;

  } catch (error) {
    console.error(`Error fetching batch word details from Gemini API for words: ${words.join(', ')}`, error);
    const errorResult: Record<string, WordDetailsResponseItem> = {};
    let defMessage = "Error fetching details for batch.";

    if (error instanceof Error) {
      if (error.message.includes("429") || error.message.includes("RESOURCE_EXHAUSTED")) {
        defMessage = "API rate limit hit. Try again later.";
      } else if (error.message.includes("API key not valid")) {
        defMessage = "Invalid API Key.";
      }
    }

    words.forEach(word => {
      errorResult[word] = {
        definition: defMessage,
        example_sentence: defMessage,
        synonymNuances: defMessage,
        mnemonic: defMessage,
        synonyms: [],
      };
    });
    return errorResult;
  }
}


export async function evaluateUserExplanation(word: string, definition: string, exampleSentence: string, userExplanation: string): Promise<GeminiEvaluationResult> {
  if (!ai) {
    console.error("Gemini API client is not initialized in evaluateUserExplanation. API_KEY might be missing.");
    return {
      isCorrect: false,
      feedback: "Evaluation service not available: API client not initialized. Check API Key.",
    };
  }

  const prompt = `
    The target word is "${word}".
    Its definition is: "${definition}"
    An example sentence is: "${exampleSentence}"
    The user provided the following explanation or example sentence: "${userExplanation}"

    Based on the word's actual definition and example, evaluate the user's input.
    Determine if the user's input correctly and adequately demonstrates understanding of the word.
    
    Respond in JSON format with the following keys:
    - "is_correct": boolean
    - "feedback": string (brief explanation)
    - "confidence": number (optional, 0.0-1.0)
    - "synonymNuances": string (Explain the nuanced similarity and differences between synonyms, and when to use which. Provide this ALWAYS, to help valid learning even if correct, but especially if incorrect.)
    - "mnemonic": string (A joke or fun fact to help memorizing this word. Provide this ALWAYS.)

    Focus on the core meaning and appropriate usage.
  `;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GEMINI_MODEL_TEXT,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.6,
      }
    });

    if (!response.text) {
      throw new Error("Gemini API response text is undefined.");
    }
    let jsonStr = response.text.trim();
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[2]) {
      jsonStr = match[2].trim();
    }

    const parsedData = JSON.parse(jsonStr) as GeminiEvaluationResponseInternal;

    return {
      isCorrect: parsedData.is_correct,
      feedback: parsedData.feedback,
      confidence: parsedData.confidence,
      synonymNuances: parsedData.synonymNuances,
      mnemonic: parsedData.mnemonic,
    };

  } catch (error) {
    console.error("Error evaluating user explanation with Gemini API:", error);
    let feedbackMessage = "Failed to evaluate your explanation.";
    if (error instanceof Error) {
      if (error.message.includes("429") || error.message.includes("RESOURCE_EXHAUSTED")) {
        feedbackMessage = "API rate limit hit. Evaluation failed. Please try again after some time.";
      } else if (error.message.includes("API key not valid")) {
        feedbackMessage = "Evaluation failed due to invalid API Key. Please check your configuration.";
      } else {
        feedbackMessage = "Could not evaluate due to an API error.";
      }
    }
    return {
      isCorrect: false, // Default to incorrect on error
      feedback: feedbackMessage,
    };
  }
}
