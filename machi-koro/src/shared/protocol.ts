import type { RuleSet } from './cards';
import type { Params } from './i18n';
import { LOG_LIMIT, type GameAction, type GameState, type LogEntry } from './types';

/**
 * How hard the bots play. `casual` is the hand-written strategy the bot shipped
 * with; `trained` is what self-play produced, and beats it by a wide margin —
 * see TRAINING.md. Anything else in the file is read as `trained`.
 */
export type BotLevel = 'casual' | 'trained';
export const BOT_LEVELS: BotLevel[] = ['casual', 'trained'];
export const DEFAULT_BOT_LEVEL: BotLevel = 'trained';

export function normaliseBotLevel(value: unknown): BotLevel {
  return value === 'casual' ? 'casual' : DEFAULT_BOT_LEVEL;
}

export interface SeatView {
  id: string;
  name: string;
  isBot: boolean;
  connected: boolean;
  isHost: boolean;
  /**
   * When this seat dropped, on the server's clock, or null while it is here.
   * The client counts the seat's grace period down from it.
   */
  awaySince: number | null;
}

export interface RoomView {
  code: string;
  hostId: string;
  rules: RuleSet;
  botLevel: BotLevel;
  seats: SeatView[];
  /** Null while the room is still in the lobby. */
  game: GameState | null;
  /**
   * Whether `game.log` carries only the lines written since this client's last
   * view, to be appended to the ones it already has, rather than the whole
   * history. The server sends the history in full to a socket it has not
   * spoken to yet — and to every socket when a fresh game restarts the ids —
   * so a client never has to ask for a gap to be filled.
   */
  logAppend: boolean;
  chat: ChatLine[];
  /** The server's clock as this view was built, so countdowns survive a skewed one. */
  now: number;
  /** How long a dropped player's turn waits before the server plays it for them. */
  autoplayAfterMs: number;
}

export interface ChatLine {
  id: number;
  from: string;
  text: string;
}

export type ClientMessage =
  | { t: 'create'; name: string; rules: RuleSet }
  | { t: 'join'; code: string; name: string }
  | { t: 'rejoin'; code: string; token: string }
  | { t: 'setRules'; rules: RuleSet }
  | { t: 'setBotLevel'; level: BotLevel }
  | { t: 'addBot' }
  | { t: 'kick'; playerId: string }
  | { t: 'start' }
  | { t: 'action'; action: GameAction }
  | { t: 'rematch' }
  | { t: 'chat'; text: string }
  | { t: 'leave' };

export type ServerMessage =
  | { t: 'joined'; code: string; youId: string; token: string }
  | { t: 'room'; room: RoomView }
  | { t: 'left' }
  /** Errors travel as translation keys so each client shows them in its own language. */
  | { t: 'error'; key: string; params?: Params };

export const MIN_PLAYERS = 2;

/**
 * The full history a client should be holding once `view` arrives, given what
 * it held before. Increments are appended and trimmed to the same cap the
 * engine keeps, so the stitched log matches the server's line for line; a view
 * that added nothing hands `held` straight back, keeping the array identity a
 * React render can lean on.
 */
export function mergeLog(held: LogEntry[], view: RoomView): LogEntry[] {
  if (!view.game) return [];
  if (!view.logAppend) return view.game.log;
  if (view.game.log.length === 0) return held;
  const merged = [...held, ...view.game.log];
  return merged.length > LOG_LIMIT ? merged.slice(merged.length - LOG_LIMIT) : merged;
}
