export type MayorId =
  | 'agronomist'
  | 'restaurateur'
  | 'industrialist'
  | 'banker'
  | 'urbanist'
  | 'adventurer';

export interface MayorDef {
  id: MayorId;
  icon: string;
}

export const MAYORS: MayorDef[] = [
  { id: 'agronomist', icon: '🌾' },
  { id: 'restaurateur', icon: '☕' },
  { id: 'industrialist', icon: '⚙️' },
  { id: 'banker', icon: '💰' },
  { id: 'urbanist', icon: '🏛️' },
  { id: 'adventurer', icon: '🧭' },
];

export const MAYOR_BY_ID: Record<MayorId, MayorDef> = Object.fromEntries(
  MAYORS.map((m) => [m.id, m])
) as Record<MayorId, MayorDef>;

/**
 * Every number the six mayors are balanced on, in one place.
 *
 * Players pick their own mayor in the lobby, so a mayor that is a few points
 * better than the rest is not a flavour choice — it is the only choice. These
 * are the dials `scripts/mayor-balance.mts` measures, and the rules text in
 * `i18n.ts` quotes them, so any change here has to be echoed there.
 */
export interface MayorTuning {
  /** Blue cards the Agronomist needs on the table before the subsidy arrives. */
  agronomistBlue: number;
  /** Coins the subsidy is worth. */
  agronomistSubsidy: number;
  /** Coins off a red card for the Restaurateur. */
  restaurateurDiscount: number;
  /** Coins the Restaurateur keeps out of every opponent's reach. */
  restaurateurShield: number;
  /** Extra coins an Industrialist factory pays for *each* icon it counts. */
  industrialistRate: number;
  /** Coins the Banker must still be holding at the end of a turn to draw a dividend. */
  bankerFloor: number;
  /** Coins the dividend pays. */
  bankerDividend: number;
  /** Cashback the Urbanist takes on every landmark. */
  urbanistCashback: number;
  /** Lowest dice total at which the Navigator may take the Harbor's +2. */
  adventurerHarbor: number;
}

/** Dials that read the same whatever the table size. */
const STEADY = {
  agronomistSubsidy: 1,
  restaurateurDiscount: 1,
  industrialistRate: 1,
  bankerFloor: 6,
};

/**
 * Dials that have to move with the table, because the abilities they belong to
 * do not scale the same way.
 *
 * A two-player game is short and gives each player half of all the turns, which
 * flatters anything paid per turn: the Agronomist ran 10% above its share there
 * and 4% below it at five. The Navigator runs the other way — reaching the high
 * rolls matters more the longer the game — and the Urbanist, Banker and
 * Restaurateur drift more gently along the same two axes. Rather than pick a
 * compromise that is wrong at both ends, each of those dials is set per table
 * size and the mayor's card prints the number for the table you are actually at.
 */
const BY_PLAYERS: Record<number, Omit<MayorTuning, keyof typeof STEADY>> = {
  2: { agronomistBlue: 6, restaurateurShield: 2, bankerDividend: 2, urbanistCashback: 2, adventurerHarbor: 6 },
  3: { agronomistBlue: 5, restaurateurShield: 1, bankerDividend: 2, urbanistCashback: 1, adventurerHarbor: 7 },
  4: { agronomistBlue: 4, restaurateurShield: 1, bankerDividend: 3, urbanistCashback: 1, adventurerHarbor: 7 },
  5: { agronomistBlue: 4, restaurateurShield: 1, bankerDividend: 3, urbanistCashback: 1, adventurerHarbor: 7 },
};

export const MIN_TABLE = 2;
export const MAX_TABLE = 5;

/** The dials for a table of this size. Anything out of range is clamped. */
export function mayorTuning(players: number): MayorTuning {
  const seats = Math.min(MAX_TABLE, Math.max(MIN_TABLE, Math.round(players)));
  return { ...STEADY, ...BY_PLAYERS[seats] };
}
