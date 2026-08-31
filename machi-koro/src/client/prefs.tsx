import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLang } from './lang';
import { play, type Cue } from './sound';

export type Theme = 'auto' | 'light' | 'dark';
export const THEMES: Theme[] = ['auto', 'light', 'dark'];

export type CardView = 'classic' | 'visual';
export const CARD_VIEWS: CardView[] = ['classic', 'visual'];

const THEME_KEY = 'machikoro.theme';
const SOUND_KEY = 'machikoro.sound';
const CARD_VIEW_KEY = 'machikoro.cardView';

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
    // Sound is opt-in: a board game opening in a browser tab should be quiet
    // until somebody says otherwise.
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
  return 'visual'; // Default to modern visual 3D view
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
  cue: () => undefined,
});

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [theme, setStoredTheme] = useState<Theme>(savedTheme);
  const [sound, setStoredSound] = useState<boolean>(savedSound);
  const [cardView, setStoredCardView] = useState<CardView>(savedCardView);

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
    // Switching it on is a click, which is the gesture the audio context needs
    // to start — so take the chance to prove the setting worked.
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

  // "Auto" is resolved here rather than in a media query, so the stylesheet only
  // ever has to define one override block instead of the whole palette twice.
  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      // The palette is swapped with transitions switched off. An element that is
      // mid-transition on a property whose value came from a custom property that
      // just changed does not always repaint — which left the whole card grid
      // wearing the old theme until something else forced it to redraw.
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
    () => ({ theme, setTheme, sound, setSound, cardView, setCardView, cue: (c: Cue) => sound && play(c) }),
    [theme, setTheme, sound, setSound, cardView, setCardView]
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
