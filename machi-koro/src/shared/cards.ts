/**
 * Card definitions for the base game, the Harbor expansion and Millionaire's Row.
 *
 * Only rules/values are encoded here (game mechanics are not copyrightable);
 * card text is paraphrased and no artwork is reproduced.
 */

export type CardColor = 'blue' | 'green' | 'red' | 'purple';

/** Icon categories. Only wheat/cow/gear/bread/cup/boat are counted by multiplier cards. */
export type CardIcon =
  | 'wheat'
  | 'cow'
  | 'gear'
  | 'bread'
  | 'factory'
  | 'fruit'
  | 'cup'
  | 'boat'
  | 'tower'
  | 'bank'
  | 'major';

export type Expansion = 'base' | 'harbor' | 'millionaires';

/** Which expansions are in play, plus the setup variant. */
export interface RuleSet {
  harbor: boolean;
  millionaires: boolean;
  /**
   * Rulebook-recommended setup for expansion games: face-up stacks drawn from a
   * deck. The market opens with one stack and widens by one a turn to the usual
   * ten, which is what evens out turn order — see `supplySlots` and BALANCE.md.
   */
  variableSupply: boolean;
  /** City events that change each round */
  events?: boolean;
  /** Asymmetrical Mayor roles */
  mayors?: boolean;
  /**
   * Measurement only: override how the variable supply's market opens — it
   * normally starts at one stack and widens by one a turn, which is what evens
   * out turn order (see BALANCE.md). `normaliseRules` drops both, so a lobby
   * can never set them; only `diagnose:seats` does, to re-sweep the dial.
   */
  supplySlotsStart?: number;
  supplySlotsEvery?: number;
}

export const DEFAULT_RULES: RuleSet = {
  harbor: true,
  millionaires: true,
  variableSupply: true,
  events: true,
  mayors: true,
};

export function normaliseRules(input: Partial<RuleSet> | undefined): RuleSet {
  return {
    harbor: Boolean(input?.harbor),
    millionaires: Boolean(input?.millionaires),
    variableSupply: Boolean(input?.variableSupply),
    events: Boolean(input?.events),
    mayors: Boolean(input?.mayors),
  };
}

export function rulesKey(rules: RuleSet): string {
  return `${rules.harbor ? 'h' : ''}${rules.millionaires ? 'm' : ''}${rules.events ? 'e' : ''}${rules.mayors ? 'y' : ''}` || 'base';
}

export function describeRules(rules: RuleSet): string {
  const parts = ['base game'];
  if (rules.harbor) parts.push('Harbor');
  if (rules.millionaires) parts.push("Millionaire's Row");
  if (rules.events) parts.push('Events');
  if (rules.mayors) parts.push('Mayors');
  return parts.join(' + ');
}

export type CardId =
  // base
  | 'wheat_field'
  | 'ranch'
  | 'bakery'
  | 'cafe'
  | 'convenience_store'
  | 'forest'
  | 'stadium'
  | 'tv_station'
  | 'business_center'
  | 'cheese_factory'
  | 'furniture_factory'
  | 'mine'
  | 'family_restaurant'
  | 'apple_orchard'
  | 'farmers_market'
  // harbor
  | 'sushi_bar'
  | 'flower_orchard'
  | 'flower_shop'
  | 'pizza_joint'
  | 'publisher'
  | 'hamburger_stand'
  | 'mackerel_boat'
  | 'tax_office'
  | 'food_warehouse'
  | 'tuna_boat'
  // millionaire's row
  | 'general_store'
  | 'corn_field'
  | 'demolition_company'
  | 'french_restaurant'
  | 'loan_office'
  | 'vineyard'
  | 'renovation_company'
  | 'winery'
  | 'moving_company'
  | 'tech_startup'
  | 'exhibit_hall'
  | 'soda_bottling_plant'
  | 'park'
  | 'members_club';

export interface CardDef {
  id: CardId;
  name: string;
  /** Coins paid to build. The Loan Office is negative: you are paid to take it. */
  cost: number;
  /** Dice totals that activate this card. */
  activates: number[];
  color: CardColor;
  icon: CardIcon;
  expansion: Expansion;
  /** Card does nothing unless its owner has built the Harbor. */
  needsHarbor?: boolean;
  text: string;
}

export const CARDS: CardDef[] = [
  // ---- base game -------------------------------------------------------
  { id: 'wheat_field', name: 'Wheat Field', cost: 1, activates: [1], color: 'blue', icon: 'wheat', expansion: 'base', text: 'Get 1 coin from the bank. (anyone’s turn)' },
  { id: 'ranch', name: 'Ranch', cost: 1, activates: [2], color: 'blue', icon: 'cow', expansion: 'base', text: 'Get 1 coin from the bank. (anyone’s turn)' },
  { id: 'bakery', name: 'Bakery', cost: 1, activates: [2, 3], color: 'green', icon: 'bread', expansion: 'base', text: 'Get 1 coin from the bank. (your turn only)' },
  { id: 'cafe', name: 'Cafe', cost: 2, activates: [3], color: 'red', icon: 'cup', expansion: 'base', text: 'Get 1 coin from the player who rolled.' },
  { id: 'convenience_store', name: 'Convenience Store', cost: 2, activates: [4], color: 'green', icon: 'bread', expansion: 'base', text: 'Get 3 coins from the bank. (your turn only)' },
  { id: 'forest', name: 'Forest', cost: 3, activates: [5], color: 'blue', icon: 'gear', expansion: 'base', text: 'Get 1 coin from the bank. (anyone’s turn)' },
  { id: 'stadium', name: 'Stadium', cost: 6, activates: [6], color: 'purple', icon: 'major', expansion: 'base', text: 'Take 2 coins from every other player. (your turn only)' },
  { id: 'tv_station', name: 'TV Station', cost: 7, activates: [6], color: 'purple', icon: 'major', expansion: 'base', text: 'Take 5 coins from one player of your choice. (your turn only)' },
  { id: 'business_center', name: 'Business Center', cost: 8, activates: [6], color: 'purple', icon: 'major', expansion: 'base', text: 'Swap one of your non-major establishments with another player’s. (your turn only)' },
  { id: 'cheese_factory', name: 'Cheese Factory', cost: 5, activates: [7], color: 'green', icon: 'factory', expansion: 'base', text: 'Get 3 coins from the bank for each cow establishment you own. (your turn only)' },
  { id: 'furniture_factory', name: 'Furniture Factory', cost: 3, activates: [8], color: 'green', icon: 'factory', expansion: 'base', text: 'Get 3 coins from the bank for each gear establishment you own. (your turn only)' },
  { id: 'mine', name: 'Mine', cost: 6, activates: [9], color: 'blue', icon: 'gear', expansion: 'base', text: 'Get 5 coins from the bank. (anyone’s turn)' },
  { id: 'family_restaurant', name: 'Family Restaurant', cost: 3, activates: [9, 10], color: 'red', icon: 'cup', expansion: 'base', text: 'Get 2 coins from the player who rolled.' },
  { id: 'apple_orchard', name: 'Apple Orchard', cost: 3, activates: [10], color: 'blue', icon: 'wheat', expansion: 'base', text: 'Get 3 coins from the bank. (anyone’s turn)' },
  { id: 'farmers_market', name: 'Fruit & Vegetable Market', cost: 2, activates: [11, 12], color: 'green', icon: 'fruit', expansion: 'base', text: 'Get 2 coins from the bank for each wheat establishment you own. (your turn only)' },

  // ---- harbor expansion ------------------------------------------------
  { id: 'sushi_bar', name: 'Sushi Bar', cost: 2, activates: [1], color: 'red', icon: 'cup', expansion: 'harbor', needsHarbor: true, text: 'If you have a Harbor: get 3 coins from the player who rolled.' },
  { id: 'flower_orchard', name: 'Flower Orchard', cost: 2, activates: [4], color: 'blue', icon: 'wheat', expansion: 'harbor', text: 'Get 1 coin from the bank. (anyone’s turn)' },
  { id: 'flower_shop', name: 'Flower Shop', cost: 1, activates: [6], color: 'green', icon: 'bread', expansion: 'harbor', text: 'Get 1 coin from the bank for each Flower Orchard you own. (your turn only)' },
  { id: 'pizza_joint', name: 'Pizza Joint', cost: 1, activates: [7], color: 'red', icon: 'cup', expansion: 'harbor', text: 'Get 1 coin from the player who rolled.' },
  { id: 'publisher', name: 'Publisher', cost: 5, activates: [7], color: 'purple', icon: 'major', expansion: 'harbor', text: 'Take 1 coin from each player for each bread and cup establishment they own. (your turn only)' },
  { id: 'hamburger_stand', name: 'Hamburger Stand', cost: 1, activates: [8], color: 'red', icon: 'cup', expansion: 'harbor', text: 'Get 1 coin from the player who rolled.' },
  { id: 'mackerel_boat', name: 'Mackerel Boat', cost: 2, activates: [8], color: 'blue', icon: 'boat', expansion: 'harbor', needsHarbor: true, text: 'If you have a Harbor: get 3 coins from the bank. (anyone’s turn)' },
  { id: 'tax_office', name: 'Tax Office', cost: 4, activates: [8, 9], color: 'purple', icon: 'major', expansion: 'harbor', text: 'From every player with 10 or more coins, take half (rounded down). (your turn only)' },
  { id: 'food_warehouse', name: 'Food Warehouse', cost: 2, activates: [12, 13, 14], color: 'green', icon: 'factory', expansion: 'harbor', text: 'Get 2 coins from the bank for each cup establishment you own. (your turn only)' },
  { id: 'tuna_boat', name: 'Tuna Boat', cost: 5, activates: [12, 13, 14], color: 'blue', icon: 'boat', expansion: 'harbor', needsHarbor: true, text: 'If you have a Harbor: on any turn, 2 dice are rolled once and every Tuna Boat owner gets that many coins. (anyone’s turn)' },

  // ---- millionaire's row -----------------------------------------------
  { id: 'general_store', name: 'General Store', cost: 0, activates: [2], color: 'green', icon: 'bread', expansion: 'millionaires', text: 'If you have fewer than 2 landmarks built, get 2 coins from the bank. (your turn only)' },
  { id: 'corn_field', name: 'Corn Field', cost: 2, activates: [3, 4], color: 'blue', icon: 'wheat', expansion: 'millionaires', text: 'If you have fewer than 2 landmarks built, get 1 coin from the bank. (anyone’s turn)' },
  { id: 'demolition_company', name: 'Demolition Company', cost: 2, activates: [4], color: 'green', icon: 'tower', expansion: 'millionaires', text: 'You must demolish one of your built landmarks, and get 8 coins from the bank. (your turn only)' },
  { id: 'french_restaurant', name: 'French Restaurant', cost: 3, activates: [5], color: 'red', icon: 'cup', expansion: 'millionaires', text: 'If the player who rolled has 2 or more landmarks built, take 5 coins from them.' },
  { id: 'loan_office', name: 'Loan Office', cost: -5, activates: [5, 6], color: 'green', icon: 'bank', expansion: 'millionaires', text: 'Get 5 coins when you build it. Pay 2 coins to the bank whenever it activates. (your turn only)' },
  { id: 'vineyard', name: 'Vineyard', cost: 3, activates: [7], color: 'blue', icon: 'wheat', expansion: 'millionaires', text: 'Get 3 coins from the bank. (anyone’s turn)' },
  { id: 'renovation_company', name: 'Renovation Company', cost: 4, activates: [8], color: 'purple', icon: 'major', expansion: 'millionaires', text: 'Close every copy of one establishment for renovation, and take 1 coin from each opponent per building of theirs closed. (your turn only)' },
  { id: 'winery', name: 'Winery', cost: 3, activates: [9], color: 'green', icon: 'factory', expansion: 'millionaires', text: 'Get 6 coins from the bank for each Vineyard you own, then close this establishment for renovation. (your turn only)' },
  { id: 'moving_company', name: 'Moving Company', cost: 2, activates: [9, 10], color: 'green', icon: 'tower', expansion: 'millionaires', text: 'Give a non-major establishment to an opponent, then get 4 coins from the bank. (your turn only)' },
  { id: 'tech_startup', name: 'Tech Startup', cost: 1, activates: [10], color: 'purple', icon: 'major', expansion: 'millionaires', text: 'Take your invested amount in coins from each opponent. At the end of each of your turns you may invest 1 more coin. (your turn only)' },
  { id: 'exhibit_hall', name: 'Exhibit Hall', cost: 7, activates: [10], color: 'purple', icon: 'major', expansion: 'millionaires', text: 'You may activate one of your non-major establishments instead; if you do, return this card to the supply. (your turn only)' },
  { id: 'soda_bottling_plant', name: 'Soda Bottling Plant', cost: 5, activates: [11], color: 'green', icon: 'factory', expansion: 'millionaires', text: 'Get 1 coin from the bank for every cup establishment owned by all players. (your turn only)' },
  { id: 'park', name: 'Park', cost: 3, activates: [11, 12, 13], color: 'purple', icon: 'major', expansion: 'millionaires', text: 'Redistribute every player’s coins as evenly as possible, topping up from the bank. (your turn only)' },
  { id: 'members_club', name: 'Member’s Only Club', cost: 4, activates: [12, 13, 14], color: 'red', icon: 'cup', expansion: 'millionaires', text: 'If the player who rolled has 3 or more landmarks built, take all of their coins.' },
];

export const CARD_BY_ID: Record<CardId, CardDef> = Object.fromEntries(
  CARDS.map((c) => [c.id, c])
) as Record<CardId, CardDef>;

/** Cards whose effect needs a decision from their owner. */
export const CHOICE_CARDS: CardId[] = [
  'tv_station',
  'business_center',
  'demolition_company',
  'moving_company',
  'renovation_company',
  'exhibit_hall',
];

export type LandmarkId =
  | 'city_hall'
  | 'harbor'
  | 'train_station'
  | 'shopping_mall'
  | 'amusement_park'
  | 'radio_tower'
  | 'airport'
  | 'space_port';

export interface LandmarkDef {
  id: LandmarkId;
  name: string;
  cost: number;
  /** Landmarks only exist when this expansion is in play; 'base' means always. */
  expansion: Expansion;
  /** Built for free at the start of the game and not counted as a landmark. */
  free?: boolean;
  text: string;
}

export const LANDMARKS: LandmarkDef[] = [
  { id: 'city_hall', name: 'City Hall', cost: 0, expansion: 'harbor', free: true, text: 'After earning income, if you have no coins, get 1 coin from the bank. Not counted as a landmark.' },
  { id: 'harbor', name: 'Harbor', cost: 2, expansion: 'harbor', text: 'If the dice total is 10 or more, you may add 2 to the total.' },
  { id: 'train_station', name: 'Train Station', cost: 4, expansion: 'base', text: 'You may roll 2 dice.' },
  { id: 'shopping_mall', name: 'Shopping Mall', cost: 10, expansion: 'base', text: 'Each of your bread and cup establishments earns +1 coin.' },
  { id: 'amusement_park', name: 'Amusement Park', cost: 16, expansion: 'base', text: 'If you roll doubles, take another turn after this one.' },
  { id: 'radio_tower', name: 'Radio Tower', cost: 22, expansion: 'base', text: 'Once per turn, you may re-roll the dice.' },
  { id: 'airport', name: 'Airport', cost: 30, expansion: 'harbor', text: 'If you build nothing on your turn, get 10 coins from the bank.' },
  { id: 'space_port', name: 'Space Port', cost: 50, expansion: 'millionaires', text: 'Once per turn, after rolling, you may add 1 to or subtract 1 from the dice total.' },
];

export const LANDMARK_BY_ID: Record<LandmarkId, LandmarkDef> = Object.fromEntries(
  LANDMARKS.map((l) => [l.id, l])
) as Record<LandmarkId, LandmarkDef>;

export const ICON_GLYPH: Record<CardIcon, string> = {
  wheat: '\u{1F33E}',
  cow: '\u{1F42E}',
  gear: '⚙️',
  bread: '\u{1F35E}',
  factory: '\u{1F3ED}',
  fruit: '\u{1F34E}',
  cup: '☕',
  boat: '⛵',
  tower: '\u{1F3D7}️',
  bank: '\u{1F3E6}',
  major: '\u{1F3E2}',
};

function includesExpansion(rules: RuleSet, expansion: Expansion): boolean {
  if (expansion === 'base') return true;
  if (expansion === 'harbor') return rules.harbor;
  return rules.millionaires;
}

const cardCache = new Map<string, CardDef[]>();
const landmarkCache = new Map<string, LandmarkDef[]>();

/**
 * Cards available under a rule set, in play order (activation number, then cost).
 * The returned arrays are shared — treat them as read-only.
 */
export function cardsFor(rules: RuleSet): CardDef[] {
  const key = rulesKey(rules);
  let list = cardCache.get(key);
  if (!list) {
    list = CARDS.filter((c) => includesExpansion(rules, c.expansion)).sort(
      (a, b) => a.activates[0] - b.activates[0] || a.cost - b.cost || a.name.localeCompare(b.name)
    );
    cardCache.set(key, list);
  }
  return list;
}

/** Landmarks under a rule set, cheapest first. Shared arrays — read-only. */
export function landmarksFor(rules: RuleSet): LandmarkDef[] {
  const key = rulesKey(rules);
  let list = landmarkCache.get(key);
  if (!list) {
    list = LANDMARKS.filter((l) => includesExpansion(rules, l.expansion)).sort((a, b) => a.cost - b.cost);
    landmarkCache.set(key, list);
  }
  return list;
}

/** Landmarks that must be built to win (City Hall is free and does not count). */
export function winLandmarks(rules: RuleSet): LandmarkDef[] {
  return landmarksFor(rules).filter((l) => !l.free);
}

/** Only the Harbor box adds the components for a fifth player. */
export function maxPlayers(rules: RuleSet): number {
  return rules.harbor || rules.millionaires ? 5 : 4;
}
