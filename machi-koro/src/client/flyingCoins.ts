/**
 * Coins arcing from one purse to another. `GameView` reads the movements out of
 * the log (see `coinFlow`) and hands them here; the overlay draws whatever is in
 * flight. Batches clean themselves up once their last coin has landed, so a
 * player who leaves the table mid-flight leaves nothing behind.
 */
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

type Point = DOMRect | { x: number; y: number };
type FlightListener = () => void;

const listeners = new Set<FlightListener>();
let nextBatchId = 1;

function notify(): void {
  for (const l of listeners) l();
}

const centre = (at: Point): { x: number; y: number } =>
  'left' in at ? { x: at.left + at.width / 2, y: at.top + at.height / 2 } : { x: at.x, y: at.y };

export const flyingCoins = {
  /** Turned off by the animation preference; see `prefs`. */
  enabled: true,
  activeBatches: [] as CoinFlightBatch[],

  subscribe(listener: FlightListener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  /**
   * `amount` is the coins that actually changed hands; the flight shows a few of
   * them rather than all — eight coins already read as "a lot" and thirty would
   * only cover the board.
   */
  launch(from: Point, to: Point, amount: number, toPlayerId?: string, isSteal = false): void {
    if (!this.enabled) return;
    if (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const start = centre(from);
    const end = centre(to);
    const numCoins = Math.min(8, Math.max(2, Math.round(amount)));
    const batchId = nextBatchId++;
    const particles: CoinParticle[] = [];

    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;
    const dist = Math.hypot(end.x - start.x, end.y - start.y);
    const arcHeight = Math.min(140, Math.max(40, dist * 0.35));

    for (let i = 0; i < numCoins; i++) {
      particles.push({
        id: `${batchId}_${i}`,
        fromX: start.x,
        fromY: start.y,
        toX: end.x,
        toY: end.y,
        // Spread so the coins do not fly as one rigid string.
        curveX: midX + (Math.random() - 0.5) * 30,
        curveY: midY - arcHeight + (Math.random() - 0.5) * 20,
        delay: i * 45,
        duration: 550 + Math.random() * 100,
        isSteal,
      });
    }

    this.activeBatches = [...this.activeBatches, { id: batchId, particles, toPlayerId, isSteal }];
    notify();

    window.setTimeout(() => {
      this.activeBatches = this.activeBatches.filter((b) => b.id !== batchId);
      notify();
    }, numCoins * 45 + 750);
  },
};
