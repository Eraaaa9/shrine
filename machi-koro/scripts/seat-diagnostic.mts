/**
 * Where does the first seat's advantage come from?
 *
 * `balance:mayors` already reports the seat spread; this asks why it is there.
 * Three things are measured, because they call for different fixes:
 *
 *  - **Turns taken.**  The game stops the instant somebody completes their
 *    landmarks, so the seats after the winner never get that round's turn.
 *    If that is the whole story, seat 0 simply plays more turns than seat n.
 *  - **How close the robbed seats were.**  For every seat that lost a turn to
 *    the sudden ending, could it have finished on the turn it never got?  With
 *    the coins already in hand, with an average roll's income, with the best
 *    roll on the board.  That brackets what a final-round rule could recover:
 *    no rule can flip a game where nobody was in reach.
 *  - **Game length.**  A tempo advantage washes out over a long game; an
 *    end-of-game advantage does not.  Seat 0's win rate in short games versus
 *    long ones says which kind this is.
 *
 *   npm run diagnose:seats -- [games] [players] [--fixed]
 *
 * `--fixed` swaps the variable supply for the fixed one.  The 10 face-up slots
 * refill as they are bought, so seat 0 gets first pick of a fresher board every
 * round; the fixed supply has no such asymmetry, and the difference between the
 * two runs is what that first pick is worth.
 */
import os from 'node:os';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';
import { DEFAULT_RULES, winLandmarks, type RuleSet } from '../src/shared/cards';
import { botAction } from '../src/shared/bot';
import { activePlayer, applyAction, createGame, incomeAt, landmarkCost, type Seat } from '../src/shared/engine';

const MAX_LEN = 500;

interface SeatTally {
  games: number;
  wins: number;
  turns: number;
  coins: number;
  landmarks: number;
  /** Games where this seat came after the winner and so lost a turn. */
  robbed: number;
  /** Of those, how many it could have finished on the turn it never got. */
  reachNow: number;
  reachAverage: number;
  reachBest: number;
  /** Coins still missing, over the robbed seats with one landmark to go. */
  oneLeft: number;
  oneLeftShort: number;
}

interface Shard {
  seats: SeatTally[];
  played: number;
  unfinished: number;
  totalTurns: number;
  /** Games by length, and seat wins by length, for the short/long split. */
  lengths: number[];
  winsByLength: number[][];
  /** Games where at least one robbed seat was in reach. */
  flipNow: number;
  flipAverage: number;
  flipBest: number;
}

const blankSeat = (): SeatTally => ({
  games: 0,
  wins: 0,
  turns: 0,
  coins: 0,
  landmarks: 0,
  robbed: 0,
  reachNow: 0,
  reachAverage: 0,
  reachBest: 0,
  oneLeft: 0,
  oneLeftShort: 0,
});

function emptyShard(players: number): Shard {
  return {
    seats: Array.from({ length: players }, blankSeat),
    played: 0,
    unfinished: 0,
    totalTurns: 0,
    lengths: new Array(MAX_LEN).fill(0),
    winsByLength: Array.from({ length: players }, () => new Array(MAX_LEN).fill(0)),
    flipNow: 0,
    flipAverage: 0,
    flipBest: 0,
  };
}

/** Totals a player can roll, and how likely each is, on the dice they would choose. */
function rollOdds(twoDice: boolean): Map<number, number> {
  const odds = new Map<number, number>();
  if (!twoDice) {
    for (let d = 1; d <= 6; d++) odds.set(d, 1 / 6);
  } else {
    for (let a = 1; a <= 6; a++) {
      for (let b = 1; b <= 6; b++) odds.set(a + b, (odds.get(a + b) ?? 0) + 1 / 36);
    }
  }
  return odds;
}

const ONE_DIE = rollOdds(false);
const TWO_DICE = rollOdds(true);

function runGames(from: number, to: number, players: number, rules: RuleSet): Shard {
  const shard = emptyShard(players);
  const needed = winLandmarks(rules);

  for (let g = from; g < to; g++) {
    const line: Seat[] = Array.from({ length: players }, (_, i) => ({ id: `p${i}`, name: `P${i}`, isBot: true }));
    const state = createGame(line, rules, g * 7919 + 13);

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
    const bucket = Math.min(state.turnCount, MAX_LEN - 1);
    shard.lengths[bucket]++;

    const winnerSeat = state.players.findIndex((p) => p.id === state.winnerId);
    let flipNow = false;
    let flipAverage = false;
    let flipBest = false;

    state.players.forEach((p, seat) => {
      const t = shard.seats[seat];
      t.games++;
      t.turns += p.stats.turns;
      t.coins += p.coins;
      const left = needed.filter((l) => !p.landmarks[l.id]);
      t.landmarks += needed.length - left.length;
      if (p.id === state.winnerId) {
        t.wins++;
        shard.winsByLength[seat][bucket]++;
        return;
      }

      // Only the seats after the winner lost a turn to the sudden ending.
      if (seat <= winnerSeat) return;
      t.robbed++;

      const price = left.reduce((sum, l) => sum + landmarkCost(state, p, l), 0);
      if (left.length === 1) {
        t.oneLeft++;
        t.oneLeftShort += Math.max(0, price - p.coins);
      }

      const odds = p.landmarks.train_station ? TWO_DICE : ONE_DIE;
      let average = 0;
      let best = -Infinity;
      for (const [total, chance] of odds) {
        const income = incomeAt(state, p, total).onYourTurn;
        average += income * chance;
        best = Math.max(best, income);
      }

      if (price <= p.coins) {
        t.reachNow++;
        flipNow = true;
      }
      if (price <= p.coins + average) {
        t.reachAverage++;
        flipAverage = true;
      }
      if (price <= p.coins + best) {
        t.reachBest++;
        flipBest = true;
      }
    });

    if (flipNow) shard.flipNow++;
    if (flipAverage) shard.flipAverage++;
    if (flipBest) shard.flipBest++;
  }
  return shard;
}

if (!isMainThread) {
  const { from, to, players, rules } = workerData as { from: number; to: number; players: number; rules: RuleSet };
  parentPort!.postMessage(runGames(from, to, players, rules));
} else {
  const GAMES = Number(process.argv[2] ?? 2000);
  const PLAYERS = Number(process.argv[3] ?? 4);
  const fixed = process.argv.includes('--fixed');
  // --slots <start>,<every>: open the market at <start> stacks and widen it by
  // one every <every> turns. Omitted, the market is the usual full 10 at once.
  const slotsArg = process.argv[process.argv.indexOf('--slots') + 1];
  const [slotsStart, slotsEvery] = process.argv.includes('--slots')
    ? slotsArg.split(',').map(Number)
    : [undefined, undefined];
  const RULES: RuleSet = {
    ...DEFAULT_RULES,
    variableSupply: !fixed,
    supplySlotsStart: slotsStart,
    supplySlotsEvery: slotsEvery,
  };
  const threads = Math.max(1, Math.min(os.cpus().length - 1, GAMES));
  const started = Date.now();
  const total = emptyShard(PLAYERS);

  const fold = (shard: Shard): void => {
    total.played += shard.played;
    total.unfinished += shard.unfinished;
    total.totalTurns += shard.totalTurns;
    total.flipNow += shard.flipNow;
    total.flipAverage += shard.flipAverage;
    total.flipBest += shard.flipBest;
    shard.lengths.forEach((n, i) => (total.lengths[i] += n));
    shard.seats.forEach((t, i) => {
      for (const k of Object.keys(t) as (keyof SeatTally)[]) total.seats[i][k] += t[k];
      shard.winsByLength[i].forEach((n, j) => (total.winsByLength[i][j] += n));
    });
  };

  const here = fileURLToPath(import.meta.url);
  const cuts = Array.from({ length: threads + 1 }, (_, i) => Math.round((GAMES * i) / threads));
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

  const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
  const share = 1 / PLAYERS;
  const played = Math.max(1, total.played);

  console.log(
    `\n${total.played} games at ${PLAYERS} players, ${fixed ? 'fixed' : 'variable'} supply` +
      (slotsStart ? `, market opens at ${slotsStart} +1 every ${slotsEvery ?? 1} turns` : '') +
      ', ' +
      `${threads} threads, ${((Date.now() - started) / 1000).toFixed(1)}s` +
      (total.unfinished ? `  — ${total.unfinished} unfinished` : '')
  );
  console.log(`fair share ${pct(share)}, average game ${(total.totalTurns / played).toFixed(1)} turns\n`);

  console.log('seat    win%   vs fair   turns   coins@end  landmarks@end');
  total.seats.forEach((t, i) => {
    const delta = (t.wins / t.games - share) * 100;
    console.log(
      `  ${i}   ${pct(t.wins / t.games).padStart(6)}  ${((delta >= 0 ? '+' : '') + delta.toFixed(1) + 'pp').padStart(7)}  ` +
        `${(t.turns / t.games).toFixed(2).padStart(6)}  ${(t.coins / t.games).toFixed(1).padStart(9)}  ${(t.landmarks / t.games).toFixed(2).padStart(13)}`
    );
  });

  console.log('\nseats that lost a turn to the sudden ending — could they have finished on it?');
  console.log('seat   robbed   with coins in hand   + an average roll   + the best roll   one landmark left (coins short)');
  total.seats.forEach((t, i) => {
    if (t.robbed === 0) {
      console.log(`  ${i}        —`);
      return;
    }
    const shortAvg = t.oneLeft ? (t.oneLeftShort / t.oneLeft).toFixed(1) : '—';
    console.log(
      `  ${i}   ${String(t.robbed).padStart(6)}   ${pct(t.reachNow / t.robbed).padStart(17)}   ${pct(t.reachAverage / t.robbed).padStart(16)}   ` +
        `${pct(t.reachBest / t.robbed).padStart(14)}   ${pct(t.oneLeft / t.robbed).padStart(8)} (${shortAvg})`
    );
  });

  console.log('\ngames a final round could have changed at all (someone in reach):');
  console.log(`  with coins in hand  ${pct(total.flipNow / played)}`);
  console.log(`  + an average roll   ${pct(total.flipAverage / played)}`);
  console.log(`  + the best roll     ${pct(total.flipBest / played)}`);

  // Short games versus long ones: a tempo edge fades with length, an ending edge does not.
  let seen = 0;
  let median = 0;
  for (let i = 0; i < MAX_LEN; i++) {
    seen += total.lengths[i];
    if (seen >= played / 2) {
      median = i;
      break;
    }
  }
  const half = (seat: number, lo: number, hi: number): [number, number] => {
    let wins = 0;
    for (let i = lo; i < hi; i++) wins += total.winsByLength[seat][i];
    let games = 0;
    for (let i = lo; i < hi; i++) games += total.lengths[i];
    return [wins, games];
  };
  console.log(`\nwin% by game length (median ${median} turns)`);
  console.log('seat   shorter than median   longer than median');
  total.seats.forEach((_, i) => {
    const [sw, sg] = half(i, 0, median);
    const [lw, lg] = half(i, median, MAX_LEN);
    console.log(`  ${i}   ${pct(sw / Math.max(1, sg)).padStart(18)}   ${pct(lw / Math.max(1, lg)).padStart(17)}`);
  });
}
