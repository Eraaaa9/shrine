/**
 * The bot's strategy, as numbers.
 *
 * Every judgement call the bot makes — how much a card is worth, when to stop
 * buying and start building, who to hit — is a weight in here.  `BASELINE` is
 * the hand-written strategy the bot shipped with; `TUNED` is what came out of
 * self-play training (`npm run train`), which is what the bot actually uses.
 */
import type { RuleSet } from './cards';

export interface BotWeights {
  // --- what a card is worth -------------------------------------------------
  /** Weight on the extra income per round a card brings in. */
  cardValue: number;
  /** Weight on income per coin spent, so cheap cards stay attractive. */
  costEfficiency: number;
  /** A card has to beat this score to be worth buying at all. */
  buyThreshold: number;
  /** Charged per copy already owned; positive spreads the city out. */
  duplicatePenalty: number;
  /** Bonus for buying out of a stack that is nearly gone. */
  scarcityBonus: number;
  /** Bonus for taking a card the opponents' engines want (denial). */
  denialWeight: number;
  /** How much of the card's value is judged under the other dice mode. */
  futureDice: number;
  /**
   * How much the bot accounts for the fact that opponents roll their own dice.
   * Blue cards pay on anyone's turn and red cards take from the roller, so a Mine
   * on 9 pays you off a two-dice opponent even while you are still on one die.
   * 0 assumes the whole table rolls the way you do; 1 uses each player's own dice.
   */
  tableDice: number;
  /** Per-colour taste, applied to the buy score only. */
  blueWeight: number;
  greenWeight: number;
  redWeight: number;
  purpleWeight: number;
  /**
   * How much the purple cards are priced against the table as it actually
   * stands rather than against an average one.  A Publisher takes a coin per
   * bread and cup in each opponent's city, a Tax Office takes nothing at all
   * from a table under ten coins, and the Park hands the richest player his own
   * money back — none of which a flat per-card constant can tell you.  0 keeps
   * the constants, 1 reads the opponents.
   */
  purpleRealism: number;

  // --- landmarks ------------------------------------------------------------
  // Landmarks are scored on the same scale as cards and the best buy wins, so
  // "build the landmark" is a judgement rather than a reflex.
  /** Weight on the income a landmark unlocks (two dice, boats, the Mall bonus). */
  landmarkValue: number;
  /**
   * Weight on the best card a landmark would make worth owning — boats after the
   * Harbor, the high numbers after the Train Station.  Without this the bot only
   * sees what a landmark does for the city it already has.
   */
  landmarkUnlock: number;
  /** Flat worth of being one landmark closer to winning. Large means always build. */
  landmarkProgress: number;
  /** Added to that per landmark already built, so a leader can close the game out. */
  landmarkRush: number;
  /** Above 0 prefer the dearest affordable landmark, below 0 the cheapest. */
  landmarkOrder: number;
  /** Hoard coins when the next landmark is within this many of affordable... */
  saveMargin: number;
  /** ...unless a card scores above this. */
  saveScore: number;

  // --- dice -----------------------------------------------------------------
  /** Added to the two-dice estimate, so the bot can be talked into the big numbers. */
  twoDiceBias: number;
  /** How much better a re-roll has to look before taking it. */
  rerollMargin: number;
  /** How much better the Harbor's +2 has to look. */
  harborMargin: number;
  /** How much better the Space Port's ±1 has to look. */
  spacePortMargin: number;

  // --- picking on people ----------------------------------------------------
  /** Weight on how close a player is to winning when choosing a target. */
  threatWeight: number;
  /** Payout the Exhibit Hall has to find before it spends itself. */
  exhibitThreshold: number;
  /** Coins to keep in hand before feeding the Tech Startup. */
  investFloor: number;
  /** Coins the Tech Startup is allowed to swallow. */
  investCap: number;
  /** How much the Renovation Company cares about closing its own cards. */
  renovationSelfHarm: number;

  /** Spread on the buy score, so equal-looking cities do not play identically. */
  jitter: number;
}

export const BASELINE: BotWeights = {
  cardValue: 1,
  costEfficiency: 1,
  buyThreshold: 0.02,
  duplicatePenalty: 0,
  scarcityBonus: 0,
  denialWeight: 0,
  futureDice: 0,
  tableDice: 0,
  blueWeight: 1,
  greenWeight: 1,
  redWeight: 1,
  purpleWeight: 1,
  purpleRealism: 0,

  landmarkValue: 1,
  landmarkUnlock: 0,
  landmarkProgress: 20,
  landmarkRush: 0,
  landmarkOrder: 1,
  saveMargin: 0,
  saveScore: 0,

  twoDiceBias: 0,
  rerollMargin: 0.5,
  harborMargin: 0,
  spacePortMargin: 0,

  threatWeight: 0.01,
  exhibitThreshold: 6,
  investFloor: 4,
  investCap: 8,
  renovationSelfHarm: 0.5,

  jitter: 0.1,
};

/** Order and search range used by the trainer; also the list of tunable keys. */
export const WEIGHT_RANGE: Record<keyof BotWeights, [min: number, max: number]> = {
  cardValue: [0, 3],
  costEfficiency: [0, 4],
  buyThreshold: [-0.5, 2],
  duplicatePenalty: [-1, 2],
  scarcityBonus: [-1, 3],
  denialWeight: [-1, 2],
  futureDice: [0, 1],
  tableDice: [0, 1],
  blueWeight: [0.2, 2.5],
  greenWeight: [0.2, 2.5],
  redWeight: [0, 2.5],
  purpleWeight: [0, 3],
  purpleRealism: [0, 1],

  landmarkValue: [0, 6],
  landmarkUnlock: [0, 3],
  landmarkProgress: [0, 20],
  landmarkRush: [-2, 4],
  landmarkOrder: [-1, 1],
  saveMargin: [0, 12],
  saveScore: [0, 6],

  twoDiceBias: [-3, 3],
  rerollMargin: [-2, 4],
  harborMargin: [-3, 3],
  spacePortMargin: [-3, 3],

  threatWeight: [0, 1],
  exhibitThreshold: [0, 14],
  investFloor: [0, 20],
  investCap: [0, 16],
  renovationSelfHarm: [0, 3],

  jitter: [0, 0.4],
};

export const WEIGHT_KEYS = Object.keys(WEIGHT_RANGE) as (keyof BotWeights)[];

// --- trained strategies ------------------------------------------------------
// Replaced wholesale by `npm run train`; edit that run, not these numbers.

/**
 * Fixed supply: every stack is on the table from the first turn.
 *
 * Kept from the run before the Space Port.  Three retrains have failed to beat
 * it head to head — 21.3%, 24.8% and 21.6% against a table of these, where a
 * fair share is 25% — so their numbers were dropped and these stayed.
 *
 * `purpleRealism` is the one number here that self-play did not find: pricing
 * the purple cards off the actual table wins 27.3% against these same weights
 * with it switched off (of 4000 games, and the flat version takes only 23.7%
 * coming back the other way).  Full realism beats a half blend too, 26.7% to
 * 24.0%, so it ships at 1.
 */
export const TUNED_FIXED: BotWeights = {
  cardValue: 0.7139,
  costEfficiency: 1.1083,
  buyThreshold: -0.2905,
  duplicatePenalty: -0.625,
  scarcityBonus: 0.847,
  denialWeight: -0.2494,
  futureDice: 0.0708,
  tableDice: 1.0,
  blueWeight: 1.1257,
  greenWeight: 0.5057,
  redWeight: 0.2166,
  purpleWeight: 2.7476,
  purpleRealism: 1,
  landmarkValue: 0.7359,
  landmarkUnlock: 0.0,
  landmarkProgress: 14.9513,
  landmarkRush: -0.1801,
  landmarkOrder: 0.6613,
  saveMargin: 3.2523,
  saveScore: 0.5595,
  twoDiceBias: 0.2669,
  rerollMargin: 0.3829,
  harborMargin: 0.495,
  spacePortMargin: 0,
  threatWeight: 0.2208,
  exhibitThreshold: 4.5706,
  investFloor: 2.8563,
  investCap: 11.5589,
  renovationSelfHarm: 1.7729,
  jitter: 0.0136,
};

/**
 * Variable supply: ten stacks at a time, drawn from a shuffled deck.
 *
 * `purpleRealism` stays off here, which is the opposite of the fixed-supply
 * call and was measured, not assumed: reading the table loses 21.9% to 29.6%
 * against these weights, and a half blend still loses 23.6% to 25.6%.  These
 * games run to about 118 turns against fixed supply's 78, and the estimate
 * reads opponents' coins as they stand this instant — "nobody holds ten coins
 * right now, so the Tax Office is worth nothing" is a far worse guess over a
 * game that long than the flat constant it replaces.
 */
export const TUNED_VARIABLE: BotWeights = {
  cardValue: 1.6879,
  costEfficiency: 1.0851,
  buyThreshold: 0.2381,
  duplicatePenalty: 0.5194,
  scarcityBonus: 0.7037,
  denialWeight: 0.1584,
  futureDice: 0.2482,
  tableDice: 0.6913,
  blueWeight: 1.9873,
  greenWeight: 0.8403,
  redWeight: 0.8424,
  purpleWeight: 2.8477,
  purpleRealism: 0,
  landmarkValue: 1.29,
  landmarkUnlock: 0.1615,
  landmarkProgress: 0.0613,
  landmarkRush: 2.6455,
  landmarkOrder: 0.7212,
  saveMargin: 0.8693,
  saveScore: 0.7712,
  twoDiceBias: 0.7111,
  rerollMargin: 0.6407,
  harborMargin: 1.7923,
  spacePortMargin: -0.7599,
  threatWeight: 0.5166,
  exhibitThreshold: 0.749,
  investFloor: 2.9945,
  investCap: 9.5238,
  renovationSelfHarm: 0.7205,
  jitter: 0.0291,
};

export function weightsFor(rules: RuleSet): BotWeights {
  return rules.variableSupply ? TUNED_VARIABLE : TUNED_FIXED;
}
