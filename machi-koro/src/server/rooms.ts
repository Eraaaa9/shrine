import { randomBytes, randomUUID } from 'node:crypto';
import type { WebSocket } from 'ws';
import { DEFAULT_RULES, maxPlayers, type RuleSet } from '../shared/cards';
import { BOT_NAMES, botAction } from '../shared/bot';
import { activePlayer, applyAction, createGame, demolishable, tradeableCards } from '../shared/engine';
import type { ChatLine, RoomView, ServerMessage } from '../shared/protocol';
import { MIN_PLAYERS } from '../shared/protocol';
import type { GameAction, GameState } from '../shared/types';

/** How long a bot "thinks" before acting, so humans can follow along. */
const BOT_DELAY_MS = 1100;
/** A disconnected player's turn is auto-played after this long so games never stall. */
const AUTOPLAY_AFTER_MS = 45_000;
const ROOM_IDLE_MS = 3 * 60 * 60 * 1000;
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export interface Seat {
  id: string;
  name: string;
  isBot: boolean;
  token: string;
  socket: WebSocket | null;
  disconnectedAt: number | null;
}

export class Room {
  readonly code: string;
  hostId = '';
  rules: RuleSet = { ...DEFAULT_RULES };
  seats: Seat[] = [];
  game: GameState | null = null;
  chat: ChatLine[] = [];
  lastActivity = Date.now();
  private nextChatId = 1;
  private timer: NodeJS.Timeout | null = null;

  constructor(code: string) {
    this.code = code;
  }

  // -- seats ---------------------------------------------------------------

  addSeat(name: string, isBot: boolean, socket: WebSocket | null): Seat {
    const seat: Seat = {
      id: randomUUID(),
      name: this.uniqueName(name),
      isBot,
      token: randomBytes(16).toString('hex'),
      socket,
      disconnectedAt: socket ? null : Date.now(),
    };
    this.seats.push(seat);
    if (!this.hostId) this.hostId = seat.id;
    return seat;
  }

  private uniqueName(name: string): string {
    const clean = (name || 'Player').trim().slice(0, 16) || 'Player';
    if (!this.seats.some((s) => s.name.toLowerCase() === clean.toLowerCase())) return clean;
    for (let i = 2; i < 20; i++) {
      const candidate = `${clean} ${i}`;
      if (!this.seats.some((s) => s.name.toLowerCase() === candidate.toLowerCase())) return candidate;
    }
    return `${clean} ${Math.floor(Math.random() * 1000)}`;
  }

  nextBotName(): string {
    const taken = new Set(this.seats.map((s) => s.name));
    return BOT_NAMES.find((n) => !taken.has(n)) ?? `Bot ${this.seats.length + 1}`;
  }

  seat(id: string): Seat | undefined {
    return this.seats.find((s) => s.id === id);
  }

  seatByToken(token: string): Seat | undefined {
    return this.seats.find((s) => s.token === token);
  }

  removeSeat(id: string): void {
    this.seats = this.seats.filter((s) => s.id !== id);
    if (this.hostId === id) {
      this.hostId = this.seats.find((s) => !s.isBot)?.id ?? this.seats[0]?.id ?? '';
    }
  }

  get connectedCount(): number {
    return this.seats.filter((s) => s.socket).length;
  }

  get maxPlayers(): number {
    return maxPlayers(this.rules);
  }

  // -- game ----------------------------------------------------------------

  start(): string | null {
    if (this.game && this.game.phase !== 'over') return 'err.alreadyStarted';
    if (this.seats.length < MIN_PLAYERS) return 'err.needPlayers';
    if (this.seats.length > this.maxPlayers) return 'err.tooManyForRules';
    this.game = createGame(
      this.seats.map((s) => ({ id: s.id, name: s.name, isBot: s.isBot })),
      this.rules
    );
    this.touch();
    return null;
  }

  play(seatId: string, action: GameAction): string | null {
    if (!this.game) return 'err.notStarted';
    const error = applyAction(this.game, seatId, action);
    if (!error) this.touch();
    return error;
  }

  // -- automation ----------------------------------------------------------

  /** Queue a move for a bot, or for a human who has been gone too long. */
  scheduleAuto(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    if (!this.game || this.game.phase === 'over') return;

    const seat = this.seat(activePlayer(this.game).id);
    if (!seat) return;

    if (seat.isBot) {
      this.timer = setTimeout(() => this.runAuto(), BOT_DELAY_MS);
    } else if (seat.disconnectedAt !== null) {
      const wait = AUTOPLAY_AFTER_MS - (Date.now() - seat.disconnectedAt);
      this.timer = setTimeout(() => this.runAuto(), Math.max(1000, wait));
    }
  }

  private runAuto(): void {
    this.timer = null;
    if (!this.game || this.game.phase === 'over') return;

    const seat = this.seat(activePlayer(this.game).id);
    if (!seat) return;
    const stalled = seat.disconnectedAt !== null && Date.now() - seat.disconnectedAt >= AUTOPLAY_AFTER_MS;
    if (!seat.isBot && !stalled) {
      this.scheduleAuto();
      return;
    }
    if (!seat.isBot) {
      this.game.log.push({
        id: this.game.nextLogId++,
        key: 'log.away',
        params: { player: seat.name },
        who: seat.id,
      });
    }

    try {
      const action = botAction(this.game) ?? fallbackAction(this.game);
      let error = applyAction(this.game, seat.id, action);
      if (error) {
        // Never let a bad heuristic wedge the game.
        error = applyAction(this.game, seat.id, fallbackAction(this.game));
        if (error) console.error(`[${this.code}] auto-play stuck in phase ${this.game.phase}: ${error}`);
      }
    } catch (err) {
      console.error(`[${this.code}] auto-play crashed in phase ${this.game.phase}:`, err);
      const rescue = applyAction(this.game, seat.id, { t: 'pass' });
      if (rescue) console.error(`[${this.code}] could not rescue the turn: ${rescue}`);
    }
    this.touch();
    this.broadcast();
  }

  // -- chat / views --------------------------------------------------------

  addChat(from: string, text: string): void {
    const clean = text.trim().slice(0, 200);
    if (!clean) return;
    this.chat.push({ id: this.nextChatId++, from, text: clean });
    if (this.chat.length > 60) this.chat.shift();
    this.touch();
  }

  view(): RoomView {
    return {
      code: this.code,
      hostId: this.hostId,
      rules: this.rules,
      seats: this.seats.map((s) => ({
        id: s.id,
        name: s.name,
        isBot: s.isBot,
        connected: s.socket !== null,
        isHost: s.id === this.hostId,
      })),
      game: this.game,
      chat: this.chat,
    };
  }

  send(seat: Seat, message: ServerMessage): void {
    if (seat.socket && seat.socket.readyState === 1) seat.socket.send(JSON.stringify(message));
  }

  broadcast(): void {
    const payload = JSON.stringify({ t: 'room', room: this.view() } satisfies ServerMessage);
    for (const seat of this.seats) {
      if (seat.socket && seat.socket.readyState === 1) seat.socket.send(payload);
    }
    this.scheduleAuto();
  }

  touch(): void {
    this.lastActivity = Date.now();
  }

  dispose(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }
}

/** A guaranteed-legal action for the current phase, used if the bot misfires. */
function fallbackAction(state: GameState): GameAction {
  const me = activePlayer(state);
  const others = state.players.filter((p) => p.id !== me.id);
  switch (state.phase) {
    case 'roll':
      return { t: 'roll', dice: 1 };
    case 'reroll':
      return { t: 'reroll', again: false };
    case 'harbor':
      return { t: 'harbor', add: false };
    case 'tv':
      return { t: 'tv', targetId: others[0].id };
    case 'trade': {
      const target = others.find((p) => tradeableCards(p).length > 0)!;
      return { t: 'trade', targetId: target.id, give: tradeableCards(me)[0], take: tradeableCards(target)[0] };
    }
    case 'moving':
      return { t: 'moving', targetId: others[0].id, give: tradeableCards(me)[0] };
    case 'demolish':
      return { t: 'demolish', landmarkId: demolishable(state, me)[0] };
    case 'renovation':
      return { t: 'renovation', cardId: 'wheat_field' };
    case 'exhibit':
      return { t: 'exhibit', cardId: null };
    case 'invest':
      return { t: 'invest', amount: 0 };
    default:
      return { t: 'pass' };
  }
}

// ---------------------------------------------------------------------------
// registry
// ---------------------------------------------------------------------------

const rooms = new Map<string, Room>();

export function createRoom(): Room {
  let code = '';
  do {
    code = Array.from({ length: 4 }, () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]).join('');
  } while (rooms.has(code));
  const room = new Room(code);
  rooms.set(code, room);
  return room;
}

export function getRoom(code: string): Room | undefined {
  return rooms.get(code.trim().toUpperCase());
}

export function roomCount(): number {
  return rooms.size;
}

export function sweepRooms(): void {
  const now = Date.now();
  for (const [code, room] of rooms) {
    const empty = room.connectedCount === 0 && now - room.lastActivity > 10 * 60 * 1000;
    if (empty || now - room.lastActivity > ROOM_IDLE_MS) {
      room.dispose();
      rooms.delete(code);
    }
  }
}
