import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLang } from './lang';
import { play, type Cue } from './sound';
import { gameJuice } from './gameJuice';
import { flyingCoins } from './flyingCoins';

export type Theme = 'auto' | 'light' | 'dark';
export const THEMES: Theme[] = ['auto', 'light', 'dark'];

export type CardView = 'classic' | 'visual';
export const CARD_VIEWS: CardView[] = ['classic', 'visual'];

const THEME_KEY = 'machikoro.theme';
const SOUND_KEY = 'machikoro.sound';
const CARD_VIEW_KEY = 'machikoro.cardView';
const FX_KEY = 'machikoro.fx';
const CHAIN_KEY = 'machikoro.chain';

function savedTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_KEY) as Theme | null;
    if (stored && THEMES.includes(stored)) return stored;
  } catch {
    /* private browsing */
  }
  return 'auto';
}

function savedSound(): boolean {
  try {
    return localStorage.getItem(SOUND_KEY) === 'on';
  } catch {
    return false;
  }
}

function savedCardView(): CardView {
  try {
    const stored = localStorage.getItem(CARD_VIEW_KEY) as CardView | null;
    if (stored && CARD_VIEWS.includes(stored)) return stored;
  } catch {
    /* private browsing */
  }
  return 'visual';
}

function savedFx(): boolean {
  try {
    const stored = localStorage.getItem(FX_KEY);
    return stored === null || stored === 'on';
  } catch {
    return true;
  }
}

function savedActionChain(): boolean {
  try {
    const stored = localStorage.getItem(CHAIN_KEY);
    return stored === null || stored === 'on';
  } catch {
    return true;
  }
}

function systemPrefersLight(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: light)').matches;
}

interface PrefsValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  sound: boolean;
  setSound: (on: boolean) => void;
  cardView: CardView;
  setCardView: (view: CardView) => void;
  fx: boolean;
  setFx: (on: boolean) => void;
  actionChain: boolean;
  setActionChain: (on: boolean) => void;
  /** Play a cue, unless the player has the sound off. */
  cue: (cue: Cue) => void;
}

const PrefsContext = createContext<PrefsValue>({
  theme: 'auto',
  setTheme: () => undefined,
  sound: false,
  setSound: () => undefined,
  cardView: 'visual',
  setCardView: () => undefined,
  fx: true,
  setFx: () => undefined,
  actionChain: true,
  setActionChain: () => undefined,
  cue: () => undefined,
});

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [theme, setStoredTheme] = useState<Theme>(savedTheme);
  const [sound, setStoredSound] = useState<boolean>(savedSound);
  const [cardView, setStoredCardView] = useState<CardView>(savedCardView);
  const [fx, setStoredFx] = useState<boolean>(savedFx);
  const [actionChain, setStoredActionChain] = useState<boolean>(savedActionChain);

  const setTheme = useCallback((next: Theme) => {
    setStoredTheme(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      /* private browsing */
    }
  }, []);

  const setSound = useCallback((on: boolean) => {
    setStoredSound(on);
    try {
      localStorage.setItem(SOUND_KEY, on ? 'on' : 'off');
    } catch {
      /* private browsing */
    }
    if (on) play('coin');
  }, []);

  const setCardView = useCallback((next: CardView) => {
    setStoredCardView(next);
    try {
      localStorage.setItem(CARD_VIEW_KEY, next);
    } catch {
      /* private browsing */
    }
  }, []);

  const setFx = useCallback((on: boolean) => {
    setStoredFx(on);
    gameJuice.enabled = on;
    flyingCoins.enabled = on;
    try {
      localStorage.setItem(FX_KEY, on ? 'on' : 'off');
    } catch {
      /* private browsing */
    }
  }, []);

  const setActionChain = useCallback((on: boolean) => {
    setStoredActionChain(on);
    try {
      localStorage.setItem(CHAIN_KEY, on ? 'on' : 'off');
    } catch {
      /* private browsing */
    }
  }, []);

  useEffect(() => {
    gameJuice.enabled = fx;
    flyingCoins.enabled = fx;
  }, [fx]);

  // "Auto" is resolved here rather than in a media query
  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      root.classList.add('theme-swapping');
      root.dataset.theme = theme === 'auto' ? (systemPrefersLight() ? 'light' : 'dark') : theme;
      void root.offsetWidth;
      requestAnimationFrame(() => root.classList.remove('theme-swapping'));
    };
    apply();
    if (theme !== 'auto' || typeof matchMedia !== 'function') return;
    const query = matchMedia('(prefers-color-scheme: light)');
    query.addEventListener('change', apply);
    return () => query.removeEventListener('change', apply);
  }, [theme]);

  const value = useMemo<PrefsValue>(
    () => ({
      theme,
      setTheme,
      sound,
      setSound,
      cardView,
      setCardView,
      fx,
      setFx,
      actionChain,
      setActionChain,
      cue: (c: Cue) => sound && play(c),
    }),
    [theme, setTheme, sound, setSound, cardView, setCardView, fx, setFx, actionChain, setActionChain]
  );

  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}

export function usePrefs(): PrefsValue {
  return useContext(PrefsContext);
}

const THEME_GLYPH: Record<Theme, string> = { auto: '◐', light: '☀', dark: '☾' };

export function ThemeSwitch() {
  const { t } = useLang();
  const { theme, setTheme } = usePrefs();
  return (
    <div className="lang-switch" role="group" aria-label={t('ui.themeLabel')}>
      {THEMES.map((option) => (
        <button
          type="button"
          key={option}
          className={option === theme ? 'on' : ''}
          onClick={() => setTheme(option)}
          title={t(`ui.theme${option[0].toUpperCase()}${option.slice(1)}`)}
          aria-pressed={option === theme}
        >
          <span aria-hidden="true">{THEME_GLYPH[option]}</span>
          <span className="sr-only">{t(`ui.theme${option[0].toUpperCase()}${option.slice(1)}`)}</span>
        </button>
      ))}
    </div>
  );
}

export function SoundSwitch() {
  const { t } = useLang();
  const { sound, setSound } = usePrefs();
  const label = t(sound ? 'ui.soundOn' : 'ui.soundOff');
  return (
    <button
      type="button"
      className="ghost small sound-switch"
      onClick={() => setSound(!sound)}
      title={label}
      aria-pressed={sound}
    >
      <span aria-hidden="true">{sound ? '🔊' : '🔇'}</span>
      <span className="sr-only">{label}</span>
    </button>
  );
}

export function FxSwitch() {
  const { t } = useLang();
  const { fx, setFx } = usePrefs();
  const label = t(fx ? 'ui.fxOn' : 'ui.fxOff');
  return (
    <button
      type="button"
      className={`ghost small fx-switch ${fx ? 'on' : 'off'}`}
      onClick={() => setFx(!fx)}
      title={label}
      aria-pressed={fx}
    >
      <span aria-hidden="true">{fx ? '✨' : '💨'}</span>
      <span className="sr-only">{label}</span>
    </button>
  );
}

export function ChainSwitch() {
  const { t } = useLang();
  const { actionChain, setActionChain } = usePrefs();
  const label = t(actionChain ? 'ui.chainOn' : 'ui.chainOff');
  return (
    <button
      type="button"
      className={`ghost small chain-switch ${actionChain ? 'on' : 'off'}`}
      onClick={() => setActionChain(!actionChain)}
      title={label}
      aria-pressed={actionChain}
    >
      <span aria-hidden="true">{actionChain ? '⚡' : '💤'}</span>
      <span className="sr-only">{label}</span>
    </button>
  );
}

export function CardViewSwitch() {
  const { t } = useLang();
  const { cardView, setCardView } = usePrefs();
  const isVisual = cardView === 'visual';
  const label = t(isVisual ? 'ui.viewVisual' : 'ui.viewClassic');
  return (
    <button
      type="button"
      className="ghost small card-view-switch"
      onClick={() => setCardView(isVisual ? 'classic' : 'visual')}
      title={label}
      aria-pressed={isVisual}
    >
      <span aria-hidden="true">{isVisual ? '🃏' : '📋'}</span>
      <span className="sr-only">{label}</span>
    </button>
  );
}
