/**
 * What the action chain calls a line of the log.
 *
 * A step is named after the card that moved the coins, or the landmark that
 * did. Some lines hold neither — the Urbanist's building bonus pays its coin
 * under nobody's name — and the chain used to reach for a landmark called `''`
 * regardless. Nothing in the table answers to that: the lookup threw, React
 * unmounted the board, and the screen stayed blank for as long as that line
 * headed the turn, which after a winning move is forever.
 *
 * So the choice is made here, where the suite can put every line a real game
 * writes through it, rather than inline at the far end where only a player
 * could find it.
 */
import type { CardId, LandmarkId } from './cards';
import type { LogEntry } from './types';

export type ChainLabel =
  | { as: 'card'; id: CardId }
  | { as: 'landmark'; id: LandmarkId }
  /** Nothing on the line to name it after; the chain says what happened instead. */
  | { as: 'generic' };

export function chainLabel(entry: LogEntry): ChainLabel {
  const card = entry.params?.card;
  if (typeof card === 'string' && card !== '') return { as: 'card', id: card as CardId };
  const landmark = entry.params?.landmark;
  if (typeof landmark === 'string' && landmark !== '') return { as: 'landmark', id: landmark as LandmarkId };
  return { as: 'generic' };
}
