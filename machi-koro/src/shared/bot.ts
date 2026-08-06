import { CARD_BY_ID, cardsFor, landmarksFor, type CardDef, type CardId, type LandmarkDef } from './cards';
import {
  activationValue,
  activePlayer,
  blueAmount,
  canBuild,
  canBuy,
  closedCopies,
  copies,
  demolishable,
  estimateIncomeAt,
  exhibitCandidates,
  greenAmount,
  openCopies,
  redAmount,
  tradeableCards,
} from './engine';
import type { GameAction, GameState, PlayerState } from './types';

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
  return others.reduce((sum, roller) => sum + Math.min(redAmount(state, card, owner, roller), roller.coins + 4), 0) / others.length;
}

function purpleEstimate(state: GameState, card: CardDef, owner: PlayerState): number {
  const n = state.players.length;
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

/** Rough coins per round a player's establishments generate. */
function deckIncome(state: GameState, p: PlayerState): number {
  const n = state.players.length;
  const twoDice = p.landmarks.train_station;
  const harbor = Boolean(p.landmarks.harbor);
  let sum = 0;

  for (const card of cardsFor(state.rules)) {
    const count = copies(p, card.id);
    if (!count) continue;
    if (card.needsHarbor && !harbor) continue;

    const prob = activationProb(card.activates, twoDice, harbor);
    let per = 0;
    let turnsPerRound = 1;
    switch (card.color) {
      case 'blue':
        per = card.id === 'tuna_boat' ? 7 : blueAmount(state, card, p);
        turnsPerRound = n;
        break;
      case 'green':
        per = greenValue(state, card, p);
        break;
      case 'red':
        per = redPerActivation(state, card, p);
        turnsPerRound = n - 1;
        break;
      case 'purple':
        per = purpleEstimate(state, card, p);
        break;
    }
    sum += prob * per * count * turnsPerRound;
  }
  return sum;
}

/** Green payouts, with the awkward cards priced by what they really cost you. */
function greenValue(state: GameState, card: CardDef, p: PlayerState): number {
  if (card.id === 'demolition_company') {
    const cheapest = landmarksFor(state.rules)
      .filter((l) => !l.free && p.landmarks[l.id])
      .reduce((min: number | null, l) => (min === null || l.cost < min ? l.cost : min), null);
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

/** Income a player gains per round by adding one more copy of a card. */
function marginalValue(state: GameState, p: PlayerState, id: CardId): number {
  const after = withCards(p, (c) => {
    c[id] = (c[id] ?? 0) + 1;
  });
  return deckIncome(state, after) - deckIncome(state, p);
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

function richestOpponent(state: GameState): PlayerState {
  return opponents(state).reduce((best, p) => (p.coins > best.coins ? p : best));
}

/** How close a player is to winning, used to decide who to hit. */
function threat(state: GameState, p: PlayerState): number {
  return landmarksFor(state.rules)
    .filter((l) => !l.free && p.landmarks[l.id])
    .reduce((a, l) => a + l.cost, 0);
}

function chooseTrade(state: GameState): GameAction {
  const me = activePlayer(state);
  const mine = tradeableCards(me);
  let best: { targetId: string; give: CardId; take: CardId; score: number } | null = null;

  for (const other of opponents(state)) {
    for (const take of tradeableCards(other)) {
      for (const give of mine) {
        if (give === take) continue;
        const after = withCards(me, (c) => {
          c[give] = (c[give] ?? 0) - 1;
          c[take] = (c[take] ?? 0) + 1;
        });
        const gain = deckIncome(state, after) - deckIncome(state, me);
        const score = gain + threat(state, other) / 100;
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

function chooseMoving(state: GameState): GameAction {
  const me = activePlayer(state);
  const give = tradeableCards(me).reduce((worst, id) =>
    marginalValue(state, me, id) < marginalValue(state, me, worst) ? id : worst
  );
  // hand it to whoever is furthest from winning
  const target = opponents(state).reduce((least, p) => (threat(state, p) < threat(state, least) ? p : least));
  return { t: 'moving', targetId: target.id, give };
}

function chooseDemolish(state: GameState): GameAction {
  const me = activePlayer(state);
  const built = demolishable(state, me);
  const cheapest = built.reduce((min, id) =>
    landmarksFor(state.rules).find((l) => l.id === id)!.cost <
    landmarksFor(state.rules).find((l) => l.id === min)!.cost
      ? id
      : min
  );
  return { t: 'demolish', landmarkId: cheapest };
}

function chooseRenovation(state: GameState): GameAction {
  const me = activePlayer(state);
  let best: { id: CardId; score: number } | null = null;
  for (const card of cardsFor(state.rules)) {
    if (card.icon === 'major') continue;
    const gain = opponents(state).reduce((sum, p) => sum + Math.min(openCopies(p, card.id), p.coins), 0);
    const selfHarm = openCopies(me, card.id) * (marginalValue(state, me, card.id) + 0.5);
    const score = gain - selfHarm;
    if (!best || score > best.score) best = { id: card.id, score };
  }
  return { t: 'renovation', cardId: best!.id };
}

function chooseExhibit(state: GameState): GameAction {
  const me = activePlayer(state);
  let best: { id: CardId; value: number } | null = null;
  for (const id of exhibitCandidates(state, me)) {
    const value = activationValue(state, me, id);
    if (!best || value > best.value) best = { id, value };
  }
  // giving up the Exhibit Hall is only worth a decent payout
  if (!best || best.value < 6) return { t: 'exhibit', cardId: null };
  return { t: 'exhibit', cardId: best.id };
}

function chooseBuild(state: GameState): GameAction {
  const me = activePlayer(state);

  const affordableLandmarks = landmarksFor(state.rules)
    .filter((l) => canBuild(state, me, l.id))
    .sort((a, b) => a.cost - b.cost);
  const landmark: LandmarkDef | undefined = affordableLandmarks[affordableLandmarks.length - 1];

  let bestCard: { id: CardId; score: number } | null = null;
  for (const card of cardsFor(state.rules)) {
    if (!canBuy(state, me, card.id)) continue;
    const value = marginalValue(state, me, card.id);
    const price = Math.max(1, card.cost);
    const score = (value + value / price) * (0.9 + Math.random() * 0.2);
    if (!bestCard || score > bestCard.score) bestCard = { id: card.id, score };
  }

  if (landmark) {
    const weakEconomy = deckIncome(state, me) < 4;
    const worthWaiting = landmark.cost >= 16 && weakEconomy && bestCard !== null && bestCard.score > 1;
    if (!worthWaiting) return { t: 'landmark', landmarkId: landmark.id };
  }

  if (bestCard && bestCard.score > 0.02) return { t: 'buy', cardId: bestCard.id };
  return { t: 'pass' };
}

/** Decide what the current player (a bot, or a stalled human) should do. */
export function botAction(state: GameState): GameAction | null {
  const me = activePlayer(state);

  switch (state.phase) {
    case 'roll': {
      if (!me.landmarks.train_station) return { t: 'roll', dice: 1 };
      return { t: 'roll', dice: expectedRoll(state, 2) >= expectedRoll(state, 1) ? 2 : 1 };
    }

    case 'reroll': {
      const current = estimateIncomeAt(state, state.diceTotal);
      const expected = expectedRoll(state, state.dice.length === 2 ? 2 : 1);
      return { t: 'reroll', again: current < expected - 0.5 };
    }

    case 'harbor': {
      const stay = estimateIncomeAt(state, state.diceTotal);
      const boosted = estimateIncomeAt(state, state.diceTotal + 2);
      return { t: 'harbor', add: boosted > stay };
    }

    case 'tv':
      return { t: 'tv', targetId: richestOpponent(state).id };

    case 'trade':
      return chooseTrade(state);

    case 'moving':
      return chooseMoving(state);

    case 'demolish':
      return chooseDemolish(state);

    case 'renovation':
      return chooseRenovation(state);

    case 'exhibit':
      return chooseExhibit(state);

    case 'invest':
      return { t: 'invest', amount: me.coins >= 4 && me.investment < 8 ? 1 : 0 };

    case 'build':
      return chooseBuild(state);

    default:
      return null;
  }
}

/** Names for bot seats. */
export const BOT_NAMES = ['Kanako', 'Riku', 'Hana', 'Sora', 'Yuki', 'Taro', 'Mei'];

/** Cards a bot considers dead weight, exposed for the UI's renovation hints. */
export function closedSummary(p: PlayerState): CardId[] {
  return (Object.keys(p.closed) as CardId[]).filter((id) => closedCopies(p, id) > 0);
}

export function describeCard(id: CardId): string {
  return CARD_BY_ID[id].name;
}
