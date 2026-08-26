/**
 * Throwaway probe: what payout does the Exhibit Hall actually have on offer?
 *
 * Since the fix an activation fires every copy you own, so the figure the bot
 * weighs against `exhibitThreshold` is no longer bounded by a single card's
 * payout.  This prints the distribution of the best candidate at each exhibit
 * decision, to say whether the [0, 14] search range still covers the answers.
 */
import { botAction } from '../src/shared/bot';
import { TUNED_VARIABLE } from '../src/shared/bot-weights';
import { activationValue, activePlayer, applyAction, createGame, exhibitCandidates } from '../src/shared/engine';
import type { RuleSet } from '../src/shared/cards';

const VARIABLE: RuleSet = { harbor: true, millionaires: true, variableSupply: true };
const GAMES = Number(process.argv[2] ?? 200);
const values: number[] = [];

for (let g = 0; g < GAMES; g++) {
  const line = Array.from({ length: 4 }, (_, i) => ({ id: `p${i}`, name: `P${i}`, isBot: true }));
  const state = createGame(line, VARIABLE, 1_000_000 + g * 7919);
  let steps = 0;
  while (state.phase !== 'over' && steps < 3500 && state.turnCount < 220) {
    const me = activePlayer(state);
    if (state.phase === 'exhibit') {
      values.push(exhibitCandidates(state, me).reduce((b, id) => Math.max(b, activationValue(state, me, id)), 0));
    }
    const action = botAction(state, TUNED_VARIABLE);
    if (!action) throw new Error(`no action in phase ${state.phase}`);
    const error = applyAction(state, me.id, action);
    if (error) throw new Error(`${JSON.stringify(action)} in ${state.phase}: ${error}`);
    steps++;
  }
}

values.sort((a, b) => a - b);
const at = (q: number) => values[Math.min(values.length - 1, Math.floor(q * values.length))];
console.log(`${values.length} exhibit decisions over ${GAMES} games`);
console.log(`  median ${at(0.5)}   p75 ${at(0.75)}   p90 ${at(0.9)}   p95 ${at(0.95)}   p99 ${at(0.99)}   max ${values[values.length - 1]}`);
for (const cut of [5, 10, 14, 18, 22, 26, 30, 40]) {
  const over = values.filter((v) => v >= cut).length;
  console.log(`  ${String(over).padStart(5)} decisions (${((over / values.length) * 100).toFixed(1)}%) had ${cut}+ on offer`);
}
