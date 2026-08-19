/**
 * Rule tests + bot-vs-bot simulation.  Run with `npm run simulate [games]`.
 *
 * The simulation is the safety net for the engine: it plays whole games, checks
 * invariants after every action, and fails loudly on an illegal state.
 */
import { cardsFor, describeRules, landmarksFor, winLandmarks, type CardId, type RuleSet } from './cards';
import {
  LANGS,
  cardName,
  cardText,
  hasTranslation,
  landmarkName,
  landmarkText,
  messages,
  placeholders,
  t,
} from './i18n';
import { botAction } from './bot';
import {
  activePlayer,
  applyAction,
  applyForcedRoll,
  closedCopies,
  copies,
  createGame,
  findPlayer,
  hasWon,
  type Seat,
} from './engine';
import type { GameAction, GameState, PlayerState } from './types';

const BASE: RuleSet = { harbor: false, millionaires: false, variableSupply: false };
const HARBOR: RuleSet = { harbor: true, millionaires: false, variableSupply: false };
const ROW: RuleSet = { harbor: false, millionaires: true, variableSupply: false };
const BRIGHT: RuleSet = { harbor: true, millionaires: true, variableSupply: false };
const BRIGHT_VAR: RuleSet = { harbor: true, millionaires: true, variableSupply: true };

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
  }
}

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

console.log('Bot games');
simulate(count, HARBOR, 4);
simulate(count, BASE, 4);
simulate(count, ROW, 4);
simulate(count, BRIGHT, 4);
simulate(count, BRIGHT_VAR, 4);
simulate(Math.max(10, Math.floor(count / 2)), BRIGHT_VAR, 5);
simulate(Math.max(10, Math.floor(count / 2)), BRIGHT_VAR, 2);

translationTests();

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log('\nAll checks passed.');
