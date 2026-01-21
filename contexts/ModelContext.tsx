import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { GEMINI_MODEL_TEXT, QWEN_MODEL_ID } from '../constants';

// Removed local definition

interface ModelContextType {
    modelId: string;
    setModelId: (id: string) => void;
    availableModels: { id: string; name: string }[];
}

const ModelContext = createContext<ModelContextType | undefined>(undefined);

export const ModelProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [modelId, setModelId] = useState<string>(() => {
        return localStorage.getItem('selectedModelId') || GEMINI_MODEL_TEXT;
    });

    useEffect(() => {
        localStorage.setItem('selectedModelId', modelId);
    }, [modelId]);

    const availableModels = [
        { id: GEMINI_MODEL_TEXT, name: 'Gemini 3 Flash' },
        { id: QWEN_MODEL_ID, name: 'Qwen 3 Max' }
    ];

    return (
        <ModelContext.Provider value={{ modelId, setModelId, availableModels }}>
            {children}
        </ModelContext.Provider>
    );
};

export const useModel = (): ModelContextType => {
    const context = useContext(ModelContext);
    if (!context) {
        throw new Error('useModel must be used within a ModelProvider');
    }
    return context;
};
