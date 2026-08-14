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
import type { ChatLine } from '../shared/protocol';
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

export function writeSnapshot(rooms: RoomSnapshot[]): void {
  const file: StateFile = { version: VERSION, savedAt: Date.now(), rooms };
  const temporary = `${FILE}.tmp`;
  try {
    mkdirSync(path.dirname(FILE), { recursive: true });
    // Write-then-rename: a crash mid-write leaves the previous file intact
    // rather than a half-written one that would be discarded on boot.
    writeFileSync(temporary, JSON.stringify(file), 'utf8');
    renameSync(temporary, FILE);
  } catch (err) {
    console.error(`Could not save rooms to ${FILE}:`, err);
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
