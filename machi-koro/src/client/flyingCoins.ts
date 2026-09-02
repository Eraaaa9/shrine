export interface CoinParticle {
  id: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  curveX: number;
  curveY: number;
  delay: number;
  duration: number;
  isSteal?: boolean;
}

export interface CoinFlightBatch {
  id: number;
  particles: CoinParticle[];
  toPlayerId?: string;
  isSteal?: boolean;
}

type FlightListener = () => void;

class FlyingCoinsManager {
  private static instance: FlyingCoinsManager;
  private listeners: Set<FlightListener> = new Set();
  public activeBatches: CoinFlightBatch[] = [];
  public enabled = true;
  private nextBatchId = 1;

  public static get(): FlyingCoinsManager {
    if (!FlyingCoinsManager.instance) {
      FlyingCoinsManager.instance = new FlyingCoinsManager();
    }
    return FlyingCoinsManager.instance;
  }

  public subscribe(listener: FlightListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const l of this.listeners) l();
  }

  public launch(
    fromRect: DOMRect | { x: number; y: number },
    toRect: DOMRect | { x: number; y: number },
    amount: number = 3,
    toPlayerId?: string,
    isSteal: boolean = false
  ): void {
    if (!this.enabled) return;
    if (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const fromX = 'left' in fromRect ? fromRect.left + fromRect.width / 2 : fromRect.x;
    const fromY = 'top' in fromRect ? fromRect.top + fromRect.height / 2 : fromRect.y;
    const toX = 'left' in toRect ? toRect.left + toRect.width / 2 : toRect.x;
    const toY = 'top' in toRect ? toRect.top + toRect.height / 2 : toRect.y;

    const numCoins = Math.min(8, Math.max(2, Math.round(amount)));
    const batchId = this.nextBatchId++;
    const particles: CoinParticle[] = [];

    const midX = (fromX + toX) / 2;
    const midY = (fromY + toY) / 2;
    const dist = Math.hypot(toX - fromX, toY - fromY);
    const arcHeight = Math.min(140, Math.max(40, dist * 0.35));

    for (let i = 0; i < numCoins; i++) {
      const spreadX = (Math.random() - 0.5) * 30;
      const spreadY = (Math.random() - 0.5) * 20;
      const curveX = midX + spreadX;
      const curveY = midY - arcHeight + spreadY;

      particles.push({
        id: `${batchId}_${i}`,
        fromX,
        fromY,
        toX,
        toY,
        curveX,
        curveY,
        delay: i * 45,
        duration: 550 + Math.random() * 100,
        isSteal,
      });
    }

    const batch: CoinFlightBatch = {
      id: batchId,
      particles,
      toPlayerId,
      isSteal,
    };

    this.activeBatches = [...this.activeBatches, batch];
    this.notify();

    // Auto cleanup after all coins land
    const totalTime = numCoins * 45 + 750;
    window.setTimeout(() => {
      this.activeBatches = this.activeBatches.filter((b) => b.id !== batchId);
      this.notify();
    }, totalTime);
  }
}

export const flyingCoins = FlyingCoinsManager.get();
