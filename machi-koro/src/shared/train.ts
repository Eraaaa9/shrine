/**
 * Self-play training for the bots.  Run with `npm run train`.
 *
 * The bot's strategy is a vector of numbers (see `bot-weights.ts`).  This finds
 * good numbers the only way that means anything in a dice game: by playing tens
 * of thousands of whole games and keeping what wins.
 *
 * Method: the cross-entropy method.  Each generation samples a population of
 * strategies from a Gaussian, plays every one of them against the reigning
 * champion over a shared set of seeds (so all candidates face the same dice and
 * the same shuffles), refits the Gaussian to the best performers, and promotes
 * the new mean only if it beats the old champion head to head.
 *
 * Games run in parallel across forked workers; the parent only does arithmetic.
 */
import { fork, type ChildProcess } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readFileSync, writeFileSync } from 'node:fs';
import { cpus } from 'node:os';

import {
  BASELINE,
  TUNED_FIXED,
  TUNED_VARIABLE,
  WEIGHT_KEYS,
  WEIGHT_RANGE,
  type BotWeights,
} from './bot-weights';
import { botAction } from './bot';
import { activePlayer, applyAction, createGame, type Seat } from './engine';
import { CARD_BY_ID, landmarksFor, type CardId, type LandmarkId, type RuleSet } from './cards';

const HERE = fileURLToPath(import.meta.url);
const WEIGHTS_FILE = fileURLToPath(new URL('./bot-weights.ts', import.meta.url));

const FIXED: RuleSet = { harbor: true, millionaires: true, variableSupply: false };
const VARIABLE: RuleSet = { harbor: true, millionaires: true, variableSupply: true };

/**
 * A game is abandoned after this many actions or turns; a strategy that cannot
 * close a game out loses it.  With the Space Port in the mix a four-player game
 * runs to about 120 turns and the long tail reaches 180, so the caps only bite on
 * a strategy that hoards and never builds.
 */
const MAX_STEPS = 3500;
const MAX_TURNS = 220;

// ---------------------------------------------------------------------------
// vectors
// ---------------------------------------------------------------------------

type Vec = number[];

function toVec(w: BotWeights): Vec {
  return WEIGHT_KEYS.map((k) => w[k]);
}

function toWeights(v: Vec): BotWeights {
  const w = {} as BotWeights;
  WEIGHT_KEYS.forEach((k, i) => {
    w[k] = v[i];
  });
  return w;
}

function clamp(v: Vec): Vec {
  return v.map((x, i) => {
    const [lo, hi] = WEIGHT_RANGE[WEIGHT_KEYS[i]];
    return Math.min(hi, Math.max(lo, x));
  });
}

function spans(): Vec {
  return WEIGHT_KEYS.map((k) => WEIGHT_RANGE[k][1] - WEIGHT_RANGE[k][0]);
}

function rngFrom(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Box–Muller, so the sampler is normal rather than boxy. */
function gauss(rand: () => number): number {
  const u = Math.max(1e-9, rand());
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
}

// ---------------------------------------------------------------------------
// playing games
// ---------------------------------------------------------------------------

export interface GameResult {
  /** Seat index of the winner, or -1 if the game never finished. */
  winner: number;
  turns: number;
  /** Cards each seat ended up owning, only collected when asked for. */
  cards?: Partial<Record<CardId, number>>[];
  landmarkOrder?: LandmarkId[][];
  /** Turn number each landmark went up on, per seat. */
  landmarkTurn?: Record<string, number>[];
}

function seats(n: number): Seat[] {
  return Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `P${i}`, isBot: true }));
}

export function playGame(seed: number, rules: RuleSet, table: BotWeights[], detail = false): GameResult {
  const line = seats(table.length);
  const state = createGame(line, rules, seed);
  const bySeat = new Map(line.map((s, i) => [s.id, table[i]]));
  const seatOf = new Map(line.map((s, i) => [s.id, i]));
  const order: LandmarkId[][] = line.map(() => []);
  const built = line.map(() => new Set<LandmarkId>());
  const builtOn: Record<string, number>[] = line.map(() => ({}));

  let steps = 0;
  while (state.phase !== 'over' && steps < MAX_STEPS && state.turnCount < MAX_TURNS) {
    const me = activePlayer(state);
    const action = botAction(state, bySeat.get(me.id));
    if (!action) throw new Error(`no action in phase ${state.phase}`);
    const error = applyAction(state, me.id, action);
    if (error) throw new Error(`${JSON.stringify(action)} in ${state.phase}: ${error}`);
    if (detail && action.t === 'landmark') {
      const i = seatOf.get(me.id)!;
      if (!built[i].has(action.landmarkId)) {
        built[i].add(action.landmarkId);
        order[i].push(action.landmarkId);
        builtOn[i][action.landmarkId] = state.turnCount;
      }
    }
    steps++;
  }

  const winner = state.winnerId ? seatOf.get(state.winnerId) ?? -1 : -1;
  const result: GameResult = { winner, turns: state.turnCount };
  if (detail) {
    // players are shuffled at setup, so re-key the card tallies by seat
    const bySeatCards: Partial<Record<CardId, number>>[] = line.map(() => ({}));
    state.players.forEach((p) => {
      bySeatCards[seatOf.get(p.id)!] = { ...p.cards };
    });
    result.cards = bySeatCards;
    result.landmarkOrder = order;
    result.landmarkTurn = builtOn;
  }
  return result;
}

export interface MatchResult {
  games: number;
  wins: number;
  stalls: number;
  turns: number;
}

/**
 * Play `seeds.length` games of `challenger` against a table of `champion`s,
 * rotating which seat the challenger takes so seating order cannot flatter it.
 */
export function playMatch(
  seeds: number[],
  rules: RuleSet,
  players: number,
  challenger: BotWeights,
  champion: BotWeights
): MatchResult {
  let wins = 0;
  let stalls = 0;
  let turns = 0;
  seeds.forEach((seed, i) => {
    const mine = i % players;
    const table = Array.from({ length: players }, (_, s) => (s === mine ? challenger : champion));
    const r = playGame(seed, rules, table);
    if (r.winner === mine) wins++;
    if (r.winner === -1) stalls++;
    turns += r.turns;
  });
  return { games: seeds.length, wins, stalls, turns };
}

// ---------------------------------------------------------------------------
// worker protocol
// ---------------------------------------------------------------------------

interface Job {
  id: number;
  seeds: number[];
  rules: RuleSet;
  players: number;
  challenger: BotWeights;
  champion: BotWeights;
}

interface Done extends MatchResult {
  id: number;
}

if (process.argv.includes('--worker')) {
  process.on('message', (job: Job) => {
    const r = playMatch(job.seeds, job.rules, job.players, job.challenger, job.champion);
    process.send!({ id: job.id, ...r } satisfies Done);
  });
}

class Pool {
  private kids: ChildProcess[] = [];
  private idle: ChildProcess[] = [];
  private queue: { job: Job; resolve: (r: Done) => void }[] = [];
  private waiting = new Map<ChildProcess, (r: Done) => void>();

  constructor(size: number) {
    for (let i = 0; i < size; i++) {
      const kid = fork(HERE, ['--worker'], { execArgv: ['--import', 'tsx'], stdio: ['ignore', 'inherit', 'inherit', 'ipc'] });
      kid.on('message', (msg: Done) => {
        const resolve = this.waiting.get(kid)!;
        this.waiting.delete(kid);
        this.idle.push(kid);
        resolve(msg);
        this.pump();
      });
      this.kids.push(kid);
      this.idle.push(kid);
    }
  }

  private pump(): void {
    while (this.idle.length && this.queue.length) {
      const kid = this.idle.pop()!;
      const { job, resolve } = this.queue.shift()!;
      this.waiting.set(kid, resolve);
      kid.send(job);
    }
  }

  get size(): number {
    return this.kids.length;
  }

  run(job: Job): Promise<Done> {
    return new Promise((resolve) => {
      this.queue.push({ job, resolve });
      this.pump();
    });
  }

  close(): void {
    for (const kid of this.kids) kid.kill();
  }
}

/**
 * Play one match across the whole pool rather than on a single worker.
 *
 * Chunks are a whole number of seat rotations, because `playMatch` gives the
 * challenger seat `i % players` and a chunk that ends mid-rotation would hand it
 * the early seats more often than the late ones.  Splitting a match must not
 * change what the match measures.
 */
async function runMatch(
  pool: Pool,
  seeds: number[],
  rules: RuleSet,
  players: number,
  challenger: BotWeights,
  champion: BotWeights,
  parts = pool.size
): Promise<MatchResult> {
  const chunk = Math.max(players, Math.ceil(seeds.length / parts / players) * players);
  const jobs: Promise<Done>[] = [];
  for (let i = 0; i * chunk < seeds.length; i++) {
    jobs.push(
      pool.run({ id: i, seeds: seeds.slice(i * chunk, (i + 1) * chunk), rules, players, challenger, champion })
    );
  }
  const done = await Promise.all(jobs);
  return done.reduce(
    (a, p) => ({ games: a.games + p.games, wins: a.wins + p.wins, stalls: a.stalls + p.stalls, turns: a.turns + p.turns }),
    { games: 0, wins: 0, stalls: 0, turns: 0 }
  );
}

// ---------------------------------------------------------------------------
// the search
// ---------------------------------------------------------------------------

interface TrainOptions {
  rules: RuleSet;
  players: number;
  generations: number;
  population: number;
  gamesPerCandidate: number;
  promotionGames: number;
  finalGames: number;
  seed: number;
  pool: Pool;
  label: string;
  /** Strategy the search starts from, and the champion it first has to beat. */
  start: BotWeights;
  /**
   * How wide the first generation samples, as a fraction of each weight's range.
   * 0.3 searches the whole board and is what a run from the baseline wants; a run
   * that starts from a strategy already worth shipping wants a tenth of that, so
   * the candidates are neighbours of it rather than strangers.
   */
  sigma0: number;
  /**
   * How far past a fair share the promotion duel has to land before the new mean
   * takes the crown.  A few hundred games put a couple of points of noise on that
   * duel, so a plain `> fair` test crowns a coin flip half the time and the search
   * wanders off a good champion on nothing but luck.
   */
  promotionMargin: number;
}

async function train(opt: TrainOptions): Promise<{ weights: BotWeights; games: number; log: string[] }> {
  const rand = rngFrom(opt.seed);
  const span = spans();
  let mean = clamp(toVec(opt.start));
  let sigma = span.map((s) => s * opt.sigma0);
  let champion = toWeights(mean);
  let games = 0;
  /** Generations since the last promotion, which is how far the search widens. */
  let held = 0;
  const log: string[] = [];
  const elite = Math.max(3, Math.round(opt.population * 0.3));

  for (let gen = 1; gen <= opt.generations; gen++) {
    // Common random numbers: every candidate this generation plays the same games.
    const seeds = Array.from({ length: opt.gamesPerCandidate }, () => Math.floor(rand() * 2 ** 30));
    const candidates: Vec[] = [mean.slice()];
    while (candidates.length < opt.population) {
      candidates.push(clamp(mean.map((m, i) => m + sigma[i] * gauss(rand))));
    }

    const scored = await Promise.all(
      candidates.map(async (v, id) => {
        const r = await opt.pool.run({
          id,
          seeds,
          rules: opt.rules,
          players: opt.players,
          challenger: toWeights(v),
          champion,
        });
        return { v, rate: r.wins / r.games, stalls: r.stalls };
      })
    );
    games += opt.population * opt.gamesPerCandidate;

    scored.sort((a, b) => b.rate - a.rate);
    const best = scored.slice(0, elite);
    const nextMean = mean.map((_, i) => best.reduce((a, c) => a + c.v[i], 0) / best.length);
    const nextSigma = mean.map((_, i) => {
      const mu = nextMean[i];
      const varr = best.reduce((a, c) => a + (c.v[i] - mu) ** 2, 0) / best.length;
      // a small floor keeps the search from collapsing onto a lucky sample,
      // measured against the width the run asked for so a local search stays local
      return Math.max(Math.sqrt(varr), span[i] * opt.sigma0 * 0.13);
    });

    // Two strategies get a shot at the crown, and neither takes it without
    // beating the sitting champion on games it has not already been judged on.
    //
    // The elite mean is the cross-entropy method's own answer, but averaging the
    // elites averages away the luck in their scores *and* a real edge held by
    // one of them.  A generation of these plays too few games to tell those
    // apart: an earlier run watched the best candidate score 27-36% against the
    // champion for eighteen generations running while the mean of the elites
    // duelled at 24%.  So the best single candidate stands too.  Picking it on a
    // noisy score costs nothing, because the duel below re-tests it on fresh
    // seeds — the score that selected it never crowns it.
    const promoSeeds = Array.from({ length: opt.promotionGames }, () => Math.floor(rand() * 2 ** 30));
    const contenders = [
      { what: 'mean', v: clamp(nextMean) },
      { what: 'best', v: scored[0].v },
    ];
    const duels = await Promise.all(
      contenders.map((c) =>
        runMatch(opt.pool, promoSeeds, opt.rules, opt.players, toWeights(c.v), champion)
      )
    );
    games += opt.promotionGames * contenders.length;
    const fair = 1 / opt.players;
    const rates = duels.map((d) => d.wins / d.games);
    const pick = rates[0] >= rates[1] ? 0 : 1;
    const rate = rates[pick];
    const promoted = rate > fair + opt.promotionMargin;
    if (promoted) {
      mean = clamp(contenders[pick].v);
      champion = toWeights(mean);
      sigma = nextSigma;
      held = 0;
    } else {
      // Sit the search back on the champion instead of following the elite mean.
      // Every candidate is scored against the champion, so a centre that keeps
      // sliding towards elites who never manage to beat it just walks the search
      // away from the thing it is measured on: earlier runs drifted for five
      // generations in a row and the duel rate fell the whole way down.  Widen
      // instead, a little more with each generation that fails to promote, so
      // repeated holds turn into a broader search around a known-good point
      // rather than a slow walk away from one.
      held++;
      mean = clamp(toVec(champion));
      const widen = opt.sigma0 * (0.27 + 0.13 * Math.min(held, 4));
      sigma = nextSigma.map((s, i) => Math.max(s, span[i] * widen));
    }

    const line =
      `  ${opt.label} gen ${String(gen).padStart(2)}  best=${(scored[0].rate * 100).toFixed(1)}%  ` +
      `mean-elite=${((best.reduce((a, c) => a + c.rate, 0) / best.length) * 100).toFixed(1)}%  ` +
      `duels: mean=${(rates[0] * 100).toFixed(1)}% best=${(rates[1] * 100).toFixed(1)}% ` +
      (promoted
        ? `→ promoted the ${contenders[pick].what}`
        : `→ held${held > 1 ? ` (${held} in a row, searching wider)` : ''}`) +
      (scored[0].stalls ? `  (${scored[0].stalls} stalled)` : '');
    console.log(line);
    log.push(line);
  }

  return { weights: champion, games, log };
}

// ---------------------------------------------------------------------------
// reporting
// ---------------------------------------------------------------------------

function wilson(wins: number, n: number): [number, number] {
  const z = 1.96;
  const p = wins / n;
  const d = 1 + (z * z) / n;
  const c = p + (z * z) / (2 * n);
  const s = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
  return [(c - s) / d, (c + s) / d];
}

/** Play one strategy against a table of another and describe the gap. */
async function validate(
  pool: Pool,
  rules: RuleSet,
  players: number,
  tuned: BotWeights,
  games: number,
  seed: number,
  opponent: BotWeights = BASELINE
): Promise<{ rate: number; lo: number; hi: number; turns: number; games: number }> {
  const rand = rngFrom(seed);
  const seeds = Array.from({ length: games }, () => Math.floor(rand() * 2 ** 30));
  const r = await runMatch(pool, seeds, rules, players, tuned, opponent);
  const [lo, hi] = wilson(r.wins, r.games);
  return { rate: r.wins / r.games, lo, hi, turns: r.turns / r.games, games: r.games };
}

/** What the trained strategy actually does, in words: what it buys and builds. */
function describeStrategy(rules: RuleSet, players: number, w: BotWeights, games: number, seed: number): string[] {
  const rand = rngFrom(seed);
  const cardTally = new Map<CardId, number>();
  const firstLandmark = new Map<LandmarkId, number>();
  const landmarkStep = new Map<LandmarkId, { sum: number; n: number; turn: number }>();
  let turns = 0;
  let wins = 0;

  for (let i = 0; i < games; i++) {
    const table = Array.from({ length: players }, () => w);
    const r = playGame(Math.floor(rand() * 2 ** 30), rules, table, true);
    if (r.winner < 0) continue;
    wins++;
    turns += r.turns;
    for (const [id, n] of Object.entries(r.cards![r.winner])) {
      cardTally.set(id as CardId, (cardTally.get(id as CardId) ?? 0) + (n ?? 0));
    }
    const order = r.landmarkOrder![r.winner];
    if (order.length) firstLandmark.set(order[0], (firstLandmark.get(order[0]) ?? 0) + 1);
    order.forEach((id, at) => {
      const e = landmarkStep.get(id) ?? { sum: 0, n: 0, turn: 0 };
      e.sum += at + 1;
      e.turn += r.landmarkTurn![r.winner][id] ?? 0;
      e.n++;
      landmarkStep.set(id, e);
    });
  }

  const out: string[] = [];
  const top = [...cardTally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
  out.push(`winner's city, average copies over ${wins} games (game length ${(turns / wins).toFixed(1)} turns):`);
  for (const [id, n] of top) out.push(`    ${CARD_BY_ID[id].name.padEnd(26)} ${(n / wins).toFixed(2)}`);
  out.push('  landmark order:');
  const marks = landmarksFor(rules).filter((l) => !l.free);
  const ranked = marks
    .map((l) => ({ l, e: landmarkStep.get(l.id) }))
    .filter((x) => x.e)
    .sort((a, b) => a.e!.sum / a.e!.n - b.e!.sum / b.e!.n);
  for (const { l, e } of ranked) {
    const first = ((firstLandmark.get(l.id) ?? 0) / wins) * 100;
    out.push(
      `    ${l.name.padEnd(26)} average position ${(e!.sum / e!.n).toFixed(2)}   ` +
        `on turn ${(e!.turn / e!.n).toFixed(0)}   first ${first.toFixed(0)}% of the time`
    );
  }
  return out;
}

// ---------------------------------------------------------------------------
// writing the result back into the source
// ---------------------------------------------------------------------------

function serialise(name: string, w: BotWeights): string {
  const body = WEIGHT_KEYS.map((k) => `  ${k}: ${Number(w[k].toFixed(4))},`).join('\n');
  return `export const ${name}: BotWeights = {\n${body}\n};`;
}

function writeWeights(updates: { name: string; weights: BotWeights }[]): void {
  let src = readFileSync(WEIGHTS_FILE, 'utf8');
  for (const u of updates) {
    const re = new RegExp(`export const ${u.name}: BotWeights = \\{[\\s\\S]*?\\};`);
    if (!re.test(src)) throw new Error(`cannot find ${u.name} in bot-weights.ts`);
    src = src.replace(re, serialise(u.name, u.weights));
  }
  writeFileSync(WEIGHTS_FILE, src);
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

function text(name: string, fallback: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
}

function flag(name: string, fallback: number): number {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : Number(process.argv[i + 1]);
}

async function main(): Promise<void> {
  // Variable supply only, unless asked otherwise.  Fixed supply is the mode
  // that gets played least and its strategy is in good shape, so spending half
  // of every run on it buys nothing; `--mode fixed` or `--mode both` still work.
  const mode = text('mode', 'variable');
  const players = flag('players', 4);
  const generations = flag('gens', 14);
  const population = flag('pop', 16);
  const gamesPerCandidate = flag('games', 48);
  const promotionGames = flag('promo', 300);
  const finalGames = flag('final', 2000);
  const workers = flag('workers', Math.max(2, Math.min(12, cpus().length - 1)));
  const seed = flag('seed', 20260810);
  // Games played by earlier runs, so a report-only pass can still credit them.
  const credit = flag('credit', 0);
  // Where the search starts, and so the first champion a candidate has to beat:
  // `baseline` from scratch, `tuned` continues this mode's trained strategy,
  // `fixed` hands the fixed-supply strategy to the variable-supply search.
  const init = text('init', 'baseline');
  // How wide the first generation samples, as a fraction of each weight's range,
  // and how far past a fair share a promotion duel has to land to be believed.
  // A run from the baseline wants the whole board; a run continuing a shipped
  // strategy wants a neighbourhood of it and a duel it cannot win on a coin flip.
  const sigma0 = flag('sigma', init === 'baseline' ? 0.3 : 0.08);
  const promotionMargin = flag('promo-margin', 0);

  const pool = new Pool(workers);
  const started = Date.now();
  const report: string[] = [];
  const updates: { name: string; weights: BotWeights }[] = [];
  let total = 0;

  const modes = [
    { key: 'fixed', rules: FIXED, name: 'TUNED_FIXED', tuned: TUNED_FIXED },
    { key: 'variable', rules: VARIABLE, name: 'TUNED_VARIABLE', tuned: TUNED_VARIABLE },
  ].filter((m) => mode === 'both' || mode === m.key);

  if (process.argv.includes('--ab')) {
    // Settle two candidate strategies against each other, both ways round, in
    // whichever rule modes were asked for.  Each side is read from a JSON file.
    const at = process.argv.indexOf('--ab');
    const [fileA, fileB] = [process.argv[at + 1], process.argv[at + 2]];
    // Defaulted off BASELINE so a vector saved before a weight existed still runs.
    const read = (f: string) => ({ ...BASELINE, ...(JSON.parse(readFileSync(f, 'utf8')) as Partial<BotWeights>) });
    const [a, b] = [read(fileA), read(fileB)];
    for (const m of modes) {
      const one = await validate(pool, m.rules, players, a, finalGames, seed + 77, b);
      const two = await validate(pool, m.rules, players, b, finalGames, seed + 78, a);
      console.log(
        `${m.key.padEnd(9)} A vs 3xB: ${(one.rate * 100).toFixed(1)}% ` +
          `(95% CI ${(one.lo * 100).toFixed(1)}-${(one.hi * 100).toFixed(1)})   ` +
          `B vs 3xA: ${(two.rate * 100).toFixed(1)}% ` +
          `(95% CI ${(two.lo * 100).toFixed(1)}-${(two.hi * 100).toFixed(1)})   of ${one.games} games each`
      );
    }
    pool.close();
    return;
  }

  if (process.argv.includes('--eval')) {
    // No search: just say how the two trained strategies and the old bot compare.
    const games = finalGames;
    for (const m of modes) {
      for (const [name, w] of [
        ['tuned for this mode', m.tuned],
        ['tuned for the other mode', m.key === 'fixed' ? TUNED_VARIABLE : TUNED_FIXED],
        ['hand-written baseline', BASELINE],
      ] as const) {
        const r = await validate(pool, m.rules, players, w, games, seed + 31, m.tuned);
        console.log(
          `${m.key.padEnd(9)} ${name.padEnd(26)} vs this mode's trained bots: ` +
            `${(r.rate * 100).toFixed(1)}% of ${r.games} (95% CI ${(r.lo * 100).toFixed(1)}–${(r.hi * 100).toFixed(1)})`
        );
      }
    }
    pool.close();
    return;
  }

  for (const m of modes) {
    console.log(`\n=== ${m.key} supply, ${players} players ===`);
    const { weights, games } = await train({
      rules: m.rules,
      players,
      generations,
      population,
      gamesPerCandidate,
      promotionGames,
      finalGames,
      seed: seed + (m.key === 'variable' ? 1 : 0),
      pool,
      label: m.key,
      start: init === 'tuned' ? m.tuned : init === 'fixed' ? TUNED_FIXED : BASELINE,
      sigma0,
      promotionMargin,
    });
    total += games;

    const v = await validate(pool, m.rules, players, weights, finalGames, seed + 999);
    total += v.games;
    const fair = 100 / players;
    console.log(
      `  trained vs baseline over ${v.games} games: ${(v.rate * 100).toFixed(1)}% ` +
        `(95% CI ${(v.lo * 100).toFixed(1)}–${(v.hi * 100).toFixed(1)}, fair share ${fair.toFixed(1)}%)`
    );

    // Beating the hand-written baseline proves nothing about the strategy that is
    // actually in the game.  The candidate only ships if it takes more than its
    // fair share against a table of the incumbent *and* the incumbent takes less
    // than its fair share against a table of the candidate — a promotion duel of
    // a few hundred games is too noisy to be the last word, and an earlier run
    // shipped a regression because nothing checked this.
    const attack = await validate(pool, m.rules, players, weights, finalGames, seed + 1234, m.tuned);
    const defence = await validate(pool, m.rules, players, m.tuned, finalGames, seed + 4321, weights);
    total += attack.games + defence.games;
    const ships = attack.rate > 1 / players && defence.rate < 1 / players;
    console.log(
      `  new vs 3x shipped: ${(attack.rate * 100).toFixed(1)}% ` +
        `(95% CI ${(attack.lo * 100).toFixed(1)}–${(attack.hi * 100).toFixed(1)})   ` +
        `shipped vs 3x new: ${(defence.rate * 100).toFixed(1)}% ` +
        `(95% CI ${(defence.lo * 100).toFixed(1)}–${(defence.hi * 100).toFixed(1)})   ` +
        `of ${attack.games} games each → ${ships ? 'SHIPPED' : 'HELD, keeping the shipped strategy'}`
    );

    const strategy = describeStrategy(m.rules, players, weights, 200, seed + 4242);
    total += 200;
    for (const line of strategy) console.log(`  ${line}`);

    report.push(
      `## ${m.key} supply (${players} players)`,
      '',
      ...(ships
        ? []
        : [
            `**Not shipped.** The candidate below did not beat the strategy it would replace, so`,
            `\`${m.name}\` is unchanged. Everything that follows describes the rejected candidate.`,
            '',
          ]),
      `Trained over ${(games + credit).toLocaleString()} self-play games.`,
      `Against the strategy it would replace: **${(attack.rate * 100).toFixed(1)}%** of ${attack.games} games ` +
        `(95% CI ${(attack.lo * 100).toFixed(1)}–${(attack.hi * 100).toFixed(1)}%), and the old strategy takes ` +
        `**${(defence.rate * 100).toFixed(1)}%** against a table of the new one (95% CI ` +
        `${(defence.lo * 100).toFixed(1)}–${(defence.hi * 100).toFixed(1)}%). Fair share is ${fair.toFixed(1)}%.`,
      `Against the hand-written baseline: **${(v.rate * 100).toFixed(1)}%** of ${v.games} games ` +
        `(95% CI ${(v.lo * 100).toFixed(1)}–${(v.hi * 100).toFixed(1)}%).`,
      '',
      '```',
      ...strategy,
      '```',
      '',
      '```json',
      JSON.stringify(weights, null, 2),
      '```',
      ''
    );
    if (ships) updates.push({ name: m.name, weights });
  }

  pool.close();
  writeWeights(updates);
  const mins = ((Date.now() - started) / 60000).toFixed(1);
  const header = [
    '# Trained bot strategies',
    '',
    `Produced by \`npm run train\` — ${total.toLocaleString()} games in ${mins} minutes.`,
    '',
    modes.length === 1
      ? `Only the ${modes[0].key}-supply strategy was trained; the other one is left as it stands.`
      : '',
    `Search: started from \`${init}\`, ${generations} generations of ${population} candidates ` +
      `over ${gamesPerCandidate} games each, sampled at ${sigma0} of each weight's range, promoted on ` +
      `the better of two ${promotionGames}-game duels at ${((1 / players + promotionMargin) * 100).toFixed(1)}%, ` +
      `settled on ${finalGames} games a side.`,
    '',
    updates.length
      ? `This run replaced ${updates.map((u) => `\`${u.name}\``).join(' and ')} in \`src/shared/bot-weights.ts\`.`
      : 'This run shipped nothing: no candidate beat the strategy it would have replaced, so' +
        ' `src/shared/bot-weights.ts` is the last strategy that did win one, not the numbers below.',
    '',
  ];
  writeFileSync(fileURLToPath(new URL('../../TRAINING.md', import.meta.url)), [...header, ...report].join('\n'));
  const written = updates.length ? updates.map((u) => u.name).join(', ') : 'nothing — every candidate was held';
  console.log(`\n${total.toLocaleString()} games in ${mins} minutes. bot-weights.ts: ${written}. Report in TRAINING.md.`);
}

if (!process.argv.includes('--worker')) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
