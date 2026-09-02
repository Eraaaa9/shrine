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
  /**
   * How far ahead that reading looks.  A purple card is bought once and then
   * fires for the rest of the game, so what matters is what an opponent
   * usually has in hand, not what is in their pocket at the moment of the
   * purchase — and a table that spends down to nothing every turn looks
   * permanently too poor to be worth taxing.  0 reads the pocket, 1 reads the
   * player's usual level.
   */
  purpleHorizon: number;
  /**
   * How much of that reading the coin-driven purples get — the Stadium, TV
   * Station, Tax Office, Tech Startup and Park, whose worth is a question
   * about the opponents' pockets rather than about their cities.  At 0 they
   * fall back on the flat constants while the Publisher and the Renovation
   * Company go on reading what the opponents have actually built.
   */
  purpleVolatile: number;

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

  // --- mayors and events ----------------------------------------------------
  // Only read in a game with the mayors switched on.  In one without they are
  // dead weight, which is why they sit at the end: a search that never sees a
  // mayor is free to leave them wherever it likes without disturbing the rest.
  /**
   * Whether a permanent holding is priced under the event that happens to be
   * up.  A city event lasts one round and a card lasts the rest of the game, so
   * reading the event into a purchase writes the boats off for good during a
   * Harbor Storm and pays over the odds for a factory during an Economic Boom —
   * but the event is also real income for as long as it is up, so which way
   * this lands is a question for self-play rather than for taste.  Read as a
   * switch at 0.5, not as a dial: blending the two would double the cost of
   * every valuation the bot makes to answer a question with two answers.
   */
  eventTrust: number;
  /**
   * How much the Banker's dividend is worth defending.  The Banker only draws it
   * while still holding `bankerFloor` coins when the turn ends, so every purchase
   * that spends past that line costs a dividend.  This is what that costs, in
   * multiples of the dividend, charged against the purchase that would do it.
   */
  bankerHold: number;
  /**
   * How much better a re-roll has to look when it is the Urbanist's charge that
   * pays for it rather than the Radio Tower.  The tower's re-roll comes back
   * every turn and is worth spending on a small gain; the mayor's is earned by
   * building a landmark and does not come back until the next one.
   */
  mayorRerollMargin: number;

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
  purpleHorizon: 0,
  purpleVolatile: 1,

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

  eventTrust: 1,
  bankerHold: 0,
  mayorRerollMargin: 0.5,

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
  purpleHorizon: [0, 1],
  purpleVolatile: [0, 1],

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
  // An activation fires every copy you own, so the payout on offer is not
  // bounded by one card: over 200 games the best candidate came to 24+ coins
  // on a tenth of the decisions and reached 54, where the old ceiling of 14
  // could not say "hold it for a big one".  Raising it bought nothing, as it
  // turns out -- a search free to go to 40 settled at 1.9, so the bots want to
  // spend the Exhibit Hall on nearly whatever it finds.  The room stays open
  // because the ceiling, not the search, was the reason nobody had asked.
  exhibitThreshold: [0, 40],
  investFloor: [0, 20],
  investCap: [0, 16],
  renovationSelfHarm: [0, 3],

  eventTrust: [0, 1],
  bankerHold: [0, 3],
  mayorRerollMargin: [-2, 4],

  jitter: [0, 0.4],
};

export const WEIGHT_KEYS = Object.keys(WEIGHT_RANGE) as (keyof BotWeights)[];

// --- trained strategies ------------------------------------------------------
// Replaced wholesale by `npm run train`; edit that run, not these numbers.

/**
 * Fixed supply: every stack is on the table from the first turn.
 *
 * The strategy these replace had turned back four retrains in a row — the last
 * of them to a dead heat — because every one of those runs started from the
 * hand-written baseline and searched the whole weight range, and never climbed
 * back to a strategy that already takes three quarters of its games off the
 * baseline.  Searching a neighbourhood of the incumbent instead, and letting
 * the single best candidate of a generation stand for the crown beside the
 * mean of the elites, finally beat it: **26.3%** against a table of the old
 * weights (95% CI 24.8–27.9) while the old weights take only **20.4%** coming
 * back the other way (19.0–21.9), of 3000 games each and a fair share of 25%.
 * Against the hand-written baseline, 75.7%.
 *
 * The opening changed with them.  The old strategy rushed the Harbor every
 * single game and reached the Train Station around turn 14; these take the
 * Train Station first two games in three, on turn 8.
 *
 * `purpleRealism` was hand-set to 1 here rather than found — pricing the purple
 * cards off the actual table beat pricing them off flat constants 27.3% to
 * 23.7%, and beat a half blend 26.7% to 24.0%.  This run left it at 0.98, which
 * is that same answer arrived at the other way round.
 *
 * Not retrained by default any more: `npm run train` does variable supply only,
 * which is the mode that gets played.  `--mode fixed` still trains these.
 */
export const TUNED_FIXED: BotWeights = {
  cardValue: 0.9034,
  costEfficiency: 1.9834,
  buyThreshold: 0.1546,
  duplicatePenalty: -0.3931,
  scarcityBonus: 0.8721,
  denialWeight: 0.4444,
  futureDice: 0.0231,
  tableDice: 0.9297,
  blueWeight: 0.9703,
  greenWeight: 0.591,
  redWeight: 0.1678,
  purpleWeight: 2.682,
  purpleRealism: 0.9776,
  purpleHorizon: 0,
  purpleVolatile: 0.8113,
  landmarkValue: 0.0457,
  landmarkUnlock: 0.0224,
  landmarkProgress: 9.9997,
  landmarkRush: 0.1662,
  landmarkOrder: 0.2987,
  saveMargin: 3.3188,
  saveScore: 0,
  twoDiceBias: -0.328,
  rerollMargin: 0.3666,
  harborMargin: 2.0476,
  spacePortMargin: 0.4077,
  threatWeight: 0.4382,
  exhibitThreshold: 4.5401,
  investFloor: 4.6969,
  investCap: 9.9025,
  renovationSelfHarm: 1.9785,
  eventTrust: 0,
  bankerHold: 0,
  mayorRerollMargin: 0.3666,
  jitter: 0.0248,
};

/**
 * Variable supply: a market drawn from a shuffled deck, opening with one stack
 * and widening a stack a turn to ten.
 *
 * These games run to about 118 turns against fixed supply's 78, and a purple
 * card bought on turn 30 has eighty turns left to earn, so this mode is far
 * fussier than the fixed one about *how* the table is read.  Reading it the
 * way fixed supply does — every card, off the opponents' pockets as they stand
 * this instant — loses badly here, 21.9% to 29.6%.  These bots spend down to
 * nearly nothing every turn, so a snapshot says the whole table is too poor to
 * be worth taxing and the bot stops buying majors at all.
 *
 * Two corrections fix it, and each was worth measuring on its own:
 * `purpleHorizon` values an opponent at their usual purse rather than today's
 * (21.9% → 24.2%), and `purpleVolatile` halves the trust placed in pockets
 * while leaving what they have *built* read in full — the Publisher's bread
 * and cup icons, the Renovation Company's open stacks, which do not evaporate
 * between turns.  Together: 26.6% against these weights with the flat
 * constants, of 12,000 games, and the flat version takes only 24.1% coming
 * back the other way.
 *
 * Both were set by hand, at 1 and 0.5.  Self-play was then given them to tune
 * along with everything else and came back with 0.89 and 0.47 — the same
 * reading of the table, found on its own.
 *
 * These weights beat the ones they replace as a challenger, **27.7%** against
 * a table of them (95% CI 26.2–29.4, fair share 25%), but only draw level as a
 * defender: the old weights still take 24.9% against a table of these
 * (23.4–26.4).  A clear win one way round and a tie the other is a smaller
 * result than the fixed-supply run's, and worth knowing when reading the next
 * one.  Against the hand-written baseline, 58.4%, up from 55.5%.
 *
 * These survived the first run under city events and the mayors, which is the
 * game as it is now dealt: a search of 18 generations and 142 544 games from
 * these weights came back with a candidate that took only 23.5% against a
 * table of them (95% CI 22.0-25.1, fair share 25%) while they took 26.8%
 * coming back the other way (25.3-28.4).  Nothing shipped, so the numbers
 * below are unchanged by that run.
 */
export const TUNED_VARIABLE: BotWeights = {
  cardValue: 2.2515,
  costEfficiency: 1.2585,
  buyThreshold: 0.503,
  duplicatePenalty: 0.3047,
  scarcityBonus: 0.4543,
  denialWeight: -0.3729,
  futureDice: 0.2701,
  tableDice: 0.5929,
  blueWeight: 2.1464,
  greenWeight: 1.0121,
  redWeight: 0.7021,
  purpleWeight: 2.9895,
  purpleRealism: 0.9076,
  purpleHorizon: 0.887,
  purpleVolatile: 0.4677,
  landmarkValue: 0.8759,
  landmarkUnlock: 0,
  landmarkProgress: 0,
  landmarkRush: 2.2883,
  landmarkOrder: 0.7192,
  saveMargin: 1.3109,
  saveScore: 0.4613,
  twoDiceBias: 0.3894,
  rerollMargin: 0.9213,
  harborMargin: 1.788,
  spacePortMargin: -0.0025,
  threatWeight: 0.3387,
  exhibitThreshold: 1.3887,
  investFloor: 3.7457,
  investCap: 8.1141,
  renovationSelfHarm: 0.7492,
  eventTrust: 0,
  bankerHold: 0,
  mayorRerollMargin: 0.9213,
  jitter: 0.0085,
};

/**
 * Variable supply at a five-player table.
 *
 * A fifth seat is a different game, not a longer one: your own roll comes round
 * a fifth of the time instead of a quarter, which pays the blue cards and the
 * restaurants at everyone else's expense, and the race is long enough that the
 * landmarks at the end of it are actually reached.  The mayors already move
 * with the table — `mayorTuning` sets a different dial at every size — so the
 * strategy that reads them moves with it too, rather than a four-player
 * strategy being asked to cover both.
 *
 * Seeded as a copy of the four-player weights.  The first five-player run
 * under events and mayors — 18 generations, 142 544 games — failed to beat
 * that seed and shipped nothing: the candidate took 21.8% attacking a table of
 * it (95% CI 20.4-23.3, fair share 20%), but the seed still held 20.3% coming
 * back the other way (18.9-21.8), and a candidate has to win both ways round.
 * So these are still the four-player numbers, and the slot exists so that the
 * next five-player run has somewhere to land that is not the four-player
 * strategy.  Replaced by `npm run train -- --players 5`.
 */
export const TUNED_VARIABLE_5P: BotWeights = {
  cardValue: 2.2515,
  costEfficiency: 1.2585,
  buyThreshold: 0.503,
  duplicatePenalty: 0.3047,
  scarcityBonus: 0.4543,
  denialWeight: -0.3729,
  futureDice: 0.2701,
  tableDice: 0.5929,
  blueWeight: 2.1464,
  greenWeight: 1.0121,
  redWeight: 0.7021,
  purpleWeight: 2.9895,
  purpleRealism: 0.9076,
  purpleHorizon: 0.887,
  purpleVolatile: 0.4677,
  landmarkValue: 0.8759,
  landmarkUnlock: 0,
  landmarkProgress: 0,
  landmarkRush: 2.2883,
  landmarkOrder: 0.7192,
  saveMargin: 1.3109,
  saveScore: 0.4613,
  twoDiceBias: 0.3894,
  rerollMargin: 0.9213,
  harborMargin: 1.788,
  spacePortMargin: -0.0025,
  threatWeight: 0.3387,
  exhibitThreshold: 1.3887,
  investFloor: 3.7457,
  investCap: 8.1141,
  renovationSelfHarm: 0.7492,
  eventTrust: 0,
  bankerHold: 0,
  mayorRerollMargin: 0.9213,
  jitter: 0.0085,
};

/**
 * The strategy a table of this shape plays.  `players` decides nothing below
 * five, because that is the only size trained on its own so far.
 */
export function weightsFor(rules: RuleSet, players = 4): BotWeights {
  if (!rules.variableSupply) return TUNED_FIXED;
  return players >= 5 ? TUNED_VARIABLE_5P : TUNED_VARIABLE;
}
