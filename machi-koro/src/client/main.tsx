import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { LangProvider } from './lang';
import { PrefsProvider } from './prefs';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LangProvider>
      <PrefsProvider>
        <App />
      </PrefsProvider>
    </LangProvider>
  </StrictMode>
);
