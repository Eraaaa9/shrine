import type { CardId, LandmarkId, RuleSet } from './cards';
import type { Params } from './i18n';

/** Anything that can move a coin, and so can head a row in the post-game table. */
export type StatKey = CardId | LandmarkId;

/** What one building did for the player over a whole game. */
export interface BuildingStat {
  /** Times it activated for its owner — or, for a landmark, times it was used. */
  hits: number;
  /** Coins it brought in. */
  earned: number;
  /**
   * Coins it took out of this player's pocket. Usually somebody else's
   * restaurant billing them; the Loan Office and the Park can bill their owner.
   */
  lost: number;
  /** Coins paid to build it. */
  spent: number;
}

/** Running ledger of every coin a player took in or handed over. */
export interface PlayerStats {
  turns: number;
  rolls: number;
  /** Sum of every total rolled, so the client can show an average. */
  pips: number;
  earned: number;
  /** The slice of `earned` that came out of the bank; the rest came from opponents. */
  fromBank: number;
  lost: number;
  /** The slice of `lost` that went to the bank; the rest went to opponents. */
  toBank: number;
  spentOnCards: number;
  spentOnLandmarks: number;
  invested: number;
  cardsBought: number;
  /** Most coins held at once. */
  peakCoins: number;
  /** Per-building breakdown, keyed by card or landmark id. */
  byKey: Partial<Record<StatKey, BuildingStat>>;
}

export interface PlayerState {
  id: string;
  name: string;
  isBot: boolean;
  coins: number;
  /** Owned establishments -> number of copies. */
  cards: Partial<Record<CardId, number>>;
  /** Copies currently closed for renovation; they skip their next activation. */
  closed: Partial<Record<CardId, number>>;
  /** Coins invested in the Tech Startup. */
  investment: number;
  landmarks: Record<LandmarkId, boolean>;
  stats: PlayerStats;
}

/** A card effect that is waiting on its owner to decide something. */
export type PendingChoice =
  | 'tv'
  | 'trade'
  | 'demolish'
  | 'moving'
  | 'renovation'
  | 'exhibit';

export type Phase =
  /** Active player must roll. */
  | 'roll'
  /** Radio Tower: active player may re-roll. */
  | 'reroll'
  /** Space Port: active player may nudge the total by 1 either way. */
  | 'spaceport'
  /** Harbor: active player may add 2 to a total of 10+. */
  | 'harbor'
  /** One of the PendingChoice card effects is waiting. */
  | PendingChoice
  /** Active player buys one card / builds one landmark / passes. */
  | 'build'
  /** Tech Startup: active player may invest a coin before the turn ends. */
  | 'invest'
  | 'over';

/**
 * How many lines of history a game keeps. The engine trims to it, and the
 * client trims to it again as it stitches the increments together, so both
 * ends of the wire agree on what "the whole log" is.
 */
export const LOG_LIMIT = 300;

export interface LogEntry {
  id: number;
  /** Translation key; the client renders it in the reader's own language. */
  key: string;
  params?: Params;
  /** Player the line is about, for colouring. */
  who?: string;
  kind?: 'turn' | 'roll' | 'income' | 'build' | 'win';
}

export interface GameState {
  rules: RuleSet;
  players: PlayerState[];
  /** Face-up supply: card id -> copies available to buy. */
  supply: Partial<Record<CardId, number>>;
  /** Face-down draw pile, only used by the variable supply setup. */
  deck: CardId[];
  /** Index into players of whoever is taking the current turn. */
  turn: number;
  turnCount: number;
  phase: Phase;
  dice: number[];
  /** Bumped on every throw so the client can animate a reroll of the same faces. */
  rollId: number;
  /** Dice total after an optional Harbor +2. */
  diceTotal: number;
  harborBonusUsed: boolean;
  spacePortUsed: boolean;
  rerollUsed: boolean;
  /** Amusement Park: the active player rolled doubles and goes again. */
  extraTurn: boolean;
  /** Card effects awaiting a decision, resolved in order. */
  pending: PendingChoice[];
  winnerId: string | null;
  log: LogEntry[];
  rng: number;
  nextLogId: number;
}

export type GameAction =
  | { t: 'roll'; dice: 1 | 2 }
  | { t: 'reroll'; again: boolean }
  | { t: 'spaceport'; delta: -1 | 0 | 1 }
  | { t: 'harbor'; add: boolean }
  | { t: 'tv'; targetId: string }
  | { t: 'trade'; targetId: string; give: CardId; take: CardId }
  | { t: 'demolish'; landmarkId: LandmarkId }
  | { t: 'moving'; targetId: string; give: CardId }
  | { t: 'renovation'; cardId: CardId }
  | { t: 'exhibit'; cardId: CardId | null }
  | { t: 'invest'; amount: 0 | 1 }
  | { t: 'buy'; cardId: CardId }
  | { t: 'landmark'; landmarkId: LandmarkId }
  | { t: 'pass' };
