/**
 * Proves a game in progress survives a server restart.
 *
 * Starts a real server on a scratch state file, plays a turn, kills the process,
 * starts it again and rejoins with the token the client would have kept — then
 * checks the board came back exactly as it was left. Run with `npm run test:restart`.
 */
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocket } from 'ws';
import { mergeLog } from '../src/shared/protocol';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tsx = path.join(root, 'node_modules/tsx/dist/cli.mjs');
const STATE = path.join(tmpdir(), `machi-koro-restart-${process.pid}.json`);

let failures = 0;
function check(label, condition, detail = '') {
  if (condition) console.log(`  ✓ ${label}`);
  else {
    failures++;
    console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function freePort() {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.on('error', reject);
    probe.listen(0, () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });
}

function startServer(port) {
  const child = spawn(process.execPath, [tsx, 'src/server/index.ts'], {
    cwd: root,
    env: { ...process.env, PORT: String(port), MACHI_KORO_STATE: STATE },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const output = [];
  child.stdout.on('data', (d) => output.push(String(d)));
  child.stderr.on('data', (d) => output.push(String(d)));

  return new Promise((resolve, reject) => {
    const failed = setTimeout(() => reject(new Error(`server did not start:\n${output.join('')}`)), 20000);
    const wait = setInterval(() => {
      if (output.join('').includes('listening on')) {
        clearInterval(wait);
        clearTimeout(failed);
        resolve({ child, output });
      }
    }, 100);
    child.on('exit', (code) => {
      clearInterval(wait);
      clearTimeout(failed);
      reject(new Error(`server exited with ${code}:\n${output.join('')}`));
    });
  });
}

function stopServer(child) {
  return new Promise((resolve) => {
    child.once('exit', resolve);
    child.kill();
  });
}

/** A socket that records every server message, with a helper to await one. */
function client(port) {
  const ws = new WebSocket(`ws://localhost:${port}/ws`);
  const seen = [];
  // Room views carry only the log lines written since this socket last heard
  // from the server, so the history is stitched here exactly as the browser
  // stitches it — see `mergeLog`.
  let log = [];
  ws.on('message', (raw) => {
    const message = JSON.parse(String(raw));
    seen.push(message);
    if (message.t === 'room') log = mergeLog(log, message.room);
  });

  const waitFor = async (predicate, what, timeout = 5000) => {
    const deadline = Date.now() + timeout;
    for (;;) {
      const hit = seen.find(predicate);
      if (hit) return hit;
      if (Date.now() > deadline) throw new Error(`timed out waiting for ${what}: ${JSON.stringify(seen)}`);
      await sleep(25);
    }
  };

  return {
    ws,
    seen,
    open: () => new Promise((resolve, reject) => (ws.once('open', resolve), ws.once('error', reject))),
    send: (msg) => ws.send(JSON.stringify(msg)),
    waitFor,
    /** The most recent room view, which is the one the UI would be showing. */
    latestRoom: () => [...seen].reverse().find((m) => m.t === 'room')?.room,
    /** The whole history this socket has heard, not just the newest slice. */
    log: () => log,
    close: () => ws.close(),
  };
}

async function main() {
  rmSync(STATE, { force: true });
  const port = await freePort();

  // -- first run -----------------------------------------------------------
  console.log(`Restart persistence (port ${port})`);
  let server = await startServer(port);

  const alice = client(port);
  await alice.open();
  alice.send({ t: 'create', name: 'Alice', rules: { harbor: true, millionaires: true, variableSupply: false } });
  const joined = await alice.waitFor((m) => m.t === 'joined', 'joined');
  alice.send({ t: 'addBot' });
  alice.send({ t: 'start' });

  // Turn order is drawn at random, so the bot may take several turns first.
  // Waiting for Alice's own roll prompt leaves the game genuinely idle: nothing
  // moves until a human acts, which is the only moment a snapshot is stable.
  const idle = (m) =>
    m.t === 'room' && m.room.game && m.room.game.phase === 'roll' && m.room.game.players[m.room.game.turn].id === joined.youId;
  await alice.waitFor(idle, "Alice's turn", 30000);

  // The save is debounced, so give it a beat to reach disk before pulling the plug.
  await sleep(2500);

  const before = alice.latestRoom();
  const beforeLog = alice.log();
  check('a game is running before the restart', before.game != null && before.game.phase !== 'over');
  check('the room has both seats', before.seats.length === 2, `${before.seats.length} seats`);
  check('the game is waiting on the human', before.game.players[before.game.turn].id === joined.youId);

  alice.close();
  await stopServer(server.child);

  // -- second run ----------------------------------------------------------
  server = await startServer(port);
  check('the restarted server reports what it restored', server.output.join('').includes('Restored 1 room'));

  const returning = client(port);
  await returning.open();
  returning.send({ t: 'rejoin', code: joined.code, token: joined.token });
  const rejoined = await returning.waitFor((m) => m.t === 'joined', 'the rejoin to be accepted');
  check('the seat is the same one', rejoined.youId === joined.youId, `${rejoined.youId} vs ${joined.youId}`);

  await returning.waitFor((m) => m.t === 'room', 'the restored room');
  const after = returning.latestRoom();
  const afterLog = returning.log();

  check('the game came back', after.game != null);
  check('same turn number', after.game.turnCount === before.game.turnCount, `${after.game.turnCount} vs ${before.game.turnCount}`);
  check('same phase', after.game.phase === before.game.phase, `${after.game.phase} vs ${before.game.phase}`);
  check('same log', afterLog.length === beforeLog.length, `${afterLog.length} vs ${beforeLog.length}`);
  check(
    'same coins',
    JSON.stringify(after.game.players.map((p) => p.coins)) === JSON.stringify(before.game.players.map((p) => p.coins)),
    `${after.game.players.map((p) => p.coins)} vs ${before.game.players.map((p) => p.coins)}`
  );
  check(
    'same cards on the board',
    JSON.stringify(after.game.supply) === JSON.stringify(before.game.supply)
  );
  check('the dice roll survived', after.game.rng === before.game.rng, 'rng state differs, so future rolls would diverge');
  check('rules survived', JSON.stringify(after.rules) === JSON.stringify(before.rules));
  check('the host is still the host', after.hostId === before.hostId);

  // The game must still be playable, not just readable: the restored seat has to
  // still own its turn, and the engine has to accept a move against the state.
  const lastId = afterLog[afterLog.length - 1].id;
  returning.send({ t: 'action', action: { t: 'roll', dice: 1 } });
  const played = await returning
    .waitFor((m) => m.t === 'room' && m.room.game.log.some((entry) => entry.id > lastId), 'the roll to land')
    .catch(() => null);
  const refused = returning.seen.find((m) => m.t === 'error');
  check('the restored game accepts moves', played != null, refused ? `server said ${refused.key}` : 'nothing was logged');

  returning.close();
  await stopServer(server.child);
  rmSync(STATE, { force: true });

  console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) failed.`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  rmSync(STATE, { force: true });
  process.exit(1);
});
