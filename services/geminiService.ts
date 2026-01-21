import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { ExploredWord, GeminiEvaluationResult } from "../types";
import { GEMINI_MODEL_TEXT } from "../constants";
import { API_KEY } from "./apiConfig";
import { Language } from "../contexts/LanguageContext";

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


export async function fetchWordDetails(word: string, language: Language = 'en'): Promise<ExploredWord | null> {
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

  const prompt = language === 'zh' 
    ? `
    IMPORTANT: Generate ALL content in SIMPLIFIED CHINESE (简体中文) ONLY, except for the synonyms which must be English words.

    对于单词 "${word}"，请用简体中文提供以下信息（以JSON格式）：
    1. 单词本身（键："word"）。
    2. 简明的定义（键："definition"），**必须用简体中文**。
    3. 使用该单词的例句（键："example_sentence"），**必须用简体中文**。
    4. 2-3个常用同义词列表（键："synonyms"，字符串数组），**同义词必须是英文单词**。
    5. 用简体中文简要解释这些同义词之间的细微差别和相似之处，以及何时使用哪个（键："synonymNuances"），**必须用简体中文**。
    6. 一个简短的笑话或趣味知识来帮助记忆这个单词（键："mnemonic"），**必须用简体中文**。

    **重要提醒：除了synonyms字段中的同义词必须是英文单词外，其他所有内容（definition、example_sentence、synonymNuances、mnemonic）都必须用简体中文生成。**

    确保输出是单个JSON对象。如果找不到信息，提供空字符串或空数组，而不是省略键。
  `
    : `
    IMPORTANT: Generate ALL content in ENGLISH ONLY.

    For the word "${word}", provide the following information in JSON format:
    1. The word itself (key: "word").
    2. A concise definition (key: "definition") in English.
    3. An example sentence using the word (key: "example_sentence") in English.
    4. A list of 2-3 common synonyms if applicable (key: "synonyms", array of English words).
    5. A brief explanation of the nuanced similarity and differences between these synonyms, and when to use which (key: "synonymNuances") in English.
    6. A short joke or fun fact to help memorizing this word (key: "mnemonic") in English.

    **REMINDER: ALL content must be generated in English.**

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
      definition: `Error: ${defMessage}`,
      exampleSentence: error instanceof Error ? error.message : "Unknown error",
      synonyms: [],
      antonyms: [],
      synonymNuances: "Check console/network tab.",
      mnemonic: "Check console/network tab.",
    };
  }
}

export async function fetchMultipleWordDetails(words: string[], language: Language = 'en'): Promise<Record<string, WordDetailsResponseItem>> {
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

  const prompt = language === 'zh'
    ? `
    IMPORTANT: Generate ALL content in SIMPLIFIED CHINESE (简体中文) ONLY, except for the synonyms which must be English words.

    对于以下列表中的每个单词，请用简体中文提供包含其定义、例句、同义词、同义词细微差别指南和记忆技巧（笑话/趣味知识）的JSON对象。
    主响应应该是单个JSON对象，其中每个键是一个输入单词，其值是具有以下键的对象：
    - "definition"（**必须用简体中文**）
    - "example_sentence"（**必须用简体中文**）
    - "synonyms"（字符串数组，**必须是英文单词**）
    - "synonymNuances"（字符串，**必须用简体中文**解释差异/用法）
    - "mnemonic"（字符串，笑话或趣味知识来帮助记忆，**必须用简体中文**）

    **重要提醒：除了synonyms字段必须是英文单词外，其他所有内容都必须用简体中文生成。**

    如果找不到特定单词的信息，请提供标准占位符。
    
    输入单词：
    ${JSON.stringify(words)}
  `
    : `
    IMPORTANT: Generate ALL content in ENGLISH ONLY.

    For each word in the following list, provide a JSON object containing its definition, example sentence, synonyms, a nuance guide for synonyms, and a mnemonic (joke/fun fact).
    The main response should be a single JSON object where each key is one of the input words, and its value is an object with the following keys: 
    - "definition" (in English)
    - "example_sentence" (in English)
    - "synonyms" (array of English words)
    - "synonymNuances" (string, explaining differences/usage in English)
    - "mnemonic" (string, a joke or fun fact to help remember in English)

    **REMINDER: ALL content must be generated in English.**

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
        definition: `Error: ${defMessage}`,
        example_sentence: error instanceof Error ? error.message : "Unknown error",
        synonymNuances: "Check settings.",
        mnemonic: "Check settings.",
        synonyms: [],
      };
    });
    return errorResult;
  }
}


export async function evaluateUserExplanation(word: string, definition: string, exampleSentence: string, userExplanation: string, language: Language = 'en'): Promise<GeminiEvaluationResult> {
  if (!ai) {
    console.error("Gemini API client is not initialized in evaluateUserExplanation. API_KEY might be missing.");
    return {
      isCorrect: false,
      feedback: "Evaluation service not available: API client not initialized. Check API Key.",
    };
  }

  const prompt = language === 'zh'
    ? `
    CRITICAL: You MUST respond in SIMPLIFIED CHINESE (简体中文) for ALL text fields. Do NOT use English.

    目标单词是 "${word}"。
    其定义是："${definition}"
    一个例句是："${exampleSentence}"
    用户提供了以下解释或例句："${userExplanation}"

    请根据单词的实际定义和例子，评估用户的输入。确定用户的输入是否正确且充分地展示了对该单词的理解。
    
    **必须以JSON格式响应，包含以下所有键（每个字段都必须有内容）：**
    
    {
      "is_correct": true 或 false（布尔值）,
      "feedback": "详细的反馈说明，用简体中文解释为什么正确或错误，至少2-3句话。必须提供具体的反馈内容，不能为空！",
      "confidence": 0.8（数字，0.0-1.0之间）,
      "synonymNuances": "用简体中文详细解释这个单词的同义词之间的细微差别和相似之处，以及何时使用哪个。必须提供！",
      "mnemonic": "用简体中文提供一个有趣的笑话、故事或记忆技巧来帮助记忆这个单词。必须提供！"
    }

    **关键要求：**
    1. feedback字段必须是详细的简体中文说明（不能只说"正确"或"需要改进"），要解释原因
    2. 所有文本字段（feedback、synonymNuances、mnemonic）都必须用简体中文
    3. 每个字段都必须有实质性的内容，不能为空
    4. feedback要具体说明用户理解得对不对，哪里需要改进

    专注于核心含义和适当用法。
  `
    : `
    IMPORTANT: Generate ALL feedback content in ENGLISH ONLY.

    The target word is "${word}".
    Its definition is: "${definition}"
    An example sentence is: "${exampleSentence}"
    The user provided the following explanation or example sentence: "${userExplanation}"

    Based on the word's actual definition and example, evaluate the user's input.
    Determine if the user's input correctly and adequately demonstrates understanding of the word.
    
    Respond in JSON format with the following keys:
    - "is_correct": boolean
    - "feedback": string (brief explanation in English)
    - "confidence": number (optional, 0.0-1.0)
    - "synonymNuances": string (Explain the nuanced similarity and differences between synonyms, and when to use which in English. Provide this ALWAYS, to help valid learning even if correct, but especially if incorrect.)
    - "mnemonic": string (A joke or fun fact to help memorizing this word in English. Provide this ALWAYS.)

    **REMINDER: ALL feedback content must be generated in English.**

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
