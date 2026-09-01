import {
  CARD_BY_ID,
  cardsFor,
  landmarksFor,
  type CardDef,
  type CardId,
  type LandmarkDef,
  type LandmarkId,
} from './cards';
import {
  activationValue,
  activePlayer,
  blueAmount,
  canBuild,
  canBuy,
  cardCost,
  closedCopies,
  copies,
  countIcon,
  demolishable,
  estimateIncomeAt,
  exhibitCandidates,
  greenAmount,
  landmarkCost,
  openCopies,
  payable,
  redAmount,
  tradeableCards,
} from './engine';
import { BASELINE, weightsFor, type BotWeights } from './bot-weights';
import type { GameAction, GameState, PlayerState } from './types';

export type { BotWeights } from './bot-weights';

const TWO_DICE_P: Record<number, number> = {
  2: 1 / 36, 3: 2 / 36, 4: 3 / 36, 5: 4 / 36, 6: 5 / 36, 7: 6 / 36,
  8: 5 / 36, 9: 4 / 36, 10: 3 / 36, 11: 2 / 36, 12: 1 / 36,
};

/** Chance that a card with these activation numbers fires on a single roll. */
function activationProb(activates: number[], twoDice: boolean, harbor: boolean): number {
  let p = 0;
  for (const t of activates) {
    if (twoDice) {
      p += TWO_DICE_P[t] ?? 0;
      // the Harbor can push a 10/11/12 up into the teens
      if (harbor && t >= 12) p += TWO_DICE_P[t - 2] ?? 0;
    } else if (t <= 6) {
      p += 1 / 6;
    }
  }
  return Math.min(1, p);
}

/** Average take of a restaurant card, over the opponents who might roll. */
function redPerActivation(state: GameState, card: CardDef, owner: PlayerState): number {
  const others = state.players.filter((p) => p.id !== owner.id);
  if (!others.length) return 0;
  return others.reduce((sum, roller) => sum + Math.min(redAmount(state, card, owner, roller), payable(state, roller) + 4), 0) / others.length;
}

/** What a purple card pays on an average table, knowing nothing about this one. */
function purpleFlat(card: CardDef, owner: PlayerState, n: number): number {
  switch (card.id) {
    case 'stadium':
      return 2 * (n - 1);
    case 'tv_station':
      return 5;
    case 'business_center':
      return 3;
    case 'publisher':
      return 2 * (n - 1);
    case 'tax_office':
      return 4;
    case 'renovation_company':
      return 2 * (n - 1);
    case 'tech_startup':
      return owner.investment * (n - 1);
    case 'exhibit_hall':
      return 4;
    case 'park':
      return 3;
    default:
      return 0;
  }
}

/**
 * What the same card pays against the players actually sitting there.
 *
 * The engine already prices purples this way when the bot is deciding how to
 * roll (`estimateIncomeAt`), but every *purchase* went through the flat
 * constants above, so the bot would pay 8 coins for a Publisher against three
 * empty cities and value a Park it could only lose money on.  Read straight off
 * the opponents instead: their coins, their bread and cup icons, what they have
 * left open.
 */
/**
 * What a player will usually have in hand, rather than what is in their pocket
 * at the instant of the purchase.
 *
 * A purple card is bought once and then fires for the rest of the game, so the
 * question is not "can this opponent pay me today" but "can they pay me, on a
 * typical turn, for the next fifty".  Players sawtooth: they collect until they
 * can afford something and then spend back down to nearly nothing, so the
 * average over that cycle sits at about half their high-water mark.  Reading
 * only the pocket makes a table that spends briskly look permanently too poor
 * to tax — which is exactly what a long game full of cheap cards looks like.
 */
function coinLevel(p: PlayerState, w: BotWeights): number {
  if (w.purpleHorizon <= 0) return p.coins;
  const usual = p.stats.peakCoins / 2;
  return p.coins + w.purpleHorizon * Math.max(0, usual - p.coins);
}

function purpleAgainstTable(state: GameState, card: CardDef, owner: PlayerState, w: BotWeights): number {
  const others = state.players.filter((p) => p.id !== owner.id);
  if (!others.length) return 0;
  const purse = (p: PlayerState) => coinLevel(p, w);
  switch (card.id) {
    case 'stadium':
      return others.reduce((a, p) => a + Math.min(2, purse(p)), 0);
    case 'tv_station':
      return Math.min(5, Math.max(0, ...others.map(purse)));
    case 'business_center':
      // worth nothing if there is nothing on either side to swap
      return tradeableCards(owner).length && others.some((p) => tradeableCards(p).length) ? 3 : 0;
    case 'publisher':
      return others.reduce((a, p) => a + Math.min(purse(p), countIcon(p, 'bread') + countIcon(p, 'cup')), 0);
    case 'tax_office':
      return others.reduce((a, p) => a + (purse(p) >= 10 ? Math.floor(purse(p) / 2) : 0), 0);
    case 'renovation_company':
      // whatever the best card to shut down would collect; what closing it costs
      // the owner is `renovationSelfHarm`'s business, at the point of choosing
      return cardsFor(state.rules).reduce((best, c) => {
        if (c.icon === 'major') return best;
        const take = others.reduce((a, p) => a + Math.min(openCopies(p, c.id), purse(p)), 0);
        return Math.max(best, take);
      }, 0);
    case 'tech_startup':
      return others.reduce((a, p) => a + Math.min(purse(p), owner.investment), 0);
    case 'exhibit_hall':
      return exhibitCandidates(state, owner).reduce((best, id) => Math.max(best, activationValue(state, owner, id)), 0);
    case 'park': {
      const pot = state.players.reduce((a, p) => a + purse(p), 0);
      // signed: levelling the table up costs the player who is already ahead
      return Math.ceil(pot / state.players.length) - purse(owner);
    }
    default:
      return 0;
  }
}

/**
 * Purples whose worth is a question about the opponents' purse rather than
 * about their cities.  What sits in a city can be read off the table and stays
 * read; what sits in a pocket is gone by the next turn, so the two kinds of
 * card do not deserve the same amount of trust.
 */
const COIN_DRIVEN: CardId[] = ['stadium', 'tv_station', 'tax_office', 'tech_startup', 'park'];

function purpleEstimate(state: GameState, card: CardDef, owner: PlayerState, w: BotWeights): number {
  const flat = purpleFlat(card, owner, state.players.length);
  const mix = w.purpleRealism * (COIN_DRIVEN.includes(card.id) ? w.purpleVolatile : 1);
  if (mix <= 0) return flat;
  const real = purpleAgainstTable(state, card, owner, w);
  return flat * (1 - mix) + real * mix;
}

/**
 * Expected activations per round, counting each roller's own dice.
 *
 * Blue cards pay on everyone's turn and red cards take from whoever rolled, so
 * what matters for them is how the *table* rolls, not how the owner does. At
 * `tableDice` 0 this collapses to the old assumption that everybody rolls the
 * way the owner does.
 */
function activationsPerRound(
  state: GameState,
  card: CardDef,
  owner: PlayerState,
  ownerTwoDice: boolean,
  w: BotWeights
): number {
  const ownHarbor = Boolean(owner.landmarks.harbor);
  const ownProb = activationProb(card.activates, ownerTwoDice, ownHarbor);
  if (card.color === 'green' || card.color === 'purple') return ownProb;

  const rollers = card.color === 'red' ? state.players.filter((r) => r.id !== owner.id) : state.players;
  let mine = 0;
  for (const roller of rollers) {
    const asMe = ownProb;
    const asThem =
      roller.id === owner.id
        ? ownProb
        : activationProb(card.activates, Boolean(roller.landmarks.train_station), Boolean(roller.landmarks.harbor));
    mine += asMe * (1 - w.tableDice) + asThem * w.tableDice;
  }
  return mine;
}

/**
 * Rough coins per round a player's establishments generate. `diceOverride`
 * prices the same city under the other dice mode, which is how the bot can see
 * that a 7-and-up engine is worth something before the Train Station is up.
 */
function deckIncome(state: GameState, p: PlayerState, w: BotWeights, diceOverride?: boolean): number {
  const twoDice = diceOverride ?? p.landmarks.train_station;
  const harbor = Boolean(p.landmarks.harbor);
  let sum = 0;

  for (const card of cardsFor(state.rules)) {
    const count = copies(p, card.id);
    if (!count) continue;
    if (card.needsHarbor && !harbor) continue;

    const rate = activationsPerRound(state, card, p, twoDice, w);
    let per = 0;
    switch (card.color) {
      case 'blue':
        per = card.id === 'tuna_boat' ? 7 : blueAmount(state, card, p);
        break;
      case 'green':
        per = greenValue(state, card, p);
        break;
      case 'red':
        per = redPerActivation(state, card, p);
        break;
      case 'purple':
        per = purpleEstimate(state, card, p, w);
        break;
    }
    sum += rate * per * count;
  }
  return sum;
}

/** Green payouts, with the awkward cards priced by what they really cost you. */
function greenValue(state: GameState, card: CardDef, p: PlayerState): number {
  if (card.id === 'demolition_company') {
    // What it really pays is eight coins less the price of putting back up
    // whatever it knocks down — at the price this player would be charged.
    const cheapest = landmarksFor(state.rules)
      .filter((l) => !l.free && p.landmarks[l.id])
      .reduce((min: number | null, l) => {
        const cost = landmarkCost(state, p, l);
        return min === null || cost < min ? cost : min;
      }, null);
    return cheapest === null ? 0 : 8 - cheapest;
  }
  if (card.id === 'moving_company') return tradeableCards(p).length ? 3 : 0;
  return greenAmount(state, card, p);
}

function withCards(p: PlayerState, edit: (cards: Partial<Record<CardId, number>>) => void): PlayerState {
  const cards = { ...p.cards };
  edit(cards);
  return { ...p, cards };
}

function plus(p: PlayerState, id: CardId): PlayerState {
  return withCards(p, (c) => {
    c[id] = (c[id] ?? 0) + 1;
  });
}

/** Income a player gains per round by adding one more copy of a card. */
function marginalValue(state: GameState, p: PlayerState, id: CardId, w: BotWeights, base?: number): number {
  return deckIncome(state, plus(p, id), w) - (base ?? deckIncome(state, p, w));
}

/** The same, blended with the value the card would have under the other dice mode. */
function marginalValueAhead(
  state: GameState,
  p: PlayerState,
  id: CardId,
  w: BotWeights,
  base: number,
  otherBase: number
): number {
  const now = deckIncome(state, plus(p, id), w) - base;
  if (w.futureDice <= 0) return now;
  const other = !p.landmarks.train_station;
  const later = deckIncome(state, plus(p, id), w, other) - otherBase;
  return now * (1 - w.futureDice) + later * w.futureDice;
}

function expectedRoll(state: GameState, dice: 1 | 2): number {
  if (dice === 1) {
    let sum = 0;
    for (let t = 1; t <= 6; t++) sum += estimateIncomeAt(state, t) / 6;
    return sum;
  }
  let sum = 0;
  for (const [total, prob] of Object.entries(TWO_DICE_P)) sum += estimateIncomeAt(state, Number(total)) * prob;
  return sum;
}

function opponents(state: GameState): PlayerState[] {
  const me = activePlayer(state);
  return state.players.filter((p) => p.id !== me.id);
}

function richestOpponent(state: GameState, w: BotWeights): PlayerState {
  const score = (p: PlayerState) => p.coins + w.threatWeight * threat(state, p);
  return opponents(state).reduce((best, p) => (score(p) > score(best) ? p : best));
}

/** How close a player is to winning, used to decide who to hit. */
function threat(state: GameState, p: PlayerState): number {
  return landmarksFor(state.rules)
    .filter((l) => !l.free && p.landmarks[l.id])
    .reduce((a, l) => a + l.cost, 0);
}

/** Deterministic noise in [-1, 1], so equal-looking cities still diverge. */
function wobble(state: GameState, id: string): number {
  let h = (state.rng ^ (state.turnCount * 2654435761)) >>> 0;
  for (let i = 0; i < id.length; i++) h = (Math.imul(h ^ id.charCodeAt(i), 16777619) >>> 0);
  return ((h % 2001) / 1000) - 1;
}

function chooseTrade(state: GameState, w: BotWeights): GameAction {
  const me = activePlayer(state);
  const mine = tradeableCards(me);
  const base = deckIncome(state, me, w);
  let best: { targetId: string; give: CardId; take: CardId; score: number } | null = null;

  for (const other of opponents(state)) {
    for (const take of tradeableCards(other)) {
      for (const give of mine) {
        if (give === take) continue;
        const after = withCards(me, (c) => {
          c[give] = (c[give] ?? 0) - 1;
          c[take] = (c[take] ?? 0) + 1;
        });
        const gain = deckIncome(state, after, w) - base;
        const score = gain + w.threatWeight * threat(state, other);
        if (!best || score > best.score) best = { targetId: other.id, give, take, score };
      }
    }
  }

  // The swap is compulsory, so fall back to the first legal pair.
  if (!best) {
    const other = opponents(state).find((p) => tradeableCards(p).length > 0)!;
    return { t: 'trade', targetId: other.id, give: mine[0], take: tradeableCards(other)[0] };
  }
  return { t: 'trade', targetId: best.targetId, give: best.give, take: best.take };
}

function chooseMoving(state: GameState, w: BotWeights): GameAction {
  const me = activePlayer(state);
  const base = deckIncome(state, me, w);
  const give = tradeableCards(me).reduce((worst, id) =>
    marginalValue(state, me, id, w, base) < marginalValue(state, me, worst, w, base) ? id : worst
  );
  // hand it to whoever is furthest from winning
  const target = opponents(state).reduce((least, p) => (threat(state, p) < threat(state, least) ? p : least));
  return { t: 'moving', targetId: target.id, give };
}

function chooseDemolish(state: GameState): GameAction {
  const me = activePlayer(state);
  const built = demolishable(state, me);
  const rebuild = (id: LandmarkId) => landmarkCost(state, me, landmarksFor(state.rules).find((l) => l.id === id)!);
  const cheapest = built.reduce((min, id) => (rebuild(id) < rebuild(min) ? id : min));
  return { t: 'demolish', landmarkId: cheapest };
}

function chooseRenovation(state: GameState, w: BotWeights): GameAction {
  const me = activePlayer(state);
  const base = deckIncome(state, me, w);
  let best: { id: CardId; score: number } | null = null;
  for (const card of cardsFor(state.rules)) {
    if (card.icon === 'major') continue;
    const gain = opponents(state).reduce((sum, p) => sum + Math.min(openCopies(p, card.id), p.coins), 0);
    const selfHarm = openCopies(me, card.id) * (marginalValue(state, me, card.id, w, base) + w.renovationSelfHarm);
    const score = gain - selfHarm;
    if (!best || score > best.score) best = { id: card.id, score };
  }
  return { t: 'renovation', cardId: best!.id };
}

function chooseExhibit(state: GameState, w: BotWeights): GameAction {
  const me = activePlayer(state);
  let best: { id: CardId; value: number } | null = null;
  for (const id of exhibitCandidates(state, me)) {
    const value = activationValue(state, me, id);
    if (!best || value > best.value) best = { id, value };
  }
  // giving up the Exhibit Hall is only worth a decent payout
  if (!best || best.value < w.exhibitThreshold) return { t: 'exhibit', cardId: null };
  return { t: 'exhibit', cardId: best.id };
}

function colourWeight(card: CardDef, w: BotWeights): number {
  switch (card.color) {
    case 'blue':
      return w.blueWeight;
    case 'green':
      return w.greenWeight;
    case 'red':
      return w.redWeight;
    default:
      return w.purpleWeight;
  }
}

/** Coins short of the cheapest landmark still to build, or null if there is none. */
function landmarkGap(state: GameState, me: PlayerState): number | null {
  const left = landmarksFor(state.rules).filter((l) => !l.free && !me.landmarks[l.id]);
  if (!left.length) return null;
  return Math.min(...left.map((l) => landmarkCost(state, me, l))) - me.coins;
}

/** The same player with one more landmark up, for pricing what it unlocks. */
function withLandmark(p: PlayerState, id: LandmarkId): PlayerState {
  return { ...p, landmarks: { ...p.landmarks, [id]: true } };
}

/**
 * Cards a landmark brings to life: the boats need a Harbor, and anything that
 * only fires on 7 or more is dead until the Train Station.  Everything else is
 * already priced by the city's own income.
 */
function gatedBy(id: LandmarkId, rules: GameState['rules']): CardDef[] {
  return cardsFor(rules).filter((card) => {
    if (id === 'harbor') return Boolean(card.needsHarbor);
    if (id === 'train_station') return card.activates.every((n) => n > 6);
    return false;
  });
}

/**
 * The best card the landmark would make worth owning.  Without this the bot only
 * sees what a landmark does for the city it already has — which is nothing at
 * all for a Harbor bought before its first boat.
 */
function unlockValue(state: GameState, l: LandmarkDef, after: PlayerState, w: BotWeights): number {
  let best = 0;
  const afterBase = deckIncome(state, after, w);
  for (const card of gatedBy(l.id, state.rules)) {
    if ((state.supply[card.id] ?? 0) <= 0) continue;
    const gain = deckIncome(state, plus(after, card.id), w) - afterBase;
    if (gain > best) best = gain;
  }
  return best;
}

/**
 * What a landmark is worth, on the same scale as a card's buy score: the income
 * it unlocks now, the income it would let the city earn later, and the flat value
 * of being one step closer to winning — which is the only thing the Radio Tower
 * and the Airport are really bought for.
 *
 * The "now" term is signed: a second landmark switches off the Corn Field and the
 * General Store, and this is where that shows up as a reason to wait.
 */
function landmarkScore(state: GameState, me: PlayerState, l: LandmarkDef, w: BotWeights, base: number): number {
  const after = withLandmark(me, l.id);
  const gain = deckIncome(state, after, w) - base;
  const built = landmarksFor(state.rules).filter((x) => !x.free && me.landmarks[x.id]).length;
  return (
    w.landmarkValue * gain +
    w.landmarkUnlock * unlockValue(state, l, after, w) +
    w.landmarkProgress +
    w.landmarkRush * built +
    w.landmarkOrder * (landmarkCost(state, me, l) / 10)
  );
}

function chooseBuild(state: GameState, w: BotWeights): GameAction {
  const me = activePlayer(state);
  const base = deckIncome(state, me, w);
  const otherBase = w.futureDice > 0 ? deckIncome(state, me, w, !me.landmarks.train_station) : 0;

  let landmark: { def: LandmarkDef; score: number } | null = null;
  for (const l of landmarksFor(state.rules)) {
    if (!canBuild(state, me, l.id)) continue;
    const score = landmarkScore(state, me, l, w, base);
    if (!landmark || score > landmark.score) landmark = { def: l, score };
  }

  // The strongest opponent's shopping list, for judging what is worth denying.
  const rival = w.denialWeight !== 0 && opponents(state).length
    ? opponents(state).reduce((best, p) => (threat(state, p) > threat(state, best) ? p : best))
    : null;
  const rivalBase = rival ? deckIncome(state, rival, w) : 0;

  let bestCard: { id: CardId; score: number } | null = null;
  for (const card of cardsFor(state.rules)) {
    if (!canBuy(state, me, card.id)) continue;
    const value = marginalValueAhead(state, me, card.id, w, base, otherBase) * colourWeight(card, w);
    const price = Math.max(1, cardCost(state, me, card));
    const left = state.supply[card.id] ?? 0;

    let score = w.cardValue * value + w.costEfficiency * (value / price);
    score -= w.duplicatePenalty * copies(me, card.id);
    if (left <= 1) score += w.scarcityBonus;
    if (rival && card.icon !== 'major') {
      score += w.denialWeight * Math.max(0, marginalValue(state, rival, card.id, w, rivalBase)) * (left <= 2 ? 1 : 0.25);
    }
    score *= 1 + w.jitter * wobble(state, card.id);
    if (!bestCard || score > bestCard.score) bestCard = { id: card.id, score };
  }

  // Landmark and card are now judged on one scale, so the better buy simply wins.
  if (landmark && (!bestCard || landmark.score >= bestCard.score)) {
    return { t: 'landmark', landmarkId: landmark.def.id };
  }
  if (!landmark) {
    // Nothing affordable yet: it can pay to sit on the coins rather than spend
    // them on a marginal card the turn before a landmark comes into reach.
    const gap = landmarkGap(state, me);
    if (gap !== null && gap <= w.saveMargin && (!bestCard || bestCard.score < w.saveScore)) {
      return { t: 'pass' };
    }
  }

  if (bestCard && bestCard.score > w.buyThreshold) return { t: 'buy', cardId: bestCard.id };
  return { t: 'pass' };
}

/** Decide what the current player (a bot, or a stalled human) should do. */
export function botAction(state: GameState, weights?: BotWeights): GameAction | null {
  const me = activePlayer(state);
  const w = weights ?? weightsFor(state.rules);

  switch (state.phase) {
    case 'roll': {
      if (!me.landmarks.train_station) return { t: 'roll', dice: 1 };
      return { t: 'roll', dice: expectedRoll(state, 2) + w.twoDiceBias >= expectedRoll(state, 1) ? 2 : 1 };
    }

    case 'reroll': {
      const current = estimateIncomeAt(state, state.diceTotal);
      const expected = expectedRoll(state, state.dice.length === 2 ? 2 : 1);
      return { t: 'reroll', again: current < expected - w.rerollMargin };
    }

    case 'spaceport': {
      const stay = estimateIncomeAt(state, state.diceTotal);
      let best: { delta: -1 | 0 | 1; value: number } = { delta: 0, value: stay + w.spacePortMargin };
      for (const delta of [-1, 1] as const) {
        if (state.diceTotal + delta < 1) continue;
        const value = estimateIncomeAt(state, state.diceTotal + delta);
        if (value > best.value) best = { delta, value };
      }
      return { t: 'spaceport', delta: best.delta };
    }

    case 'harbor': {
      const stay = estimateIncomeAt(state, state.diceTotal);
      const boosted = estimateIncomeAt(state, state.diceTotal + 2);
      return { t: 'harbor', add: boosted > stay + w.harborMargin };
    }

    case 'tv':
      return { t: 'tv', targetId: richestOpponent(state, w).id };

    case 'trade':
      return chooseTrade(state, w);

    case 'moving':
      return chooseMoving(state, w);

    case 'demolish':
      return chooseDemolish(state);

    case 'renovation':
      return chooseRenovation(state, w);

    case 'exhibit':
      return chooseExhibit(state, w);

    case 'invest':
      return { t: 'invest', amount: me.coins >= w.investFloor && me.investment < w.investCap ? 1 : 0 };

    case 'build':
      return chooseBuild(state, w);

    default:
      return null;
  }
}

export { BASELINE };

/** Names for bot seats — a room draws from these at random, so the table changes. */
export const BOT_NAMES = [
  'Aizhan',
  'Yerlan',
  'Aigerim',
  'Nurlan',
  'Dana',
  'Askar',
  'Madina',
  'Timur',
  'Aliya',
  'Daulet',
  'Zhanna',
  'Bekzat',
  'Gulnara',
  'Arman',
  'Saule',
  'Kanat',
  'Dinara',
  'Yerbol',
  'Ainur',
  'Serik',
  'Zarina',
  'Talgat',
  'Meruert',
  'Olzhas',
];

/** Cards a bot considers dead weight, exposed for the UI's renovation hints. */
export function closedSummary(p: PlayerState): CardId[] {
  return (Object.keys(p.closed) as CardId[]).filter((id) => closedCopies(p, id) > 0);
}

export function describeCard(id: CardId): string {
  return CARD_BY_ID[id].name;
}
