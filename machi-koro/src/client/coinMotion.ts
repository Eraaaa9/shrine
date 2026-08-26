import { useEffect, useRef, useState } from 'react';
import type { PlayerState } from '../shared/types';

/** A coin swing that just happened to one player. */
export interface CoinDelta {
  key: number;
  playerId: string;
  amount: number;
}

/** How long a delta stays on screen, in step with the CSS animation. */
const LINGER_MS = 1500;

function reducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Watches every purse at the table and reports what changed since the last
 * update, so the panels can float a `+3` or a `−5` over the player it happened
 * to. Income is the whole point of a turn and until now the only trace of it
 * was a line scrolling past in the log.
 *
 * Several payments inside one turn arrive as a single state update, so what is
 * shown is the turn's net swing per player rather than every individual coin.
 * The first snapshot is only remembered — joining a game in progress should not
 * replay everyone's fortune at you.
 */
export default function useCoinDeltas(players: PlayerState[], turnCount: number): Map<string, CoinDelta[]> {
  const [deltas, setDeltas] = useState<CoinDelta[]>([]);
  const previous = useRef<Map<string, number> | null>(null);
  const lastTurn = useRef(turnCount);
  const nextKey = useRef(1);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());

  const signature = players.map((p) => `${p.id}:${p.coins}`).join(',');

  useEffect(() => {
    const before = previous.current;
    const now = new Map(players.map((p) => [p.id, p.coins]));
    previous.current = now;

    // A rematch deals everyone a fresh purse; that is a new game, not income.
    const restarted = turnCount < lastTurn.current;
    lastTurn.current = turnCount;
    if (!before || restarted || reducedMotion()) return;

    const fresh: CoinDelta[] = [];
    for (const [id, coins] of now) {
      const was = before.get(id);
      if (was === undefined || was === coins) continue;
      fresh.push({ key: nextKey.current++, playerId: id, amount: coins - was });
    }
    if (fresh.length === 0) return;

    setDeltas((current) => [...current, ...fresh]);
    for (const delta of fresh) {
      const timer = setTimeout(() => {
        timers.current.delete(timer);
        setDeltas((current) => current.filter((d) => d.key !== delta.key));
      }, LINGER_MS);
      timers.current.add(timer);
    }
    // `players` is read from the render that changed the signature, so the diff
    // is always against the snapshot immediately before it.
  }, [signature, turnCount]);

  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const timer of pending) clearTimeout(timer);
      pending.clear();
    };
  }, []);

  const byPlayer = new Map<string, CoinDelta[]>();
  for (const delta of deltas) {
    const list = byPlayer.get(delta.playerId);
    if (list) list.push(delta);
    else byPlayer.set(delta.playerId, [delta]);
  }
  return byPlayer;
}
