export type CityEventId =
  | 'economic_boom'
  | 'food_festival'
  | 'urban_grant'
  | 'big_catch'
  | 'harbor_storm'
  | 'factory_strike'
  | 'health_inspection'
  | 'tax_hike'
  | 'anti_monopoly'
  | 'social_aid'
  | 'lucky_seven'
  | 'subsidized_market';

export interface CityEventDef {
  id: CityEventId;
  icon: string;
  category: 'boom' | 'calamity' | 'balance' | 'wild';
}

export const CITY_EVENTS: CityEventDef[] = [
  { id: 'economic_boom', icon: '📈', category: 'boom' },
  { id: 'food_festival', icon: '🍕', category: 'boom' },
  { id: 'urban_grant', icon: '🏗️', category: 'boom' },
  { id: 'big_catch', icon: '🐟', category: 'boom' },
  { id: 'harbor_storm', icon: '⛈️', category: 'calamity' },
  { id: 'factory_strike', icon: '🪧', category: 'calamity' },
  { id: 'health_inspection', icon: '🩺', category: 'calamity' },
  { id: 'tax_hike', icon: '💸', category: 'calamity' },
  { id: 'anti_monopoly', icon: '⚖️', category: 'balance' },
  { id: 'social_aid', icon: '🤝', category: 'balance' },
  { id: 'lucky_seven', icon: '🍀', category: 'wild' },
  { id: 'subsidized_market', icon: '🏷️', category: 'boom' },
];

export const CITY_EVENT_BY_ID: Record<CityEventId, CityEventDef> = Object.fromEntries(
  CITY_EVENTS.map((e) => [e.id, e])
) as Record<CityEventId, CityEventDef>;

export function createEventDeck(): CityEventId[] {
  return CITY_EVENTS.map((e) => e.id);
}
