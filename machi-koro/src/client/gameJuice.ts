export type ShakeIntensity = 'light' | 'medium' | 'heavy';

export interface LandmarkBurstEvent {
  id: number;
  playerId: string;
  landmarkId: string;
  x: number;
  y: number;
}

export interface DiceShockwaveEvent {
  id: number;
  isDoubles: boolean;
  total: number;
}

type JuiceListener = () => void;

class GameJuiceManager {
  private static instance: GameJuiceManager;
  private shakeTimeout: number | null = null;
  private listeners: Set<JuiceListener> = new Set();
  public isShaking = false;
  public shakeClass = '';
  public activeShockwave: DiceShockwaveEvent | null = null;
  public activeBursts: LandmarkBurstEvent[] = [];
  public stealFlashes: Set<string> = new Set();
  public enabled = true;
  private nextBurstId = 1;

  public static get(): GameJuiceManager {
    if (!GameJuiceManager.instance) {
      GameJuiceManager.instance = new GameJuiceManager();
    }
    return GameJuiceManager.instance;
  }

  public subscribe(listener: JuiceListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const l of this.listeners) {
      l();
    }
  }

  public shake(intensity: ShakeIntensity = 'medium'): void {
    if (!this.enabled) return;
    if (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    if (this.shakeTimeout) {
      window.clearTimeout(this.shakeTimeout);
    }
    this.isShaking = true;
    this.shakeClass = `shake-${intensity}`;
    this.notify();

    const duration = intensity === 'heavy' ? 320 : intensity === 'medium' ? 220 : 150;
    this.shakeTimeout = window.setTimeout(() => {
      this.isShaking = false;
      this.shakeClass = '';
      this.shakeTimeout = null;
      this.notify();
    }, duration);
  }

  public shockwave(isDoubles: boolean, total: number): void {
    if (!this.enabled) return;
    this.activeShockwave = { id: Date.now(), isDoubles, total };
    this.notify();
    window.setTimeout(() => {
      this.activeShockwave = null;
      this.notify();
    }, 800);
  }

  public triggerBurst(playerId: string, landmarkId: string, x: number, y: number): void {
    const burst: LandmarkBurstEvent = {
      id: this.nextBurstId++,
      playerId,
      landmarkId,
      x,
      y,
    };
    this.activeBursts = [...this.activeBursts, burst];
    this.notify();

    window.setTimeout(() => {
      this.activeBursts = this.activeBursts.filter((b) => b.id !== burst.id);
      this.notify();
    }, 1200);
  }

  public flashSteal(victimId: string): void {
    this.stealFlashes.add(victimId);
    this.notify();
    window.setTimeout(() => {
      this.stealFlashes.delete(victimId);
      this.notify();
    }, 600);
  }
}

export const gameJuice = GameJuiceManager.get();
