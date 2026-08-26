import {
  CARD_BY_ID,
  cardsFor,
  landmarksFor,
  maxPlayers,
  winLandmarks,
  type CardDef,
  type CardIcon,
  type CardId,
  type LandmarkId,
  type RuleSet,
} from './cards';
import { rulesCode, type Params } from './i18n';
import type {
  BuildingStat,
  GameAction,
  GameState,
  LogEntry,
  PendingChoice,
  PlayerState,
  PlayerStats,
  StatKey,
} from './types';

const START_COINS = 3;
const SUPPLY_PER_CARD = 6;
/** Face-up stacks kept available under the variable supply setup. */
const SUPPLY_SLOTS = 10;

// ---------------------------------------------------------------------------
// rng (kept in state so a game is reproducible from its seed)
// ---------------------------------------------------------------------------

function random(state: GameState): number {
  state.rng = (state.rng + 0x6d2b79f5) | 0;
  let t = state.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function die(state: GameState): number {
  return 1 + Math.floor(random(state) * 6);
}

function shuffle<T>(state: GameState, items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(random(state) * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

// ---------------------------------------------------------------------------
// setup
// ---------------------------------------------------------------------------

export interface Seat {
  id: string;
  name: string;
  isBot: boolean;
}

export function createGame(seats: Seat[], rules: RuleSet, seed = Date.now()): GameState {
  const state: GameState = {
    rules,
    players: [],
    supply: {},
    deck: [],
    turn: 0,
    turnCount: 0,
    phase: 'roll',
    dice: [],
    rollId: 0,
    diceTotal: 0,
    harborBonusUsed: false,
    spacePortUsed: false,
    rerollUsed: false,
    extraTurn: false,
    pending: [],
    winnerId: null,
    log: [],
    rng: seed | 0,
    nextLogId: 1,
  };

  state.players = shuffle(state, seats.slice()).map((s) => newPlayer(s, rules));

  const stock = (card: CardDef) => (card.icon === 'major' ? state.players.length : SUPPLY_PER_CARD);
  if (rules.variableSupply) {
    for (const card of cardsFor(rules)) {
      for (let i = 0; i < stock(card); i++) state.deck.push(card.id);
    }
    shuffle(state, state.deck);
    refillSupply(state);
  } else {
    for (const card of cardsFor(rules)) state.supply[card.id] = stock(card);
  }

  log(state, 'log.gameOn', { rules: rulesCode(rules) }, { kind: 'turn' });
  log(state, 'log.turnOrder', { order: state.players.map((p) => p.name).join(' → ') });
  if (rules.variableSupply) log(state, 'log.variableSupply', { n: SUPPLY_SLOTS });
  announceTurn(state);
  return state;
}

function newPlayer(seat: Seat, rules: RuleSet): PlayerState {
  const landmarks = {} as Record<LandmarkId, boolean>;
  for (const l of landmarksFor(rules)) landmarks[l.id] = Boolean(l.free);
  return {
    id: seat.id,
    name: seat.name,
    isBot: seat.isBot,
    coins: START_COINS,
    cards: { wheat_field: 1, bakery: 1 },
    closed: {},
    investment: 0,
    landmarks,
    stats: newStats(),
  };
}

function newStats(): PlayerStats {
  return {
    turns: 0,
    rolls: 0,
    pips: 0,
    earned: 0,
    fromBank: 0,
    lost: 0,
    toBank: 0,
    spentOnCards: 0,
    spentOnLandmarks: 0,
    invested: 0,
    cardsBought: 0,
    peakCoins: START_COINS,
    byKey: {},
  };
}

/** Draw face-up stacks until 10 different cards are on offer. */
function refillSupply(state: GameState): void {
  if (!state.rules.variableSupply) return;
  while (state.deck.length > 0 && uniqueOnOffer(state) < SUPPLY_SLOTS) {
    const id = state.deck.pop()!;
    state.supply[id] = (state.supply[id] ?? 0) + 1;
  }
}

function uniqueOnOffer(state: GameState): number {
  let n = 0;
  for (const count of Object.values(state.supply)) if ((count ?? 0) > 0) n++;
  return n;
}

// ---------------------------------------------------------------------------
// small helpers
// ---------------------------------------------------------------------------

function log(
  state: GameState,
  key: string,
  params?: Params,
  extra: { who?: string; kind?: LogEntry['kind'] } = {}
): void {
  state.log.push({ id: state.nextLogId++, key, params, who: extra.who, kind: extra.kind });
  if (state.log.length > 300) state.log.splice(0, state.log.length - 300);
}

export function activePlayer(state: GameState): PlayerState {
  return state.players[state.turn];
}

export function findPlayer(state: GameState, id: string): PlayerState | undefined {
  return state.players.find((p) => p.id === id);
}

export function copies(p: PlayerState, id: CardId): number {
  return p.cards[id] ?? 0;
}

export function closedCopies(p: PlayerState, id: CardId): number {
  return Math.max(0, Math.min(p.closed[id] ?? 0, copies(p, id)));
}

/** Copies that are open for business. */
export function openCopies(p: PlayerState, id: CardId): number {
  return Math.max(0, copies(p, id) - closedCopies(p, id));
}

/** Total number of establishment cards a player owns carrying a given icon. */
export function countIcon(p: PlayerState, icon: CardIcon): number {
  let n = 0;
  for (const [id, count] of Object.entries(p.cards)) {
    if (count && CARD_BY_ID[id as CardId].icon === icon) n += count;
  }
  return n;
}

/** Landmarks built, not counting the free City Hall. */
export function landmarkCount(state: GameState, p: PlayerState): number {
  return winLandmarks(state.rules).filter((l) => p.landmarks[l.id]).length;
}

/** Opponents in counter-clockwise order — the player on the active player's right pays/collects first. */
function counterClockwiseOpponents(state: GameState): PlayerState[] {
  const n = state.players.length;
  const out: PlayerState[] = [];
  for (let i = 1; i < n; i++) out.push(state.players[((state.turn - i) % n + n) % n]);
  return out;
}

function otherPlayers(state: GameState): PlayerState[] {
  return state.players.filter((_, i) => i !== state.turn);
}

/** Cards of `color` owned by `p` that trigger on `total`, honouring Harbor requirements. */
function triggered(p: PlayerState, total: number, color: CardDef['color'], rules: RuleSet): CardDef[] {
  return cardsFor(rules).filter(
    (c) =>
      c.color === color &&
      c.activates.includes(total) &&
      copies(p, c.id) > 0 &&
      (!c.needsHarbor || p.landmarks.harbor)
  );
}

/**
 * Renovation tokens come off when a closed card would have activated.
 * Returns how many copies actually activate.
 */
function wakeUp(state: GameState, p: PlayerState, card: CardDef): number {
  const shut = closedCopies(p, card.id);
  if (shut > 0) {
    p.closed[card.id] = 0;
    log(state, 'log.reopens', { player: p.name, card: card.id, times: times(shut) }, { who: p.id, kind: 'income' });
  }
  return copies(p, card.id) - shut;
}

function times(n: number): string {
  return n > 1 ? ` ×${n}` : '';
}

// ---------------------------------------------------------------------------
// the coin ledger
//
// Every coin that moves goes through `gain`, `drain` or `pay`, each naming the
// building responsible. That is what feeds the post-game table, and it keeps
// `coins === 3 + earned - lost - spent - invested` true for the whole game.
// ---------------------------------------------------------------------------

function ledger(p: PlayerState, key: StatKey): BuildingStat {
  const row = p.stats.byKey[key] ?? { hits: 0, earned: 0, lost: 0, spent: 0 };
  p.stats.byKey[key] = row;
  return row;
}

/** Note that a building activated, whether or not it paid out. */
function noteHits(p: PlayerState, key: StatKey, n = 1): void {
  ledger(p, key).hits += n;
}

/** Coins in, from the bank or from another player. */
function gain(p: PlayerState, key: StatKey, amount: number, fromBank: boolean): void {
  if (amount <= 0) return;
  p.coins += amount;
  ledger(p, key).earned += amount;
  p.stats.earned += amount;
  if (fromBank) p.stats.fromBank += amount;
  p.stats.peakCoins = Math.max(p.stats.peakCoins, p.coins);
}

/** Coins out, capped at what the player actually has. Returns what was taken. */
function drain(p: PlayerState, key: StatKey, want: number, toBank: boolean): number {
  const paid = Math.max(0, Math.min(want, p.coins));
  if (paid === 0) return 0;
  p.coins -= paid;
  ledger(p, key).lost += paid;
  p.stats.lost += paid;
  if (toBank) p.stats.toBank += paid;
  return paid;
}

function pay(from: PlayerState, to: PlayerState, want: number, key: StatKey): number {
  const paid = drain(from, key, want, false);
  gain(to, key, paid, false);
  return paid;
}

/** Coins spent to put a building on the table. */
function noteBuild(p: PlayerState, key: StatKey, cost: number, isLandmark: boolean): void {
  ledger(p, key).spent += cost;
  if (isLandmark) p.stats.spentOnLandmarks += cost;
  else p.stats.spentOnCards += cost;
}

/**
 * Coins put into the Tech Startup. They are not a purchase, so they stay out of
 * the buildings total, but the card's own row has to show them or its profit
 * reads as the whole take against a price of one coin.
 */
function noteInvest(p: PlayerState, amount: number): void {
  ledger(p, 'tech_startup').spent += amount;
  p.stats.invested += amount;
}

/** Move one copy between players, handing over an open card when there is one. */
function transferCard(from: PlayerState, to: PlayerState, id: CardId): void {
  const wasClosed = openCopies(from, id) === 0 && closedCopies(from, id) > 0;
  from.cards[id] = copies(from, id) - 1;
  to.cards[id] = copies(to, id) + 1;
  if (wasClosed) {
    // Count the tokens, not the clamped view: the card counts have already moved,
    // so reading back through `closedCopies` here would drop a token on the giver
    // (two closed copies, one given away, leaves one closed) and, once the giver
    // is down to none, leave a negative behind that reads as an extra open copy.
    from.closed[id] = Math.max(0, (from.closed[id] ?? 0) - 1);
    to.closed[id] = Math.min(copies(to, id), (to.closed[id] ?? 0) + 1);
  }
}

// ---------------------------------------------------------------------------
// payout tables (per copy of the card)
// ---------------------------------------------------------------------------

/** Coins a red establishment takes from the roller, per copy. */
export function redAmount(state: GameState, card: CardDef, owner: PlayerState, roller: PlayerState): number {
  const mall = owner.landmarks.shopping_mall && card.icon === 'cup' ? 1 : 0;
  switch (card.id) {
    case 'cafe':
    case 'pizza_joint':
    case 'hamburger_stand':
      return 1 + mall;
    case 'family_restaurant':
      return 2 + mall;
    case 'sushi_bar':
      return 3 + mall;
    case 'french_restaurant':
      return landmarkCount(state, roller) >= 2 ? 5 + mall : 0;
    case 'members_club':
      return landmarkCount(state, roller) >= 3 ? roller.coins : 0;
    default:
      return 0;
  }
}

/** Coins a blue establishment takes from the bank, per copy. Tuna Boat is handled separately. */
export function blueAmount(state: GameState, card: CardDef, owner: PlayerState): number {
  switch (card.id) {
    case 'wheat_field':
    case 'ranch':
    case 'forest':
    case 'flower_orchard':
      return 1;
    case 'corn_field':
      return landmarkCount(state, owner) < 2 ? 1 : 0;
    case 'apple_orchard':
    case 'mackerel_boat':
    case 'vineyard':
      return 3;
    case 'mine':
      return 5;
    default:
      return 0;
  }
}

/**
 * Coins a green establishment takes from the bank, per copy.
 * Negative means the owner pays the bank. Cards that need a decision return 0
 * here and queue a choice instead.
 */
export function greenAmount(state: GameState, card: CardDef, owner: PlayerState): number {
  const mall = owner.landmarks.shopping_mall && card.icon === 'bread' ? 1 : 0;
  switch (card.id) {
    case 'bakery':
      return 1 + mall;
    case 'convenience_store':
      return 3 + mall;
    case 'general_store':
      return landmarkCount(state, owner) < 2 ? 2 + mall : 0;
    case 'flower_shop':
      return copies(owner, 'flower_orchard') + mall;
    case 'cheese_factory':
      return 3 * countIcon(owner, 'cow');
    case 'furniture_factory':
      return 3 * countIcon(owner, 'gear');
    case 'farmers_market':
      return 2 * countIcon(owner, 'wheat');
    case 'food_warehouse':
      return 2 * countIcon(owner, 'cup');
    case 'winery':
      return 6 * copies(owner, 'vineyard');
    case 'soda_bottling_plant':
      return state.players.reduce((sum, p) => sum + countIcon(p, 'cup'), 0);
    case 'loan_office':
      return -2;
    default:
      return 0;
  }
}

// ---------------------------------------------------------------------------
// income
// ---------------------------------------------------------------------------

function resolveIncome(state: GameState): void {
  const total = state.diceTotal;
  const active = activePlayer(state);

  // 1. Restaurants (red) — opponents take from the active player.
  for (const p of counterClockwiseOpponents(state)) {
    for (const card of triggered(p, total, 'red', state.rules)) {
      const n = wakeUp(state, p, card);
      if (n <= 0) continue;
      noteHits(p, card.id, n);
      let paid = 0;
      let wanted = 0;
      for (let i = 0; i < n; i++) {
        const want = redAmount(state, card, p, active);
        wanted += want;
        paid += pay(active, p, want, card.id);
      }
      if (wanted > 0) {
        log(
          state,
          paid < wanted ? 'log.redTakeBroke' : 'log.redTake',
          { player: p.name, amount: paid, from: active.name, card: card.id, times: times(n) },
          { who: p.id, kind: 'income' }
        );
      }
    }
  }

  // 2. Primary industry (blue) — every player, whoever rolled.
  let tunaRoll = 0;
  for (let i = 0; i < state.players.length; i++) {
    const p = state.players[(state.turn + i) % state.players.length];
    for (const card of triggered(p, total, 'blue', state.rules)) {
      const n = wakeUp(state, p, card);
      if (n <= 0) continue;
      noteHits(p, card.id, n);
      let amount: number;
      if (card.id === 'tuna_boat') {
        if (!tunaRoll) {
          tunaRoll = die(state) + die(state);
          log(state, 'log.tunaRoll', { total: tunaRoll }, { kind: 'roll' });
        }
        amount = tunaRoll * n;
      } else {
        amount = blueAmount(state, card, p) * n;
      }
      if (amount > 0) {
        gain(p, card.id, amount, true);
        log(state, 'log.gets', { player: p.name, amount, card: card.id, times: times(n) }, { who: p.id, kind: 'income' });
      }
    }
  }

  // 3. Secondary industry (green) — active player only.
  for (const card of triggered(active, total, 'green', state.rules)) {
    const n = wakeUp(state, active, card);
    if (n <= 0) continue;
    noteHits(active, card.id, n);

    if (card.id === 'demolition_company') {
      for (let i = 0; i < n; i++) {
        if (landmarkCount(state, active) > 0) state.pending.push('demolish');
        else log(state, 'log.noDemolish', { player: active.name }, { who: active.id, kind: 'income' });
      }
      continue;
    }
    if (card.id === 'moving_company') {
      for (let i = 0; i < n; i++) {
        if (tradeableCards(active).length > 0) state.pending.push('moving');
        else log(state, 'log.noMoving', { player: active.name }, { who: active.id, kind: 'income' });
      }
      continue;
    }

    const amount = greenAmount(state, card, active) * n;
    if (amount > 0) {
      gain(active, card.id, amount, true);
      log(state, 'log.gets', { player: active.name, amount, card: card.id, times: times(n) }, { who: active.id, kind: 'income' });
    } else if (amount < 0) {
      const lost = drain(active, card.id, -amount, true);
      log(state, 'log.pays', { player: active.name, amount: lost, card: card.id, times: times(n) }, { who: active.id, kind: 'income' });
    }

    if (card.id === 'winery') {
      active.closed.winery = n;
      log(state, 'log.wineryCloses', { player: active.name }, { who: active.id, kind: 'income' });
    }
  }

  // 4. Major establishments (purple) — active player only, some need a decision.
  resolvePurple(state);
}

const PURPLE_ORDER: CardId[] = [
  'stadium',
  'tv_station',
  'business_center',
  'publisher',
  'renovation_company',
  'tax_office',
  'tech_startup',
  'exhibit_hall',
  'park',
];

function resolvePurple(state: GameState): void {
  const active = activePlayer(state);
  const total = state.diceTotal;

  for (const id of PURPLE_ORDER) {
    const card = CARD_BY_ID[id];
    if (!cardsFor(state.rules).includes(card)) continue;
    if (!card.activates.includes(total) || copies(active, id) === 0) continue;
    const activated = wakeUp(state, active, card);
    if (activated <= 0) continue;
    noteHits(active, id, activated);

    switch (id) {
      case 'stadium': {
        let got = 0;
        for (const p of otherPlayers(state)) got += pay(p, active, 2, id);
        log(state, 'log.stadium', { player: active.name, amount: got }, { who: active.id, kind: 'income' });
        break;
      }
      case 'tv_station': {
        if (otherPlayers(state).some((p) => p.coins > 0)) state.pending.push('tv');
        else log(state, 'log.tvNobody', undefined, { kind: 'income' });
        break;
      }
      case 'business_center': {
        if (tradeIsPossible(state)) state.pending.push('trade');
        else log(state, 'log.bcNoSwap', undefined, { kind: 'income' });
        break;
      }
      case 'publisher': {
        let got = 0;
        for (const p of otherPlayers(state)) {
          got += pay(p, active, countIcon(p, 'bread') + countIcon(p, 'cup'), id);
        }
        log(state, 'log.publisher', { player: active.name, amount: got }, { who: active.id, kind: 'income' });
        break;
      }
      case 'renovation_company': {
        state.pending.push('renovation');
        break;
      }
      case 'tax_office': {
        let got = 0;
        for (const p of otherPlayers(state)) {
          if (p.coins >= 10) got += pay(p, active, Math.floor(p.coins / 2), id);
        }
        log(state, 'log.taxOffice', { player: active.name, amount: got }, { who: active.id, kind: 'income' });
        break;
      }
      case 'tech_startup': {
        if (active.investment <= 0) {
          log(state, 'log.techNoInvestment', undefined, { kind: 'income' });
          break;
        }
        let got = 0;
        for (const p of otherPlayers(state)) got += pay(p, active, active.investment, id);
        log(
          state,
          'log.techStartup',
          { player: active.name, amount: got, invested: active.investment },
          { who: active.id, kind: 'income' }
        );
        break;
      }
      case 'exhibit_hall': {
        if (exhibitCandidates(state, active).length > 0) state.pending.push('exhibit');
        else log(state, 'log.exhibitNothing', undefined, { kind: 'income' });
        break;
      }
      case 'park': {
        const pot = state.players.reduce((sum, p) => sum + p.coins, 0);
        const each = Math.ceil(pot / state.players.length);
        // Levelling up moves coins from the richer players to the poorer ones,
        // so the ledger books those as transfers. Rounding the share up can ask
        // for more than the table holds; only that shortfall comes from the bank.
        let pool = 0;
        for (const p of state.players) {
          if (p.coins > each) pool += drain(p, id, p.coins - each, false);
        }
        for (const p of state.players) {
          if (p.coins >= each) continue;
          const owed = each - p.coins;
          const shared = Math.min(pool, owed);
          pool -= shared;
          gain(p, id, shared, false);
          gain(p, id, owed - shared, true);
        }
        log(state, 'log.park', { each }, { who: active.id, kind: 'income' });
        break;
      }
    }
  }
}

function tradeIsPossible(state: GameState): boolean {
  if (tradeableCards(activePlayer(state)).length === 0) return false;
  return otherPlayers(state).some((p) => tradeableCards(p).length > 0);
}

/** Establishments that can change hands (everything except majors). */
export function tradeableCards(p: PlayerState): CardId[] {
  return (Object.keys(p.cards) as CardId[]).filter(
    (id) => copies(p, id) > 0 && CARD_BY_ID[id].icon !== 'major'
  );
}

/** Cards the Exhibit Hall could stand in for: your own open, non-major, non-restaurant cards. */
export function exhibitCandidates(state: GameState, p: PlayerState): CardId[] {
  return cardsFor(state.rules)
    .filter((c) => c.icon !== 'major' && c.color !== 'red' && openCopies(p, c.id) > 0)
    .filter((c) => !c.needsHarbor || p.landmarks.harbor)
    .map((c) => c.id);
}

/** Immediate coin swing if this card were activated once for its owner. */
export function activationValue(state: GameState, p: PlayerState, id: CardId): number {
  const card = CARD_BY_ID[id];
  // the Exhibit Hall fires every open copy you own, so the payout scales with them
  const n = openCopies(p, id);
  if (n <= 0) return 0;
  if (card.id === 'tuna_boat') return 7 * n;
  if (card.id === 'demolition_company') return Math.min(n, landmarkCount(state, p)) * 8;
  if (card.id === 'moving_company') return tradeableCards(p).length > 0 ? 4 * n : 0;
  if (card.color === 'blue') return blueAmount(state, card, p) * n;
  if (card.color === 'green') return greenAmount(state, card, p) * n;
  return 0;
}

/**
 * Run a card's effect for its owner, as the Exhibit Hall allows: every open copy
 * of the chosen establishment fires, and only the owner is paid — an opponent's
 * copies of a blue card stay quiet.
 */
function activateAll(state: GameState, p: PlayerState, id: CardId): void {
  const card = CARD_BY_ID[id];
  const n = wakeUp(state, p, card);
  if (n <= 0) return;
  noteHits(p, id, n);
  if (id === 'demolition_company') {
    for (let i = 0; i < n; i++) {
      if (landmarkCount(state, p) > 0) state.pending.push('demolish');
      else log(state, 'log.noDemolish', { player: p.name }, { who: p.id, kind: 'income' });
    }
    return;
  }
  if (id === 'moving_company') {
    for (let i = 0; i < n; i++) {
      if (tradeableCards(p).length > 0) state.pending.push('moving');
      else log(state, 'log.noMoving', { player: p.name }, { who: p.id, kind: 'income' });
    }
    return;
  }
  // one roll for the card, then a payout per copy — as on a rolled 12-14
  let amount: number;
  if (id === 'tuna_boat') {
    const roll = die(state) + die(state);
    log(state, 'log.tunaRoll', { total: roll }, { kind: 'roll' });
    amount = roll * n;
  } else {
    amount = (card.color === 'blue' ? blueAmount(state, card, p) : greenAmount(state, card, p)) * n;
  }
  if (amount > 0) {
    gain(p, id, amount, true);
    log(state, 'log.getsVia', { player: p.name, amount, card: id, times: times(n) }, { who: p.id, kind: 'income' });
  } else if (amount < 0) {
    const lost = drain(p, id, -amount, true);
    log(state, 'log.paysVia', { player: p.name, amount: lost, card: id, times: times(n) }, { who: p.id, kind: 'income' });
  } else {
    log(state, 'log.activatesNothing', { player: p.name, card: id }, { who: p.id, kind: 'income' });
  }
  if (id === 'winery') {
    p.closed.winery = n;
    log(state, 'log.wineryCloses', { player: p.name }, { who: p.id, kind: 'income' });
  }
}

// ---------------------------------------------------------------------------
// turn flow
// ---------------------------------------------------------------------------

function announceTurn(state: GameState): void {
  state.turnCount++;
  const active = activePlayer(state);
  active.stats.turns++;
  log(
    state,
    'log.turn',
    { n: state.turnCount, player: active.name, coins: active.coins },
    { who: active.id, kind: 'turn' }
  );
}

function startTurn(state: GameState, samePlayer: boolean): void {
  if (!samePlayer) state.turn = (state.turn + 1) % state.players.length;
  state.dice = [];
  state.diceTotal = 0;
  state.rerollUsed = false;
  state.harborBonusUsed = false;
  state.spacePortUsed = false;
  state.pending = [];
  state.phase = 'roll';
  announceTurn(state);
}

function rollDice(state: GameState, count: number): void {
  state.dice = Array.from({ length: count }, () => die(state));
  state.rollId++;
  state.diceTotal = state.dice.reduce((a, b) => a + b, 0);
  const active = activePlayer(state);
  active.stats.rolls++;
  active.stats.pips += state.diceTotal;
  if (count === 2) noteHits(active, 'train_station');
  log(
    state,
    'log.roll',
    { player: active.name, dice: state.dice.join(' + '), total: state.diceTotal },
    { who: active.id, kind: 'roll' }
  );
}

/**
 * Test hook: resolve income for an exact set of dice, skipping the Radio Tower,
 * Space Port and Harbor prompts. The server never calls this — see `applyAction`.
 */
export function applyForcedRoll(state: GameState, dice: number[]): void {
  state.dice = dice.slice();
  state.rollId++;
  state.diceTotal = state.dice.reduce((a, b) => a + b, 0);
  activePlayer(state).stats.rolls++;
  activePlayer(state).stats.pips += state.diceTotal;
  log(state, 'log.roll', {
    player: activePlayer(state).name,
    dice: state.dice.join(' + '),
    total: state.diceTotal,
  }, { kind: 'roll' });
  beginIncome(state);
}

function afterRoll(state: GameState): void {
  if (activePlayer(state).landmarks.radio_tower && !state.rerollUsed) {
    state.phase = 'reroll';
    return;
  }
  afterFinalRoll(state);
}

/**
 * The Space Port goes before the Harbor: nudging a 9 up to 10 is what puts the
 * Harbor's +2 within reach, and both only ever move the total, never the dice.
 */
function afterFinalRoll(state: GameState): void {
  if (activePlayer(state).landmarks.space_port && !state.spacePortUsed) {
    state.phase = 'spaceport';
    return;
  }
  afterAdjustedRoll(state);
}

function afterAdjustedRoll(state: GameState): void {
  const active = activePlayer(state);
  if (active.landmarks.harbor && state.diceTotal >= 10 && !state.harborBonusUsed) {
    state.phase = 'harbor';
    return;
  }
  beginIncome(state);
}

function beginIncome(state: GameState): void {
  const active = activePlayer(state);
  if (active.landmarks.amusement_park && state.dice.length === 2 && state.dice[0] === state.dice[1]) {
    state.extraTurn = true;
    noteHits(active, 'amusement_park');
    log(state, 'log.doubles', { player: active.name }, { who: active.id, kind: 'roll' });
  }
  resolveIncome(state);
  continueAfterIncome(state);
}

/**
 * A queued choice can go stale — demolishing your only landmark leaves a second
 * Demolition Company with nothing to knock down. Drop those rather than wedging.
 */
function choiceIsPossible(state: GameState, choice: PendingChoice): boolean {
  const me = activePlayer(state);
  switch (choice) {
    case 'tv':
      return otherPlayers(state).some((p) => p.coins > 0);
    case 'trade':
      return tradeIsPossible(state);
    case 'demolish':
      return demolishable(state, me).length > 0;
    case 'moving':
      return tradeableCards(me).length > 0 && state.players.length > 1;
    case 'exhibit':
      return copies(me, 'exhibit_hall') > 0 && exhibitCandidates(state, me).length > 0;
    case 'renovation':
      return true;
  }
}

function continueAfterIncome(state: GameState): void {
  while (state.pending.length && !choiceIsPossible(state, state.pending[0])) {
    log(state, 'log.skipChoice', { player: activePlayer(state).name }, { kind: 'income' });
    state.pending.shift();
  }
  if (state.pending.length) {
    state.phase = state.pending[0];
    return;
  }
  enterBuildPhase(state);
}

function enterBuildPhase(state: GameState): void {
  const active = activePlayer(state);
  if (active.landmarks.city_hall && active.coins === 0) {
    noteHits(active, 'city_hall');
    gain(active, 'city_hall', 1, true);
    log(state, 'log.cityHall', { player: active.name }, { who: active.id, kind: 'income' });
  }
  state.phase = 'build';
}

function advancePending(state: GameState): void {
  state.pending.shift();
  continueAfterIncome(state);
}

/** After building (or passing): win check, optional Tech Startup investment, then next player. */
function endOfTurn(state: GameState): void {
  const active = activePlayer(state);
  if (hasWon(state, active)) {
    state.winnerId = active.id;
    state.phase = 'over';
    log(state, 'log.win', { player: active.name }, { who: active.id, kind: 'win' });
    return;
  }
  if (copies(active, 'tech_startup') > 0 && active.coins >= 1) {
    state.phase = 'invest';
    return;
  }
  finishTurn(state);
}

function finishTurn(state: GameState): void {
  if (state.extraTurn) {
    state.extraTurn = false;
    startTurn(state, true);
  } else {
    startTurn(state, false);
  }
}

export function hasWon(state: GameState, p: PlayerState): boolean {
  return winLandmarks(state.rules).every((l) => p.landmarks[l.id]);
}

// ---------------------------------------------------------------------------
// legality
// ---------------------------------------------------------------------------

export function canBuy(state: GameState, p: PlayerState, id: CardId): boolean {
  const card = CARD_BY_ID[id];
  if (!card || !cardsFor(state.rules).includes(card)) return false;
  if ((state.supply[id] ?? 0) <= 0) return false;
  if (p.coins < card.cost) return false;
  if (card.icon === 'major' && copies(p, id) > 0) return false;
  return true;
}

export function canBuild(state: GameState, p: PlayerState, id: LandmarkId): boolean {
  const l = landmarksFor(state.rules).find((x) => x.id === id);
  if (!l || l.free) return false;
  if (p.landmarks[id]) return false;
  return p.coins >= l.cost;
}

/** Landmarks the Demolition Company could knock down. */
export function demolishable(state: GameState, p: PlayerState): LandmarkId[] {
  return winLandmarks(state.rules)
    .filter((l) => p.landmarks[l.id])
    .map((l) => l.id);
}

/** Whose input the game is waiting on, or null when the game is over. */
export function waitingOn(state: GameState): string | null {
  return state.phase === 'over' ? null : activePlayer(state).id;
}

export function playerLimit(rules: RuleSet): number {
  return maxPlayers(rules);
}

// ---------------------------------------------------------------------------
// action entry point — returns a translation key for the error, or null
// ---------------------------------------------------------------------------

function expectPhase(state: GameState, phase: PendingChoice): boolean {
  return state.phase === phase && state.pending[0] === phase;
}

export function applyAction(state: GameState, playerId: string, action: GameAction): string | null {
  if (state.phase === 'over') return 'err.gameOver';
  const active = activePlayer(state);
  if (playerId !== active.id) return 'err.notYourTurn';

  switch (action.t) {
    case 'roll': {
      if (state.phase !== 'roll') return 'err.alreadyRolled';
      if (action.dice !== 1 && action.dice !== 2) return 'err.rollOneOrTwo';
      if (action.dice === 2 && !active.landmarks.train_station) return 'err.needTrainStation';
      rollDice(state, action.dice);
      afterRoll(state);
      return null;
    }

    case 'reroll': {
      if (state.phase !== 'reroll') return 'err.nothingToReroll';
      state.rerollUsed = true;
      if (action.again) {
        noteHits(active, 'radio_tower');
        log(state, 'log.reroll', { player: active.name }, { who: active.id, kind: 'roll' });
        rollDice(state, state.dice.length);
      }
      afterFinalRoll(state);
      return null;
    }

    case 'spaceport': {
      if (state.phase !== 'spaceport') return 'err.spacePortNotNow';
      const delta = action.delta;
      if (delta !== -1 && delta !== 0 && delta !== 1) return 'err.spacePortRange';
      if (state.diceTotal + delta < 1) return 'err.spacePortRange';
      state.spacePortUsed = true;
      if (delta !== 0) {
        noteHits(active, 'space_port');
        state.diceTotal += delta;
        log(state, 'log.spacePortUsed', { player: active.name, total: state.diceTotal }, { who: active.id, kind: 'roll' });
      }
      afterAdjustedRoll(state);
      return null;
    }

    case 'harbor': {
      if (state.phase !== 'harbor') return 'err.harborNotNow';
      state.harborBonusUsed = true;
      if (action.add) {
        noteHits(active, 'harbor');
        state.diceTotal += 2;
        log(state, 'log.harborUsed', { player: active.name, total: state.diceTotal }, { who: active.id, kind: 'roll' });
      }
      beginIncome(state);
      return null;
    }

    case 'tv': {
      if (!expectPhase(state, 'tv')) return 'err.tvNotWaiting';
      const target = findPlayer(state, action.targetId);
      if (!target) return 'err.unknownPlayer';
      if (target.id === active.id) return 'err.pickAnother';
      const took = pay(target, active, 5, 'tv_station');
      log(state, 'log.tvTake', { player: active.name, amount: took, target: target.name }, { who: active.id, kind: 'income' });
      advancePending(state);
      return null;
    }

    case 'trade': {
      if (!expectPhase(state, 'trade')) return 'err.bcNotWaiting';
      const target = findPlayer(state, action.targetId);
      if (!target) return 'err.unknownPlayer';
      if (target.id === active.id) return 'err.pickAnother';
      if (CARD_BY_ID[action.give]?.icon === 'major' || CARD_BY_ID[action.take]?.icon === 'major') {
        return 'err.noMajorSwap';
      }
      if (copies(active, action.give) <= 0) return 'err.dontOwn';
      if (copies(target, action.take) <= 0) return 'err.theyDontOwn';
      transferCard(active, target, action.give);
      transferCard(target, active, action.take);
      log(
        state,
        'log.trade',
        { player: active.name, card: action.give, target: target.name, card2: action.take },
        { who: active.id, kind: 'income' }
      );
      advancePending(state);
      return null;
    }

    case 'demolish': {
      if (!expectPhase(state, 'demolish')) return 'err.nothingToDemolish';
      if (!demolishable(state, active).includes(action.landmarkId)) return 'err.notBuilt';
      active.landmarks[action.landmarkId] = false;
      gain(active, 'demolition_company', 8, true);
      log(state, 'log.demolish', { player: active.name, landmark: action.landmarkId }, { who: active.id, kind: 'build' });
      advancePending(state);
      return null;
    }

    case 'moving': {
      if (!expectPhase(state, 'moving')) return 'err.movingNotWaiting';
      const target = findPlayer(state, action.targetId);
      if (!target) return 'err.unknownPlayer';
      if (target.id === active.id) return 'err.pickAnother';
      if (CARD_BY_ID[action.give]?.icon === 'major') return 'err.noMajorMove';
      if (copies(active, action.give) <= 0) return 'err.dontOwn';
      transferCard(active, target, action.give);
      gain(active, 'moving_company', 4, true);
      log(
        state,
        'log.moving',
        { player: active.name, card: action.give, target: target.name },
        { who: active.id, kind: 'income' }
      );
      advancePending(state);
      return null;
    }

    case 'renovation': {
      if (!expectPhase(state, 'renovation')) return 'err.renovationNotWaiting';
      const card = CARD_BY_ID[action.cardId];
      if (!card || card.icon === 'major') return 'err.chooseNonMajor';
      if (!cardsFor(state.rules).includes(card)) return 'err.cardNotInGame';
      let collected = 0;
      let shut = 0;
      for (const p of state.players) {
        const newly = openCopies(p, action.cardId);
        if (newly <= 0) continue;
        p.closed[action.cardId] = copies(p, action.cardId);
        shut += newly;
        if (p.id !== active.id) collected += pay(p, active, newly, 'renovation_company');
      }
      log(
        state,
        'log.renovation',
        { player: active.name, count: shut, card: action.cardId, amount: collected },
        { who: active.id, kind: 'income' }
      );
      advancePending(state);
      return null;
    }

    case 'exhibit': {
      if (!expectPhase(state, 'exhibit')) return 'err.exhibitNotWaiting';
      if (action.cardId === null) {
        log(state, 'log.exhibitKeep', { player: active.name }, { who: active.id, kind: 'income' });
        advancePending(state);
        return null;
      }
      if (!exhibitCandidates(state, active).includes(action.cardId)) return 'err.cannotActivate';
      activateAll(state, active, action.cardId);
      active.cards.exhibit_hall = copies(active, 'exhibit_hall') - 1;
      state.supply.exhibit_hall = (state.supply.exhibit_hall ?? 0) + 1;
      log(state, 'log.exhibitReturn', { player: active.name }, { who: active.id, kind: 'build' });
      advancePending(state);
      return null;
    }

    case 'invest': {
      if (state.phase !== 'invest') return 'err.noInvest';
      if (action.amount === 1) {
        if (active.coins < 1) return 'err.noCoinToInvest';
        active.coins -= 1;
        active.investment += 1;
        noteInvest(active, 1);
        log(state, 'log.invest', { player: active.name, total: active.investment }, { who: active.id, kind: 'build' });
      }
      finishTurn(state);
      return null;
    }

    case 'buy': {
      if (state.phase !== 'build') return 'err.cannotBuildNow';
      if (!canBuy(state, active, action.cardId)) return 'err.cannotBuy';
      const card = CARD_BY_ID[action.cardId];
      // The Loan Office has a negative price: taking it on pays you.
      if (card.cost < 0) gain(active, card.id, -card.cost, true);
      else {
        active.coins -= card.cost;
        noteBuild(active, card.id, card.cost, false);
      }
      active.stats.cardsBought++;
      active.cards[card.id] = copies(active, card.id) + 1;
      state.supply[card.id] = (state.supply[card.id] ?? 0) - 1;
      if (card.cost < 0) {
        log(state, 'log.buyPaid', { player: active.name, card: card.id, amount: -card.cost }, { who: active.id, kind: 'build' });
      } else {
        log(state, 'log.buy', { player: active.name, card: card.id, cost: card.cost }, { who: active.id, kind: 'build' });
      }
      refillSupply(state);
      endOfTurn(state);
      return null;
    }

    case 'landmark': {
      if (state.phase !== 'build') return 'err.cannotBuildNow';
      if (!canBuild(state, active, action.landmarkId)) return 'err.cannotBuildLandmark';
      const l = landmarksFor(state.rules).find((x) => x.id === action.landmarkId)!;
      active.coins -= l.cost;
      noteBuild(active, l.id, l.cost, true);
      active.landmarks[l.id] = true;
      log(state, 'log.buildLandmark', { player: active.name, landmark: l.id, cost: l.cost }, { who: active.id, kind: 'build' });
      endOfTurn(state);
      return null;
    }

    case 'pass': {
      if (state.phase !== 'build') return 'err.cannotPass';
      if (active.landmarks.airport) {
        noteHits(active, 'airport');
        gain(active, 'airport', 10, true);
        log(state, 'log.passAirport', { player: active.name }, { who: active.id, kind: 'build' });
      } else {
        log(state, 'log.pass', { player: active.name }, { who: active.id, kind: 'build' });
      }
      endOfTurn(state);
      return null;
    }

    default:
      return 'err.unknownAction';
  }
}

// ---------------------------------------------------------------------------
// estimates used by the bots
// ---------------------------------------------------------------------------

/** Coins the blue cards pay out, which they do on anybody's roll. */
function blueIncomeAt(state: GameState, p: PlayerState, total: number): number {
  let sum = 0;
  for (const card of triggered(p, total, 'blue', state.rules)) {
    const n = openCopies(p, card.id);
    sum += (card.id === 'tuna_boat' ? 7 : blueAmount(state, card, p)) * n;
  }
  return sum;
}

/** Coins the green cards pay out, which they only do on their owner's turn. */
function greenIncomeAt(state: GameState, p: PlayerState, total: number): number {
  let sum = 0;
  for (const card of triggered(p, total, 'green', state.rules)) {
    const n = openCopies(p, card.id);
    if (card.id === 'demolition_company') sum += (landmarkCount(state, p) > 0 ? 8 : 0) * n;
    else if (card.id === 'moving_company') sum += (tradeableCards(p).length > 0 ? 4 : 0) * n;
    else sum += greenAmount(state, card, p) * n;
  }
  return sum;
}

/** Coins a player collects from the bank on a given total. */
export function bankIncomeAt(state: GameState, p: PlayerState, total: number): number {
  return blueIncomeAt(state, p, total) + greenIncomeAt(state, p, total);
}

/** What the majors would bring in for `p`, read against the table as it stands. */
function purpleIncomeAt(state: GameState, p: PlayerState, total: number): number {
  const others = state.players.filter((o) => o.id !== p.id);
  let sum = 0;

  for (const card of triggered(p, total, 'purple', state.rules)) {
    if (openCopies(p, card.id) <= 0) continue;
    switch (card.id) {
      case 'stadium':
        sum += others.reduce((a, o) => a + Math.min(2, o.coins), 0);
        break;
      case 'tv_station':
        sum += Math.min(5, Math.max(0, ...others.map((o) => o.coins)));
        break;
      case 'business_center':
        sum += 2;
        break;
      case 'publisher':
        sum += others.reduce((a, o) => a + Math.min(o.coins, countIcon(o, 'bread') + countIcon(o, 'cup')), 0);
        break;
      case 'tax_office':
        sum += others.reduce((a, o) => a + (o.coins >= 10 ? Math.floor(o.coins / 2) : 0), 0);
        break;
      case 'tech_startup':
        sum += others.reduce((a, o) => a + Math.min(o.coins, p.investment), 0);
        break;
      case 'renovation_company':
        sum += others.reduce((a, o) => a + Math.min(o.coins, 2), 0);
        break;
      case 'exhibit_hall':
        sum += 4;
        break;
      case 'park': {
        const pot = state.players.reduce((a, o) => a + o.coins, 0);
        sum += Math.ceil(pot / state.players.length) - p.coins;
        break;
      }
    }
  }
  return sum;
}

/** What the opponents' restaurants would take off `p` if `p` rolled this total. */
function redOwedAt(state: GameState, p: PlayerState, total: number): number {
  let owed = 0;
  for (const other of state.players) {
    if (other.id === p.id) continue;
    for (const card of triggered(other, total, 'red', state.rules)) {
      owed += redAmount(state, card, other, p) * openCopies(other, card.id);
    }
  }
  // Nobody can be billed for more than they are holding.
  return Math.min(owed, p.coins);
}

/** What one dice total is worth to a city, from both sides of the table. */
export interface IncomeAtTotal {
  /** Net swing when this player rolls the total themselves. */
  onYourTurn: number;
  /** Take when somebody else rolls it: the blue cards, plus this player's restaurants. */
  onTheirTurn: number;
}

/**
 * A city's income curve, total by total. `estimateIncomeAt` is only the
 * own-turn half of this; both halves matter to a human reading the board,
 * because a Mine on 9 earns most of its keep off the opponents' rolls and a
 * city judged on its own turn alone misprices every blue card in it.
 */
export function incomeAt(state: GameState, p: PlayerState, total: number): IncomeAtTotal {
  const blue = blueIncomeAt(state, p, total);
  const mine = blue + greenIncomeAt(state, p, total) + purpleIncomeAt(state, p, total);

  // On somebody else's roll it is the restaurants that pay, so average the take
  // over whoever might have done the rolling.
  const others = state.players.filter((o) => o.id !== p.id);
  let take = 0;
  if (others.length > 0) {
    for (const card of triggered(p, total, 'red', state.rules)) {
      const n = openCopies(p, card.id);
      if (n <= 0) continue;
      const average =
        others.reduce((a, roller) => a + Math.min(redAmount(state, card, p, roller), roller.coins), 0) / others.length;
      take += average * n;
    }
  }

  return { onYourTurn: mine - redOwedAt(state, p, total), onTheirTurn: blue + take };
}

/** Rough net coin swing for the active player if `total` came up. */
export function estimateIncomeAt(state: GameState, total: number): number {
  return incomeAt(state, activePlayer(state), total).onYourTurn;
}
