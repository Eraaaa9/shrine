/**
 * Exhibit Hall rules check: it fires every copy you own of the chosen
 * establishment, pays only you, and returning it to the market draws nothing
 * while 10 or more stacks are already on offer.
 */
import { activePlayer, applyAction, applyForcedRoll, createGame } from '../src/shared/engine';
import { CARD_BY_ID, DEFAULT_RULES, type CardId } from '../src/shared/cards';
import type { GameState, PlayerState } from '../src/shared/types';

let failures = 0;

function check(label: string, actual: unknown, expected: unknown): void {
  const ok = actual === expected;
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}: got ${actual}${ok ? '' : `, expected ${expected}`}`);
}

/** A game parked on the Exhibit Hall prompt, with `setup` applied to the roller. */
function atExhibit(setup: (p: PlayerState, state: GameState) => void, seed = 42): [GameState, PlayerState] {
  const state = createGame(
    [
      { id: 'a', name: 'A', isBot: false },
      { id: 'b', name: 'B', isBot: false },
    ],
    DEFAULT_RULES,
    seed
  );
  const me = activePlayer(state);
  me.cards.exhibit_hall = 1;
  me.coins = 0;
  setup(me, state);
  applyForcedRoll(state, [5, 5]);
  if (state.phase !== 'exhibit') throw new Error(`expected the exhibit prompt, got ${state.phase}`);
  return [state, me];
}

function activate(state: GameState, p: PlayerState, cardId: CardId): void {
  const err = applyAction(state, p.id, { t: 'exhibit', cardId });
  if (err) throw new Error(`action rejected: ${err}`);
}

// 1. every copy of the chosen card fires
{
  const [state, me] = atExhibit((p) => {
    p.cards.convenience_store = 3;
  });
  activate(state, me, 'convenience_store');
  check('3 Convenience Stores pay 3 each', me.coins, 9);
}

// 2. a blue card pays only the Exhibit Hall's owner
{
  const [state, me] = atExhibit((p, s) => {
    p.cards.ranch = 2;
    const other = s.players.find((q) => q.id !== p.id)!;
    other.cards.ranch = 3;
    other.coins = 0;
  });
  const other = state.players.find((q) => q.id !== me.id)!;
  activate(state, me, 'ranch');
  check('owner collects for both Ranches', me.coins, 2);
  check('opponent collects nothing', other.coins, 0);
}

// 3. Tuna Boat rolls once, then pays per copy
{
  const [state, me] = atExhibit((p) => {
    p.landmarks.harbor = true;
    p.cards.tuna_boat = 2;
  });
  activate(state, me, 'tuna_boat');
  const roll = Number(state.log.filter((e) => e.key === 'log.tunaRoll').at(-1)!.params!.total);
  check('2 Tuna Boats pay twice one roll', me.coins, roll * 2);
}

// 4. the market only draws once it drops back below 10 stacks on offer
{
  const onOffer = (s: GameState) => Object.values(s.supply).filter((n) => (n ?? 0) > 0).length;
  const [state, me] = atExhibit((p, s) => {
    p.cards.ranch = 1;
    p.coins = 50;
    // take the Exhibit Hall off the market, and top the offer back up to 10 so
    // that its return pushes the market to 11
    s.supply.exhibit_hall = 0;
    const spare = (Object.keys(s.supply) as CardId[]).find((id) => (s.supply[id] ?? 0) === 0 && id !== 'exhibit_hall')!;
    s.supply[spare] = 1;
  });
  check('the market starts at 10 stacks', onOffer(state), 10);

  const deckBefore = state.deck.length;
  activate(state, me, 'ranch');
  check('returning the Exhibit Hall makes 11 stacks', onOffer(state), 11);
  check('no card was drawn at 11', state.deck.length, deckBefore);

  // buying out a one-card stack takes the market back to 10 — still no draw
  const thin = (Object.keys(state.supply) as CardId[]).find(
    (id) => state.supply[id] === 1 && CARD_BY_ID[id].cost <= 50 && id !== 'exhibit_hall'
  )!;
  const err = applyAction(state, me.id, { t: 'buy', cardId: thin });
  if (err) throw new Error(`buy rejected: ${err}`);
  check('the market is back to 10 stacks', onOffer(state), 10);
  check('no card was drawn at 10', state.deck.length, deckBefore);
}

if (failures > 0) {
  console.error(`${failures} check(s) failed`);
  process.exit(1);
}
console.log('all checks passed');
