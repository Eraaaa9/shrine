/**
 * Proves the incremental log is faithful, and measures what a game costs.
 *
 * The log used to travel in full on every single move — 300 lines, 34 KB of a
 * 46 KB view — and nothing compressed it. Both ends now carry a cursor, so a
 * view holds only the lines written since that socket last heard from us. That
 * is only safe if the history a client stitches together is the same one the
 * server holds, and if a socket that comes back is given everything again.
 *
 * Plays a real game against a real server, drops mid-game, and checks the
 * stitched history line for line against the full one the fresh socket is
 * sent. Run with `npm run test:traffic`.
 */
import { spawn, type ChildProcess } from 'node:child_process';
import { createServer } from 'node:net';
import { rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocket } from 'ws';
import { botAction } from '../src/shared/bot';
import { mergeLog, type RoomView, type ServerMessage } from '../src/shared/protocol';
import type { LogEntry } from '../src/shared/types';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tsx = path.join(root, 'node_modules/tsx/dist/cli.mjs');
const STATE = path.join(tmpdir(), `machi-koro-traffic-${process.pid}.json`);
/** What a 4-player game cost one client before any of this: about 9.5 MB. */
const BUDGET_KB = 600;

let failures = 0;
function check(label: string, condition: boolean, detail = ''): void {
  if (condition) console.log(`  ✓ ${label}`);
  else {
    failures++;
    console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.on('error', reject);
    probe.listen(0, () => {
      const { port } = probe.address() as { port: number };
      probe.close(() => resolve(port));
    });
  });
}

function startServer(port: number): Promise<ChildProcess> {
  const child = spawn(process.execPath, [tsx, 'src/server/index.ts'], {
    cwd: root,
    env: { ...process.env, PORT: String(port), MACHI_KORO_STATE: STATE },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const output: string[] = [];
  child.stdout!.on('data', (d) => output.push(String(d)));
  child.stderr!.on('data', (d) => output.push(String(d)));

  return new Promise((resolve, reject) => {
    const failed = setTimeout(() => reject(new Error(`server did not start:\n${output.join('')}`)), 20000);
    const wait = setInterval(() => {
      if (output.join('').includes('listening on')) {
        clearInterval(wait);
        clearTimeout(failed);
        resolve(child);
      }
    }, 100);
    child.on('exit', (code) => {
      clearInterval(wait);
      clearTimeout(failed);
      reject(new Error(`server exited with ${code}:\n${output.join('')}`));
    });
  });
}

/**
 * A socket that stitches the log together exactly as the browser client does,
 * and keeps count of what the wire actually carried.
 */
function client(port: number) {
  const ws = new WebSocket(`ws://localhost:${port}/ws`);
  const seen: ServerMessage[] = [];
  let log: LogEntry[] = [];
  let room: RoomView | null = null;
  let updates = 0;

  ws.on('message', (raw) => {
    const message = JSON.parse(String(raw)) as ServerMessage;
    seen.push(message);
    if (message.t !== 'room') return;
    updates++;
    log = mergeLog(log, message.room);
    room = message.room;
  });

  const waitFor = async (predicate: (m: ServerMessage) => boolean, what: string, timeout = 15000) => {
    const deadline = Date.now() + timeout;
    for (;;) {
      const hit = seen.find(predicate);
      if (hit) return hit;
      if (Date.now() > deadline) throw new Error(`timed out waiting for ${what}`);
      await sleep(25);
    }
  };

  return {
    open: () => new Promise<void>((resolve, reject) => (ws.once('open', () => resolve()), ws.once('error', reject))),
    send: (msg: unknown) => ws.send(JSON.stringify(msg)),
    waitFor,
    room: () => room,
    log: () => log,
    updates: () => updates,
    /** Bytes off the wire, so compression counts for what it is worth. */
    bytes: () => (ws as unknown as { _socket?: { bytesRead: number } })._socket?.bytesRead ?? 0,
    extensions: () => ws.extensions,
    close: () => ws.close(),
  };
}

async function main(): Promise<void> {
  rmSync(STATE, { force: true });
  const port = await freePort();
  console.log(`Traffic and log stitching (port ${port})`);
  const server = await startServer(port);

  const alice = client(port);
  await alice.open();
  alice.send({ t: 'create', name: 'Alice', rules: { harbor: true, millionaires: true, variableSupply: true } });
  const joined = await alice.waitFor((m) => m.t === 'joined', 'joined');
  if (joined.t !== 'joined') throw new Error('unreachable');
  const { token, youId } = joined;
  for (let i = 0; i < 3; i++) alice.send({ t: 'addBot' });
  alice.send({ t: 'start' });
  await alice.waitFor((m) => m.t === 'room' && m.room.game !== null, 'the game to start');

  check('the connection negotiated deflate', alice.extensions().includes('permessage-deflate'), alice.extensions() || 'none');

  /**
   * Alice plays her own turns the way the bots play theirs. Nothing moves while
   * the game waits on her, so it only advances as fast as this drives it.
   */
  const play = async (seat: ReturnType<typeof client>, until: () => boolean, limit: number) => {
    const deadline = Date.now() + limit;
    while (!until() && Date.now() < deadline) {
      const game = seat.room()?.game;
      if (game && game.phase !== 'over' && game.players[game.turn].id === youId) {
        const action = botAction(game);
        if (action) seat.send({ t: 'action', action });
      }
      await sleep(30);
    }
  };

  // -- the stitched history is the server's history -------------------------
  await play(alice, () => alice.log().length >= 60, 120000);
  const stitched = alice.log();
  check('the log is being stitched from increments', stitched.length >= 60, `${stitched.length} lines`);
  check(
    'no line went missing on the way',
    stitched.every((entry, i) => i === 0 || entry.id === stitched[i - 1].id + 1),
    'the ids are not contiguous'
  );

  const perUpdate = alice.bytes() / alice.updates();
  check(
    'an update costs a fraction of the full view it replaced',
    perUpdate < 4000,
    `${Math.round(perUpdate)} bytes per update over ${alice.updates()} updates`
  );

  // Drop and come back on a new socket, which the server owes the whole history.
  const code = alice.room()!.code;
  const droppedBytes = alice.bytes();
  alice.close();
  await sleep(200);

  const back = client(port);
  await back.open();
  back.send({ t: 'rejoin', code, token });
  const first = await back.waitFor((m) => m.t === 'room' && m.room.game !== null, 'the room after rejoining');
  if (first.t !== 'room') throw new Error('unreachable');

  check('a fresh socket is sent the history in full, not a tail', first.room.logAppend === false);
  const overlap = back.log().filter((entry) => entry.id <= stitched[stitched.length - 1].id);
  check(
    'the stitched history matches the server line for line',
    overlap.length > 0 && JSON.stringify(overlap) === JSON.stringify(stitched.slice(stitched.length - overlap.length)),
    `${overlap.length} lines compared`
  );

  // -- what a whole game costs ----------------------------------------------
  await play(back, () => back.room()?.game?.phase === 'over', 240000);
  const game = back.room()?.game;
  check('the game played out to a win', game?.phase === 'over', `phase ${game?.phase}`);

  const kb = (droppedBytes + back.bytes()) / 1024;
  const updates = alice.updates() + back.updates();
  console.log(`\n  4 players, ${game?.turnCount} turns, ${updates} updates`);
  console.log(`  one client received ${kb.toFixed(0)} KB — ${Math.round((kb * 1024) / updates)} bytes per update`);
  check(`a whole game costs one client under ${BUDGET_KB} KB`, kb < BUDGET_KB, `${kb.toFixed(0)} KB`);

  back.close();
  server.kill();
  rmSync(STATE, { force: true });
  console.log(failures === 0 ? '\nAll good.' : `\n${failures} failed.`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
