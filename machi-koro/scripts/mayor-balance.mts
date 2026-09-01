/**
 * How fair are the six mayors?  Plays bot-vs-bot games under the default rule
 * set and reports each mayor's win rate against its fair share.
 *
 * The seating is the whole point of the design.  Turn order in Machi Koro is
 * worth real money, and a mayor dealt at random collects a random slice of that
 * advantage, so a naive deal needs a huge sample before the seat noise washes
 * out.  Instead every block plays the same six-mayor ring six times, shifting it
 * by one chair each game: over a block each mayor sits in every seat exactly
 * once and sits out exactly `6 - players` games.  Seat advantage is then
 * identical for all six by construction, and what is left is the mayor.
 *
 *   npm run balance:mayors -- [blocks] [players]
 *
 * The bot knows nothing about mayors, so what this measures is the passive
 * strength of each ability — the floor a human would build on, not the ceiling.
 */
import os from 'node:os';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';
import { MAYORS, type MayorId } from '../src/shared/mayors';
import { DEFAULT_RULES, landmarksFor, type RuleSet } from '../src/shared/cards';
import { botAction } from '../src/shared/bot';
import { activePlayer, applyAction, createGame, type Seat } from '../src/shared/engine';

const ids = MAYORS.map((m) => m.id);

interface Tally {
  games: number;
  wins: number;
  turnsWon: number;
  earned: number;
  landmarks: number;
  ability: number;
}

interface Shard {
  byMayor: Record<string, Tally>;
  bySeat: Tally[];
  played: number;
  unfinished: number;
  totalTurns: number;
}

const blank = (): Tally => ({ games: 0, wins: 0, turnsWon: 0, earned: 0, landmarks: 0, ability: 0 });

/** Small deterministic PRNG, so a re-run of the same block count repeats exactly. */
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x9e3779b9) >>> 0;
    let t = Math.imul(s ^ (s >>> 16), 0x21f0aaad);
    t = Math.imul(t ^ (t >>> 15), 0x735a2d97);
    return ((t ^ (t >>> 15)) >>> 0) / 4294967296;
  };
}

/**
 * Seeded per block rather than per run, so a block always plays the same ring
 * whichever worker happens to draw it.
 */
function ringFor(block: number): MayorId[] {
  const next = rng(0xba1a5ce + block * 0x27d4eb2f);
  const out = ids.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function emptyShard(players: number): Shard {
  return {
    byMayor: Object.fromEntries(ids.map((id) => [id, blank()])),
    bySeat: Array.from({ length: players }, blank),
    played: 0,
    unfinished: 0,
    totalTurns: 0,
  };
}

function runBlocks(from: number, to: number, players: number, rules: RuleSet): Shard {
  const allLandmarks = landmarksFor(rules).map((l) => l.id);
  const shard = emptyShard(players);

  for (let block = from; block < to; block++) {
    const ring = ringFor(block);
    for (let offset = 0; offset < ids.length; offset++) {
      const line: Seat[] = Array.from({ length: players }, (_, i) => ({
        id: `p${i}`,
        name: `P${i}`,
        isBot: true,
        mayor: ring[(i + offset) % ids.length],
      }));
      const state = createGame(line, rules, (block * ids.length + offset) * 7919 + 13);

      let steps = 0;
      while (state.phase !== 'over' && steps < 40000) {
        const me = activePlayer(state);
        const action = botAction(state);
        if (!action) throw new Error(`no action in phase ${state.phase}`);
        const error = applyAction(state, me.id, action);
        if (error) throw new Error(`${JSON.stringify(action)} in ${state.phase}: ${error}`);
        steps++;
      }
      if (state.phase !== 'over') {
        shard.unfinished++;
        continue;
      }

      shard.played++;
      shard.totalTurns += state.turnCount;
      state.players.forEach((p, seat) => {
        const won = p.id === state.winnerId;
        for (const t of [shard.byMayor[p.mayor!], shard.bySeat[seat]]) {
          t.games++;
          if (won) {
            t.wins++;
            t.turnsWon += state.turnCount;
          }
          t.earned += p.stats.earned;
          t.landmarks += allLandmarks.filter((l) => p.landmarks[l]).length;
          t.ability += p.stats.byKey[p.mayor!]?.earned ?? 0;
        }
      });
    }
  }
  return shard;
}

if (!isMainThread) {
  const { from, to, players, rules } = workerData as { from: number; to: number; players: number; rules: RuleSet };
  parentPort!.postMessage(runBlocks(from, to, players, rules));
} else {
  const BLOCKS = Number(process.argv[2] ?? 500);
  const PLAYERS = Number(process.argv[3] ?? 4);
  const RULES: RuleSet = { ...DEFAULT_RULES };
  const threads = Math.max(1, Math.min(os.cpus().length - 1, BLOCKS));
  const share = 1 / PLAYERS;
  const started = Date.now();
  const total = emptyShard(PLAYERS);

  const fold = (shard: Shard): void => {
    total.played += shard.played;
    total.unfinished += shard.unfinished;
    total.totalTurns += shard.totalTurns;
    for (const id of ids) {
      for (const k of Object.keys(total.byMayor[id]) as (keyof Tally)[]) {
        total.byMayor[id][k] += shard.byMayor[id][k];
      }
    }
    shard.bySeat.forEach((t, i) => {
      for (const k of Object.keys(t) as (keyof Tally)[]) total.bySeat[i][k] += t[k];
    });
  };

  const here = fileURLToPath(import.meta.url);
  const cuts = Array.from({ length: threads + 1 }, (_, i) => Math.round((BLOCKS * i) / threads));
  await Promise.all(
    Array.from(
      { length: threads },
      (_, i) =>
        new Promise<void>((resolve, reject) => {
          const worker = new Worker(here, {
            workerData: { from: cuts[i], to: cuts[i + 1], players: PLAYERS, rules: RULES },
            execArgv: ['--import', 'tsx'],
          });
          worker.on('message', fold);
          worker.on('error', reject);
          worker.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`worker exited ${code}`))));
        })
    )
  );

  /** Wilson score interval — honest at the sample sizes a short run produces. */
  const wilson = (wins: number, n: number): [number, number] => {
    if (n === 0) return [0, 0];
    const z = 1.96;
    const p = wins / n;
    const d = 1 + (z * z) / n;
    const centre = p + (z * z) / (2 * n);
    const half = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
    return [(centre - half) / d, (centre + half) / d];
  };

  const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
  const rows = ids
    .map((id) => ({ id, t: total.byMayor[id] }))
    .sort((a, b) => b.t.wins / b.t.games - a.t.wins / a.t.games);

  console.log(
    `\n${total.played} games (${BLOCKS} blocks x 6) at ${PLAYERS} players on ${threads} threads, ` +
      `default rules, ${((Date.now() - started) / 1000).toFixed(1)}s` +
      (total.unfinished ? `  — ${total.unfinished} unfinished` : '')
  );
  console.log(
    `fair share ${pct(share)}, average game ${(total.totalTurns / Math.max(1, total.played)).toFixed(1)} turns\n`
  );
  console.log('mayor            games    win%   95% CI          vs fair   turns/win  earned  landmarks  ability');
  for (const { id, t } of rows) {
    const rate = t.wins / t.games;
    const [lo, hi] = wilson(t.wins, t.games);
    const delta = (rate - share) * 100;
    const clear = lo > share ? ' ↑' : hi < share ? ' ↓' : '  ';
    console.log(
      `${id.padEnd(15)} ${String(t.games).padStart(6)}  ${pct(rate).padStart(6)}   ` +
        `${pct(lo).padStart(5)}-${pct(hi).padEnd(6)}  ${(delta >= 0 ? '+' : '') + delta.toFixed(1)}pp${clear}  ` +
        `${(t.turnsWon / Math.max(1, t.wins)).toFixed(1).padStart(8)}  ${(t.earned / t.games).toFixed(1).padStart(6)}  ` +
        `${(t.landmarks / t.games).toFixed(2).padStart(9)}  ${(t.ability / t.games).toFixed(1).padStart(7)}`
    );
  }

  console.log('\nseat check (turn-order advantage only — the design spreads it evenly over the six)');
  total.bySeat.forEach((t, i) => {
    const [lo, hi] = wilson(t.wins, t.games);
    console.log(`  seat ${i}  ${pct(t.wins / t.games).padStart(6)}   ${pct(lo)}-${pct(hi)}`);
  });

  // Chi-square against a flat 1/players, so "is anything off at all?" gets one number.
  const expected = (rows.reduce((sum, r) => sum + r.t.games, 0) * share) / rows.length;
  const chi = rows.reduce((sum, r) => sum + (r.t.wins - expected) ** 2 / expected, 0);
  console.log(`\nchi-square vs flat: ${chi.toFixed(1)} on 5 df (11.07 = 5% significance, 15.09 = 1%)`);
}
