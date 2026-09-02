/**
 * Where the coins in a log line went.
 *
 * The client animates coins flying between purses, and it used to read that out
 * of the log's translation params — `coins`, `payer`, `receiver`, none of which
 * the engine has ever written. Every flight fell back to two coins and the
 * player-to-player case never fired at all. So the mapping lives here instead of
 * being guessed at the far end, and `simulate` fails on a log line that names an
 * amount without appearing below: a new money line cannot go quietly unanimated,
 * or — worse — animate backwards.
 *
 * The amount is always the line's own `amount`, or its `cost` for a purchase.
 * `who` is the player the line is about, and `from` the one who paid them.
 */
import type { LogEntry } from './types';

export interface CoinFlow {
  amount: number;
  /** Whose purse the coins leave; the bank, or the table at large, when unset. */
  fromId?: string;
  /** Whose purse they land in; the bank when unset. */
  toId?: string;
}

/** The bank, or every other player at once, pays the player the line is about. */
const INBOUND = new Set([
  'log.gets',
  'log.getsVia',
  'log.stadium',
  'log.publisher',
  'log.taxOffice',
  'log.techStartup',
  'log.renovation',
  'log.eventLuckySeven',
  'log.eventAntiMonopolyAid',
  'log.mayorAgronomist',
  'log.mayorBanker',
  'log.mayorUrbanist',
  // A card that pays to be taken: the buyer collects rather than spends.
  'log.buyPaid',
]);

/** The player the line is about pays the bank. */
const OUTBOUND = new Set(['log.pays', 'log.paysVia', 'log.eventTaxHike']);

/** One player pays another — `from` pays, `who` is paid. */
const TRANSFER = new Set(['log.redTake', 'log.redTakeBroke', 'log.redTakeProtected', 'log.tvTake']);

/** A purchase: the coins are in `cost`, not `amount`. */
const SPEND = new Set(['log.buy', 'log.buildLandmark']);

/** Every line that moves coins, for the check in `simulate`. */
export const COIN_LOG_KEYS = new Set([...INBOUND, ...OUTBOUND, ...TRANSFER, ...SPEND]);

function count(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;
}

/**
 * A line that mentions coins without moving any — the Park levels the table out
 * and names the share, an investment names its running total — so a line naming
 * one of these is not an unclassified money line.
 */
export function namesCoinsWithoutMoving(entry: LogEntry): boolean {
  return entry.key === 'log.park' || entry.key === 'log.invest';
}

export function coinFlow(entry: LogEntry): CoinFlow | null {
  const key = entry.key;
  if (SPEND.has(key)) {
    const amount = count(entry.params?.cost);
    return amount > 0 ? { amount, fromId: entry.who } : null;
  }
  const amount = count(entry.params?.amount);
  if (amount === 0) return null;
  if (TRANSFER.has(key)) return { amount, fromId: entry.from, toId: entry.who };
  if (OUTBOUND.has(key)) return { amount, fromId: entry.who };
  if (INBOUND.has(key)) return { amount, toId: entry.who };
  return null;
}
