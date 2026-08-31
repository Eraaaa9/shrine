import type { CardId, LandmarkId } from '../shared/cards';

export const CARD_EMOJI: Record<CardId, string> = {
  // Base game
  wheat_field: '🌾',
  ranch: '🐄',
  bakery: '🍞',
  cafe: '☕',
  convenience_store: '🏪',
  forest: '🌲',
  stadium: '🏟️',
  tv_station: '📺',
  business_center: '🏢',
  cheese_factory: '🧀',
  furniture_factory: '🪑',
  mine: '⛏️',
  family_restaurant: '🍽️',
  apple_orchard: '🍎',
  farmers_market: '🍏',

  // Harbor expansion
  sushi_bar: '🍣',
  flower_orchard: '🌷',
  flower_shop: '💐',
  pizza_joint: '🍕',
  publisher: '📰',
  hamburger_stand: '🍔',
  mackerel_boat: '⛵',
  tax_office: '🏛️',
  food_warehouse: '📦',
  tuna_boat: '🐟',

  // Millionaire's Row
  general_store: '🛒',
  corn_field: '🌽',
  demolition_company: '🔨',
  french_restaurant: '🍷',
  loan_office: '💳',
  vineyard: '🍇',
  renovation_company: '🧹',
  winery: '🍾',
  moving_company: '🚚',
  tech_startup: '💡',
  exhibit_hall: '🎪',
  soda_bottling_plant: '🥤',
  park: '🌳',
  members_club: '🍸',
};

export const LANDMARK_EMOJI: Record<LandmarkId, string> = {
  city_hall: '🏛️',
  harbor: '⚓',
  train_station: '🚂',
  shopping_mall: '🏬',
  amusement_park: '🎡',
  radio_tower: '📻',
  airport: '✈️',
  space_port: '🚀',
};

export function getCardEmoji(id: CardId): string {
  return CARD_EMOJI[id] || '🏢';
}

export function getLandmarkEmoji(id: LandmarkId): string {
  return LANDMARK_EMOJI[id] || '🏛️';
}
