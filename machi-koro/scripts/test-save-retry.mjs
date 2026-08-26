/**
 * Proves a save survives something briefly standing on the state file.
 *
 * Saving is write-then-rename, and on Windows that rename fails with EPERM for
 * as long as anything denies replacing the destination — a virus scanner
 * reading the file the server just wrote is the usual one, and it lets go in
 * milliseconds. Treating it as fatal throws a room's state away over a hiccup.
 *
 * The block is simulated with the read-only attribute, set here and cleared
 * again by a separate process: same error, same errno, no scanner required.
 * Run with `npm run test:save-retry`.
 */
import { spawn } from 'node:child_process';
import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = mkdtempSync(path.join(tmpdir(), 'machi-koro-save-'));
const STATE = path.join(dir, 'rooms.json');

let failures = 0;
function check(label, condition, detail = '') {
  if (condition) console.log(`  ✓ ${label}`);
  else {
    failures++;
    console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

const room = (code) => ({
  code,
  hostId: 'host',
  rules: { harbor: true, millionaires: true, variableSupply: false },
  seats: [{ id: 'host', name: 'Host', isBot: false, token: 'tok' }],
  game: null,
  chat: [],
  nextChatId: 1,
  lastActivity: Date.now(),
});

const savedCode = () => JSON.parse(readFileSync(STATE, 'utf8')).rooms[0]?.code;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const fwd = (p) => p.split(path.sep).join('/');

/**
 * Deny replacing the state file, and lift it again after `ms` — from another
 * process, because that is where the real thing comes from.  A timer in this
 * process could never fire: saving is synchronous, so a save that waits holds
 * the event loop while it does.
 */
async function blockFrom(ms) {
  const ready = path.join(dir, 'blocking.flag');
  chmodSync(STATE, 0o444);
  const script = [
    `New-Item -ItemType File '${fwd(ready)}' | Out-Null;`,
    `Start-Sleep -Milliseconds ${ms};`,
    `Set-ItemProperty -Path '${fwd(STATE)}' -Name IsReadOnly -Value $false`,
  ].join('');
  const child = spawn('powershell', ['-NoProfile', '-Command', script], { stdio: 'ignore' });
  const done = new Promise((r) => child.on('exit', r));
  for (let waited = 0; waited < 10000 && !existsSync(ready); waited += 20) await sleep(20);
  if (!existsSync(ready)) throw new Error('could not start the blocker');
  rmSync(ready, { force: true });
  return done;
}

async function main() {
  process.env.MACHI_KORO_STATE = STATE;
  const url = new URL(`file:///${path.join(root, 'src/server/store.ts').split(path.sep).join('/')}`);
  const { writeSnapshot } = await import(url.href);

  console.log('saving while the file is blocked:');

  writeSnapshot([room('AAAA')]);
  check('a save with nothing in the way lands', savedCode() === 'AAAA', `file says ${savedCode()}`);

  const blocked = 400;
  const lifted = blockFrom(blocked);
  const started = Date.now();
  writeSnapshot([room('BBBB')]);
  const took = Date.now() - started;
  await lifted;

  check('the save is not lost to a brief block', savedCode() === 'BBBB', `file still says ${savedCode()}`);
  check('it waited the block out', took >= blocked - 100, `returned after ${took}ms`);
  check('without waiting far longer than needed', took < blocked + 1500, `returned after ${took}ms`);

  writeSnapshot([room('CCCC')]);
  check('saves still work afterwards', savedCode() === 'CCCC', `file says ${savedCode()}`);

  // A block that never lifts must not hang the server: give up, keep the last
  // good file, and leave no temporary behind.
  chmodSync(STATE, 0o444);
  const gaveUpAt = Date.now();
  writeSnapshot([room('DDDD')]);
  const gaveUp = Date.now() - gaveUpAt;
  chmodSync(STATE, 0o644);

  check('a block that never lifts is given up on', gaveUp < 5000, `took ${gaveUp}ms`);
  check('and the last good save is still readable', savedCode() === 'CCCC', `file says ${savedCode()}`);
  let leftover = true;
  try {
    readFileSync(`${STATE}.tmp`, 'utf8');
  } catch {
    leftover = false;
  }
  check('with no temporary file left behind', !leftover);
}

main()
  .catch((err) => {
    failures++;
    console.error(err);
  })
  .finally(() => {
    try {
      chmodSync(STATE, 0o644);
      writeFileSync(STATE, '{}', 'utf8');
    } catch {
      /* already gone */
    }
    rmSync(dir, { recursive: true, force: true });
    console.log(failures ? `\n${failures} check(s) failed.` : '\nAll checks passed.');
    process.exit(failures ? 1 : 0);
  });
