import type { CardId, LandmarkId, RuleSet } from './cards';

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
  /** Harbor: active player may add 2 to a total of 10+. */
  | 'harbor'
  /** One of the PendingChoice card effects is waiting. */
  | PendingChoice
  /** Active player buys one card / builds one landmark / passes. */
  | 'build'
  /** Tech Startup: active player may invest a coin before the turn ends. */
  | 'invest'
  | 'over';

export interface LogEntry {
  id: number;
  text: string;
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
  /** Dice total after an optional Harbor +2. */
  diceTotal: number;
  harborBonusUsed: boolean;
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
