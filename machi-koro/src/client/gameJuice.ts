/**
 * The screen's reaction to a roll or a landmark: a shake and the shockwave the
 * dice tray rides on. Both live outside React because the events that set them
 * off arrive in the log, from a component that has no business owning them.
 *
 * Everything here is decoration, so it stays off when the player asked for it to
 * be off and when the system asks for less motion — one gate, checked in one
 * place, rather than per effect.
 */
export type ShakeIntensity = 'light' | 'medium' | 'heavy';

export interface DiceShockwaveEvent {
  id: number;
  isDoubles: boolean;
  total: number;
}

type JuiceListener = () => void;

const listeners = new Set<JuiceListener>();
let shakeTimeout: number | null = null;
let nextShockwaveId = 1;

function notify(): void {
  for (const l of listeners) l();
}

export const gameJuice = {
  /** Turned off by the animation preference; see `prefs`. */
  enabled: true,
  shakeClass: '',
  activeShockwave: null as DiceShockwaveEvent | null,

  subscribe(listener: JuiceListener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  muted(): boolean {
    if (!this.enabled) return true;
    return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  },

  shake(intensity: ShakeIntensity = 'medium'): void {
    if (this.muted()) return;
    if (shakeTimeout) window.clearTimeout(shakeTimeout);
    this.shakeClass = `shake-${intensity}`;
    notify();

    const duration = intensity === 'heavy' ? 320 : intensity === 'medium' ? 220 : 150;
    shakeTimeout = window.setTimeout(() => {
      this.shakeClass = '';
      shakeTimeout = null;
      notify();
    }, duration);
  },

  shockwave(isDoubles: boolean, total: number): void {
    if (this.muted()) return;
    this.activeShockwave = { id: nextShockwaveId++, isDoubles, total };
    notify();
    window.setTimeout(() => {
      this.activeShockwave = null;
      notify();
    }, 800);
  },
};
