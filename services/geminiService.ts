import { ExploredWord, GeminiEvaluationResult } from "../types";
import { GEMINI_MODEL_TEXT } from "../constants";
import { API_KEY } from "./apiConfig";
import { Language } from "../contexts/LanguageContext";

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

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

async function fetchOpenRouter(messages: any[], temperature: number = 0.5): Promise<string> {
  if (!API_KEY) {
    throw new Error("API Key is missing.");
  }

  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${API_KEY}`,
      "HTTP-Referer": "http://localhost:5173", // Optional: Update with actual site URL
      "X-Title": "GRE Vocabulary Mastery", // Optional
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: GEMINI_MODEL_TEXT,
      messages: messages,
      response_format: { type: "json_object" },
      temperature: temperature
    })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenRouter API Error: ${response.status} - ${errorBody}`);
  }

  const data = await response.json();
  return data.choices && data.choices[0] && data.choices[0].message ? data.choices[0].message.content : "";
}

export async function fetchWordDetails(word: string, language: Language = 'en'): Promise<ExploredWord | null> {
  if (!API_KEY) {
    console.error("API Key is missing in fetchWordDetails.");
    return {
      text: word,
      definition: "API Key missing.",
      exampleSentence: "Unable to fetch details.",
      synonyms: [],
      antonyms: [],
      synonymNuances: "API Key missing.",
      mnemonic: "API Key missing.",
    };
  }

  const prompt = language === 'zh'
    ? `
    语言要求 - CRITICAL LANGUAGE RULES:
    - definition: 必须100%简体中文
    - example_sentence: 必须100%英文 (This helps users learn English!)
    - synonyms: 必须是英文单词
    - synonymNuances: 必须100%简体中文
    - mnemonic: 必须100%简体中文

    对于英文单词 "${word}"，请提供以下信息（JSON格式）：

    {
      "word": "${word}",
      "definition": "用简体中文写的定义",
      "example_sentence": "A complete English sentence using the word '${word}' naturally",
      "synonyms": ["synonym1", "synonym2"],
      "synonymNuances": "用简体中文详细解释同义词之间的区别",
      "mnemonic": "用简体中文提供记忆技巧"
    }

    **关键：example_sentence必须是纯英文句子！不要翻译成中文！**
    
    其他字段（除了synonyms和example_sentence）必须用简体中文。
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
    const jsonStr = await fetchOpenRouter([{ role: "user", content: prompt }], 0.5);
    if (!jsonStr) {
      throw new Error("Empty response from OpenRouter.");
    }

    // Try to handle potential markdown fences if OpenRouter/Gemini wraps JSON in them despite strict prompt
    let cleanJson = jsonStr.trim();
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = cleanJson.match(fenceRegex);
    if (match && match[2]) {
      cleanJson = match[2].trim();
    }

    const parsedData = JSON.parse(cleanJson) as WordDetailsResponse;

    return {
      text: parsedData.word || word,
      definition: parsedData.definition || "No definition provided.",
      exampleSentence: parsedData.example_sentence || "No example sentence provided.",
      synonyms: parsedData.synonyms || [],
      antonyms: [],
      synonymNuances: parsedData.synonymNuances,
      mnemonic: parsedData.mnemonic,
    };

  } catch (error) {
    console.error(`Error fetching word details for "${word}" from OpenRouter:`, error);
    let defMessage = "Error fetching definition.";
    let exMessage = "Error fetching example status.";

    if (error instanceof Error) {
      if (error.message.includes("429") || error.message.includes("RESOURCE_EXHAUSTED")) {
        defMessage = "Rate limit hit. Try again later.";
        exMessage = "Unavailable due to rate limit.";
      } else if (error.message.includes("API Key")) {
        defMessage = "Invalid API Key.";
        exMessage = "Check API Key.";
      } else {
        defMessage = "Could not load definition.";
        exMessage = "Could not load example.";
      }
    }

    return {
      text: word,
      definition: `Error: ${defMessage}`,
      exampleSentence: error instanceof Error ? error.message : "Unknown error",
      synonyms: [],
      antonyms: [],
      synonymNuances: "Check console/network.",
      mnemonic: "Check console/network.",
    };
  }
}

export async function fetchMultipleWordDetails(words: string[], language: Language = 'en'): Promise<Record<string, WordDetailsResponseItem>> {
  if (!API_KEY) {
    console.error("API Key is missing in fetchMultipleWordDetails.");
    const errorResult: Record<string, WordDetailsResponseItem> = {};
    words.forEach(word => {
      errorResult[word] = {
        definition: "API Key missing.",
        example_sentence: "Unable to fetch.",
        synonymNuances: "API Key missing.",
        mnemonic: "API Key missing.",
        synonyms: [],
      }
    });
    return errorResult;
  }

  if (words.length === 0) {
    return {};
  }

  const prompt = language === 'zh'
    ? `
    语言要求 - CRITICAL LANGUAGE RULES FOR EACH WORD:
    - "definition": 必须100%简体中文
    - "example_sentence": 必须100%英文 (English sentence! 帮助用户学习英语)
    - "synonyms": 数组，每个同义词都是英文单词
    - "synonymNuances": 必须100%简体中文
    - "mnemonic": 必须100%简体中文

    对于以下英文单词列表，返回一个JSON对象，每个单词作为键，值是包含以下字段的对象：

    示例格式：
    {
      "wordname": {
        "definition": "简体中文定义",
        "example_sentence": "Complete English sentence using the word naturally",
        "synonyms": ["synonym1", "synonym2"],
        "synonymNuances": "用简体中文解释同义词的细微差别",
        "mnemonic": "用简体中文的记忆技巧"
      }
    }

    **关键规则：example_sentence必须是完整的英文句子，不能翻译成中文！**

    输入单词列表：
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
    const jsonStr = await fetchOpenRouter([{ role: "user", content: prompt }], 0.4);
    if (!jsonStr) {
      throw new Error("Empty response from OpenRouter for batch.");
    }

    let cleanJson = jsonStr.trim();
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = cleanJson.match(fenceRegex);
    if (match && match[2]) {
      cleanJson = match[2].trim();
    }

    const parsedData = JSON.parse(cleanJson) as BatchWordDetailsResponse;
    const result: Record<string, WordDetailsResponseItem> = {};

    words.forEach(word => {
      if (parsedData[word]) {
        result[word] = {
          definition: parsedData[word].definition || "No definition provided.",
          example_sentence: parsedData[word].example_sentence || "No example provided.",
          synonymNuances: parsedData[word].synonymNuances || "No nuance guide.",
          mnemonic: parsedData[word].mnemonic || "No mnemonic.",
          synonyms: parsedData[word].synonyms || []
        };
      } else {
        result[word] = {
          definition: "Details not found.",
          example_sentence: "Example not found.",
          synonymNuances: "Details missing.",
          mnemonic: "Details missing.",
          synonyms: [],
        };
      }
    });
    return result;

  } catch (error) {
    console.error(`Error fetching batch details from OpenRouter:`, error);
    const errorResult: Record<string, WordDetailsResponseItem> = {};
    let defMessage = "Error fetching batch.";

    if (error instanceof Error) {
      if (error.message.includes("429") || error.message.includes("RESOURCE_EXHAUSTED")) {
        defMessage = "Rate limit hit.";
      } else if (error.message.includes("API Key")) {
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
  if (!API_KEY) {
    console.error("API Key is missing in evaluateUserExplanation.");
    return {
      isCorrect: false,
      feedback: "Evaluation service unavailable: API Key missing.",
    };
  }

  const prompt = language === 'zh'
    ? `
    **绝对语言要求 - ABSOLUTE LANGUAGE REQUIREMENT:**
    你必须用100%纯简体中文回答所有字段。禁止使用任何英文单词（除非是引用用户输入或单词本身）。

    评估任务：
    目标单词：${word}
    标准定义：${definition}
    标准例句：${exampleSentence}
    用户解释：${userExplanation}

    请评估用户的理解是否正确。

    **JSON响应格式（所有文本必须是简体中文）：**
    {
      "is_correct": true,
      "feedback": "你的理解非常准确。你正确地识别了这个词表示XXX的含义，并且你的解释展现了对这个词在实际使用中的深刻理解。继续保持！",
      "confidence": 0.85,
      "synonymNuances": "这个词的同义词包括XXX和YYY。它们之间的主要区别是：XXX侧重于..., 而YYY则强调... 使用时要注意...",
      "mnemonic": "记忆技巧：可以联想... 或者想象... 这样就能轻松记住这个词了！"
    }

    **严格规则：**
    1. feedback必须完整的简体中文句子（3-4句），详细说明为什么对/错
    2. synonymNuances必须完整的简体中文段落
    3. mnemonic必须完整的简体中文段落
    4. 不要在feedback、synonymNuances、mnemonic中使用英文词汇
    5. 所有标点符号使用中文标点（，。！？）

    立即生成100%简体中文的JSON响应。
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
    const jsonStr = await fetchOpenRouter([{ role: "user", content: prompt }], 0.6);
    if (!jsonStr) {
      throw new Error("Empty response for evaluation.");
    }

    let cleanJson = jsonStr.trim();
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = cleanJson.match(fenceRegex);
    if (match && match[2]) {
      cleanJson = match[2].trim();
    }

    const parsedData = JSON.parse(cleanJson) as GeminiEvaluationResponseInternal;

    return {
      isCorrect: parsedData.is_correct,
      feedback: parsedData.feedback,
      confidence: parsedData.confidence,
      synonymNuances: parsedData.synonymNuances,
      mnemonic: parsedData.mnemonic,
    };

  } catch (error) {
    console.error("Error evaluating user explanation:", error);
    let feedbackMessage = "Failed to evaluate.";

    if (error instanceof Error) {
      if (error.message.includes("429") || error.message.includes("RESOURCE_EXHAUSTED")) {
        feedbackMessage = "Rate limit hit. Evaluation failed.";
      } else if (error.message.includes("API Key")) {
        feedbackMessage = "Invalid API Key.";
      } else {
        feedbackMessage = "Evaluation error: " + error.message;
      }
    }

    return {
      isCorrect: false,
      feedback: feedbackMessage,
    };
  }
}
