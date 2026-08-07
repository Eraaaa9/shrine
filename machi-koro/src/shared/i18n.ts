/**
 * Translations. Game state carries message *keys* rather than sentences, so the
 * log reads in each player's own language even though the server writes it once.
 */
import { CARD_BY_ID, LANDMARK_BY_ID, type CardId, type LandmarkId, type RuleSet } from './cards';

export type Lang = 'en' | 'ru' | 'kk';
export const LANGS: Lang[] = ['en', 'ru', 'kk'];
export const LANG_NAMES: Record<Lang, string> = { en: 'English', ru: 'Русский', kk: 'Қазақша' };

export type Params = Record<string, string | number>;

// ---------------------------------------------------------------------------
// card + landmark names and rules text
// ---------------------------------------------------------------------------

const CARDS_RU: Record<CardId, { name: string; text: string }> = {
  wheat_field: { name: 'Пшеничное поле', text: 'Получите 1 монету из банка. (в любой ход)' },
  ranch: { name: 'Ферма', text: 'Получите 1 монету из банка. (в любой ход)' },
  bakery: { name: 'Пекарня', text: 'Получите 1 монету из банка. (только в свой ход)' },
  cafe: { name: 'Кафе', text: 'Получите 1 монету от игрока, который бросил кубики.' },
  convenience_store: { name: 'Магазинчик', text: 'Получите 3 монеты из банка. (только в свой ход)' },
  forest: { name: 'Лес', text: 'Получите 1 монету из банка. (в любой ход)' },
  stadium: { name: 'Стадион', text: 'Заберите по 2 монеты у каждого соперника. (только в свой ход)' },
  tv_station: { name: 'Телестудия', text: 'Заберите 5 монет у любого игрока на ваш выбор. (только в свой ход)' },
  business_center: {
    name: 'Бизнес-центр',
    text: 'Обменяйте одно своё некрупное предприятие на предприятие другого игрока. (только в свой ход)',
  },
  cheese_factory: {
    name: 'Сыроварня',
    text: 'Получите 3 монеты из банка за каждое ваше предприятие с коровой. (только в свой ход)',
  },
  furniture_factory: {
    name: 'Мебельная фабрика',
    text: 'Получите 3 монеты из банка за каждое ваше предприятие с шестерёнкой. (только в свой ход)',
  },
  mine: { name: 'Шахта', text: 'Получите 5 монет из банка. (в любой ход)' },
  family_restaurant: { name: 'Семейный ресторан', text: 'Получите 2 монеты от игрока, который бросил кубики.' },
  apple_orchard: { name: 'Яблоневый сад', text: 'Получите 3 монеты из банка. (в любой ход)' },
  farmers_market: {
    name: 'Фруктово-овощной рынок',
    text: 'Получите 2 монеты из банка за каждое ваше предприятие с пшеницей. (только в свой ход)',
  },

  sushi_bar: { name: 'Суши-бар', text: 'Если у вас есть Гавань: получите 3 монеты от игрока, который бросил кубики.' },
  flower_orchard: { name: 'Цветочный сад', text: 'Получите 1 монету из банка. (в любой ход)' },
  flower_shop: {
    name: 'Цветочный магазин',
    text: 'Получите 1 монету из банка за каждый ваш Цветочный сад. (только в свой ход)',
  },
  pizza_joint: { name: 'Пиццерия', text: 'Получите 1 монету от игрока, который бросил кубики.' },
  publisher: {
    name: 'Издательство',
    text: 'Заберите у каждого игрока по 1 монете за каждое его предприятие с выпечкой и чашкой. (только в свой ход)',
  },
  hamburger_stand: { name: 'Бургерная', text: 'Получите 1 монету от игрока, который бросил кубики.' },
  mackerel_boat: { name: 'Скумбриевый баркас', text: 'Если у вас есть Гавань: получите 3 монеты из банка. (в любой ход)' },
  tax_office: {
    name: 'Налоговая',
    text: 'У каждого игрока, у которого 10 или больше монет, заберите половину (с округлением вниз). (только в свой ход)',
  },
  food_warehouse: {
    name: 'Продовольственный склад',
    text: 'Получите 2 монеты из банка за каждое ваше предприятие с чашкой. (только в свой ход)',
  },
  tuna_boat: {
    name: 'Траулер',
    text: 'Если у вас есть Гавань: в любой ход один раз бросаются 2 кубика, и каждый владелец Траулера получает столько монет. (в любой ход)',
  },

  general_store: {
    name: 'Универсам',
    text: 'Если у вас построено меньше 2 достопримечательностей, получите 2 монеты из банка. (только в свой ход)',
  },
  corn_field: {
    name: 'Кукурузное поле',
    text: 'Если у вас построено меньше 2 достопримечательностей, получите 1 монету из банка. (в любой ход)',
  },
  demolition_company: {
    name: 'Компания по сносу',
    text: 'Вы обязаны снести одну свою достопримечательность и получить 8 монет из банка. (только в свой ход)',
  },
  french_restaurant: {
    name: 'Французский ресторан',
    text: 'Если у игрока, бросившего кубики, построено 2 или больше достопримечательностей, заберите у него 5 монет.',
  },
  loan_office: {
    name: 'Ссудная касса',
    text: 'Получите 5 монет при постройке. Платите 2 монеты в банк при каждой активации. (только в свой ход)',
  },
  vineyard: { name: 'Виноградник', text: 'Получите 3 монеты из банка. (в любой ход)' },
  renovation_company: {
    name: 'Ремонтная компания',
    text: 'Закройте на ремонт все копии одного предприятия и заберите у каждого соперника по 1 монете за каждое его закрытое здание. (только в свой ход)',
  },
  winery: {
    name: 'Винодельня',
    text: 'Получите 6 монет из банка за каждый ваш Виноградник, затем закройте это предприятие на ремонт. (только в свой ход)',
  },
  moving_company: {
    name: 'Транспортная компания',
    text: 'Отдайте некрупное предприятие сопернику и получите 4 монеты из банка. (только в свой ход)',
  },
  tech_startup: {
    name: 'Технологический стартап',
    text: 'Заберите у каждого соперника столько монет, сколько вложено в стартап. В конце каждого своего хода можете вложить ещё 1 монету. (только в свой ход)',
  },
  exhibit_hall: {
    name: 'Выставочный зал',
    text: 'Вы можете активировать вместо него одно своё некрупное предприятие; если активируете, верните эту карту в запас. (только в свой ход)',
  },
  soda_bottling_plant: {
    name: 'Завод газировки',
    text: 'Получите 1 монету из банка за каждое предприятие с чашкой у всех игроков. (только в свой ход)',
  },
  park: {
    name: 'Парк',
    text: 'Разделите монеты всех игроков поровну, добирая недостающее из банка. (только в свой ход)',
  },
  members_club: {
    name: 'Закрытый клуб',
    text: 'Если у игрока, бросившего кубики, построено 3 или больше достопримечательностей, заберите все его монеты.',
  },
};

const CARDS_KK: Record<CardId, { name: string; text: string }> = {
  wheat_field: { name: 'Бидай алқабы', text: 'Банктен 1 монета алыңыз. (кез келген жүрісте)' },
  ranch: { name: 'Мал шаруашылығы', text: 'Банктен 1 монета алыңыз. (кез келген жүрісте)' },
  bakery: { name: 'Наубайхана', text: 'Банктен 1 монета алыңыз. (тек өз жүрісіңізде)' },
  cafe: { name: 'Кафе', text: 'Кубик тастаған ойыншыдан 1 монета алыңыз.' },
  convenience_store: { name: 'Шағын дүкен', text: 'Банктен 3 монета алыңыз. (тек өз жүрісіңізде)' },
  forest: { name: 'Орман', text: 'Банктен 1 монета алыңыз. (кез келген жүрісте)' },
  stadium: { name: 'Стадион', text: 'Әр қарсыласыңыздан 2 монетадан алыңыз. (тек өз жүрісіңізде)' },
  tv_station: { name: 'Телестудия', text: 'Таңдаған кез келген ойыншыдан 5 монета алыңыз. (тек өз жүрісіңізде)' },
  business_center: {
    name: 'Бизнес-орталық',
    text: 'Өзіңіздің ірі емес кәсіпорныңызды басқа ойыншының кәсіпорнына айырбастаңыз. (тек өз жүрісіңізде)',
  },
  cheese_factory: {
    name: 'Ірімшік зауыты',
    text: 'Сиыр белгісі бар әр кәсіпорныңыз үшін банктен 3 монета алыңыз. (тек өз жүрісіңізде)',
  },
  furniture_factory: {
    name: 'Жиһаз фабрикасы',
    text: 'Тісті доңғалақ белгісі бар әр кәсіпорныңыз үшін банктен 3 монета алыңыз. (тек өз жүрісіңізде)',
  },
  mine: { name: 'Кеніш', text: 'Банктен 5 монета алыңыз. (кез келген жүрісте)' },
  family_restaurant: { name: 'Отбасылық мейрамхана', text: 'Кубик тастаған ойыншыдан 2 монета алыңыз.' },
  apple_orchard: { name: 'Алма бағы', text: 'Банктен 3 монета алыңыз. (кез келген жүрісте)' },
  farmers_market: {
    name: 'Көкөніс базары',
    text: 'Бидай белгісі бар әр кәсіпорныңыз үшін банктен 2 монета алыңыз. (тек өз жүрісіңізде)',
  },

  sushi_bar: { name: 'Суши-бар', text: 'Айлағыңыз болса: кубик тастаған ойыншыдан 3 монета алыңыз.' },
  flower_orchard: { name: 'Гүл бағы', text: 'Банктен 1 монета алыңыз. (кез келген жүрісте)' },
  flower_shop: {
    name: 'Гүл дүкені',
    text: 'Әр Гүл бағыңыз үшін банктен 1 монета алыңыз. (тек өз жүрісіңізде)',
  },
  pizza_joint: { name: 'Пиццерия', text: 'Кубик тастаған ойыншыдан 1 монета алыңыз.' },
  publisher: {
    name: 'Баспа',
    text: 'Әр ойыншыдан наубайхана және шыныаяқ белгісі бар әр кәсіпорны үшін 1 монетадан алыңыз. (тек өз жүрісіңізде)',
  },
  hamburger_stand: { name: 'Бургер дүңгіршегі', text: 'Кубик тастаған ойыншыдан 1 монета алыңыз.' },
  mackerel_boat: { name: 'Скумбрия қайығы', text: 'Айлағыңыз болса: банктен 3 монета алыңыз. (кез келген жүрісте)' },
  tax_office: {
    name: 'Салық басқармасы',
    text: '10 немесе одан көп монетасы бар әр ойыншыдан жартысын алыңыз (кемітіп дөңгелектеңіз). (тек өз жүрісіңізде)',
  },
  food_warehouse: {
    name: 'Азық-түлік қоймасы',
    text: 'Шыныаяқ белгісі бар әр кәсіпорныңыз үшін банктен 2 монета алыңыз. (тек өз жүрісіңізде)',
  },
  tuna_boat: {
    name: 'Тунец қайығы',
    text: 'Айлағыңыз болса: кез келген жүрісте 2 кубик бір рет тасталады, әр Тунец қайығының иесі сонша монета алады. (кез келген жүрісте)',
  },

  general_store: {
    name: 'Әмбебап дүкен',
    text: 'Салынған көрнекті нысаныңыз 2-ден аз болса, банктен 2 монета алыңыз. (тек өз жүрісіңізде)',
  },
  corn_field: {
    name: 'Жүгері алқабы',
    text: 'Салынған көрнекті нысаныңыз 2-ден аз болса, банктен 1 монета алыңыз. (кез келген жүрісте)',
  },
  demolition_company: {
    name: 'Бұзу компаниясы',
    text: 'Өзіңіздің бір көрнекті нысаныңызды бұзып, банктен 8 монета алуға міндеттісіз. (тек өз жүрісіңізде)',
  },
  french_restaurant: {
    name: 'Француз мейрамханасы',
    text: 'Кубик тастаған ойыншының салынған көрнекті нысаны 2 немесе одан көп болса, одан 5 монета алыңыз.',
  },
  loan_office: {
    name: 'Несие кеңсесі',
    text: 'Салған кезде 5 монета алыңыз. Әр іске қосылғанда банкке 2 монета төлеңіз. (тек өз жүрісіңізде)',
  },
  vineyard: { name: 'Жүзімдік', text: 'Банктен 3 монета алыңыз. (кез келген жүрісте)' },
  renovation_company: {
    name: 'Жөндеу компаниясы',
    text: 'Бір кәсіпорынның барлық көшірмесін жөндеуге жабыңыз да, әр қарсыласыңыздан жабылған әр ғимараты үшін 1 монетадан алыңыз. (тек өз жүрісіңізде)',
  },
  winery: {
    name: 'Шарап зауыты',
    text: 'Әр Жүзімдігіңіз үшін банктен 6 монета алыңыз, содан соң бұл кәсіпорынды жөндеуге жабыңыз. (тек өз жүрісіңізде)',
  },
  moving_company: {
    name: 'Көлік компаниясы',
    text: 'Ірі емес кәсіпорныңызды қарсыласыңызға беріп, банктен 4 монета алыңыз. (тек өз жүрісіңізде)',
  },
  tech_startup: {
    name: 'Технологиялық стартап',
    text: 'Әр қарсыласыңыздан стартапқа салынған сома көлемінде монета алыңыз. Әр жүрісіңіздің соңында тағы 1 монета сала аласыз. (тек өз жүрісіңізде)',
  },
  exhibit_hall: {
    name: 'Көрме залы',
    text: 'Оның орнына өзіңіздің бір ірі емес кәсіпорныңызды іске қоса аласыз; іске қоссаңыз, бұл картаны қорға қайтарыңыз. (тек өз жүрісіңізде)',
  },
  soda_bottling_plant: {
    name: 'Сусын зауыты',
    text: 'Барлық ойыншының шыныаяқ белгісі бар әр кәсіпорны үшін банктен 1 монета алыңыз. (тек өз жүрісіңізде)',
  },
  park: {
    name: 'Саябақ',
    text: 'Барлық ойыншының монеталарын тең бөліңіз, жетпегенін банктен толықтырыңыз. (тек өз жүрісіңізде)',
  },
  members_club: {
    name: 'Жабық клуб',
    text: 'Кубик тастаған ойыншының салынған көрнекті нысаны 3 немесе одан көп болса, оның барлық монетасын алыңыз.',
  },
};

const LANDMARKS_RU: Record<LandmarkId, { name: string; text: string }> = {
  city_hall: {
    name: 'Мэрия',
    text: 'После получения дохода, если у вас нет монет, получите 1 монету из банка. Не считается достопримечательностью.',
  },
  harbor: { name: 'Гавань', text: 'Если на кубиках выпало 10 или больше, вы можете добавить 2 к результату.' },
  train_station: { name: 'Вокзал', text: 'Вы можете бросать 2 кубика.' },
  shopping_mall: { name: 'Торговый центр', text: 'Каждое ваше предприятие с выпечкой и чашкой приносит +1 монету.' },
  amusement_park: { name: 'Парк аттракционов', text: 'Если выпал дубль, сделайте ещё один ход после этого.' },
  radio_tower: { name: 'Телебашня', text: 'Раз за ход вы можете перебросить кубики.' },
  airport: { name: 'Аэропорт', text: 'Если вы ничего не построили в свой ход, получите 10 монет из банка.' },
};

const LANDMARKS_KK: Record<LandmarkId, { name: string; text: string }> = {
  city_hall: {
    name: 'Әкімдік',
    text: 'Табыс алғаннан кейін монетаңыз болмаса, банктен 1 монета алыңыз. Көрнекті нысан болып саналмайды.',
  },
  harbor: { name: 'Айлақ', text: 'Кубиктерде 10 немесе одан көп түссе, нәтижеге 2 қоса аласыз.' },
  train_station: { name: 'Вокзал', text: '2 кубик тастай аласыз.' },
  shopping_mall: { name: 'Сауда орталығы', text: 'Наубайхана және шыныаяқ белгісі бар әр кәсіпорныңыз +1 монета әкеледі.' },
  amusement_park: { name: 'Ойын-сауық саябағы', text: 'Бірдей сан түссе, осыдан кейін тағы бір жүріс жасаңыз.' },
  radio_tower: { name: 'Телемұнара', text: 'Жүрісіне бір рет кубиктерді қайта тастай аласыз.' },
  airport: { name: 'Әуежай', text: 'Өз жүрісіңізде ештеңе салмасаңыз, банктен 10 монета алыңыз.' },
};

/** Card and landmark tables per language; English lives on the card definitions. */
const CARD_TABLES: Partial<Record<Lang, Record<CardId, { name: string; text: string }>>> = {
  ru: CARDS_RU,
  kk: CARDS_KK,
};

const LANDMARK_TABLES: Partial<Record<Lang, Record<LandmarkId, { name: string; text: string }>>> = {
  ru: LANDMARKS_RU,
  kk: LANDMARKS_KK,
};

export function cardName(lang: Lang, id: CardId): string {
  return CARD_TABLES[lang]?.[id]?.name ?? CARD_BY_ID[id].name;
}

export function cardText(lang: Lang, id: CardId): string {
  return CARD_TABLES[lang]?.[id]?.text ?? CARD_BY_ID[id].text;
}

export function landmarkName(lang: Lang, id: LandmarkId): string {
  return LANDMARK_TABLES[lang]?.[id]?.name ?? LANDMARK_BY_ID[id].name;
}

export function landmarkText(lang: Lang, id: LandmarkId): string {
  return LANDMARK_TABLES[lang]?.[id]?.text ?? LANDMARK_BY_ID[id].text;
}

/** Short label for the landmark chips, where space is tight. */
const LANDMARK_SHORT: Record<Lang, Record<LandmarkId, string>> = {
  en: {
    city_hall: 'City Hall',
    harbor: 'Harbor',
    train_station: 'Train',
    shopping_mall: 'Mall',
    amusement_park: 'Park',
    radio_tower: 'Radio',
    airport: 'Airport',
  },
  ru: {
    city_hall: 'Мэрия',
    harbor: 'Гавань',
    train_station: 'Вокзал',
    shopping_mall: 'ТЦ',
    amusement_park: 'Аттракционы',
    radio_tower: 'Телебашня',
    airport: 'Аэропорт',
  },
  kk: {
    city_hall: 'Әкімдік',
    harbor: 'Айлақ',
    train_station: 'Вокзал',
    shopping_mall: 'СО',
    amusement_park: 'Саябақ',
    radio_tower: 'Телемұнара',
    airport: 'Әуежай',
  },
};

export function landmarkShort(lang: Lang, id: LandmarkId): string {
  return LANDMARK_SHORT[lang]?.[id] ?? landmarkName(lang, id).split(' ')[0];
}

export function describeRulesIn(lang: Lang, rules: RuleSet): string {
  const parts = [t(lang, 'rules.base')];
  if (rules.harbor) parts.push(t(lang, 'rules.harbor'));
  if (rules.millionaires) parts.push(t(lang, 'rules.millionaires'));
  return parts.join(' + ');
}

// ---------------------------------------------------------------------------
// messages
// ---------------------------------------------------------------------------

const EN: Record<string, string> = {
  'rules.base': 'base game',
  'rules.harbor': 'Harbor',
  'rules.millionaires': "Millionaire's Row",

  // log
  'log.gameOn': 'Game on — {rules}.',
  'log.turnOrder': 'Turn order: {order}.',
  'log.variableSupply': 'Variable supply: {n} stacks are available at a time.',
  'log.turn': '— Turn {n}: {player} ({coins} {coinsWord}) —',
  'log.roll': '{player} rolls {dice} = {total}',
  'log.tunaRoll': 'Tuna Boat roll: {total}.',
  'log.redTake': '{player} takes {amount} from {from} — {card}{times}',
  'log.redTakeBroke': '{player} takes {amount} from {from} — {card}{times} ({from} is broke)',
  'log.gets': '{player} gets {amount} — {card}{times}',
  'log.pays': '{player} pays {amount} to the bank — {card}{times}',
  'log.getsVia': '{player} gets {amount} — {card} (via the Exhibit Hall)',
  'log.paysVia': '{player} pays {amount} — {card} (via the Exhibit Hall)',
  'log.activatesNothing': '{player} activates {card} for nothing.',
  'log.reopens': "{player}'s {card}{times} reopens after renovation.",
  'log.wineryCloses': "{player}'s Winery closes for renovation.",
  'log.stadium': '{player} collects {amount} from everyone — Stadium',
  'log.publisher': '{player} collects {amount} — Publisher',
  'log.taxOffice': '{player} collects {amount} — Tax Office',
  'log.techStartup': '{player} collects {amount} — Tech Startup (invested {invested})',
  'log.techNoInvestment': 'Tech Startup has no investment yet.',
  'log.tvNobody': 'TV Station: nobody has coins to take.',
  'log.bcNoSwap': 'Business Center: no establishment can be swapped.',
  'log.exhibitNothing': 'Exhibit Hall: nothing worth activating.',
  'log.park': 'The Park redistributes the coins — everyone now has {each}.',
  'log.cityHall': '{player} gets 1 coin — City Hall',
  'log.doubles': '{player} rolled doubles — Amusement Park grants another turn.',
  'log.harborUsed': '{player} uses the Harbor: total becomes {total}.',
  'log.reroll': '{player} uses the Radio Tower to re-roll.',
  'log.tvTake': '{player} takes {amount} from {target} — TV Station',
  'log.trade': "{player} swaps {card} for {target}'s {card2} — Business Center",
  'log.demolish': '{player} demolishes the {landmark} and gets 8 — Demolition Company',
  'log.noDemolish': '{player} has no landmark to demolish.',
  'log.moving': '{player} gives {card} to {target} and gets 4 — Moving Company',
  'log.noMoving': '{player} has nothing the Moving Company could shift.',
  'log.renovation': '{player} closes {count} × {card} for renovation and collects {amount} — Renovation Company',
  'log.exhibitKeep': '{player} keeps the Exhibit Hall.',
  'log.exhibitReturn': '{player} returns the Exhibit Hall to the supply.',
  'log.invest': '{player} invests 1 in the Tech Startup (now {total}).',
  'log.buy': '{player} buys {card} for {cost}.',
  'log.buyPaid': '{player} takes on the {card} and gets {amount}.',
  'log.buildLandmark': '{player} builds the {landmark} for {cost}!',
  'log.passAirport': '{player} builds nothing and gets 10 — Airport',
  'log.pass': '{player} builds nothing.',
  'log.win': '🏆 {player} completed the city and wins!',
  'log.skipChoice': '{player} has nothing left to choose — skipping.',
  'log.away': '{player} is away — playing automatically.',
  'log.leftForBot': '{player} left — a bot takes over.',

  // errors
  'err.gameOver': 'The game is over.',
  'err.notYourTurn': 'It is not your turn.',
  'err.alreadyRolled': 'You have already rolled.',
  'err.rollOneOrTwo': 'Roll 1 or 2 dice.',
  'err.needTrainStation': 'The Train Station is needed to roll 2 dice.',
  'err.nothingToReroll': 'Nothing to re-roll right now.',
  'err.harborNotNow': 'The Harbor cannot be used right now.',
  'err.tvNotWaiting': 'The TV Station is not waiting on you.',
  'err.unknownPlayer': 'Unknown player.',
  'err.pickAnother': 'Pick another player.',
  'err.bcNotWaiting': 'The Business Center is not waiting on you.',
  'err.noMajorSwap': 'Major establishments cannot be swapped.',
  'err.dontOwn': 'You do not own that establishment.',
  'err.theyDontOwn': 'They do not own that establishment.',
  'err.nothingToDemolish': 'Nothing is waiting to be demolished.',
  'err.notBuilt': 'You have not built that landmark.',
  'err.movingNotWaiting': 'The Moving Company is not waiting on you.',
  'err.noMajorMove': 'Major establishments cannot be moved.',
  'err.renovationNotWaiting': 'The Renovation Company is not waiting on you.',
  'err.chooseNonMajor': 'Choose a non-major establishment.',
  'err.cardNotInGame': 'That card is not in this game.',
  'err.exhibitNotWaiting': 'The Exhibit Hall is not waiting on you.',
  'err.cannotActivate': 'You cannot activate that card.',
  'err.noInvest': 'There is nothing to invest in right now.',
  'err.noCoinToInvest': 'You have no coin to invest.',
  'err.cannotBuildNow': 'You cannot build right now.',
  'err.cannotBuy': 'You cannot buy that.',
  'err.cannotBuildLandmark': 'You cannot build that landmark.',
  'err.cannotPass': 'You cannot pass right now.',
  'err.unknownAction': 'Unknown action.',
  'err.roomNotFound': 'No room with that code.',
  'err.gameInProgress': 'That game is already in progress. Ask for the rejoin link, or wait for the next game.',
  'err.roomFull': 'That room is full.',
  'err.roomGone': 'That room no longer exists.',
  'err.seatGone': 'Your seat in that room is gone.',
  'err.notInRoom': 'You are not in a room.',
  'err.hostOnly': 'Only the host can do that.',
  'err.gameRunning': 'The game is already running.',
  'err.tooManyForRules': 'That set-up seats only {max} players — remove someone first.',
  'err.noSuchPlayer': 'No such player.',
  'err.hostCannotBeRemoved': 'The host cannot be removed.',
  'err.needPlayers': 'You need at least {min} players.',
  'err.finishFirst': 'Finish this game first.',
  'err.alreadyStarted': 'The game has already started.',
  'err.notStarted': 'The game has not started.',
  'err.malformed': 'Malformed message.',
  'err.serverError': 'Something went wrong on the server.',
  'err.unknownMessage': 'Unknown message.',

  // interface
  'ui.title': 'Machi Koro',
  'ui.tagline': 'Roll dice, build your city, beat your friends to all the landmarks.',
  'ui.yourName': 'Your name',
  'ui.playerPlaceholder': 'Player',
  'ui.startGame': 'Start a game',
  'ui.createRoom': 'Create room',
  'ui.joinGame': 'Join a game',
  'ui.code': 'CODE',
  'ui.joinRoom': 'Join room',
  'ui.fineprint': 'A fan implementation of the board game for private play. Rules only — no original artwork or card text.',
  'ui.connecting': 'Connecting…',
  'ui.connectionLost': 'Connection lost — retrying…',

  'ui.harborName': 'Harbor expansion',
  'ui.harborBlurb': 'Boats, City Hall, Airport, and a 5th seat',
  'ui.rowName': "Millionaire's Row",
  'ui.rowBlurb': 'Wineries, demolition, renovation, Tech Startup',
  'ui.supplyName': 'Variable supply',
  'ui.supplyBlurb': 'Only 10 different cards on offer at a time, refilled from a deck',
  'ui.on': 'on',
  'ui.off': 'off',
  'ui.rulesSummary': '{cards} establishments · {landmarks} landmarks to win · up to {players} players',

  'ui.room': 'Room {code}',
  'ui.leave': 'Leave',
  'ui.inviteHint': 'Send this link to your friends:',
  'ui.copy': 'Copy',
  'ui.copied': 'Copied',
  'ui.players': 'Players',
  'ui.host': 'host',
  'ui.bot': 'bot',
  'ui.you': 'you',
  'ui.remove': 'remove',
  'ui.addBot': 'Add bot',
  'ui.startTheGame': 'Start game',
  'ui.waitingForHost': 'Waiting for the host to start — {rules}…',
  'ui.sayHello': 'Say hello…',
  'ui.message': 'Message',
  'ui.send': 'Send',
  'ui.log': 'Log',
  'ui.chat': 'Chat',

  'ui.yourTurn': 'Your turn',
  'ui.wins': '🏆 {player} wins!',
  'ui.playAgain': 'Play again',
  'ui.waitingRematch': 'Waiting for the host to start a rematch…',
  'ui.yourCoins': 'your coins',
  'ui.spectating': 'spectating {player}',
  'ui.stacksAndDeck': '{stacks} stacks · {deck} in deck',
  'ui.cardsLeft': '{n} left',
  'ui.youOwn': 'you: {n}',
  'ui.noEstablishments': 'no establishments',
  'ui.takingTurn': 'taking their turn',
  'ui.cardAria': '{name}, activates on {activates}, costs {cost}',
  'ui.paidToBuild': 'you are paid to build this',
  'ui.investedTitle': '{n} invested in the Tech Startup',
  'ui.closedForRenovation': '({n} closed for renovation)',

  'ui.phase.roll': '{player} is rolling',
  'ui.phase.reroll': '{player} may re-roll (Radio Tower)',
  'ui.phase.harbor': '{player} may use the Harbor',
  'ui.phase.tv': '{player} is choosing a TV Station target',
  'ui.phase.trade': '{player} is choosing a Business Center swap',
  'ui.phase.moving': '{player} is giving an establishment away',
  'ui.phase.demolish': '{player} must demolish a landmark',
  'ui.phase.renovation': '{player} is closing an establishment for renovation',
  'ui.phase.exhibit': '{player} is using the Exhibit Hall',
  'ui.phase.invest': '{player} may invest in the Tech Startup',
  'ui.phase.build': '{player} is building',
  'ui.phase.over': 'Game over',

  'ui.rollPrompt': 'Your turn — roll:',
  'ui.rollOne': 'Roll 1 die',
  'ui.rollTwo': 'Roll 2 dice',
  'ui.needsTrainStation': 'Needs the Train Station',
  'ui.rerollPrompt': 'Radio Tower — re-roll?',
  'ui.keepTotal': 'Keep {total}',
  'ui.reroll': 'Re-roll',
  'ui.harborPrompt': 'Harbor — add 2 to the total?',
  'ui.makeIt': 'Make it {total}',
  'ui.tvPrompt': 'TV Station — take 5 coins from:',
  'ui.demolishPrompt': 'Demolition Company — knock one down for 8 coins:',
  'ui.investPrompt': 'Tech Startup — invested {n}. Add another coin?',
  'ui.investOne': 'Invest 1',
  'ui.endTurn': 'End turn',
  'ui.endTurnAirport': 'End turn (+10 Airport)',
  'ui.buildPrompt': 'Buy a card, build a landmark, or end your turn:',

  'ui.bcTitle': 'Business Center',
  'ui.bcBlurb': 'Swap one of your establishments for one of theirs. Major establishments cannot be swapped.',
  'ui.youGive': 'You give',
  'ui.youTakeFrom': 'You take from',
  'ui.swap': 'Swap',
  'ui.movingTitle': 'Moving Company',
  'ui.movingBlurb': 'Give one establishment away, then take 4 coins from the bank.',
  'ui.giveAway': 'Give away',
  'ui.to': 'To',
  'ui.handOver': 'Hand it over (+4)',
  'ui.renovationTitle': 'Renovation Company',
  'ui.renovationBlurb':
    'Close every copy of one establishment for renovation. Each closed building skips its next activation, and every opponent pays you 1 coin per building of theirs you close — including your own copies.',
  'ui.closeEvery': 'Close every',
  'ui.renovationPreview': '{owners} — you collect about {amount}.',
  'ui.closeForRenovation': 'Close for renovation',
  'ui.exhibitTitle': 'Exhibit Hall',
  'ui.exhibitBlurb':
    'You may activate one of your own establishments instead. If you do, the Exhibit Hall goes back to the supply.',
  'ui.activate': 'Activate',
  'ui.keepExhibit': 'Keep the Exhibit Hall',
  'ui.activateIt': 'Activate it',
  'ui.nothingAvailable': 'nothing available',
  'ui.closedList': 'Closed for renovation: {cards}',
};

const RU: Record<string, string> = {
  'rules.base': 'базовая игра',
  'rules.harbor': 'Гавань',
  'rules.millionaires': 'Улица миллионеров',

  // log
  'log.gameOn': 'Игра началась — {rules}.',
  'log.turnOrder': 'Порядок хода: {order}.',
  'log.variableSupply': 'Переменный запас: одновременно доступно {n} стопок.',
  'log.turn': '— Ход {n}: {player} ({coins} {coinsWord}) —',
  'log.roll': '{player} бросает {dice} = {total}',
  'log.tunaRoll': 'Бросок Траулера: {total}.',
  'log.redTake': '{player} забирает {amount} у {from} — {card}{times}',
  'log.redTakeBroke': '{player} забирает {amount} у {from} — {card}{times} (у {from} больше нет монет)',
  'log.gets': '{player} получает {amount} — {card}{times}',
  'log.pays': '{player} платит {amount} в банк — {card}{times}',
  'log.getsVia': '{player} получает {amount} — {card} (через Выставочный зал)',
  'log.paysVia': '{player} платит {amount} — {card} (через Выставочный зал)',
  'log.activatesNothing': '{player} активирует {card} впустую.',
  'log.reopens': '{card}{times} игрока {player} снова открывается после ремонта.',
  'log.wineryCloses': 'Винодельня игрока {player} закрывается на ремонт.',
  'log.stadium': '{player} собирает {amount} со всех — Стадион',
  'log.publisher': '{player} собирает {amount} — Издательство',
  'log.taxOffice': '{player} собирает {amount} — Налоговая',
  'log.techStartup': '{player} собирает {amount} — Технологический стартап (вложено {invested})',
  'log.techNoInvestment': 'В Технологический стартап пока ничего не вложено.',
  'log.tvNobody': 'Телестудия: не у кого забирать монеты.',
  'log.bcNoSwap': 'Бизнес-центр: обменивать нечего.',
  'log.exhibitNothing': 'Выставочный зал: активировать нечего.',
  'log.park': 'Парк делит монеты поровну — теперь у каждого по {each}.',
  'log.cityHall': '{player} получает 1 монету — Мэрия',
  'log.doubles': 'У {player} выпал дубль — Парк аттракционов даёт ещё один ход.',
  'log.harborUsed': '{player} использует Гавань: сумма становится {total}.',
  'log.reroll': '{player} использует Телебашню и перебрасывает кубики.',
  'log.tvTake': '{player} забирает {amount} у {target} — Телестудия',
  'log.trade': '{player} меняет {card} на {card2} игрока {target} — Бизнес-центр',
  'log.demolish': '{player} сносит {landmark} и получает 8 — Компания по сносу',
  'log.noDemolish': 'У {player} нет достопримечательностей для сноса.',
  'log.moving': '{player} отдаёт {card} игроку {target} и получает 4 — Транспортная компания',
  'log.noMoving': 'У {player} нет предприятий для перевозки.',
  'log.renovation': '{player} закрывает на ремонт {count} × {card} и собирает {amount} — Ремонтная компания',
  'log.exhibitKeep': '{player} оставляет Выставочный зал себе.',
  'log.exhibitReturn': '{player} возвращает Выставочный зал в запас.',
  'log.invest': '{player} вкладывает 1 монету в Технологический стартап (всего {total}).',
  'log.buy': '{player} покупает {card} за {cost}.',
  'log.buyPaid': '{player} берёт {card} и получает {amount}.',
  'log.buildLandmark': '{player} строит {landmark} за {cost}!',
  'log.passAirport': '{player} ничего не строит и получает 10 — Аэропорт',
  'log.pass': '{player} ничего не строит.',
  'log.win': '🏆 {player} достроил город и побеждает!',
  'log.skipChoice': 'У {player} не осталось вариантов — пропуск.',
  'log.away': '{player} отсутствует — ход играется автоматически.',
  'log.leftForBot': '{player} вышел — за него играет бот.',

  // errors
  'err.gameOver': 'Игра окончена.',
  'err.notYourTurn': 'Сейчас не ваш ход.',
  'err.alreadyRolled': 'Вы уже бросили кубики.',
  'err.rollOneOrTwo': 'Бросайте 1 или 2 кубика.',
  'err.needTrainStation': 'Чтобы бросать 2 кубика, нужен Вокзал.',
  'err.nothingToReroll': 'Сейчас нечего перебрасывать.',
  'err.harborNotNow': 'Сейчас Гавань использовать нельзя.',
  'err.tvNotWaiting': 'Телестудия сейчас не ждёт вашего решения.',
  'err.unknownPlayer': 'Неизвестный игрок.',
  'err.pickAnother': 'Выберите другого игрока.',
  'err.bcNotWaiting': 'Бизнес-центр сейчас не ждёт вашего решения.',
  'err.noMajorSwap': 'Крупные предприятия обменивать нельзя.',
  'err.dontOwn': 'У вас нет такого предприятия.',
  'err.theyDontOwn': 'У него нет такого предприятия.',
  'err.nothingToDemolish': 'Сейчас ничего не нужно сносить.',
  'err.notBuilt': 'Эта достопримечательность у вас не построена.',
  'err.movingNotWaiting': 'Транспортная компания сейчас не ждёт вашего решения.',
  'err.noMajorMove': 'Крупные предприятия передавать нельзя.',
  'err.renovationNotWaiting': 'Ремонтная компания сейчас не ждёт вашего решения.',
  'err.chooseNonMajor': 'Выберите некрупное предприятие.',
  'err.cardNotInGame': 'Этой карты нет в текущей игре.',
  'err.exhibitNotWaiting': 'Выставочный зал сейчас не ждёт вашего решения.',
  'err.cannotActivate': 'Эту карту активировать нельзя.',
  'err.noInvest': 'Сейчас вкладывать некуда.',
  'err.noCoinToInvest': 'У вас нет монеты для вклада.',
  'err.cannotBuildNow': 'Сейчас строить нельзя.',
  'err.cannotBuy': 'Это купить нельзя.',
  'err.cannotBuildLandmark': 'Эту достопримечательность построить нельзя.',
  'err.cannotPass': 'Сейчас пропустить нельзя.',
  'err.unknownAction': 'Неизвестное действие.',
  'err.roomNotFound': 'Комнаты с таким кодом нет.',
  'err.gameInProgress': 'Эта игра уже идёт. Попросите ссылку для возврата или дождитесь следующей партии.',
  'err.roomFull': 'В комнате нет свободных мест.',
  'err.roomGone': 'Этой комнаты больше нет.',
  'err.seatGone': 'Вашего места в этой комнате больше нет.',
  'err.notInRoom': 'Вы не в комнате.',
  'err.hostOnly': 'Это может сделать только хост.',
  'err.gameRunning': 'Игра уже идёт.',
  'err.tooManyForRules': 'При этих настройках помещается только {max} игроков — уберите кого-нибудь.',
  'err.noSuchPlayer': 'Такого игрока нет.',
  'err.hostCannotBeRemoved': 'Хоста убрать нельзя.',
  'err.needPlayers': 'Нужно минимум {min} игрока.',
  'err.finishFirst': 'Сначала закончите эту партию.',
  'err.alreadyStarted': 'Игра уже началась.',
  'err.notStarted': 'Игра ещё не началась.',
  'err.malformed': 'Некорректное сообщение.',
  'err.serverError': 'На сервере что-то пошло не так.',
  'err.unknownMessage': 'Неизвестное сообщение.',

  // interface
  'ui.title': 'Мачи Коро',
  'ui.tagline': 'Бросайте кубики, стройте город и обгоните друзей в гонке за достопримечательностями.',
  'ui.yourName': 'Ваше имя',
  'ui.playerPlaceholder': 'Игрок',
  'ui.startGame': 'Создать партию',
  'ui.createRoom': 'Создать комнату',
  'ui.joinGame': 'Присоединиться',
  'ui.code': 'КОД',
  'ui.joinRoom': 'Войти в комнату',
  'ui.fineprint': 'Любительская реализация настольной игры для частных партий. Только правила — без оригинальных иллюстраций и текстов.',
  'ui.connecting': 'Подключение…',
  'ui.connectionLost': 'Связь потеряна — переподключаемся…',

  'ui.harborName': 'Дополнение «Гавань»',
  'ui.harborBlurb': 'Баркасы, Мэрия, Аэропорт и пятое место',
  'ui.rowName': 'Улица миллионеров',
  'ui.rowBlurb': 'Винодельни, снос, ремонт, Технологический стартап',
  'ui.supplyName': 'Переменный запас',
  'ui.supplyBlurb': 'Одновременно доступно только 10 разных карт, стопки пополняются из колоды',
  'ui.on': 'вкл',
  'ui.off': 'выкл',
  'ui.rulesSummary': 'предприятий: {cards} · достопримечательностей для победы: {landmarks} · до {players} игроков',

  'ui.room': 'Комната {code}',
  'ui.leave': 'Выйти',
  'ui.inviteHint': 'Отправьте эту ссылку друзьям:',
  'ui.copy': 'Копировать',
  'ui.copied': 'Скопировано',
  'ui.players': 'Игроки',
  'ui.host': 'хост',
  'ui.bot': 'бот',
  'ui.you': 'вы',
  'ui.remove': 'убрать',
  'ui.addBot': 'Добавить бота',
  'ui.startTheGame': 'Начать игру',
  'ui.waitingForHost': 'Ждём, пока хост начнёт партию — {rules}…',
  'ui.sayHello': 'Поздоровайтесь…',
  'ui.message': 'Сообщение',
  'ui.send': 'Отправить',
  'ui.log': 'Лог',
  'ui.chat': 'Чат',

  'ui.yourTurn': 'Ваш ход',
  'ui.wins': '🏆 {player} побеждает!',
  'ui.playAgain': 'Сыграть ещё',
  'ui.waitingRematch': 'Ждём, пока хост начнёт новую партию…',
  'ui.yourCoins': 'ваши монеты',
  'ui.spectating': 'наблюдаете за {player}',
  'ui.stacksAndDeck': 'стопок: {stacks} · в колоде: {deck}',
  'ui.cardsLeft': 'осталось {n}',
  'ui.youOwn': 'у вас: {n}',
  'ui.noEstablishments': 'предприятий нет',
  'ui.takingTurn': 'сейчас ходит',
  'ui.cardAria': '{name}, срабатывает на {activates}, стоит {cost}',
  'ui.paidToBuild': 'за постройку платят вам',
  'ui.investedTitle': 'вложено в Технологический стартап: {n}',
  'ui.closedForRenovation': '(закрыто на ремонт: {n})',

  'ui.phase.roll': '{player} бросает кубики',
  'ui.phase.reroll': '{player} может перебросить (Телебашня)',
  'ui.phase.harbor': '{player} может использовать Гавань',
  'ui.phase.tv': '{player} выбирает жертву Телестудии',
  'ui.phase.trade': '{player} выбирает обмен в Бизнес-центре',
  'ui.phase.moving': '{player} отдаёт предприятие',
  'ui.phase.demolish': '{player} должен снести достопримечательность',
  'ui.phase.renovation': '{player} закрывает предприятие на ремонт',
  'ui.phase.exhibit': '{player} использует Выставочный зал',
  'ui.phase.invest': '{player} может вложиться в Технологический стартап',
  'ui.phase.build': '{player} строит',
  'ui.phase.over': 'Игра окончена',

  'ui.rollPrompt': 'Ваш ход — бросайте:',
  'ui.rollOne': '1 кубик',
  'ui.rollTwo': '2 кубика',
  'ui.needsTrainStation': 'Нужен Вокзал',
  'ui.rerollPrompt': 'Телебашня — перебросить?',
  'ui.keepTotal': 'Оставить {total}',
  'ui.reroll': 'Перебросить',
  'ui.harborPrompt': 'Гавань — добавить 2 к сумме?',
  'ui.makeIt': 'Сделать {total}',
  'ui.tvPrompt': 'Телестудия — забрать 5 монет у:',
  'ui.demolishPrompt': 'Компания по сносу — снесите одну за 8 монет:',
  'ui.investPrompt': 'Технологический стартап — вложено {n}. Добавить ещё монету?',
  'ui.investOne': 'Вложить 1',
  'ui.endTurn': 'Закончить ход',
  'ui.endTurnAirport': 'Закончить ход (+10 Аэропорт)',
  'ui.buildPrompt': 'Купите карту, постройте достопримечательность или закончите ход:',

  'ui.bcTitle': 'Бизнес-центр',
  'ui.bcBlurb': 'Обменяйте своё предприятие на предприятие соперника. Крупные предприятия обменивать нельзя.',
  'ui.youGive': 'Вы отдаёте',
  'ui.youTakeFrom': 'Вы забираете у',
  'ui.swap': 'Обменять',
  'ui.movingTitle': 'Транспортная компания',
  'ui.movingBlurb': 'Отдайте одно предприятие, затем возьмите 4 монеты из банка.',
  'ui.giveAway': 'Отдать',
  'ui.to': 'Кому',
  'ui.handOver': 'Отдать (+4)',
  'ui.renovationTitle': 'Ремонтная компания',
  'ui.renovationBlurb':
    'Закройте на ремонт все копии одного предприятия. Каждое закрытое здание пропустит следующую активацию, а каждый соперник заплатит вам 1 монету за своё закрытое здание — ваши копии тоже закроются.',
  'ui.closeEvery': 'Закрыть все',
  'ui.renovationPreview': '{owners} — вы получите примерно {amount}.',
  'ui.closeForRenovation': 'Закрыть на ремонт',
  'ui.exhibitTitle': 'Выставочный зал',
  'ui.exhibitBlurb':
    'Можно активировать вместо него одно своё предприятие. Тогда Выставочный зал вернётся в запас.',
  'ui.activate': 'Активировать',
  'ui.keepExhibit': 'Оставить Выставочный зал',
  'ui.activateIt': 'Активировать',
  'ui.nothingAvailable': 'ничего нет',
  'ui.closedList': 'Закрыто на ремонт: {cards}',
};

const KK: Record<string, string> = {
  'rules.base': 'негізгі ойын',
  'rules.harbor': 'Айлақ',
  'rules.millionaires': 'Миллионерлер көшесі',

  // log
  'log.gameOn': 'Ойын басталды — {rules}.',
  'log.turnOrder': 'Жүріс кезегі: {order}.',
  'log.variableSupply': 'Ауыспалы қор: бір мезгілде {n} үйінді қолжетімді.',
  'log.turn': '— {n}-жүріс: {player} ({coins} {coinsWord}) —',
  'log.roll': '{player} кубик тастады: {dice} = {total}',
  'log.tunaRoll': 'Тунец қайығының тастауы: {total}.',
  'log.redTake': '{player} {from} ойыншысынан {amount} алады — {card}{times}',
  'log.redTakeBroke': '{player} {from} ойыншысынан {amount} алады — {card}{times} ({from} ойыншысында монета қалмады)',
  'log.gets': '{player} {amount} алады — {card}{times}',
  'log.pays': '{player} банкке {amount} төлейді — {card}{times}',
  'log.getsVia': '{player} {amount} алады — {card} (Көрме залы арқылы)',
  'log.paysVia': '{player} {amount} төлейді — {card} (Көрме залы арқылы)',
  'log.activatesNothing': '{player} {card} картасын босқа іске қосады.',
  'log.reopens': '{player} ойыншысының {card}{times} картасы жөндеуден кейін қайта ашылды.',
  'log.wineryCloses': '{player} ойыншысының Шарап зауыты жөндеуге жабылады.',
  'log.stadium': '{player} бәрінен {amount} жинайды — Стадион',
  'log.publisher': '{player} {amount} жинайды — Баспа',
  'log.taxOffice': '{player} {amount} жинайды — Салық басқармасы',
  'log.techStartup': '{player} {amount} жинайды — Технологиялық стартап (салынғаны {invested})',
  'log.techNoInvestment': 'Технологиялық стартапқа әзірге ештеңе салынған жоқ.',
  'log.tvNobody': 'Телестудия: монета алатын ешкім жоқ.',
  'log.bcNoSwap': 'Бизнес-орталық: айырбастайтын кәсіпорын жоқ.',
  'log.exhibitNothing': 'Көрме залы: іске қосатын ештеңе жоқ.',
  'log.park': 'Саябақ монеталарды тең бөледі — енді әрқайсысында {each}.',
  'log.cityHall': '{player} 1 монета алады — Әкімдік',
  'log.doubles': '{player} бірдей сан тастады — Ойын-сауық саябағы тағы бір жүріс береді.',
  'log.harborUsed': '{player} Айлақты пайдаланады: жиынтық {total} болды.',
  'log.reroll': '{player} Телемұнараны пайдаланып, кубиктерді қайта тастайды.',
  'log.tvTake': '{player} {target} ойыншысынан {amount} алады — Телестудия',
  'log.trade': '{player} {card} картасын {target} ойыншысының {card2} картасына айырбастайды — Бизнес-орталық',
  'log.demolish': '{player} {landmark} нысанын бұзып, 8 алады — Бұзу компаниясы',
  'log.noDemolish': '{player} ойыншысында бұзатын көрнекті нысан жоқ.',
  'log.moving': '{player} {card} картасын {target} ойыншысына беріп, 4 алады — Көлік компаниясы',
  'log.noMoving': '{player} ойыншысында Көлік компаниясы тасымалдайтын кәсіпорын жоқ.',
  'log.renovation': '{player} {count} × {card} кәсіпорнын жөндеуге жауып, {amount} жинайды — Жөндеу компаниясы',
  'log.exhibitKeep': '{player} Көрме залын өзінде қалдырады.',
  'log.exhibitReturn': '{player} Көрме залын қорға қайтарады.',
  'log.invest': '{player} Технологиялық стартапқа 1 монета салады (барлығы {total}).',
  'log.buy': '{player} {card} картасын {cost} монетаға сатып алады.',
  'log.buyPaid': '{player} {card} картасын алып, {amount} алады.',
  'log.buildLandmark': '{player} {landmark} нысанын {cost} монетаға салады!',
  'log.passAirport': '{player} ештеңе салмайды және 10 алады — Әуежай',
  'log.pass': '{player} ештеңе салмайды.',
  'log.win': '🏆 {player} қаласын аяқтап, жеңіске жетті!',
  'log.skipChoice': '{player} ойыншысында таңдау қалмады — өткізіледі.',
  'log.away': '{player} орнында жоқ — жүріс автоматты түрде ойналады.',
  'log.leftForBot': '{player} шықты — оның орнына бот ойнайды.',

  // errors
  'err.gameOver': 'Ойын аяқталды.',
  'err.notYourTurn': 'Қазір сіздің жүрісіңіз емес.',
  'err.alreadyRolled': 'Сіз кубиктерді тастап қойдыңыз.',
  'err.rollOneOrTwo': '1 немесе 2 кубик тастаңыз.',
  'err.needTrainStation': '2 кубик тастау үшін Вокзал керек.',
  'err.nothingToReroll': 'Қазір қайта тастайтын ештеңе жоқ.',
  'err.harborNotNow': 'Қазір Айлақты пайдалануға болмайды.',
  'err.tvNotWaiting': 'Телестудия қазір сіздің шешіміңізді күтіп тұрған жоқ.',
  'err.unknownPlayer': 'Белгісіз ойыншы.',
  'err.pickAnother': 'Басқа ойыншыны таңдаңыз.',
  'err.bcNotWaiting': 'Бизнес-орталық қазір сіздің шешіміңізді күтіп тұрған жоқ.',
  'err.noMajorSwap': 'Ірі кәсіпорындарды айырбастауға болмайды.',
  'err.dontOwn': 'Сізде ондай кәсіпорын жоқ.',
  'err.theyDontOwn': 'Онда ондай кәсіпорын жоқ.',
  'err.nothingToDemolish': 'Қазір бұзатын ештеңе жоқ.',
  'err.notBuilt': 'Бұл көрнекті нысан сізде салынбаған.',
  'err.movingNotWaiting': 'Көлік компаниясы қазір сіздің шешіміңізді күтіп тұрған жоқ.',
  'err.noMajorMove': 'Ірі кәсіпорындарды беруге болмайды.',
  'err.renovationNotWaiting': 'Жөндеу компаниясы қазір сіздің шешіміңізді күтіп тұрған жоқ.',
  'err.chooseNonMajor': 'Ірі емес кәсіпорынды таңдаңыз.',
  'err.cardNotInGame': 'Бұл карта осы ойында жоқ.',
  'err.exhibitNotWaiting': 'Көрме залы қазір сіздің шешіміңізді күтіп тұрған жоқ.',
  'err.cannotActivate': 'Бұл картаны іске қосуға болмайды.',
  'err.noInvest': 'Қазір салатын ештеңе жоқ.',
  'err.noCoinToInvest': 'Сізде салуға монета жоқ.',
  'err.cannotBuildNow': 'Қазір салуға болмайды.',
  'err.cannotBuy': 'Мұны сатып алуға болмайды.',
  'err.cannotBuildLandmark': 'Бұл көрнекті нысанды салуға болмайды.',
  'err.cannotPass': 'Қазір өткізуге болмайды.',
  'err.unknownAction': 'Белгісіз әрекет.',
  'err.roomNotFound': 'Мұндай коды бар бөлме жоқ.',
  'err.gameInProgress': 'Бұл ойын жүріп жатыр. Қайта қосылу сілтемесін сұраңыз немесе келесі партияны күтіңіз.',
  'err.roomFull': 'Бөлмеде бос орын жоқ.',
  'err.roomGone': 'Бұл бөлме енді жоқ.',
  'err.seatGone': 'Бұл бөлмедегі орныңыз енді жоқ.',
  'err.notInRoom': 'Сіз бөлмеде емессіз.',
  'err.hostOnly': 'Мұны тек хост жасай алады.',
  'err.gameRunning': 'Ойын әлдеқашан жүріп жатыр.',
  'err.tooManyForRules': 'Бұл теңшеуде тек {max} ойыншы сыяды — біреуін алып тастаңыз.',
  'err.noSuchPlayer': 'Мұндай ойыншы жоқ.',
  'err.hostCannotBeRemoved': 'Хостты алып тастауға болмайды.',
  'err.needPlayers': 'Кемінде {min} ойыншы қажет.',
  'err.finishFirst': 'Алдымен осы партияны аяқтаңыз.',
  'err.alreadyStarted': 'Ойын басталып кетті.',
  'err.notStarted': 'Ойын әлі басталған жоқ.',
  'err.malformed': 'Қате хабарлама.',
  'err.serverError': 'Серверде бірдеңе дұрыс болмады.',
  'err.unknownMessage': 'Белгісіз хабарлама.',

  // interface
  'ui.title': 'Мачи Коро',
  'ui.tagline': 'Кубик тастаңыз, қала салыңыз және көрнекті нысандар жарысында достарыңызды озып кетіңіз.',
  'ui.yourName': 'Атыңыз',
  'ui.playerPlaceholder': 'Ойыншы',
  'ui.startGame': 'Партия құру',
  'ui.createRoom': 'Бөлме құру',
  'ui.joinGame': 'Ойынға қосылу',
  'ui.code': 'КОД',
  'ui.joinRoom': 'Бөлмеге кіру',
  'ui.fineprint': 'Үстел ойынының жеке партияларға арналған әуесқой нұсқасы. Тек ережелер — түпнұсқа суреттер мен мәтіндерсіз.',
  'ui.connecting': 'Қосылуда…',
  'ui.connectionLost': 'Байланыс үзілді — қайта қосылудамыз…',

  'ui.harborName': '«Айлақ» толықтыруы',
  'ui.harborBlurb': 'Қайықтар, Әкімдік, Әуежай және бесінші орын',
  'ui.rowName': 'Миллионерлер көшесі',
  'ui.rowBlurb': 'Шарап зауыттары, бұзу, жөндеу, Технологиялық стартап',
  'ui.supplyName': 'Ауыспалы қор',
  'ui.supplyBlurb': 'Бір мезгілде тек 10 түрлі карта қолжетімді, үйінділер колодадан толықтырылады',
  'ui.on': 'қосулы',
  'ui.off': 'өшірулі',
  'ui.rulesSummary': 'кәсіпорын: {cards} · жеңіске қажет көрнекті нысан: {landmarks} · {players} ойыншыға дейін',

  'ui.room': '{code} бөлмесі',
  'ui.leave': 'Шығу',
  'ui.inviteHint': 'Бұл сілтемені достарыңызға жіберіңіз:',
  'ui.copy': 'Көшіру',
  'ui.copied': 'Көшірілді',
  'ui.players': 'Ойыншылар',
  'ui.host': 'хост',
  'ui.bot': 'бот',
  'ui.you': 'сіз',
  'ui.remove': 'алып тастау',
  'ui.addBot': 'Бот қосу',
  'ui.startTheGame': 'Ойынды бастау',
  'ui.waitingForHost': 'Хосттың партияны бастауын күтудеміз — {rules}…',
  'ui.sayHello': 'Сәлемдесіңіз…',
  'ui.message': 'Хабарлама',
  'ui.send': 'Жіберу',
  'ui.log': 'Журнал',
  'ui.chat': 'Чат',

  'ui.yourTurn': 'Сіздің жүрісіңіз',
  'ui.wins': '🏆 {player} жеңді!',
  'ui.playAgain': 'Тағы ойнау',
  'ui.waitingRematch': 'Хосттың жаңа партия бастауын күтудеміз…',
  'ui.yourCoins': 'сіздің монеталарыңыз',
  'ui.spectating': '{player} ойыншысын бақылап отырсыз',
  'ui.stacksAndDeck': 'үйінді: {stacks} · колодада: {deck}',
  'ui.cardsLeft': '{n} қалды',
  'ui.youOwn': 'сізде: {n}',
  'ui.noEstablishments': 'кәсіпорын жоқ',
  'ui.takingTurn': 'қазір жүріп жатыр',
  'ui.cardAria': '{name}, {activates} санында іске қосылады, бағасы {cost}',
  'ui.paidToBuild': 'салғаныңыз үшін сізге төлейді',
  'ui.investedTitle': 'Технологиялық стартапқа салынғаны: {n}',
  'ui.closedForRenovation': '(жөндеуге жабылғаны: {n})',

  'ui.phase.roll': '{player} кубик тастап жатыр',
  'ui.phase.reroll': '{player} қайта тастай алады (Телемұнара)',
  'ui.phase.harbor': '{player} Айлақты пайдалана алады',
  'ui.phase.tv': '{player} Телестудияның нысанасын таңдап жатыр',
  'ui.phase.trade': '{player} Бизнес-орталықтағы айырбасты таңдап жатыр',
  'ui.phase.moving': '{player} кәсіпорнын беріп жатыр',
  'ui.phase.demolish': '{player} көрнекті нысанды бұзуы керек',
  'ui.phase.renovation': '{player} кәсіпорынды жөндеуге жауып жатыр',
  'ui.phase.exhibit': '{player} Көрме залын пайдаланып жатыр',
  'ui.phase.invest': '{player} Технологиялық стартапқа сала алады',
  'ui.phase.build': '{player} салып жатыр',
  'ui.phase.over': 'Ойын аяқталды',

  'ui.rollPrompt': 'Сіздің жүрісіңіз — тастаңыз:',
  'ui.rollOne': '1 кубик',
  'ui.rollTwo': '2 кубик',
  'ui.needsTrainStation': 'Вокзал қажет',
  'ui.rerollPrompt': 'Телемұнара — қайта тастайсыз ба?',
  'ui.keepTotal': '{total} қалдыру',
  'ui.reroll': 'Қайта тастау',
  'ui.harborPrompt': 'Айлақ — жиынтыққа 2 қосасыз ба?',
  'ui.makeIt': '{total} жасау',
  'ui.tvPrompt': 'Телестудия — 5 монета алу:',
  'ui.demolishPrompt': 'Бұзу компаниясы — біреуін 8 монетаға бұзыңыз:',
  'ui.investPrompt': 'Технологиялық стартап — салынғаны {n}. Тағы бір монета қосасыз ба?',
  'ui.investOne': '1 салу',
  'ui.endTurn': 'Жүрісті аяқтау',
  'ui.endTurnAirport': 'Жүрісті аяқтау (+10 Әуежай)',
  'ui.buildPrompt': 'Карта сатып алыңыз, көрнекті нысан салыңыз немесе жүрісті аяқтаңыз:',

  'ui.bcTitle': 'Бизнес-орталық',
  'ui.bcBlurb': 'Кәсіпорныңызды қарсыласыңыздың кәсіпорнына айырбастаңыз. Ірі кәсіпорындарды айырбастауға болмайды.',
  'ui.youGive': 'Сіз бересіз',
  'ui.youTakeFrom': 'Сіз аласыз',
  'ui.swap': 'Айырбастау',
  'ui.movingTitle': 'Көлік компаниясы',
  'ui.movingBlurb': 'Бір кәсіпорынды беріңіз де, банктен 4 монета алыңыз.',
  'ui.giveAway': 'Беру',
  'ui.to': 'Кімге',
  'ui.handOver': 'Беру (+4)',
  'ui.renovationTitle': 'Жөндеу компаниясы',
  'ui.renovationBlurb':
    'Бір кәсіпорынның барлық көшірмесін жөндеуге жабыңыз. Әр жабылған ғимарат келесі іске қосылуын өткізіп жібереді, ал әр қарсылас өзінің жабылған ғимараты үшін 1 монетадан төлейді — өз көшірмелеріңіз де жабылады.',
  'ui.closeEvery': 'Барлығын жабу',
  'ui.renovationPreview': '{owners} — шамамен {amount} аласыз.',
  'ui.closeForRenovation': 'Жөндеуге жабу',
  'ui.exhibitTitle': 'Көрме залы',
  'ui.exhibitBlurb':
    'Оның орнына өзіңіздің бір кәсіпорныңызды іске қоса аласыз. Сонда Көрме залы қорға қайтады.',
  'ui.activate': 'Іске қосу',
  'ui.keepExhibit': 'Көрме залын қалдыру',
  'ui.activateIt': 'Іске қосу',
  'ui.nothingAvailable': 'ештеңе жоқ',
  'ui.closedList': 'Жөндеуге жабылған: {cards}',
};

const TABLES: Record<Lang, Record<string, string>> = { en: EN, ru: RU, kk: KK };

/** Used by the tests to prove no message falls back to English by accident. */
export function hasTranslation(lang: Lang, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(TABLES[lang] ?? {}, key);
}

/** Russian needs three forms; English two; Kazakh keeps the singular after a numeral. */
function coinsWord(lang: Lang, n: number): string {
  if (lang === 'en') return n === 1 ? 'coin' : 'coins';
  if (lang === 'kk') return 'монета';
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'монета';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'монеты';
  return 'монет';
}

/** Params holding a card id, so the log can name cards in the reader's language. */
const CARD_PARAMS = new Set(['card', 'card2']);

export function t(lang: Lang, key: string, params?: Params): string {
  const template = TABLES[lang]?.[key] ?? EN[key] ?? key;
  if (!params) return template;

  return template.replace(/\{(\w+)\}/g, (_match, name: string) => {
    if (name === 'coinsWord') return coinsWord(lang, Number(params.coins ?? 0));
    const value = params[name];
    if (value === undefined) return '';
    if (CARD_PARAMS.has(name)) return cardName(lang, value as CardId);
    if (name === 'landmark') return landmarkName(lang, value as LandmarkId);
    if (name === 'rules') {
      return String(value)
        .split('+')
        .map((part) => t(lang, `rules.${part}`))
        .join(' + ');
    }
    return String(value);
  });
}

/** Compact rules code stored in the log, expanded per language at render time. */
export function rulesCode(rules: RuleSet): string {
  return ['base', rules.harbor ? 'harbor' : '', rules.millionaires ? 'millionaires' : ''].filter(Boolean).join('+');
}
