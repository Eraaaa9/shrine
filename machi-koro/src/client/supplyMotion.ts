import { useEffect, useRef, useState } from 'react';

/**
 * What just happened to a stack on the board:
 *  - `gone`  the last copy was bought, so the stack is leaving the offer
 *  - `fresh` the stack was drawn from the deck and is new on the board
 *  - `pulse` a copy was bought or drawn, but the stack stays
 */
export type CardMark = 'gone' | 'fresh' | 'pulse';

/** How long each mark stays on the card, in step with the CSS animations. */
const LINGER: Record<CardMark, number> = { gone: 2600, fresh: 3000, pulse: 1000 };

interface Mark {
  key: number;
  id: string;
  kind: CardMark;
}

/** Cheap change detector: the supply is a small flat map of counts. */
function stamp(supply: Record<string, number>): string {
  return Object.keys(supply)
    .sort()
    .map((id) => `${id}:${supply[id]}`)
    .join(',');
}

/**
 * Watches the variable-supply board and reports what changed since the last
 * update, so the cards can show it: bought-out stacks linger for a beat on
 * their way out, and stacks drawn from the deck arrive with a flourish.
 *
 * The first snapshot is only remembered, never marked — joining a game in
 * progress should show the board as it stands, not deal it out again.
 */
export default function useSupplyMotion(supply: Record<string, number>, enabled: boolean): Map<string, CardMark> {
  const [marks, setMarks] = useState<Mark[]>([]);
  const previous = useRef<Record<string, number> | null>(null);
  const nextKey = useRef(1);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());

  const signature = enabled ? stamp(supply) : '';

  useEffect(() => {
    if (!enabled) return;
    const before = previous.current;
    previous.current = { ...supply };
    if (!before) return;

    const fresh: Mark[] = [];
    for (const id of new Set([...Object.keys(before), ...Object.keys(supply)])) {
      const was = before[id] ?? 0;
      const now = supply[id] ?? 0;
      if (was === now) continue;
      const kind: CardMark = now <= 0 ? 'gone' : was <= 0 ? 'fresh' : 'pulse';
      fresh.push({ key: nextKey.current++, id, kind });
    }
    if (fresh.length === 0) return;

    setMarks((current) => [...current, ...fresh]);
    for (const mark of fresh) {
      const timer = setTimeout(() => {
        timers.current.delete(timer);
        setMarks((current) => current.filter((m) => m.key !== mark.key));
      }, LINGER[mark.kind]);
      timers.current.add(timer);
    }
    // `supply` is read from the render that changed the signature, so the diff
    // is always against the snapshot right before it.
  }, [signature, enabled]);

  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const timer of pending) clearTimeout(timer);
      pending.clear();
    };
  }, []);

  // Marks are appended in order, so a stack that ran out and was redrawn in the
  // same update ends up showing the newer of the two.
  const byCard = new Map<string, CardMark>();
  for (const mark of marks) byCard.set(mark.id, mark.kind);
  return byCard;
}
