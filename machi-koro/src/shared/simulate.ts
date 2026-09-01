/**
 * Rule tests + bot-vs-bot simulation.  Run with `npm run simulate [games]`.
 *
 * The simulation is the safety net for the engine: it plays whole games, checks
 * invariants after every action, and fails loudly on an illegal state.
 */
import { LANDMARK_BY_ID, cardsFor, describeRules, landmarksFor, winLandmarks, type CardId, type RuleSet } from './cards';
import {
  LANGS,
  cardName,
  cardText,
  hasTranslation,
  landmarkName,
  landmarkText,
  mayorText,
  messages,
  placeholders,
  statName,
  t,
} from './i18n';
import { botAction } from './bot';
import { BASELINE, type BotWeights } from './bot-weights';
import { CITY_EVENTS, type CityEventId } from './events';
import { MAYORS, MAX_TABLE, MIN_TABLE, mayorTuning, type MayorId, type MayorTuning } from './mayors';
import {
  activePlayer,
  applyAction,
  applyForcedRoll,
  canBuild,
  canBuy,
  closedCopies,
  copies,
  createGame,
  findPlayer,
  hasWon,
  incomeAt,
  landmarkCost,
  type Seat,
} from './engine';
import type { GameAction, GameState, PlayerState } from './types';

const BASE: RuleSet = { harbor: false, millionaires: false, variableSupply: false };
const HARBOR: RuleSet = { harbor: true, millionaires: false, variableSupply: false };
const ROW: RuleSet = { harbor: false, millionaires: true, variableSupply: false };
const BRIGHT: RuleSet = { harbor: true, millionaires: true, variableSupply: false };
const BRIGHT_VAR: RuleSet = { harbor: true, millionaires: true, variableSupply: true };
const EVENTS: RuleSet = { harbor: true, millionaires: true, variableSupply: false, events: true, mayors: false };
const MAYORS_ON: RuleSet = { harbor: true, millionaires: true, variableSupply: false, events: false, mayors: true };
const EVERYTHING: RuleSet = { harbor: true, millionaires: true, variableSupply: true, events: true, mayors: true };

let failures = 0;

function check(label: string, condition: boolean, detail = ''): void {
  if (!condition) {
    failures++;
    console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

function expect(label: string, actual: unknown, wanted: unknown): void {
  check(label, Object.is(actual, wanted), `expected ${String(wanted)}, got ${String(actual)}`);
}

function seats(n: number): Seat[] {
  return Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `P${i}`, isBot: true }));
}

/** Hand a player some cards, taking them out of the supply so conservation still holds. */
function give(state: GameState, p: PlayerState, id: CardId, n = 1): void {
  p.cards[id] = (p.cards[id] ?? 0) + n;
  state.supply[id] = (state.supply[id] ?? 0) - n;
}

function stacksOnOffer(state: GameState): number {
  return Object.values(state.supply).filter((n) => (n ?? 0) > 0).length;
}

/** Roll, buy nothing, hand the turn on — for tests that need the table to come round. */
function passTurn(state: GameState): void {
  const p = activePlayer(state);
  applyForcedRoll(state, [4]);
  applyAction(state, p.id, { t: 'pass' });
}

/** The first seeded game whose opening two-dice roll comes up `total`. */
function rollingTotal(total: number, make: (seed: number) => GameState): GameState {
  for (let seed = 1; seed < 2000; seed++) {
    const g = make(seed);
    applyAction(g, activePlayer(g).id, { t: 'roll', dice: 2 });
    if (g.diceTotal === total) return g;
  }
  throw new Error(`no seed opened on a ${total}`);
}

// ---------------------------------------------------------------------------
// invariants
// ---------------------------------------------------------------------------

function checkInvariants(state: GameState, where: string): void {
  for (const p of state.players) {
    check(`${where}: ${p.name} coins never negative`, p.coins >= 0, `coins=${p.coins}`);
    check(`${where}: ${p.name} investment never negative`, p.investment >= 0);

    // The stats ledger has to account for every coin, or the post-game table lies.
    const s = p.stats;
    const byKeyEarned = Object.values(s.byKey).reduce((a, row) => a + (row?.earned ?? 0), 0);
    const byKeyLost = Object.values(s.byKey).reduce((a, row) => a + (row?.lost ?? 0), 0);
    const byKeySpent = Object.values(s.byKey).reduce((a, row) => a + (row?.spent ?? 0), 0);
    check(`${where}: ${p.name} per-building earnings add up`, byKeyEarned === s.earned, `${byKeyEarned} != ${s.earned}`);
    check(`${where}: ${p.name} per-building losses add up`, byKeyLost === s.lost, `${byKeyLost} != ${s.lost}`);
    // Investments are booked against the Tech Startup too, so they belong here
    // even though they are not a purchase.
    const paidOut = s.spentOnCards + s.spentOnLandmarks + s.invested;
    check(
      `${where}: ${p.name} per-building costs add up`,
      byKeySpent === paidOut,
      `${byKeySpent} != ${paidOut}`
    );
    check(`${where}: ${p.name} bank share within earnings`, s.fromBank <= s.earned && s.fromBank >= 0);
    check(`${where}: ${p.name} bank share within losses`, s.toBank <= s.lost && s.toBank >= 0);
    for (const [id, n] of Object.entries(p.cards)) {
      check(`${where}: ${p.name} card count non-negative`, (n ?? 0) >= 0, `${id}=${n}`);
    }
    for (const [id, n] of Object.entries(p.closed)) {
      check(
        `${where}: ${p.name} cannot close more ${id} than they own`,
        (n ?? 0) <= copies(p, id as CardId),
        `${n} closed of ${copies(p, id as CardId)}`
      );
    }
  }

  // Card conservation: deck + supply + everything owned must match the initial totals.
  const startingHand: Record<string, number> = { wheat_field: state.players.length, bakery: state.players.length };
  const inDeck = new Map<string, number>();
  for (const id of state.deck) inDeck.set(id, (inDeck.get(id) ?? 0) + 1);

  for (const card of cardsFor(state.rules)) {
    const initial = (card.icon === 'major' ? state.players.length : 6) + (startingHand[card.id] ?? 0);
    const owned = state.players.reduce((a, p) => a + (p.cards[card.id] ?? 0), 0);
    const inSupply = state.supply[card.id] ?? 0;
    const total = inSupply + owned + (inDeck.get(card.id) ?? 0);
    check(`${where}: ${card.name} conserved`, inSupply >= 0 && total === initial, `${total} != ${initial}`);
  }

  // Nobody owns two of the same major establishment.
  for (const p of state.players) {
    for (const card of cardsFor(state.rules)) {
      if (card.icon === 'major') {
        check(`${where}: ${p.name} has at most one ${card.name}`, (p.cards[card.id] ?? 0) <= 1);
      }
    }
  }

  // The variable supply keeps ten stacks up (an Exhibit Hall coming back can make eleven).
  if (state.rules.variableSupply) {
    const stacks = stacksOnOffer(state);
    check(`${where}: sensible number of stacks`, stacks <= 11, `${stacks} stacks`);
    check(`${where}: stacks refilled while the deck lasts`, stacks >= 10 || state.deck.length === 0, `${stacks} stacks, ${state.deck.length} in deck`);
  }
}

/**
 * Every coin a player holds is either one of the three they started with or one
 * the ledger booked, so the post-game table can be trusted. Only the full games
 * are checked: the rule tests hand out coins directly to set up a position.
 */
function checkLedger(state: GameState, where: string): void {
  for (const p of state.players) {
    const s = p.stats;
    const purse = 3 + s.earned - s.lost - s.spentOnCards - s.spentOnLandmarks - s.invested;
    check(`${where}: ${p.name} ledger matches the purse`, purse === p.coins, `ledger=${purse}, coins=${p.coins}`);
    check(`${where}: ${p.name} peak is at least the purse`, s.peakCoins >= p.coins, `${s.peakCoins} < ${p.coins}`);
  }
}

/** End-of-game sanity for the numbers the post-game table shows. */
function statsSanity(state: GameState, where: string): void {
  const turns = state.players.reduce((a, p) => a + p.stats.turns, 0);
  expect(`${where}: turns add up to the turn counter`, turns, state.turnCount);

  // Coins taken off another player have to land on someone: what the table
  // calls "from opponents" and "to opponents" are two views of the same moves.
  const taken = state.players.reduce((a, p) => a + p.stats.earned - p.stats.fromBank, 0);
  const given = state.players.reduce((a, p) => a + p.stats.lost - p.stats.toBank, 0);
  expect(`${where}: coins taken from opponents match coins handed over`, taken, given);

  // The awards read off these two: they are one set of moves seen from both
  // ends, and a subset of everything that reached a player rather than the bank.
  const stolen = state.players.reduce((a, p) => a + p.stats.stolenFromOthers, 0);
  const handed = state.players.reduce((a, p) => a + p.stats.paidToOthers, 0);
  expect(`${where}: what was stolen matches what was paid over`, stolen, handed);
  check(`${where}: and never counts more than the coins that changed hands`, stolen <= taken, `${stolen} > ${taken}`);

  for (const p of state.players) {
    check(`${where}: ${p.name} rolled at least once a turn`, p.stats.rolls >= p.stats.turns, `${p.stats.rolls} rolls, ${p.stats.turns} turns`);
    for (const [id, row] of Object.entries(p.stats.byKey)) {
      check(`${where}: ${p.name} ${id} has no negative figures`, (row?.hits ?? 0) >= 0 && (row?.earned ?? 0) >= 0 && (row?.lost ?? 0) >= 0 && (row?.spent ?? 0) >= 0);
    }
  }
}

// ---------------------------------------------------------------------------
// base + harbor rules
// ---------------------------------------------------------------------------

function baseRuleTests(): void {
  {
    // Starting position
    const g = createGame(seats(4), HARBOR, 1);
    expect('starts with 3 coins', g.players[0].coins, 3);
    expect('starts with a Wheat Field', g.players[0].cards.wheat_field, 1);
    expect('starts with a Bakery', g.players[0].cards.bakery, 1);
    expect('City Hall is free', g.players[0].landmarks.city_hall, true);
    expect('Harbor is not free', g.players[0].landmarks.harbor, false);
    expect('6 winning landmarks with Harbor', winLandmarks(HARBOR).length, 6);
    expect('4 winning landmarks in the base game', winLandmarks(BASE).length, 4);
    expect('base game has 15 establishments', cardsFor(BASE).length, 15);
    expect('harbor game has 25 establishments', cardsFor(HARBOR).length, 25);
    expect('everything together is 39 establishments', cardsFor(BRIGHT).length, 39);
    expect('majors are one per player', g.supply.stadium, 4);
    expect('other cards have 6 copies', g.supply.ranch, 6);
  }

  {
    // Blue pays everyone; green pays only the active player.
    const g = createGame(seats(3), HARBOR, 7);
    const [a, b] = g.players;
    applyForcedRoll(g, [1]);
    expect('active player collects Wheat Field', a.coins, 4);
    expect('opponent collects Wheat Field too', b.coins, 4);

    const g2 = createGame(seats(3), HARBOR, 7);
    applyForcedRoll(g2, [3]);
    expect('active player collects Bakery', g2.players[0].coins, 4);
    expect('opponent gets nothing from a Bakery', g2.players[1].coins, 3);
  }

  {
    // Shopping Mall adds +1 to each bread/cup card.
    const g = createGame(seats(2), HARBOR, 11);
    const a = g.players[0];
    a.landmarks.shopping_mall = true;
    give(g, a, 'convenience_store');
    applyForcedRoll(g, [4]);
    expect('Shopping Mall boosts the Convenience Store', a.coins, 7);
  }

  {
    // Red cards take from the roller, capped by what the roller has.
    const g = createGame(seats(2), HARBOR, 13);
    const [a, b] = g.players;
    give(g, b, 'cafe');
    a.coins = 1;
    applyForcedRoll(g, [3]);
    expect('roller pays the Cafe', a.coins, 1);
    expect('cafe owner collects', b.coins, 4);

    const g2 = createGame(seats(2), BASE, 13);
    give(g2, g2.players[1], 'family_restaurant');
    g2.players[0].coins = 1;
    applyForcedRoll(g2, [9]);
    expect('a broke roller pays what they have', g2.players[0].coins, 0);
    expect('restaurant owner only gets what was there', g2.players[1].coins, 4);
  }

  {
    // Multiplier cards.
    const g = createGame(seats(2), HARBOR, 17);
    const a = g.players[0];
    give(g, a, 'ranch', 3);
    give(g, a, 'cheese_factory');
    applyForcedRoll(g, [7]);
    expect('Cheese Factory pays per cow', a.coins, 12);
  }

  {
    // Harbor turns a 10 into a 12 and triggers the Food Warehouse.
    const g = createGame(seats(2), HARBOR, 19);
    const a = g.players[0];
    a.landmarks.harbor = true;
    give(g, a, 'food_warehouse');
    give(g, a, 'cafe', 2);
    applyForcedRoll(g, [5, 5]);
    expect('a total of 10 does not reach the Food Warehouse', a.coins, 3);
    const g2 = createGame(seats(2), HARBOR, 19);
    const a2 = g2.players[0];
    a2.landmarks.harbor = true;
    give(g2, a2, 'food_warehouse');
    give(g2, a2, 'cafe', 2);
    applyForcedRoll(g2, [6, 6]);
    expect('Food Warehouse pays per cup', a2.coins, 7);
  }

  {
    // Boats need a Harbor.
    const g = createGame(seats(2), HARBOR, 23);
    const a = g.players[0];
    give(g, a, 'mackerel_boat');
    applyForcedRoll(g, [4, 4]);
    expect('Mackerel Boat is dead without a Harbor', a.coins, 3);
    a.landmarks.harbor = true;
    a.coins = 3;
    applyForcedRoll(g, [4, 4]);
    expect('Mackerel Boat pays 3 with a Harbor', a.coins, 6);
  }

  {
    // Stadium, Tax Office, Publisher.
    const g = createGame(seats(3), HARBOR, 29);
    const [a, b, c] = g.players;
    give(g, a, 'stadium');
    b.coins = 1;
    c.coins = 10;
    applyForcedRoll(g, [3, 3]);
    expect('Stadium takes 2 from each, or all they have', a.coins, 3 + 1 + 2);
    expect('a poor player pays what they can', b.coins, 0);
    expect('a rich player pays 2', c.coins, 8);

    const g2 = createGame(seats(2), HARBOR, 29);
    give(g2, g2.players[0], 'tax_office');
    g2.players[1].coins = 11;
    applyForcedRoll(g2, [4, 4]);
    expect('Tax Office halves a rich opponent', g2.players[1].coins, 6);
    expect('Tax Office collects the difference', g2.players[0].coins, 8);

    const g3 = createGame(seats(2), HARBOR, 29);
    give(g3, g3.players[0], 'publisher');
    g3.players[1].coins = 20;
    give(g3, g3.players[1], 'cafe');
    applyForcedRoll(g3, [3, 4]);
    expect('Publisher charges per bread and cup', g3.players[1].coins, 18);
  }

  {
    // TV Station and Business Center pause for a decision.
    const g = createGame(seats(2), HARBOR, 31);
    const [a, b] = g.players;
    give(g, a, 'tv_station');
    b.coins = 9;
    applyForcedRoll(g, [3, 3]);
    expect('TV Station waits for a target', g.phase, 'tv');
    expect('non-active player cannot answer', applyAction(g, b.id, { t: 'tv', targetId: a.id }), 'err.notYourTurn');
    check('TV Station resolves', applyAction(g, a.id, { t: 'tv', targetId: b.id }) === null);
    expect('TV Station takes 5', b.coins, 4);
    expect('after the choice, it is time to build', g.phase, 'build');

    const g2 = createGame(seats(2), HARBOR, 31);
    give(g2, g2.players[0], 'business_center');
    applyForcedRoll(g2, [3, 3]);
    expect('Business Center waits for a swap', g2.phase, 'trade');
    check(
      'majors cannot be swapped',
      applyAction(g2, g2.players[0].id, {
        t: 'trade',
        targetId: g2.players[1].id,
        give: 'business_center',
        take: 'bakery',
      }) === 'err.noMajorSwap'
    );
    check(
      'swap goes through',
      applyAction(g2, g2.players[0].id, { t: 'trade', targetId: g2.players[1].id, give: 'bakery', take: 'wheat_field' }) === null
    );
    expect('gave away the Bakery', g2.players[0].cards.bakery, 0);
    expect('received a Wheat Field', g2.players[0].cards.wheat_field, 2);
    expect('opponent got the Bakery', g2.players[1].cards.bakery, 2);
    checkInvariants(g2, 'after a swap');
  }

  {
    // Buying, the Train Station gate, and the City Hall top-up.
    const g = createGame(seats(2), HARBOR, 37);
    const a = g.players[0];
    expect('two dice need a Train Station', applyAction(g, a.id, { t: 'roll', dice: 2 }), 'err.needTrainStation');
    a.coins = 0;
    applyForcedRoll(g, [5]);
    expect('City Hall tops a broke player up to 1', a.coins, 1);
    expect('cannot afford the Forest', applyAction(g, a.id, { t: 'buy', cardId: 'forest' }), 'err.cannotBuy');
    check('can buy a Wheat Field', applyAction(g, a.id, { t: 'buy', cardId: 'wheat_field' }) === null);
    expect('supply went down', g.supply.wheat_field, 5);
    expect('turn passed to the next player', g.turn, 1);
  }

  {
    // Amusement Park grants a second turn on doubles.
    const g = createGame(seats(2), HARBOR, 41);
    const a = g.players[0];
    a.landmarks.amusement_park = true;
    a.landmarks.train_station = true;
    applyForcedRoll(g, [2, 2]);
    check('extra turn queued', g.extraTurn);
    applyAction(g, a.id, { t: 'pass' });
    expect('same player goes again', g.turn, 0);
    expect('extra turn consumed', g.extraTurn, false);
  }

  {
    // Airport pays for building nothing.
    const g = createGame(seats(2), HARBOR, 43);
    const a = g.players[0];
    a.landmarks.airport = true;
    applyForcedRoll(g, [5]);
    const before = a.coins;
    applyAction(g, a.id, { t: 'pass' });
    expect('Airport pays 10', a.coins, before + 10);
  }

  {
    // Winning requires every landmark.
    const g = createGame(seats(2), HARBOR, 47);
    const a = g.players[0];
    for (const l of winLandmarks(HARBOR)) a.landmarks[l.id] = true;
    a.landmarks.airport = false;
    a.coins = 30;
    check('not a winner yet', !hasWon(g, a));
    applyForcedRoll(g, [5]);
    check('builds the Airport', applyAction(g, a.id, { t: 'landmark', landmarkId: 'airport' }) === null);
    expect('game is over', g.phase, 'over');
    expect('winner recorded', g.winnerId, a.id);
    expect('no further actions', applyAction(g, a.id, { t: 'pass' }), 'err.gameOver');
  }

  {
    // Base variant hides the expansions.
    const g = createGame(seats(2), BASE, 53);
    expect('no City Hall in the base game', g.players[0].landmarks.city_hall, undefined);
    expect('no Harbor cards in the supply', g.supply.tuna_boat, undefined);
    expect('no Millionaire’s Row cards either', g.supply.winery, undefined);
    applyForcedRoll(g, [5]);
    expect('cannot buy expansion cards', applyAction(g, g.players[0].id, { t: 'buy', cardId: 'sushi_bar' }), 'err.cannotBuy');
  }
}

// ---------------------------------------------------------------------------
// millionaire's row
// ---------------------------------------------------------------------------

function millionairesRuleTests(): void {
  {
    // Corn Field and General Store only pay while you are behind.
    const g = createGame(seats(2), ROW, 101);
    const a = g.players[0];
    give(g, a, 'corn_field');
    applyForcedRoll(g, [4]);
    expect('Corn Field pays while you are behind', a.coins, 4);
    a.landmarks.train_station = true;
    a.landmarks.amusement_park = true;
    a.coins = 3;
    applyForcedRoll(g, [4]);
    expect('Corn Field dries up once you have 2 landmarks', a.coins, 3);

    const g2 = createGame(seats(2), ROW, 102);
    const b = g2.players[0];
    give(g2, b, 'general_store');
    b.landmarks.shopping_mall = true;
    applyForcedRoll(g2, [2]);
    expect('Shopping Mall boosts the General Store and Bakery', b.coins, 3 + 3 + 2);
  }

  {
    // The Loan Office pays you to take it, then bites.
    const g = createGame(seats(2), ROW, 103);
    const a = g.players[0];
    applyForcedRoll(g, [4]);
    check('the Loan Office is always affordable', applyAction(g, a.id, { t: 'buy', cardId: 'loan_office' }) === null);
    expect('and hands over 5 coins', a.coins, 8);

    const g2 = createGame(seats(2), ROW, 104);
    const a2 = g2.players[0];
    give(g2, a2, 'loan_office');
    applyForcedRoll(g2, [5]);
    expect('the Loan Office charges 2 when it activates', a2.coins, 1);
  }

  {
    // Vineyards feed the Winery, which then shuts for renovation.
    const g = createGame(seats(2), ROW, 105);
    const a = g.players[0];
    give(g, a, 'vineyard', 2);
    give(g, a, 'winery');
    applyForcedRoll(g, [9]);
    expect('Winery pays 6 per Vineyard', a.coins, 15);
    expect('Winery closes itself', closedCopies(a, 'winery'), 1);
    a.coins = 0;
    applyForcedRoll(g, [9]);
    expect('a closed Winery pays nothing', a.coins, 0);
    expect('but it reopens', closedCopies(a, 'winery'), 0);
    applyForcedRoll(g, [7]);
    expect('Vineyards pay 3 each', a.coins, 6);
  }

  {
    // Demolition Company.
    const g = createGame(seats(2), ROW, 106);
    const a = g.players[0];
    give(g, a, 'demolition_company');
    a.landmarks.train_station = true;
    applyForcedRoll(g, [4]);
    expect('Demolition Company waits for a target', g.phase, 'demolish');
    check('demolition resolves', applyAction(g, a.id, { t: 'demolish', landmarkId: 'train_station' }) === null);
    expect('the landmark comes down', a.landmarks.train_station, false);
    expect('and pays 8', a.coins, 11);
    expect('then it is time to build', g.phase, 'build');

    const g2 = createGame(seats(2), ROW, 107);
    give(g2, g2.players[0], 'demolition_company');
    applyForcedRoll(g2, [4]);
    expect('nothing to demolish means no payout', g2.players[0].coins, 3);
    expect('and no prompt', g2.phase, 'build');
  }

  {
    // Moving Company.
    const g = createGame(seats(2), ROW, 108);
    const [a, b] = g.players;
    give(g, a, 'moving_company');
    applyForcedRoll(g, [9]);
    expect('Moving Company waits', g.phase, 'moving');
    check('the move resolves', applyAction(g, a.id, { t: 'moving', targetId: b.id, give: 'wheat_field' }) === null);
    expect('the card leaves your city', copies(a, 'wheat_field'), 0);
    expect('and lands in theirs', copies(b, 'wheat_field'), 2);
    expect('you get 4 coins for it', a.coins, 7);
    checkInvariants(g, 'after a move');
  }

  {
    // French Restaurant and Member's Only Club punish the leader.
    const g = createGame(seats(2), ROW, 109);
    const [a, b] = g.players;
    give(g, b, 'french_restaurant');
    applyForcedRoll(g, [5]);
    expect('French Restaurant needs a roller with 2 landmarks', b.coins, 3);
    a.landmarks.train_station = true;
    a.landmarks.shopping_mall = true;
    a.coins = 10;
    applyForcedRoll(g, [5]);
    expect('now it takes 5', b.coins, 8);
    expect('from the roller', a.coins, 5);

    const g2 = createGame(seats(2), ROW, 110);
    const [a2, b2] = g2.players;
    give(g2, b2, 'members_club');
    a2.landmarks.train_station = true;
    a2.landmarks.shopping_mall = true;
    a2.landmarks.amusement_park = true;
    a2.coins = 17;
    applyForcedRoll(g2, [6, 6]);
    expect('Member’s Only Club cleans the leader out', a2.coins, 0);
    expect('and takes the lot', b2.coins, 20);
  }

  {
    // Soda Bottling Plant counts cups across the whole table.
    const g = createGame(seats(2), ROW, 111);
    const [a, b] = g.players;
    give(g, a, 'soda_bottling_plant');
    give(g, a, 'cafe');
    give(g, b, 'french_restaurant', 2);
    applyForcedRoll(g, [5, 6]);
    expect('Soda Bottling Plant pays per cup everywhere', a.coins, 6);
  }

  {
    // Tech Startup: invest at the end of your turn, collect when it fires.
    const g = createGame(seats(2), ROW, 112);
    const a = g.players[0];
    give(g, a, 'tech_startup');
    applyForcedRoll(g, [5]);
    applyAction(g, a.id, { t: 'pass' });
    expect('Tech Startup offers an investment', g.phase, 'invest');
    check('investing works', applyAction(g, a.id, { t: 'invest', amount: 1 }) === null);
    expect('the coin sits on the card', a.investment, 1);
    expect('and leaves your purse', a.coins, 2);
    expect('the card is charged for it', a.stats.byKey.tech_startup?.spent, 1);
    expect('the turn then moves on', g.turn, 1);

    const g2 = createGame(seats(3), ROW, 113);
    const [a2, b2, c2] = g2.players;
    give(g2, a2, 'tech_startup');
    a2.investment = 3;
    b2.coins = 10;
    c2.coins = 2;
    applyForcedRoll(g2, [5, 5]);
    expect('each opponent pays the invested amount', a2.coins, 8);
    expect('a rich opponent pays in full', b2.coins, 7);
    expect('a poor one pays what they have', c2.coins, 0);
  }

  {
    // Exhibit Hall stands in for another card, then leaves.
    const g = createGame(seats(2), ROW, 114);
    const a = g.players[0];
    give(g, a, 'exhibit_hall');
    give(g, a, 'mine');
    applyForcedRoll(g, [5, 5]);
    expect('Exhibit Hall waits', g.phase, 'exhibit');
    const before = g.supply.exhibit_hall ?? 0;
    check('activating works', applyAction(g, a.id, { t: 'exhibit', cardId: 'mine' }) === null);
    expect('the stand-in pays out', a.coins, 8);
    expect('the Exhibit Hall goes back to the supply', g.supply.exhibit_hall, before + 1);
    expect('and you no longer own it', copies(a, 'exhibit_hall'), 0);
    checkInvariants(g, 'after an exhibit');

    const g2 = createGame(seats(2), ROW, 115);
    const a2 = g2.players[0];
    give(g2, a2, 'exhibit_hall');
    give(g2, a2, 'mine');
    applyForcedRoll(g2, [5, 5]);
    check('declining works', applyAction(g2, a2.id, { t: 'exhibit', cardId: null }) === null);
    expect('declining keeps the card', copies(a2, 'exhibit_hall'), 1);
    expect('and pays nothing', a2.coins, 3);
  }

  {
    // Renovation Company closes a card type everywhere.
    const g = createGame(seats(3), ROW, 116);
    const [a, b, c] = g.players;
    give(g, a, 'renovation_company');
    give(g, b, 'bakery', 2);
    applyForcedRoll(g, [4, 4]);
    expect('Renovation Company waits', g.phase, 'renovation');
    check('renovation resolves', applyAction(g, a.id, { t: 'renovation', cardId: 'bakery' }) === null);
    expect('every copy of theirs closes', closedCopies(b, 'bakery'), 3);
    expect('your own copies close too', closedCopies(a, 'bakery'), 1);
    expect('the busy opponent pays 3', b.coins, 0);
    expect('the other pays 1', c.coins, 2);
    expect('and you collect it all', a.coins, 7);
  }

  {
    // Park levels the table.
    const g = createGame(seats(3), ROW, 117);
    const [a, b, c] = g.players;
    give(g, a, 'park');
    a.coins = 10;
    b.coins = 3;
    c.coins = 0;
    applyForcedRoll(g, [5, 6]);
    expect('the Park rounds everyone up', a.coins, 5);
    expect('including the poorest', c.coins, 5);
    expect('and trims the richest', b.coins, 5);
  }

  {
    // Handing a closed card over must not leave a phantom token behind: the
    // giver used to keep a negative count, which read back as an extra open copy.
    const g = createGame(seats(2), ROW, 123);
    const [a, b] = g.players;
    give(g, a, 'vineyard');
    give(g, a, 'winery');
    give(g, a, 'moving_company');
    applyForcedRoll(g, [9]);
    expect('the Winery shuts itself', closedCopies(a, 'winery'), 1);
    expect('the Moving Company is waiting', g.phase, 'moving');
    check(
      'the closed Winery can be given away',
      applyAction(g, a.id, { t: 'moving', targetId: b.id, give: 'winery' }) === null
    );
    expect('the giver keeps no Winery', copies(a, 'winery'), 0);
    expect('and no token for one', closedCopies(a, 'winery'), 0);
    expect('the closed card travels with it', closedCopies(b, 'winery'), 1);

    give(g, a, 'winery');
    a.coins = 0;
    applyForcedRoll(g, [9]);
    expect('a replacement Winery pays for one copy, not two', a.coins, 6);

    // Give one of two closed copies away and the one that stays is still closed.
    const g2 = createGame(seats(2), ROW, 124);
    const [c, d] = g2.players;
    give(g2, c, 'vineyard');
    give(g2, c, 'winery', 2);
    give(g2, c, 'moving_company');
    applyForcedRoll(g2, [9]);
    expect('both Wineries shut', closedCopies(c, 'winery'), 2);
    check(
      'one of them moves on',
      applyAction(g2, c.id, { t: 'moving', targetId: d.id, give: 'winery' }) === null
    );
    expect('the copy left behind keeps its token', closedCopies(c, 'winery'), 1);
    expect('and the travelling one keeps its own', closedCopies(d, 'winery'), 1);
  }

  {
    // Space Port: one nudge per turn, before the Harbor, never below 1.
    const g = createGame(seats(2), BRIGHT, 119);
    const a = g.players[0];
    a.landmarks.space_port = true;
    a.landmarks.train_station = true;
    give(g, a, 'mine');
    applyAction(g, a.id, { t: 'roll', dice: 2 });
    expect('the Space Port asks first', g.phase, 'spaceport');
    const rolled = g.diceTotal;
    const tooFar = { t: 'spaceport', delta: 2 } as unknown as GameAction;
    expect('a nudge of 1 is all it moves', applyAction(g, a.id, tooFar), 'err.spacePortRange');
    check('and it moves the total', applyAction(g, a.id, { t: 'spaceport', delta: 1 }) === null);
    expect('by exactly one', g.diceTotal, rolled + 1);
    expect('only once a turn', applyAction(g, a.id, { t: 'spaceport', delta: 1 }), 'err.spacePortNotNow');

    // 9 → 10 opens the Harbor, which the roll alone would not have done.
    const g2 = createGame(seats(2), BRIGHT, 120);
    const b = g2.players[0];
    b.landmarks.space_port = true;
    b.landmarks.harbor = true;
    b.landmarks.train_station = true;
    g2.dice = [4, 5];
    g2.diceTotal = 9;
    g2.phase = 'spaceport';
    check('nudging up to 10', applyAction(g2, b.id, { t: 'spaceport', delta: 1 }) === null);
    expect('hands the roll to the Harbor', g2.phase, 'harbor');
    check('which adds its 2', applyAction(g2, b.id, { t: 'harbor', add: true }) === null);
    expect('for a total of 12', g2.diceTotal, 12);

    // A single die showing 1 cannot be nudged down to nothing.
    const g3 = createGame(seats(2), BRIGHT, 121);
    const c = g3.players[0];
    c.landmarks.space_port = true;
    g3.dice = [1];
    g3.diceTotal = 1;
    g3.phase = 'spaceport';
    expect('a total of 1 cannot go lower', applyAction(g3, c.id, { t: 'spaceport', delta: -1 }), 'err.spacePortRange');
    check('but it can stand', applyAction(g3, c.id, { t: 'spaceport', delta: 0 }) === null);
    expect('with the total untouched', g3.diceTotal, 1);
  }

  {
    // Winning now needs the Space Port too.
    const g = createGame(seats(2), BRIGHT, 122);
    const a = g.players[0];
    for (const l of winLandmarks(BRIGHT)) a.landmarks[l.id] = true;
    a.landmarks.space_port = false;
    a.coins = 50;
    check('the Airport is no longer the last one', !hasWon(g, a));
    applyForcedRoll(g, [5]);
    check('builds the Space Port', applyAction(g, a.id, { t: 'landmark', landmarkId: 'space_port' }) === null);
    expect('and that wins it', g.phase, 'over');
  }

  {
    // Variable supply setup.
    const g = createGame(seats(3), BRIGHT_VAR, 118);
    expect('ten stacks on offer', stacksOnOffer(g), 10);
    check('the rest waits in the deck', g.deck.length > 0);
    checkInvariants(g, 'variable supply setup');

    // buying out a stack draws a replacement
    const a = g.players[0];
    const target = (Object.keys(g.supply) as CardId[]).find((id) => (g.supply[id] ?? 0) > 0)!;
    g.supply[target] = 1;
    a.coins = 60;
    applyForcedRoll(g, [5]);
    const err = applyAction(g, a.id, { t: 'buy', cardId: target });
    check('bought the last copy of a stack', err === null, String(err));
    expect('a fresh stack replaced it', stacksOnOffer(g), 10);
  }
}

// ---------------------------------------------------------------------------
// the post-game ledger
// ---------------------------------------------------------------------------

function statsTests(): void {
  {
    // A restaurant credits its owner and bills the roller, both by name.
    const g = createGame(seats(2), HARBOR, 201);
    const [a, b] = g.players;
    give(g, b, 'cafe');
    applyForcedRoll(g, [3]);
    expect('the Café earned for its owner', b.stats.byKey.cafe?.earned, 1);
    expect('and counted its activation', b.stats.byKey.cafe?.hits, 1);
    expect('the roller is billed under the same card', a.stats.byKey.cafe?.lost, 1);
    expect('the roller did not "own" it', a.stats.byKey.cafe?.hits, 0);
    expect('coins from an opponent are not bank coins', b.stats.fromBank, 0);
    expect('but they still count as earnings', b.stats.earned, 1);
    expect('and as a loss for the payer', a.stats.lost, 1);
    expect('booked as paid to a player, not the bank', a.stats.toBank, 0);
  }

  {
    // Buying is a cost against the card; the Loan Office is a payout instead.
    const g = createGame(seats(2), ROW, 202);
    const a = g.players[0];
    a.coins = 10;
    applyForcedRoll(g, [4]);
    applyAction(g, a.id, { t: 'buy', cardId: 'ranch' });
    expect('the Ranch is booked at its price', a.stats.byKey.ranch?.spent, 1);
    expect('and against the establishment budget', a.stats.spentOnCards, 1);

    const g2 = createGame(seats(2), ROW, 203);
    const a2 = g2.players[0];
    applyForcedRoll(g2, [4]);
    applyAction(g2, a2.id, { t: 'buy', cardId: 'loan_office' });
    expect('taking on the Loan Office is earnings, not a cost', a2.stats.byKey.loan_office?.earned, 5);
    expect('nothing was spent on it', a2.stats.spentOnCards, 0);
  }

  {
    // A landmark is a row of its own, and the Airport keeps paying into it.
    const g = createGame(seats(2), HARBOR, 204);
    const a = g.players[0];
    a.coins = 30;
    applyForcedRoll(g, [1]);
    applyAction(g, a.id, { t: 'landmark', landmarkId: 'airport' });
    expect('the Airport is booked at its price', a.stats.byKey.airport?.spent, 30);
    expect('under the landmark budget', a.stats.spentOnLandmarks, 30);
    // Round the table back to the Airport's owner.
    while (activePlayer(g).id !== a.id) {
      applyForcedRoll(g, [1]);
      applyAction(g, activePlayer(g).id, { t: 'pass' });
    }
    applyForcedRoll(g, [1]);
    applyAction(g, a.id, { t: 'pass' });
    expect('and pays out when you build nothing', a.stats.byKey.airport?.earned, 10);
    expect('counting as a use of the landmark', a.stats.byKey.airport?.hits, 1);
  }

  {
    // The Park levels everyone up: the poor gain, the rich pay.
    const g = createGame(seats(2), ROW, 205);
    const [a, b] = g.players;
    give(g, a, 'park');
    a.coins = 1;
    b.coins = 9;
    applyForcedRoll(g, [11]);
    expect('the Park tops the poorer player up', a.coins, 5);
    expect('booking the difference as earnings', a.stats.byKey.park?.earned, 4);
    expect('and takes from the richer one', b.stats.byKey.park?.lost, 4);
    expect('the coins came off an opponent, not the bank', a.stats.fromBank, 0);
    expect('and went to an opponent, not the bank', b.stats.toBank, 0);
  }

  {
    // Rounding the share up can outrun the pot. Only that shortfall is the
    // bank's; the rest is the richer player's money changing hands.
    const g = createGame(seats(3), ROW, 206);
    const [a, b, c] = g.players;
    give(g, a, 'park');
    a.coins = 10;
    b.coins = 3;
    c.coins = 0;
    applyForcedRoll(g, [5, 6]);
    expect('the richest hands over the whole surplus', a.stats.byKey.park?.lost, 5);
    expect('none of which reaches the bank', a.stats.toBank, 0);
    expect('the poorest is levelled up to the share', c.stats.byKey.park?.earned, 5);
    expect('and the bank covers only the rounding', b.stats.fromBank + c.stats.fromBank, 2);
  }
}

// ---------------------------------------------------------------------------
// city events
// ---------------------------------------------------------------------------

/** A game parked on one city event, so a test is not at the mercy of the deck. */
function eventGame(event: CityEventId, seed: number, players = 2): GameState {
  const g = createGame(seats(players), EVENTS, seed);
  g.currentEvent = event;
  return g;
}

function eventRuleTests(): void {
  {
    // The boom adds a coin to every primary industry, for everybody.
    const g = eventGame('economic_boom', 401);
    const [a, b] = g.players;
    applyForcedRoll(g, [1]);
    expect('the boom tops up the roller’s Wheat Field', a.coins, 5);
    expect('and the opponent’s, blue paying the whole table', b.coins, 5);
  }

  {
    // The festival adds a coin to every restaurant bill.
    const g = eventGame('food_festival', 402);
    const [a, b] = g.players;
    give(g, b, 'cafe');
    applyForcedRoll(g, [3]);
    expect('the Café bills two at the festival', b.coins, 5);
    expect('and the roller pays before their own Bakery pays them', a.coins, 2);
  }

  {
    // The strike shaves a coin off the factory rate, floored at one.
    const g = eventGame('factory_strike', 403);
    const a = g.players[0];
    give(g, a, 'ranch', 2);
    give(g, a, 'cheese_factory');
    applyForcedRoll(g, [7]);
    expect('the Cheese Factory pays two a cow, not three', a.coins, 7);
  }

  {
    // The storm shuts the boats even for a city that built the Harbor.
    const g = eventGame('harbor_storm', 404);
    const a = g.players[0];
    a.landmarks.harbor = true;
    give(g, a, 'mackerel_boat');
    applyForcedRoll(g, [4, 4]);
    expect('the Mackerel Boat stays in port', a.coins, 3);
  }

  {
    // And the Harbor's own +2 goes with them.
    const g = rollingTotal(10, (seed) => {
      const s = eventGame('harbor_storm', seed);
      s.players[0].landmarks.harbor = true;
      s.players[0].landmarks.train_station = true;
      return s;
    });
    check('the storm withdraws the Harbor bonus', g.phase !== 'harbor', g.phase);
  }

  {
    // The big catch opens the boats to a city with no Harbor at all.
    const g = eventGame('big_catch', 405);
    const a = g.players[0];
    give(g, a, 'mackerel_boat');
    expect('the boat starts dry', a.landmarks.harbor, false);
    applyForcedRoll(g, [4, 4]);
    expect('the Mackerel Boat lands its three', a.coins, 6);
  }

  {
    // The inspector closes the priciest restaurant, and only that one.
    const g = eventGame('health_inspection', 406);
    const [, b] = g.players;
    give(g, b, 'cafe');
    give(g, b, 'family_restaurant');
    applyForcedRoll(g, [3]);
    expect('the cheap Café keeps billing', b.coins, 4);

    const g2 = eventGame('health_inspection', 407);
    const [, b2] = g2.players;
    give(g2, b2, 'cafe');
    give(g2, b2, 'family_restaurant');
    applyForcedRoll(g2, [4, 5]);
    expect('the priciest restaurant is shut', b2.coins, 3);
  }

  {
    // The tax takes a coin off anyone ending a turn on ten or more.
    const g = eventGame('tax_hike', 408);
    const a = g.players[0];
    a.coins = 10;
    applyForcedRoll(g, [4]);
    applyAction(g, a.id, { t: 'pass' });
    expect('a full purse is taxed', a.coins, 9);
    expect('the Tax Office is not blamed for it', a.stats.byKey.tax_office?.lost, undefined);
    expect('the event carries the charge', a.stats.byKey.tax_hike?.lost, 1);
  }

  {
    // Social aid picks a broke player up as their turn opens.
    const g = eventGame('social_aid', 409);
    const [a, b] = g.players;
    b.coins = 0;
    applyForcedRoll(g, [4]);
    applyAction(g, a.id, { t: 'pass' });
    expect('the broke player is helped up', b.coins, 2);
    expect('the City Hall is not credited for it', b.stats.byKey.city_hall?.earned, undefined);
    expect('the event is', b.stats.byKey.social_aid?.earned, 2);
  }

  {
    // A seven pays a bonus while the clover is out.
    const g = eventGame('lucky_seven', 410);
    const a = g.players[0];
    applyForcedRoll(g, [3, 4]);
    expect('the seven pays three', a.coins, 6);
    expect('the Wheat Field is not credited for it', a.stats.byKey.wheat_field?.earned, undefined);
    expect('the event is', a.stats.byKey.lucky_seven?.earned, 3);
  }

  {
    // The grant knocks two coins off every landmark, floored at one.
    const g = eventGame('urban_grant', 411);
    const a = g.players[0];
    a.coins = 2;
    applyForcedRoll(g, [4]);
    const err = applyAction(g, a.id, { t: 'landmark', landmarkId: 'train_station' });
    check('the grant puts the Train Station in reach', err === null, String(err));
    expect('and it is charged at the granted price', a.coins, 0);
    expect('booked at what was actually paid', a.stats.byKey.train_station?.spent, 2);
  }

  {
    // The subsidy knocks a coin off every establishment, floored at one.
    const g = eventGame('subsidized_market', 412);
    const a = g.players[0];
    a.coins = 1;
    applyForcedRoll(g, [4]);
    const err = applyAction(g, a.id, { t: 'buy', cardId: 'cafe' });
    check('the Café is affordable at the subsidised price', err === null, String(err));
    expect('and never drops below one coin', a.coins, 0);
  }

  {
    // Anti-monopoly locks the landmark leader out of the major establishments.
    const g = eventGame('anti_monopoly', 413);
    const [a, b] = g.players;
    a.landmarks.train_station = true;
    a.coins = 40;
    b.coins = 40;
    expect('the leader cannot take a major', canBuy(g, a, 'stadium'), false);
    expect('the player behind still can', canBuy(g, b, 'stadium'), true);
  }

  {
    // A round rolling over draws the next event and pays the anti-monopoly aid.
    const g = createGame(seats(2), EVENTS, 414);
    g.eventDeck = ['anti_monopoly'];
    g.currentEvent = 'lucky_seven';
    const [a, b] = g.players;
    a.landmarks.train_station = true;
    passTurn(g);
    passTurn(g);
    expect('the round turned the event over', g.currentEvent, 'anti_monopoly');
    expect('the trailing city is handed aid', b.stats.byKey.anti_monopoly?.earned, 2);
    expect('the leader is not', a.stats.byKey.anti_monopoly?.earned, undefined);
  }
}

// ---------------------------------------------------------------------------
// mayors
// ---------------------------------------------------------------------------

/** Hand the mayors out by name, so no random pick can colour a test. */
function withMayors(state: GameState, ...mayors: (MayorId | null)[]): GameState {
  state.players.forEach((p, i) => {
    p.mayor = mayors[i] ?? null;
  });
  return state;
}

function mayorRuleTests(): void {
  // Every game below seats two, so these are the two-player dials: the numbers
  // are deliberately literal, because a test that recomputes them from
  // `mayorTuning` would pass whatever the tuning happened to say.
  const two = mayorTuning(2);
  expect('the two-player Agronomist wants six fields', two.agronomistBlue, 6);
  expect('the two-player Restaurateur keeps two back', two.restaurateurShield, 2);
  expect('the two-player Banker pays two', two.bankerDividend, 2);
  expect('the two-player Urbanist rebates two', two.urbanistCashback, 2);
  expect('the two-player Navigator reaches a six', two.adventurerHarbor, 6);

  {
    // The Industrialist's coin rides on the factory firing, not on owning it.
    const g = withMayors(createGame(seats(2), MAYORS_ON, 301), 'industrialist', null);
    const a = g.players[0];
    give(g, a, 'cheese_factory');
    applyForcedRoll(g, [7]);
    expect('a cowless Cheese Factory pays nothing', a.coins, 3);
  }

  {
    // The extra coin rides on every icon the factory counts, not on the payout.
    const g = withMayors(createGame(seats(2), MAYORS_ON, 302), 'industrialist', null);
    const a = g.players[0];
    give(g, a, 'ranch', 2);
    give(g, a, 'cheese_factory');
    applyForcedRoll(g, [7]);
    expect('a factory that does fire pays a coin more per cow', a.coins, 11);
  }

  {
    // Every green card wearing the factory icon is a factory, as the text says.
    const g = withMayors(createGame(seats(2), MAYORS_ON, 315), 'industrialist', null);
    const a = g.players[0];
    give(g, a, 'cafe', 2);
    give(g, a, 'food_warehouse');
    applyForcedRoll(g, [6, 6]);
    expect('the Food Warehouse counts as one too', a.coins, 3 + 3 * 2);
  }

  {
    // Building a landmark hands the Urbanist a rebate and a reroll for later.
    const g = withMayors(createGame(seats(2), MAYORS_ON, 303), 'urbanist', null);
    const a = g.players[0];
    a.coins = 40;
    applyForcedRoll(g, [4]);
    const err = applyAction(g, a.id, { t: 'landmark', landmarkId: 'train_station' });
    check('the landmark went up', err === null, String(err));
    expect('the Urbanist banks a rebate', a.stats.byKey.urbanist?.earned, 2);
    expect('the City Hall is not credited for it', a.stats.byKey.city_hall?.earned, undefined);
    expect('and holds a free reroll', a.mayorRerollAvailable, true);
  }

  {
    // The Radio Tower pays for its own reroll; the Urbanist's charge is not spent.
    const g = withMayors(createGame(seats(2), MAYORS_ON, 304), 'urbanist', null);
    const a = g.players[0];
    a.landmarks.radio_tower = true;
    a.mayorRerollAvailable = true;
    applyAction(g, a.id, { t: 'roll', dice: 1 });
    expect('the reroll prompt is up', g.phase, 'reroll');
    applyAction(g, a.id, { t: 'reroll', again: true });
    expect('the Radio Tower is credited', a.stats.byKey.radio_tower?.hits, 1);
    expect('and the Urbanist keeps their charge', a.mayorRerollAvailable, true);
  }

  {
    // With no tower it is the mayor's charge that pays, and the mayor's row.
    const g = withMayors(createGame(seats(2), MAYORS_ON, 305), 'urbanist', null);
    const a = g.players[0];
    a.mayorRerollAvailable = true;
    applyAction(g, a.id, { t: 'roll', dice: 1 });
    expect('the charge opens the reroll prompt', g.phase, 'reroll');
    applyAction(g, a.id, { t: 'reroll', again: true });
    expect('the charge is spent', a.mayorRerollAvailable, false);
    expect('the Radio Tower is not credited for a reroll it never gave', a.stats.byKey.radio_tower?.hits, undefined);
    expect('the mayor is', a.stats.byKey.urbanist?.hits, 1);
  }

  {
    // Nobody else gets a second look at the dice.
    const g = withMayors(createGame(seats(2), MAYORS_ON, 313), null, null);
    const a = g.players[0];
    applyAction(g, a.id, { t: 'roll', dice: 1 });
    check('a plain city rolls once', g.phase !== 'reroll', g.phase);
  }

  {
    // Opponents cannot take the Restaurateur's last two coins.
    const g = withMayors(createGame(seats(2), MAYORS_ON, 306), 'restaurateur', null);
    const [a, b] = g.players;
    give(g, b, 'family_restaurant');
    a.coins = 3;
    expect('the preview owes only what can be taken', incomeAt(g, a, 9).onYourTurn, -1);
    applyForcedRoll(g, [4, 5]);
    expect('the Restaurateur keeps two back', a.coins, 2);
    expect('the restaurant collects only what it could take', b.coins, 4);
  }

  {
    // Restaurants come a coin cheaper for the Restaurateur.
    const g = withMayors(createGame(seats(2), MAYORS_ON, 307), 'restaurateur', null);
    const a = g.players[0];
    a.coins = 1;
    applyForcedRoll(g, [4]);
    const err = applyAction(g, a.id, { t: 'buy', cardId: 'cafe' });
    check('the Café is affordable at the discount', err === null, String(err));
    expect('and charged at it', a.coins, 0);
    expect('booked at what was actually paid', a.stats.byKey.cafe?.spent, 1);
  }

  {
    // Six fields open the Agronomist's turn a coin up.
    const g = withMayors(createGame(seats(2), MAYORS_ON, 308), 'agronomist', null);
    const a = g.players[0];
    give(g, a, 'ranch', 5);
    passTurn(g);
    passTurn(g);
    expect('the Agronomist draws a subsidy', a.stats.byKey.agronomist?.earned, 1);
    expect('the Wheat Field is not credited for it', a.stats.byKey.wheat_field?.earned, undefined);
  }

  {
    // Five fields are not yet a farm.
    const g = withMayors(createGame(seats(2), MAYORS_ON, 314), 'agronomist', null);
    const a = g.players[0];
    give(g, a, 'ranch', 4);
    passTurn(g);
    passTurn(g);
    expect('five fields draw nothing', a.stats.byKey.agronomist?.earned, undefined);
  }

  {
    // The Banker takes a dividend on a turn ended with six coins.
    const g = withMayors(createGame(seats(2), MAYORS_ON, 309), 'banker', null);
    const a = g.players[0];
    a.coins = 6;
    applyForcedRoll(g, [4]);
    applyAction(g, a.id, { t: 'pass' });
    expect('the dividend lands', a.coins, 8);
    expect('booked to the mayor', a.stats.byKey.banker?.earned, 2);
    expect('and not to the Wheat Field', a.stats.byKey.wheat_field?.earned, undefined);
  }

  {
    // The Navigator's Harbor reaches down to a six at this table size.
    const g = rollingTotal(6, (seed) => {
      const s = withMayors(createGame(seats(2), MAYORS_ON, seed), 'adventurer', null);
      s.players[0].landmarks.harbor = true;
      s.players[0].landmarks.train_station = true;
      return s;
    });
    expect('the Harbor is offered on a six', g.phase, 'harbor');
  }

  {
    const g = rollingTotal(6, (seed) => {
      const s = withMayors(createGame(seats(2), MAYORS_ON, seed), null, null);
      s.players[0].landmarks.harbor = true;
      s.players[0].landmarks.train_station = true;
      return s;
    });
    check('without the Navigator a six is just a six', g.phase !== 'harbor', g.phase);
  }

  {
    // The same ability is worth a different number at a bigger table, and the
    // engine reads the table it is actually playing rather than a fixed dial.
    const g = rollingTotal(6, (seed) => {
      const s = withMayors(createGame(seats(5), MAYORS_ON, seed), 'adventurer', null, null, null, null);
      s.players[0].landmarks.harbor = true;
      s.players[0].landmarks.train_station = true;
      return s;
    });
    check('a six is out of the Navigator’s reach on five', g.phase !== 'harbor', g.phase);
    expect('because a bigger table pushes the bar up', mayorTuning(5).adventurerHarbor, 7);
  }
}

// ---------------------------------------------------------------------------
// the bot's prices
// ---------------------------------------------------------------------------

function botPricingTests(): void {
  // Weights that put the whole decision on the saving rule: every card is worth
  // buying, and any landmark within `saveMargin` is worth holding out for. What
  // is left to judge is how far away the bot thinks that landmark is.
  const SAVER: BotWeights = { ...BASELINE, saveMargin: 2, saveScore: 100, buyThreshold: -100 };

  /** A city one landmark short of the Shopping Mall, with seven coins in hand. */
  function almostAMall(event: CityEventId | null): GameState {
    const g = createGame(seats(2), EVENTS, 501);
    g.currentEvent = event;
    const a = g.players[0];
    a.landmarks.harbor = true;
    a.landmarks.train_station = true;
    applyForcedRoll(g, [4]);
    a.coins = 7;
    return g;
  }

  {
    // The grant leaves the Mall one coin away rather than three — near enough
    // that the bot should be sitting on its coins instead of spending them.
    const g = almostAMall('urban_grant');
    const a = g.players[0];
    expect('the grant marks the Mall down to eight', landmarkCost(g, a, LANDMARK_BY_ID.shopping_mall), 8);
    expect('which is still one coin out of reach', canBuild(g, a, 'shopping_mall'), false);
    expect('so the bot waits for it', botAction(g, SAVER)?.t, 'pass');
  }

  {
    // At full price the same city is three coins short, which is too far to wait.
    const g = almostAMall(null);
    const a = g.players[0];
    expect('the Mall is back to ten', landmarkCost(g, a, LANDMARK_BY_ID.shopping_mall), 10);
    expect('so the bot spends instead', botAction(g, SAVER)?.t, 'buy');
  }

  {
    // A discount the bot acts on has to be the discount it is charged.
    const g = createGame(seats(2), EVENTS, 503);
    g.currentEvent = 'subsidized_market';
    const a = g.players[0];
    applyForcedRoll(g, [4]);
    a.coins = 1;
    const action = botAction(g);
    if (action?.t === 'buy') {
      applyAction(g, a.id, action);
      expect('the subsidised card cost the one coin it had', a.coins, 0);
    } else {
      check('the bot found the subsidised card', false, String(action?.t));
    }
  }

  {
    // Whatever the discounts are doing, the bot must never propose a move the
    // engine will refuse.
    for (const event of ['urban_grant', 'subsidized_market', 'anti_monopoly'] as CityEventId[]) {
      const g = createGame(seats(3), EVERYTHING, 502);
      for (let i = 0; i < 60 && g.phase !== 'over'; i++) {
        g.currentEvent = event;
        const me = activePlayer(g);
        const action = botAction(g);
        if (!action) break;
        const err = applyAction(g, me.id, action);
        check(`${event}: the bot\u2019s ${action.t} is legal`, err === null, String(err));
        if (err) break;
      }
    }
  }
}
/** Which dials each mayor's rules text quotes, so a stale number cannot hide. */
const MAYOR_DIALS: Record<MayorId, (keyof MayorTuning)[]> = {
  agronomist: ['agronomistBlue'],
  restaurateur: ['restaurateurShield'],
  industrialist: [],
  banker: ['bankerFloor', 'bankerDividend'],
  urbanist: ['urbanistCashback'],
  adventurer: ['adventurerHarbor'],
};

// ---------------------------------------------------------------------------
// full games
// ---------------------------------------------------------------------------

/** Every message key the engine actually emitted, collected across all games. */
const seenKeys = new Set<string>();

function simulate(games: number, rules: RuleSet, playerCount: number): void {
  const turns: number[] = [];
  let stuck = 0;
  const label = `${describeRules(rules).replace('base game', 'base')}${rules.variableSupply ? ' +var' : ''}`;

  for (let i = 0; i < games; i++) {
    const state = createGame(seats(playerCount), rules, i * 7919 + 13);
    let steps = 0;
    while (state.phase !== 'over' && steps < 40000) {
      const me = activePlayer(state);
      const action = botAction(state);
      if (!action) {
        check('bot always has a move', false, `phase ${state.phase}`);
        break;
      }
      const error = applyAction(state, me.id, action);
      if (error) {
        check('bot moves are legal', false, `${JSON.stringify(action)} in phase ${state.phase}: ${error}`);
        break;
      }
      checkLedger(state, `game ${i}`);
      if (steps % 25 === 0) checkInvariants(state, `game ${i}`);
      steps++;
    }
    checkInvariants(state, `game ${i} end`);
    checkLedger(state, `game ${i} end`);
    statsSanity(state, `game ${i}`);
    for (const entry of state.log) seenKeys.add(entry.key);
    if (state.phase !== 'over') {
      stuck++;
      continue;
    }
    turns.push(state.turnCount);
    findPlayer(state, state.winnerId!)!;
  }

  check(`${label}/${playerCount}p: every game finished`, stuck === 0, `${stuck} unfinished`);
  const avg = turns.reduce((a, b) => a + b, 0) / Math.max(1, turns.length);
  const sorted = turns.slice().sort((a, b) => a - b);
  console.log(
    `${label.padEnd(34)} ${playerCount}p  games=${games}  turns avg=${avg.toFixed(1)} ` +
      `min=${sorted[0]} median=${sorted[Math.floor(sorted.length / 2)]} max=${sorted[sorted.length - 1]}`
  );
}

/**
 * English is the reference table: every one of its keys must exist in every
 * language, carry the same `{placeholders}`, and every card must be named.
 * The engine's own output is checked on top of that, so a log line the games
 * above actually produced can never fall back to English.
 */
function translationTests(): void {
  const beforeTranslations = failures;
  const english = messages('en');
  const englishKeys = Object.keys(english);
  console.log(`\nTranslations (${englishKeys.length} keys, ${seenKeys.size} of them seen in play)`);

  for (const lang of LANGS) {
    for (const key of seenKeys) {
      check(`${lang}: log key ${key} is translated`, hasTranslation(lang, key));
    }
  }

  // Mayors and events head rows of their own in the post-game table now, so
  // every one of them has to come back with a name rather than its own id.
  for (const lang of LANGS) {
    for (const m of MAYORS) {
      check(`${lang}: the ${m.id} mayor names its stats row`, statName(lang, m.id) !== m.id);
    }
    // The mayors' numbers move with the table size, so their rules text quotes
    // dials rather than digits. A translation that dropped a placeholder would
    // render a sentence with a hole in it, or — worse — keep printing whatever
    // number was true when it was written.
    for (const m of MAYORS) {
      const small = mayorText(lang, m.id, MIN_TABLE);
      const large = mayorText(lang, m.id, MAX_TABLE);
      check(`${lang}: the ${m.id} mayor has rules text`, small.length > 0);
      check(`${lang}: the ${m.id} mayor leaves no placeholder unfilled`, !/[{}]/.test(small + large), small);
      const moves = MAYOR_DIALS[m.id].some((dial) => mayorTuning(MIN_TABLE)[dial] !== mayorTuning(MAX_TABLE)[dial]);
      check(
        `${lang}: the ${m.id} mayor reprints its dial for the table`,
        moves === (small !== large),
        moves ? `same text at ${MIN_TABLE} and ${MAX_TABLE} players: "${small}"` : `text moved without a dial moving`
      );
    }
    for (const e of CITY_EVENTS) {
      check(`${lang}: the ${e.id} event names its stats row`, statName(lang, e.id) !== e.id);
    }
  }

  for (const lang of LANGS.filter((l) => l !== 'en')) {
    const table = messages(lang);
    for (const key of englishKeys) {
      if (!hasTranslation(lang, key)) {
        check(`${lang}: ${key} is translated`, false, `only in English: "${english[key]}"`);
        continue;
      }
      // A dropped or misspelt placeholder renders as an empty string at runtime,
      // which reads as a plausible sentence with a hole in it — catch it here.
      const wanted = placeholders(english[key]);
      const got = placeholders(table[key]);
      const missing = [...wanted].filter((p) => !got.has(p));
      const extra = [...got].filter((p) => !wanted.has(p));
      check(
        `${lang}: ${key} keeps its placeholders`,
        missing.length === 0 && extra.length === 0,
        [missing.length ? `missing {${missing.join('}, {')}}` : '', extra.length ? `unexpected {${extra.join('}, {')}}` : '']
          .filter(Boolean)
          .join('; ')
      );
    }
    for (const key of Object.keys(table)) {
      check(`${lang}: ${key} still exists in English`, englishKeys.includes(key), 'stale key — delete it');
    }
  }

  for (const lang of LANGS.filter((l) => l !== 'en')) {
    for (const card of cardsFor(BRIGHT)) {
      check(`${lang}: ${card.name} has a name`, cardName(lang, card.id) !== card.name);
      check(`${lang}: ${card.name} has rules text`, cardText(lang, card.id) !== card.text);
    }
    for (const l of landmarksFor(BRIGHT)) {
      check(`${lang}: ${l.name} has a name`, landmarkName(lang, l.id) !== l.name);
      check(`${lang}: ${l.name} has rules text`, landmarkText(lang, l.id) !== l.text);
    }
  }
  const shown = t('ru', 'log.turn', { n: 3, player: 'Аня', coins: 1 });
  check('ru: coin plural for 1', shown.includes('1 монета'), shown);
  check('ru: coin plural for 3', t('ru', 'log.turn', { n: 1, player: 'A', coins: 3 }).includes('3 монеты'));
  check('ru: coin plural for 5', t('ru', 'log.turn', { n: 1, player: 'A', coins: 5 }).includes('5 монет'));
  check('ru: coin plural for 11', t('ru', 'log.turn', { n: 1, player: 'A', coins: 11 }).includes('11 монет'));
  check('ru: coin plural for 21', t('ru', 'log.turn', { n: 1, player: 'A', coins: 21 }).includes('21 монета'));
  check(
    'ru: card names resolve inside log lines',
    t('ru', 'log.buy', { player: 'Аня', card: 'winery', cost: 3 }).includes('Винодельню') ||
      t('ru', 'log.buy', { player: 'Аня', card: 'winery', cost: 3 }).includes('Винодельня')
  );
  check('ru: rules code expands', t('ru', 'log.gameOn', { rules: 'base+harbor' }).includes('Гавань'));

  const kkTurn = t('kk', 'log.turn', { n: 3, player: 'Аружан', coins: 1 });
  check('kk: coin word for 1', kkTurn.includes('1 монета'), kkTurn);
  check('kk: coin word stays singular', t('kk', 'log.turn', { n: 1, player: 'A', coins: 5 }).includes('5 монета'));
  check(
    'kk: card names resolve inside log lines',
    t('kk', 'log.buy', { player: 'Аружан', card: 'winery', cost: 3 }).includes('Шарап зауыты')
  );
  check('kk: rules code expands', t('kk', 'log.gameOn', { rules: 'base+harbor' }).includes('Айлақ'));
  console.log(failures === beforeTranslations ? '  passed' : `  ${failures - beforeTranslations} failed`);
}

const count = Number(process.argv[2] ?? 100);

console.log('Base + Harbor rules');
baseRuleTests();
console.log(failures === 0 ? '  passed\n' : `  ${failures} failed\n`);

const afterBase = failures;
console.log('Millionaire’s Row rules');
millionairesRuleTests();
console.log(failures === afterBase ? '  passed\n' : `  ${failures - afterBase} failed\n`);

const afterRow = failures;
console.log('Post-game stats');
statsTests();
console.log(failures === afterRow ? '  passed\n' : `  ${failures - afterRow} failed\n`);

const afterStats = failures;
console.log('City events');
eventRuleTests();
console.log(failures === afterStats ? '  passed\n' : `  ${failures - afterStats} failed\n`);

const afterEvents = failures;
console.log('Mayors');
mayorRuleTests();
console.log(failures === afterEvents ? '  passed\n' : `  ${failures - afterEvents} failed\n`);

const afterMayors = failures;
console.log('Bot prices');
botPricingTests();
console.log(failures === afterMayors ? '  passed\n' : `  ${failures - afterMayors} failed\n`);

console.log('Bot games');
simulate(count, HARBOR, 4);
simulate(count, BASE, 4);
simulate(count, ROW, 4);
simulate(count, BRIGHT, 4);
simulate(count, BRIGHT_VAR, 4);
simulate(Math.max(10, Math.floor(count / 2)), BRIGHT_VAR, 5);
simulate(Math.max(10, Math.floor(count / 2)), BRIGHT_VAR, 2);
simulate(count, EVENTS, 4);
simulate(count, MAYORS_ON, 4);
simulate(count, EVERYTHING, 4);

translationTests();

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log('\nAll checks passed.');
