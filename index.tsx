import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { VocabularyProvider } from './contexts/VocabularyContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { ModelProvider } from './contexts/ModelContext';
import ErrorBoundary from './components/ErrorBoundary';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <LanguageProvider>
        <ModelProvider>
          <VocabularyProvider>
            <App />
          </VocabularyProvider>
        </ModelProvider>
      </LanguageProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
