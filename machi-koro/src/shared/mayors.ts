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
