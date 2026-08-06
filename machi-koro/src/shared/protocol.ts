import type { RuleSet } from './cards';
import type { GameAction, GameState } from './types';

export interface SeatView {
  id: string;
  name: string;
  isBot: boolean;
  connected: boolean;
  isHost: boolean;
}

export interface RoomView {
  code: string;
  hostId: string;
  rules: RuleSet;
  seats: SeatView[];
  /** Null while the room is still in the lobby. */
  game: GameState | null;
  chat: ChatLine[];
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
  | { t: 'error'; message: string };

export const MIN_PLAYERS = 2;
