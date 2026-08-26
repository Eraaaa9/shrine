/**
 * Rooms on disk, so a server restart does not throw away games in progress.
 *
 * Clients already hold a rejoin token and retry the socket on their own, so the
 * only thing missing across a restart was the state itself. The whole registry
 * is small (a few kB per game) and rewritten as one atomic file — cheap enough
 * that there is no reason to reach for a database.
 */
import { mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { RuleSet } from '../shared/cards';
import type { BotLevel, ChatLine } from '../shared/protocol';
import type { GameState } from '../shared/types';

/** Bumped when the shape below changes. An older file is discarded, not migrated. */
const VERSION = 3;

/** Sockets and disconnect timers are runtime-only; everything else survives. */
export interface SeatSnapshot {
  id: string;
  name: string;
  isBot: boolean;
  token: string;
}

export interface RoomSnapshot {
  code: string;
  hostId: string;
  rules: RuleSet;
  /**
   * Absent in files written before bot difficulty existed. It reads back as the
   * default, which is what those rooms were playing, so there is nothing to
   * migrate and no reason to throw a game in progress away over it.
   */
  botLevel?: BotLevel;
  seats: SeatSnapshot[];
  game: GameState | null;
  chat: ChatLine[];
  nextChatId: number;
  lastActivity: number;
}

interface StateFile {
  version: number;
  savedAt: number;
  rooms: RoomSnapshot[];
}

const here = path.dirname(fileURLToPath(import.meta.url));
const FILE = process.env.MACHI_KORO_STATE ?? path.resolve(here, '../../.data/rooms.json');

/** Enough of a check that a truncated or hand-edited file cannot crash the engine. */
function looksLikeRoom(value: unknown): value is RoomSnapshot {
  const room = value as Partial<RoomSnapshot> | null;
  return (
    !!room &&
    typeof room.code === 'string' &&
    room.code.length > 0 &&
    Array.isArray(room.seats) &&
    room.seats.every((s) => s && typeof s.id === 'string' && typeof s.token === 'string') &&
    (room.game === null || (typeof room.game === 'object' && Array.isArray(room.game?.players))) &&
    Array.isArray(room.chat)
  );
}

export function readSnapshot(): RoomSnapshot[] {
  let raw: string;
  try {
    raw = readFileSync(FILE, 'utf8');
  } catch (err) {
    // A missing file is the normal first-run case; anything else is worth saying.
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.error(`Could not read ${FILE}:`, err);
    }
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as StateFile;
    if (parsed.version !== VERSION) {
      console.log(`Ignoring ${FILE}: written by format v${parsed.version}, this build wants v${VERSION}.`);
      return [];
    }
    const rooms = (parsed.rooms ?? []).filter(looksLikeRoom);
    const skipped = (parsed.rooms ?? []).length - rooms.length;
    if (skipped > 0) console.error(`Skipped ${skipped} unreadable room(s) in ${FILE}.`);
    return rooms;
  } catch (err) {
    // Never let a corrupt file stop the server from booting.
    console.error(`Could not parse ${FILE}, starting with no rooms:`, err);
    return [];
  }
}

/**
 * Waits between attempts at the rename below, and by its length the point at
 * which the save is given up on — a little under a second in total.
 *
 * Windows refuses to replace a file that anything else is standing on, and
 * something usually is: a virus scanner reads what was just written, and while
 * it does the rename comes back EPERM.  The hold is over in milliseconds, so
 * the first retry almost always carries it.  Waiting is worth it because the
 * alternative is throwing a room's state away over a hiccup, but it is capped
 * because a save runs on the server's own thread and a permanent block — a
 * read-only file, a directory in the way — must not stop the game.
 */
const RENAME_WAITS = [5, 15, 40, 100, 250, 500];

/** Codes Windows reports for "someone is on this file"; all of them pass. */
const TRANSIENT = new Set(['EPERM', 'EACCES', 'EBUSY']);

/** Block the thread. Saves are synchronous, including the one on shutdown. */
function pause(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function publish(temporary: string): void {
  for (let attempt = 0; ; attempt++) {
    try {
      renameSync(temporary, FILE);
      return;
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code ?? '';
      if (attempt >= RENAME_WAITS.length || !TRANSIENT.has(code)) throw err;
      pause(RENAME_WAITS[attempt]);
    }
  }
}

export function writeSnapshot(rooms: RoomSnapshot[]): void {
  const file: StateFile = { version: VERSION, savedAt: Date.now(), rooms };
  const temporary = `${FILE}.tmp`;
  try {
    mkdirSync(path.dirname(FILE), { recursive: true });
    // Write-then-rename: a crash mid-write leaves the previous file intact
    // rather than a half-written one that would be discarded on boot.
    writeFileSync(temporary, JSON.stringify(file), 'utf8');
    publish(temporary);
  } catch (err) {
    // One line rather than a stack: this fires on a timer, so a lasting problem
    // would otherwise fill the console with the same trace every few seconds.
    const e = err as NodeJS.ErrnoException;
    console.error(`Could not save rooms to ${FILE}: ${e.code ?? 'failed'} on ${e.syscall ?? 'write'}.`);
    try {
      unlinkSync(temporary);
    } catch {
      /* nothing to clean up */
    }
  }
}

export function stateFile(): string {
  return FILE;
}
