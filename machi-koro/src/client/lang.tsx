import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { LANGS, LANG_NAMES, t as translate, type Lang, type Params } from '../shared/i18n';

const KEY = 'machikoro.lang';

function detect(): Lang {
  try {
    const saved = localStorage.getItem(KEY) as Lang | null;
    if (saved && LANGS.includes(saved)) return saved;
  } catch {
    /* private browsing */
  }
  return navigator.language?.toLowerCase().startsWith('ru') ? 'ru' : 'en';
}

interface LangValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string, params?: Params) => string;
}

const LangContext = createContext<LangValue>({ lang: 'en', setLang: () => undefined, t: (key) => key });

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setStored] = useState<Lang>(detect);

  const setLang = useCallback((next: Lang) => {
    setStored(next);
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* private browsing */
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = translate(lang, 'ui.title');
  }, [lang]);

  const value = useMemo<LangValue>(
    () => ({ lang, setLang, t: (key, params) => translate(lang, key, params) }),
    [lang, setLang]
  );

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang(): LangValue {
  return useContext(LangContext);
}

export function LangSwitch() {
  const { lang, setLang } = useLang();
  return (
    <div className="lang-switch">
      {LANGS.map((code) => (
        <button
          type="button"
          key={code}
          className={code === lang ? 'on' : ''}
          onClick={() => setLang(code)}
          title={LANG_NAMES[code]}
        >
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
