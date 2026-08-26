import { randomBytes, randomUUID } from 'node:crypto';
import type { WebSocket } from 'ws';
import { DEFAULT_RULES, maxPlayers, type RuleSet } from '../shared/cards';
import { BOT_NAMES, botAction } from '../shared/bot';
import { BASELINE, weightsFor, type BotWeights } from '../shared/bot-weights';
import { activePlayer, applyAction, createGame, demolishable, tradeableCards } from '../shared/engine';
import type { BotLevel, ChatLine, RoomView, ServerMessage } from '../shared/protocol';
import { DEFAULT_BOT_LEVEL, MIN_PLAYERS, normaliseBotLevel } from '../shared/protocol';
import type { GameAction, GameState } from '../shared/types';
import { readSnapshot, stateFile, writeSnapshot, type RoomSnapshot } from './store';

/**
 * How long a bot pauses before acting, so humans can follow along.
 *
 * A bot's turn is not one decision but an average of two and a half and as many
 * as seven — roll, re-roll, Space Port, Harbor, a card effect, build, invest —
 * and charging every one of them the same full beat made a three-bot round take
 * eight seconds of watching nothing.
 *
 * Only the throw is worth waiting for: the dice tumble for about 600ms in the
 * browser, and the total is the one thing at the table nobody can predict.
 * What the bot then does with it is written into the log as it happens, so it
 * can go at a glance.
 */
const BOT_THINK_MS = 200;
const BOT_AFTER_ROLL_MS = 600;
const BOT_STEP_MS = 200;
/** A disconnected player's turn is auto-played after this long so games never stall. */
export const AUTOPLAY_AFTER_MS = 45_000;
const ROOM_IDLE_MS = 3 * 60 * 60 * 1000;
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
/** Saves are batched: a busy turn touches the room several times in a few ms. */
const SAVE_DEBOUNCE_MS = 1500;

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
  botLevel: BotLevel = DEFAULT_BOT_LEVEL;
  seats: Seat[] = [];
  game: GameState | null = null;
  chat: ChatLine[] = [];
  lastActivity = Date.now();
  private nextChatId = 1;
  private timer: NodeJS.Timeout | null = null;
  /**
   * The throw the last automatic move was taken on top of. Only the first step
   * after a fresh `rollId` has to wait for the dice to land — and it is tracked
   * here rather than in `scheduleAuto`, which runs again on every broadcast, so
   * that somebody sending a chat message cannot spend the pause on their behalf.
   */
  private rollPlayedThrough = -1;

  constructor(code: string) {
    this.code = code;
  }

  // -- persistence ---------------------------------------------------------

  snapshot(): RoomSnapshot {
    return {
      code: this.code,
      hostId: this.hostId,
      rules: this.rules,
      botLevel: this.botLevel,
      seats: this.seats.map((s) => ({ id: s.id, name: s.name, isBot: s.isBot, token: s.token })),
      game: this.game,
      chat: this.chat,
      nextChatId: this.nextChatId,
      lastActivity: this.lastActivity,
    };
  }

  static restore(snap: RoomSnapshot): Room {
    const room = new Room(snap.code);
    room.hostId = snap.hostId;
    room.rules = snap.rules;
    room.botLevel = normaliseBotLevel(snap.botLevel);
    room.game = snap.game;
    room.chat = snap.chat;
    room.nextChatId = snap.nextChatId;
    room.lastActivity = snap.lastActivity;
    room.seats = snap.seats.map((s) => ({
      ...s,
      socket: null,
      // Everyone is disconnected after a restart. Dating that to now rather than
      // to the save gives players the full grace period to come back before a
      // stalled turn is auto-played.
      disconnectedAt: Date.now(),
    }));
    return room;
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
    // Drawn at random rather than in list order, so you are not sat down with the
    // same four opponents every game.
    const free = BOT_NAMES.filter((n) => !taken.has(n));
    if (free.length === 0) return `Bot ${this.seats.length + 1}`;
    return free[Math.floor(Math.random() * free.length)];
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

  /**
   * The strategy this room's bots play. A human who has dropped is auto-played
   * with the same weights — they are getting a favour, not an opponent, so the
   * casual setting applies to them too.
   */
  private botWeights(): BotWeights {
    return this.botLevel === 'casual' ? BASELINE : weightsFor(this.rules);
  }

  /**
   * How long to wait before the next automatic move. The pause that follows a
   * throw has to cover the dice animation, or the board would change while they
   * were still tumbling; the rest of the turn does not.
   */
  private botPause(): number {
    if (!this.game) return BOT_STEP_MS;
    if (this.game.phase === 'roll') return BOT_THINK_MS;
    return this.game.rollId === this.rollPlayedThrough ? BOT_STEP_MS : BOT_AFTER_ROLL_MS;
  }

  /** Queue a move for a bot, or for a human who has been gone too long. */
  scheduleAuto(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    if (!this.game || this.game.phase === 'over') return;

    const seat = this.seat(activePlayer(this.game).id);
    if (!seat) return;

    if (seat.isBot) {
      this.timer = setTimeout(() => this.runAuto(), this.botPause());
    } else if (seat.disconnectedAt !== null) {
      const left = AUTOPLAY_AFTER_MS - (Date.now() - seat.disconnectedAt);
      // Their grace period comes first; once it is spent the rest of the turn
      // is played out at the bots' pace rather than a flat second a step.
      this.timer = setTimeout(() => this.runAuto(), Math.max(this.botPause(), left));
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
    // Whatever happens below happens after this throw has had its moment.
    this.rollPlayedThrough = this.game.rollId;
    if (!seat.isBot) {
      this.game.log.push({
        id: this.game.nextLogId++,
        key: 'log.away',
        params: { player: seat.name },
        who: seat.id,
      });
    }

    try {
      const action = botAction(this.game, this.botWeights()) ?? fallbackAction(this.game);
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
      botLevel: this.botLevel,
      seats: this.seats.map((s) => ({
        id: s.id,
        name: s.name,
        isBot: s.isBot,
        connected: s.socket !== null,
        isHost: s.id === this.hostId,
        awaySince: s.disconnectedAt,
      })),
      game: this.game,
      chat: this.chat,
      // Sent alongside the timestamps above rather than left to the browser:
      // a client whose clock is minutes out would otherwise show a countdown
      // that is already finished, or one that never starts.
      now: Date.now(),
      autoplayAfterMs: AUTOPLAY_AFTER_MS,
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
    // Every state change ends in a broadcast, so this is the one hook that
    // cannot be forgotten when a new message type is added.
    markDirty();
  }

  touch(): void {
    this.lastActivity = Date.now();
    markDirty();
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

let saveTimer: NodeJS.Timeout | null = null;

function markDirty(): void {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    saveRooms();
  }, SAVE_DEBOUNCE_MS);
  // Never hold the process open just to write a save.
  saveTimer.unref();
}

/** Write the registry out now, cancelling any batched save. */
export function saveRooms(): void {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  writeSnapshot([...rooms.values()].map((room) => room.snapshot()));
}

/**
 * Rebuild the registry from disk. Rooms that were already past their idle
 * cut-off when the server went down are dropped rather than resurrected.
 */
export function loadRooms(): void {
  const now = Date.now();
  let expired = 0;
  for (const snap of readSnapshot()) {
    if (now - snap.lastActivity > ROOM_IDLE_MS) {
      expired++;
      continue;
    }
    rooms.set(snap.code, Room.restore(snap));
  }
  if (rooms.size > 0 || expired > 0) {
    const games = [...rooms.values()].filter((r) => r.game && r.game.phase !== 'over').length;
    console.log(
      `Restored ${rooms.size} room(s), ${games} mid-game, from ${stateFile()}` +
        (expired > 0 ? ` (${expired} expired)` : '')
    );
  }
}

export function createRoom(): Room {
  let code = '';
  do {
    code = Array.from({ length: 4 }, () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]).join('');
  } while (rooms.has(code));
  const room = new Room(code);
  rooms.set(code, room);
  markDirty();
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
  let swept = 0;
  for (const [code, room] of rooms) {
    const empty = room.connectedCount === 0 && now - room.lastActivity > 10 * 60 * 1000;
    if (empty || now - room.lastActivity > ROOM_IDLE_MS) {
      room.dispose();
      rooms.delete(code);
      swept++;
    }
  }
  if (swept > 0) markDirty();
}
