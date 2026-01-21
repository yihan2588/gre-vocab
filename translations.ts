import { Language } from './contexts/LanguageContext';

export const translations = {
  // Header
  appTitle: {
    en: 'GRE Vocabulary Mastery',
    zh: 'GRE词汇精通'
  },

  // Dashboard
  dashboardWelcome: {
    en: 'Welcome to Your GRE Prep Hub',
    zh: '欢迎来到您的GRE备考中心'
  },
  dashboardSubtitle: {
    en: 'Stay on track with your vocabulary goals using spaced repetition.',
    zh: '使用间隔重复法保持词汇学习目标的进度。'
  },
  wordsToLearnToday: {
    en: 'Words to Learn Today',
    zh: '今日待学单词'
  },
  wordsToReviewToday: {
    en: 'Words to Review Today',
    zh: '今日待复习单词'
  },
  wordsMastered: {
    en: 'Words Mastered',
    zh: '已掌握单词'
  },
  learnNewWords: {
    en: 'Learn New Words',
    zh: '学习新单词'
  },
  reviewDueWords: {
    en: 'Review Due Words',
    zh: '复习到期单词'
  },
  allWords: {
    en: 'All Words',
    zh: '全部单词'
  },
  exploreWithGemini: {
    en: 'Explore with Gemini',
    zh: '使用Gemini探索'
  },

  // Learn Session
  learnNewWordsTitle: {
    en: 'Learn New Words',
    zh: '学习新单词'
  },
  allCaughtUp: {
    en: 'All caught up!',
    zh: '全部学完了！'
  },
  allWordsLearned: {
    en: "You've learned all available new words for now.",
    zh: '您已经学完了所有可用的新单词。'
  },
  backToDashboard: {
    en: 'Back to Dashboard',
    zh: '返回主页'
  },
  preparingSession: {
    en: 'Preparing your learning session...',
    zh: '正在准备您的学习课程...'
  },
  fetchingDetails: {
    en: 'Fetching details for',
    zh: '正在获取详情'
  },
  words: {
    en: 'words',
    zh: '个单词'
  },
  loadingDuration: {
    en: 'This might take one to two minutes.',
    zh: '这可能需要一到两分钟。'
  },
  endSession: {
    en: 'End Session',
    zh: '结束课程'
  },
  gotItNextWord: {
    en: 'Got It, Next Word',
    zh: '明白了，下一个'
  },
  finishSession: {
    en: 'Finish Session',
    zh: '完成课程'
  },

  // Review Session
  reviewWords: {
    en: 'Review Words',
    zh: '复习单词'
  },
  practiceWord: {
    en: 'Practice Word',
    zh: '练习单词'
  },
  loading: {
    en: 'Loading...',
    zh: '加载中...'
  },
  error: {
    en: 'Error',
    zh: '错误'
  },
  noWordsToReview: {
    en: 'No words to review right now!',
    zh: '现在没有需要复习的单词！'
  },
  excellentWork: {
    en: 'Excellent work! Come back later or learn some new words.',
    zh: '干得好！稍后回来或学习一些新单词。'
  },
  couldNotLoadWord: {
    en: 'Could not load word for practice.',
    zh: '无法加载练习单词。'
  },
  tryAgain: {
    en: 'Please try again or select another word.',
    zh: '请重试或选择另一个单词。'
  },
  backToAllWords: {
    en: 'Back to All Words',
    zh: '返回全部单词'
  },
  fixApiErrors: {
    en: 'Fix "API Key" Errors (Clear Cache)',
    zh: '修复"API密钥"错误（清除缓存）'
  },
  correct: {
    en: 'Correct!',
    zh: '正确！'
  },
  needsImprovement: {
    en: 'Needs Improvement',
    zh: '需要改进'
  },
  nuanceUsage: {
    en: 'Nuance & Usage:',
    zh: '细微差别与用法：'
  },
  funFactMnemonic: {
    en: 'Fun Fact / Mnemonic:',
    zh: '趣味知识/记忆技巧：'
  },
  nextWord: {
    en: 'Next Word',
    zh: '下一个单词'
  },
  cancelPractice: {
    en: 'Cancel Practice',
    zh: '取消练习'
  },

  // Word Card
  definition: {
    en: 'Definition:',
    zh: '定义：'
  },
  example: {
    en: 'Example:',
    zh: '例句：'
  },
  synonyms: {
    en: 'Synonyms:',
    zh: '同义词：'
  },
  showAnswer: {
    en: 'Show Answer',
    zh: '显示答案'
  },
  incorrect: {
    en: 'Incorrect',
    zh: '错误'
  },
  explainWord: {
    en: 'Explain the word',
    zh: '解释单词'
  },
  inYourOwnWords: {
    en: 'in your own words, or use it in an example sentence.',
    zh: '用您自己的话，或在例句中使用它。'
  },
  typeExplanation: {
    en: 'Type your explanation or example here...',
    zh: '在此输入您的解释或例句...'
  },
  submitForReview: {
    en: 'Submit for Gemini Review',
    zh: '提交Gemini审核'
  },
  evaluating: {
    en: 'Evaluating...',
    zh: '评估中...'
  },
  apiKeyNotConfigured: {
    en: 'Gemini API key not configured. Review feature is limited.',
    zh: 'Gemini API密钥未配置。审核功能受限。'
  },
  lastReviewed: {
    en: 'Last Reviewed:',
    zh: '上次复习：'
  },
  nextReview: {
    en: 'Next Review:',
    zh: '下次复习：'
  },
  mastered: {
    en: 'Mastered!',
    zh: '已掌握！'
  },
  interval: {
    en: 'Interval:',
    zh: '间隔：'
  },
  days: {
    en: 'days',
    zh: '天'
  },

  // Explore Word
  exploreWordTitle: {
    en: 'Explore Word with Gemini',
    zh: '使用Gemini探索单词'
  },
  exploreDescription: {
    en: 'Enter any English word below to get its definition, an example sentence, synonyms, and antonyms, powered by Gemini.',
    zh: '在下方输入任何英文单词，获取由Gemini提供的定义、例句、同义词和反义词。'
  },
  apiKeyNote: {
    en: 'Note: The Gemini API key must be configured in your environment variables (`process.env.API_KEY`) for this feature to work.',
    zh: '注意：必须在环境变量中配置Gemini API密钥（`process.env.API_KEY`）才能使用此功能。'
  },
  enterWord: {
    en: 'Enter a word (e.g., ubiquitous)',
    zh: '输入单词（例如：ubiquitous）'
  },
  exploreWord: {
    en: 'Explore Word',
    zh: '探索单词'
  },
  fetching: {
    en: 'Fetching...',
    zh: '获取中...'
  },
  apiKeyDisabled: {
    en: 'Gemini API key not configured. This feature is disabled.',
    zh: 'Gemini API密钥未配置。此功能已禁用。'
  },
  antonyms: {
    en: 'Antonyms:',
    zh: '反义词：'
  },

  // All Words View
  allVocabularyWords: {
    en: 'All Vocabulary Words',
    zh: '全部词汇单词'
  },
  searchWords: {
    en: 'Search words...',
    zh: '搜索单词...'
  },
  sort: {
    en: 'Sort',
    zh: '排序'
  },
  noMatchingWords: {
    en: 'No words match your search.',
    zh: '没有匹配您搜索的单词。'
  },
  new: {
    en: 'New',
    zh: '新单词'
  },
  learning: {
    en: 'Learning',
    zh: '学习中'
  },
  reviewing: {
    en: 'Reviewing',
    zh: '复习中'
  },
  loadingDetails: {
    en: 'Loading details...',
    zh: '加载详情中...'
  },
  correctInRow: {
    en: 'Correct in a row:',
    zh: '连续正确次数：'
  },
  resetProgress: {
    en: 'Reset Progress',
    zh: '重置进度'
  },
  resetConfirm: {
    en: 'Are you sure you want to reset progress for',
    zh: '您确定要重置进度吗'
  },
  resetConfirmEnd: {
    en: 'This word will be marked as new.',
    zh: '此单词将被标记为新单词。'
  },
  practiceThisWord: {
    en: 'Practice this word',
    zh: '练习此单词'
  },
  next: {
    en: 'Next:',
    zh: '下次：'
  },
  level: {
    en: 'Level',
    zh: '级别'
  },

  // Footer
  madeWith: {
    en: 'Made with',
    zh: '用'
  },
  by: {
    en: 'by',
    zh: '制作，作者'
  },

  // Status
  status: {
    new: {
      en: 'NEW',
      zh: '新'
    },
    learning: {
      en: 'LEARNING',
      zh: '学习中'
    },
    reviewing: {
      en: 'REVIEWING',
      zh: '复习中'
    },
    mastered: {
      en: 'MASTERED',
      zh: '已掌握'
    }
  },

  // Notice messages
  apiNoticeManual: {
    en: 'Gemini API key not found. Falling back to manual review mode. Please check the word\'s definition and mark if you remembered it correctly.',
    zh: '未找到Gemini API密钥。回退到手动复习模式。请查看单词的定义并标记您是否正确记住了它。'
  },
  markedCorrect: {
    en: 'Marked as correct.',
    zh: '标记为正确。'
  },
  markedIncorrect: {
    en: 'Marked as incorrect.',
    zh: '标记为错误。'
  },
  pleaseEnterWord: {
    en: 'Please enter a word.',
    zh: '请输入一个单词。'
  },
  yourExplanationFor: {
    en: 'Your explanation for',
    zh: '您对'
  },
  explanationPlaceholder: {
    en: 'the explanation',
    zh: '的解释'
  }
};

export const t = (key: keyof typeof translations, lang: Language): string => {
  const translation = translations[key];
  if (translation && typeof translation === 'object' && lang in translation) {
    return (translation as any)[lang];
  }
  return '';
};

// Helper function for nested translations (like status)
export const tn = (category: string, key: string, lang: Language): string => {
  const categoryObj = translations[category as keyof typeof translations];
  if (categoryObj && typeof categoryObj === 'object' && key in categoryObj) {
    return (categoryObj as any)[key][lang];
  }
  return key;
};
