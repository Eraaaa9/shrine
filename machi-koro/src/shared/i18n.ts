/**
 * Translations. Game state carries message *keys* rather than sentences, so the
 * log reads in each player's own language even though the server writes it once.
 */
import { CARD_BY_ID, LANDMARK_BY_ID, type CardId, type LandmarkId, type RuleSet } from './cards';
import { CITY_EVENT_BY_ID, type CityEventId } from './events';
import { MAYOR_BY_ID, mayorTuning, type MayorId } from './mayors';

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
  space_port: {
    name: 'Космодром',
    text: 'Один раз за ход, после броска, вы можете прибавить 1 к сумме или вычесть 1 из неё.',
  },
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
  space_port: {
    name: 'Ғарыш айлағы',
    text: 'Жүрісіне бір рет, кубик тастағаннан кейін, жиынтыққа 1 қоса аласыз немесе одан 1 шегере аласыз.',
  },
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

/** Name of whatever a post-game row is about — a building, a mayor or an event. */
export function statName(lang: Lang, key: string): string {
  if (key in LANDMARK_BY_ID) return landmarkName(lang, key as LandmarkId);
  if (key in MAYOR_BY_ID) return mayorName(lang, key as MayorId);
  if (key in CITY_EVENT_BY_ID) return eventName(lang, key as CityEventId);
  return cardName(lang, key as CardId);
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
    space_port: 'Space Port',
  },
  ru: {
    city_hall: 'Мэрия',
    harbor: 'Гавань',
    train_station: 'Вокзал',
    shopping_mall: 'ТЦ',
    amusement_park: 'Аттракционы',
    radio_tower: 'Телебашня',
    airport: 'Аэропорт',
    space_port: 'Космодром',
  },
  kk: {
    city_hall: 'Әкімдік',
    harbor: 'Айлақ',
    train_station: 'Вокзал',
    shopping_mall: 'СО',
    amusement_park: 'Саябақ',
    radio_tower: 'Телемұнара',
    airport: 'Әуежай',
    space_port: 'Ғарыш',
  },
};

export function landmarkShort(lang: Lang, id: LandmarkId): string {
  return LANDMARK_SHORT[lang]?.[id] ?? landmarkName(lang, id).split(' ')[0];
}

// ---------------------------------------------------------------------------
// city events & mayors translations
// ---------------------------------------------------------------------------

const EVENTS_EN: Record<CityEventId, { name: string; text: string }> = {
  economic_boom: { name: 'Economic Boom', text: 'All Blue primary industry establishments earn +1 coin upon activation.' },
  food_festival: { name: 'Food Festival', text: 'All Red restaurants take +1 coin from the player who rolled.' },
  urban_grant: { name: 'Urban Grant', text: 'All Landmarks cost 2 coins less to build (minimum 1).' },
  big_catch: { name: 'Lucky Catch', text: 'All Boat establishments activate on their numbers even if you have not built the Harbor.' },
  harbor_storm: { name: 'Harbor Storm', text: 'Harbor +2 bonus and Boat establishments are disabled during this round.' },
  factory_strike: { name: 'Factory Strike', text: 'Green factories earn 1 coin less per source establishment (minimum 1).' },
  health_inspection: { name: 'Health Inspection', text: 'Each player’s most expensive Red restaurant is temporarily closed during this round.' },
  tax_hike: { name: 'Tax Hike', text: 'At the end of your turn, pay 1 coin to the bank if you hold 10 or more coins.' },
  anti_monopoly: { name: 'Anti-Monopoly Act', text: 'Leader in landmarks cannot buy Major cards. Player with fewest landmarks gets 2 coins subsidy.' },
  social_aid: { name: 'Social Aid', text: 'If you start your turn with 0 coins, receive 2 coins from the bank instead of 1.' },
  lucky_seven: { name: 'Lucky Seven', text: 'Rolling a total of 7 immediately awards the roller 3 bonus coins from the bank.' },
  subsidized_market: { name: 'Market Discount', text: 'All establishments in the supply cost 1 coin less (minimum 1) during this round.' },
};

const EVENTS_RU: Record<CityEventId, { name: string; text: string }> = {
  economic_boom: { name: 'Экономический бум', text: 'Все синие предприятия приносят +1 дополнительную монету при срабатывании.' },
  food_festival: { name: 'Гастрономический фестиваль', text: 'Все красные заведения берут +1 дополнительную монету с бросившего кубики.' },
  urban_grant: { name: 'Городские субсидии', text: 'Строительство любой достопримечательности стоит на 2 монеты дешевле (минимум 1).' },
  big_catch: { name: 'Удачный улов', text: 'Все лодки и траулеры срабатывают даже если у вас не построена Гавань.' },
  harbor_storm: { name: 'Шторм в гавани', text: 'Свойство Гавани (+2) и лодки не действуют в этот раунд.' },
  factory_strike: { name: 'Забастовка фабрик', text: 'Зеленые фабрики приносят на 1 монету меньше за каждое исходное здание (минимум 1).' },
  health_inspection: { name: 'Санитарная инспекция', text: 'Самое дорогое красное заведение каждого игрока закрыто на проверку в этот раунд.' },
  tax_hike: { name: 'Инфляция и налоги', text: 'В конце своего хода заплатите 1 монету в банк, если у вас 10 или больше монет.' },
  anti_monopoly: { name: 'Антимонопольный указ', text: 'Лидер по достопримечательностям не может покупать фиолетовые карты; отстающий получает 2 монеты.' },
  social_aid: { name: 'Социальный пакет', text: 'Если в начале своего хода у вас 0 монет, банк выдает вам 2 монеты вместо 1.' },
  lucky_seven: { name: 'Счастливая семёрка', text: 'Если сумма кубиков равна 7, бросивший игрок получает 3 монеты из банка бонусом.' },
  subsidized_market: { name: 'Сезон скидок', text: 'Все предприятия на рынке стоят на 1 монету дешевле (минимум 1) в этот раунд.' },
};

const EVENTS_KK: Record<CityEventId, { name: string; text: string }> = {
  economic_boom: { name: 'Экономикалық өсім', text: 'Барлық көк кәсіпорындар іске қосылғанда +1 қосымша монета әкеледі.' },
  food_festival: { name: 'Асхана фестивалі', text: 'Барлық қызыл мейрамханалар кубик тастаған ойыншыдан +1 қосымша монета алады.' },
  urban_grant: { name: 'Қалалық субсидия', text: 'Кез келген көрнекті нысанды салу 2 монетаға арзан (кемінде 1).' },
  big_catch: { name: 'Сәтті аулау', text: 'Барлық қайықтар мен траулерлер Айлақ салынбаса да іске қосылады.' },
  harbor_storm: { name: 'Айлақтағы дауыл', text: 'Айлақтың +2 қасиеті мен қайықтар бұл раундта жұмыс істемейді.' },
  factory_strike: { name: 'Зауыттар ереуілі', text: 'Жасыл зауыттар әр шикізат кәсіпорны үшін 1 монетаға аз әкеледі (кемінде 1).' },
  health_inspection: { name: 'Санитарлық тексеру', text: 'Әр ойыншының ең қымбат қызыл мейрамханасы бұл раундта жұмыс істемейді.' },
  tax_hike: { name: 'Салықтың өсуі', text: 'Жүрісіңіздің соңында 10 немесе одан көп монетаңыз болса, банкке 1 монета төлеңіз.' },
  anti_monopoly: { name: 'Монополияға қарсы заң', text: 'Көрнекті нысандар бойынша көшбасшы күлгін карталарды ала алмайды; соңғы ойыншы 2 монета алады.' },
  social_aid: { name: 'Әлеуметтік көмек', text: 'Жүрісіңіздің басында 0 монетаңыз болса, банк 1 монетаның орнына 2 монета береді.' },
  lucky_seven: { name: 'Сәтті жетілік', text: 'Кубиктер жиынтығы 7 болса, тастаған ойыншы банкке 3 монета бонус алады.' },
  subsidized_market: { name: 'Жеңілдіктер маусымы', text: 'Қордағы барлық кәсіпорындар бұл раундта 1 монетаға арзан (кемінде 1).' },
};

const MAYORS_EN: Record<MayorId, { name: string; text: string }> = {
  agronomist: { name: 'Agronomist', text: 'Start of turn: if you own {blue} or more Blue cards, gain 1 coin from the bank.' },
  restaurateur: { name: 'Restaurateur', text: 'Red cards cost 1 coin less (min 0). Opponents always leave you {shield} {shieldWord}.' },
  industrialist: { name: 'Industrialist', text: 'Your green factories pay 1 coin more for each source establishment they count.' },
  banker: { name: 'Banker', text: 'End of turn: if you hold {floor} or more coins, gain {dividend} dividend {dividendWord} from the bank.' },
  urbanist: { name: 'Urbanist', text: 'When you build a Landmark, receive {cashback} {cashbackWord} cashback and a free re-roll on your next turn.' },
  adventurer: { name: 'Navigator', text: 'If you own Harbor, you can use the +2 dice modifier on rolls of {roll}+ (instead of 10+).' },
};

const MAYORS_RU: Record<MayorId, { name: string; text: string }> = {
  agronomist: { name: 'Мэр-Аграрий', text: 'В начале хода: если у вас {blue} или более синих карт, получите 1 монету из банка.' },
  restaurateur: { name: 'Мэр-Ресторатор', text: 'Скидка 1 монета на красные карты. Неприкосновенный запас: {shield} {shieldWord}.' },
  industrialist: { name: 'Мэр-Индустриалист', text: 'Ваши зеленые фабрики приносят на 1 монету больше за каждое исходное здание.' },
  banker: { name: 'Мэр-Банкир', text: 'В конце хода: если у вас {floor} или более монет, банк выплачивает дивиденды: {dividend} {dividendWord}.' },
  urbanist: { name: 'Мэр-Урбанист', text: 'При постройке достопримечательности: кэшбэк {cashback} {cashbackWord} и право на переброс кубиков.' },
  adventurer: { name: 'Мэр-Мореплаватель', text: 'С Гаванью бонус +2 к броску доступен уже при сумме от {roll} (вместо 10).' },
};

const MAYORS_KK: Record<MayorId, { name: string; text: string }> = {
  agronomist: { name: 'Агроном Әкім', text: 'Жүрістің басында: {blue} немесе одан көп көк картаңыз болса, банктен 1 монета алыңыз.' },
  restaurateur: { name: 'Мейрамханашы Әкім', text: 'Қызыл карталар 1 монетаға арзан. Қолсұғылмайтын қор: {shield} {shieldWord}.' },
  industrialist: { name: 'Өнеркәсіпші Әкім', text: 'Жасыл зауыттарыңыз санайтын әр шикізат кәсіпорны үшін 1 монета көп төлейді.' },
  banker: { name: 'Банкир Әкім', text: 'Жүрістің соңында: {floor} немесе одан көп монетаңыз болса, банк {dividend} {dividendWord} дивиденд береді.' },
  urbanist: { name: 'Урбанист Әкім', text: 'Көрнекті нысан салғанда {cashback} {cashbackWord} кэшбэк және қайта тастау құқығы беріледі.' },
  adventurer: { name: 'Теңізші Әкім', text: 'Айлақпен кубиктерде {roll} немесе одан көп түскенде +2 қоса аласыз (10-ның орнына).' },
};

const EVENT_TABLES: Record<Lang, Record<CityEventId, { name: string; text: string }>> = {
  en: EVENTS_EN,
  ru: EVENTS_RU,
  kk: EVENTS_KK,
};

const MAYOR_TABLES: Record<Lang, Record<MayorId, { name: string; text: string }>> = {
  en: MAYORS_EN,
  ru: MAYORS_RU,
  kk: MAYORS_KK,
};

export function eventName(lang: Lang, id: CityEventId): string {
  return EVENT_TABLES[lang]?.[id]?.name ?? id;
}

export function eventText(lang: Lang, id: CityEventId): string {
  return EVENT_TABLES[lang]?.[id]?.text ?? '';
}

export function eventIcon(id: CityEventId): string {
  return CITY_EVENT_BY_ID[id]?.icon ?? '🏙️';
}

export function mayorName(lang: Lang, id: MayorId): string {
  return MAYOR_TABLES[lang]?.[id]?.name ?? id;
}

/**
 * The mayors' numbers move with the table size, so the card has to be told how
 * many are playing before it can say what the ability is worth.
 */
export function mayorText(lang: Lang, id: MayorId, players: number): string {
  const d = mayorTuning(players);
  return fill(lang, MAYOR_TABLES[lang]?.[id]?.text ?? '', {
    blue: d.agronomistBlue,
    shield: d.restaurateurShield,
    floor: d.bankerFloor,
    dividend: d.bankerDividend,
    cashback: d.urbanistCashback,
    roll: d.adventurerHarbor,
  });
}

export function mayorIcon(id: MayorId): string {
  return MAYOR_BY_ID[id]?.icon ?? '👤';
}

export function describeRulesIn(lang: Lang, rules: RuleSet): string {
  const parts = [t(lang, 'rules.base')];
  if (rules.harbor) parts.push(t(lang, 'rules.harbor'));
  if (rules.millionaires) parts.push(t(lang, 'rules.millionaires'));
  if (rules.events) parts.push(t(lang, 'rules.events'));
  if (rules.mayors) parts.push(t(lang, 'rules.mayors'));
  return parts.join(' + ');
}

// ---------------------------------------------------------------------------
// messages
// ---------------------------------------------------------------------------

const EN: Record<string, string> = {
  'rules.base': 'base game',
  'rules.harbor': 'Harbor',
  'rules.millionaires': "Millionaire's Row",
  'rules.events': 'Events',
  'rules.mayors': 'Mayors',

  // log
  'log.gameOn': 'Game on — {rules}.',
  'log.turnOrder': 'Turn order: {order}.',
  'log.variableSupply': 'Variable supply: the market opens with one stack and gains one each turn, up to {n}.',
  'log.eventStart': 'City Event: {event} — {text}',
  'log.mayorAssigned': '{player} was appointed {mayor}.',
  'log.mayorAgronomist': '{player} gets {amount} from the bank — Agronomist Mayor',
  'log.mayorBanker': '{player} receives {amount} dividend — Banker Mayor',
  'log.mayorUrbanist': '{player} receives {amount} cashback and free reroll — Urbanist Mayor',
  'log.eventLuckySeven': 'Lucky Seven: {player} gets {amount} bonus from the bank!',
  'log.eventSocialAid': 'Social Aid: {player} receives emergency funds from the bank.',
  'log.eventTaxHike': 'Tax Hike: {player} pays {amount} to the bank.',
  'log.eventAntiMonopolyAid': 'Anti-Monopoly Act: {player} receives {amount} subsidy.',
  'log.turn': '— Turn {n}: {player} ({coins} {coinsWord}) —',
  'log.roll': '{player} rolls {dice} = {total}',
  'log.tunaRoll': 'Tuna Boat roll: {total}.',
  'log.redTake': '{player} takes {amount} from {from} — {card}{times}',
  'log.redTakeBroke': '{player} takes {amount} from {from} — {card}{times} ({from} is broke)',
  'log.redTakeProtected': '{player} takes {amount} from {from} — {card}{times} ({from} protected 2 coins with Restaurateur Mayor)',
  'log.gets': '{player} gets {amount} — {card}{times}',
  'log.pays': '{player} pays {amount} to the bank — {card}{times}',
  'log.getsVia': '{player} gets {amount} — {card}{times} (via the Exhibit Hall)',
  'log.paysVia': '{player} pays {amount} — {card}{times} (via the Exhibit Hall)',
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
  'log.spacePortUsed': '{player} uses the Space Port: total becomes {total}.',
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
  'err.spacePortNotNow': 'The Space Port cannot be used right now.',
  'err.spacePortRange': 'The Space Port moves the total by 1, and never below 1.',
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
  'ui.supplyBlurb': 'The market opens with one card and grows by one each turn, up to 10, refilled from a deck',
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
  'ui.stackAndDeck': '{stacks} stack · {deck} in deck',
  'ui.stacksAndDeck': '{stacks} stacks · {deck} in deck',
  'ui.cardsLeft': '{n} left',
  'ui.soldOut': 'sold out',
  'ui.newStack': 'new',
  'ui.youOwn': 'you: {n}',
  'ui.noEstablishments': 'no establishments',
  'ui.takingTurn': 'taking their turn',
  'ui.cardAria': '{name}, activates on {activates}, costs {cost}',
  'ui.paidToBuild': 'you are paid to build this',
  'ui.investedTitle': '{n} invested in the Tech Startup',
  'ui.closedForRenovation': '({n} closed for renovation)',

  // spoken to screen readers; the dice and the log are otherwise just glyphs
  'ui.logLabel': 'Game log',
  'ui.diceRolling': 'Rolling the dice…',
  'ui.diceRolled': 'Rolled {dice} — total {total}',

  'ui.phase.roll': '{player} is rolling',
  'ui.phase.reroll': '{player} may re-roll (Radio Tower)',
  'ui.phase.spaceport': '{player} may use the Space Port',
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
  'ui.spacePortPrompt': 'Space Port — move the total by 1?',
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
  'ui.moveWindow': 'Drag the bar to move this window — double-click it to re-centre',

  // post-game stats
  'ui.statsButton': 'Stats',
  'ui.statsTitle': 'How the city was built',
  'ui.statsClose': 'Close',
  'ui.statsTurnsPlayed': '{n} turns played.',
  'ui.statsBlurb':
    'Per building: how often it activated, what it cost to build, what it brought in, and what it took back out of your pocket — an opponent’s copy billing you counts here too.',
  'ui.statsLandmarks': '· {n} landmarks',
  'ui.colPlayer': 'Player',
  'ui.colTurns': 'Turns',
  'ui.colEarned': 'Earned',
  'ui.colPaid': 'Paid',
  'ui.colSpent': 'Built',
  'ui.colCost': 'Cost',
  'ui.colCoins': 'Left',
  'ui.colAvgRoll': 'Avg roll',
  'ui.colBuilding': 'Building',
  'ui.colHits': 'Hits',
  'ui.colNet': 'Net',
  'ui.statsNoBuildings': 'Not a single coin ever moved.',
  'ui.statsBest': 'Best earner: {name} — {amount} clear.',
  'ui.statsWorst': 'Biggest drain: {name} — {amount} down.',
  'ui.statsEarnedSplit': 'Earned {bank} from the bank and {players} from opponents.',
  'ui.statsPaidSplit': 'Paid {bank} to the bank and {players} to opponents.',
  'ui.statsSpentSplit': 'Spent {total} on building: {cardCoins} on {cards} establishments and {landmarkCoins} on landmarks.',
  'ui.statsInvested': 'Sank {n} into the Tech Startup.',
  'ui.statsPeak': 'Richest moment: {n} coins.',
  // board filters
  'ui.viewModeLabel': 'View',
  'ui.viewClassic': 'Classic',
  'ui.viewVisual': 'Cards 3D',
  'ui.flipToRead': 'Flip to read',
  'ui.flipBack': 'Flip back',
  'ui.buyCard': 'Buy',
  'ui.doubles': 'Doubles!',
  'ui.extraTurnBadge': 'Extra turn!',
  'ui.filterLabel': 'Show',
  'ui.filterAll': 'All',
  'ui.filterAffordable': 'Affordable',
  'ui.sortLabel': 'Sort',
  'ui.sortByNumber': 'By number',
  'ui.sortByCost': 'By cost',
  'ui.sortByColour': 'By colour',
  'ui.boardShowing': '{shown} of {total}',
  'ui.othersOwn': 'others: {n}',
  'ui.noCardsMatch': 'Nothing you can afford right now.',

  // income by roll
  'ui.city': 'City',
  'ui.incomeTitle': 'Income by roll',
  'ui.incomeBlurb':
    'What your city collects on each total — on your own roll, and on an opponent’s. Blue cards pay on anybody’s turn; green ones only on yours.',
  'ui.incomeYours': 'your roll',
  'ui.incomeTheirs': 'their roll',
  'ui.incomeOdds': 'Odds for',
  'ui.incomeOneDie': 'one die',
  'ui.incomeTwoDice': 'two dice',
  'ui.incomeUnreachable': 'out of reach on one die',
  'ui.incomeNothing': 'Your city collects nothing yet.',
  'ui.incomeExpected': 'Average per roll: {mine} on your turn, {theirs} on each opponent’s.',
  'ui.incomeRowAria': 'Total {total}: {mine} on your roll, {theirs} on an opponent’s roll, {chance}% likely.',

  // player panels
  'ui.landmarkProgress': '{built} of {total} landmarks built',
  'ui.awayCountdown': 'away — auto-play in {n}s',
  'ui.awayNow': 'away — playing automatically',

  // theme + sound
  'ui.themeLabel': 'Theme',
  'ui.themeAuto': 'Auto',
  'ui.themeLight': 'Light',
  'ui.themeDark': 'Dark',
  'ui.soundLabel': 'Sound',
  'ui.soundOn': 'Sound on',
  'ui.soundOff': 'Sound off',

  // confirmations + shortcuts
  'ui.confirmTitle': 'Are you sure?',
  'ui.confirmDemolish': 'Demolish the {landmark}? Building it again costs {cost}.',
  'ui.confirmMoving': 'Hand {card} to {target}? You cannot ask for it back.',
  'ui.confirmYes': 'Go ahead',
  'ui.confirmNo': 'Cancel',
  'ui.shortcuts': 'Keys: R roll · T two dice · E end turn · S stats',

  // bots
  'ui.botLevel': 'Bot skill',
  'ui.botCasual': 'Casual',
  'ui.botCasualBlurb': 'The hand-written strategy. Beatable while you are learning.',
  'ui.botTrained': 'Trained',
  'ui.botTrainedBlurb': 'Tuned by self-play. It will punish a slow start.',
  'ui.statsTitleLive': 'How the city is going',

  // expansions & rules
  'ui.eventsName': 'City Events',
  'ui.eventsBlurb': 'New global event each round changing city rules.',
  'ui.mayorsName': 'Mayors & Factions',
  'ui.mayorsBlurb': 'Asymmetrical abilities for each player.',

  // post-game stats tabs & charts
  'ui.statsTabTable': 'Building Ledger',
  'ui.statsTabCharts': 'Charts & Analytics',
  'ui.statsTabAwards': 'MVP & Highlights',
  'ui.chartCapitalTitle': 'Wealth Over Time (Coins)',
  'ui.chartDiceTitle': 'Dice Distribution vs Expected (2d6)',
  'ui.chartRoll': 'Roll',
  'ui.chartCount': 'Actual',
  'ui.chartExpected': 'Expected',

  // awards
  'ui.awardMvp': '🌟 MVP Establishment',
  'ui.awardMvpDesc': 'Earned {amount} net coins',
  'ui.awardThief': '🦹 Master Extortionist',
  'ui.awardThiefDesc': 'Extorted {amount} coins from opponents',
  'ui.awardPatron': '💸 Generous Patron',
  'ui.awardPatronDesc': 'Paid {amount} coins to opponents',
  'ui.awardLucky': '🎲 Fortune’s Favorite',
  'ui.awardLuckyDesc': 'Rolled {amount} doubles and high values',
  'ui.awardArchitect': '🏛️ Master Builder',
  'ui.awardArchitectDesc': 'Constructed {amount} landmarks with speed',

  // reactions
  'ui.reactionsTitle': 'Quick Reactions',
  'ui.reactLuck': 'Good luck! 🎲',
  'ui.reactOhNo': 'Oh no! 😱',
  'ui.reactThanks': 'Thanks for the coins! 😈',
  'ui.reactRobbed': 'I got robbed! 💸',
  'ui.reactWinning': 'Almost won! 👑',
  'ui.reactGg': 'Well played! 🤝',
  'ui.reactYourTurn': 'Your turn! ⏱️',
  'ui.reactFire': 'On fire! 🔥',
  'ui.roundEvent': 'Round {round} Event: {event}',
  'ui.mayorPower': 'Mayor Ability',
  'ui.chooseMayorTitle': 'Choose Your Mayor',
  'ui.chooseMayorBlurb': 'Each player gains a unique passive ability for the whole game.',
  'ui.totalGain': 'Total earnings',
  'ui.victoryTitle': 'Victory!',
  'ui.victoryWinnerDesc': '{player} constructed all landmarks and won the game!',
  'ui.toLobby': 'Return to Lobby',
  'ui.inspectBoard': 'Inspect City',
  'ui.showVictory': '🏆 Victory Summary',
  'ui.nextMayorTitle': 'Choose Mayor for next game:',
  'ui.winnerMayor': 'Winning Mayor',
};

const RU: Record<string, string> = {
  'rules.base': 'базовая игра',
  'rules.harbor': 'Гавань',
  'rules.millionaires': 'Улица миллионеров',
  'rules.events': 'События',
  'rules.mayors': 'Мэры',

  // log
  'log.gameOn': 'Игра началась — {rules}.',
  'log.turnOrder': 'Порядок хода: {order}.',
  'log.variableSupply': 'Переменный запас: рынок открывается одной стопкой и прибавляет по одной за ход, до {n}.',
  'log.eventStart': 'Городское событие: {event} — {text}',
  'log.mayorAssigned': '{player} назначен на роль {mayor}.',
  'log.mayorAgronomist': '{player} получает {amount} из банка — Мэр-Аграрий',
  'log.mayorBanker': '{player} получает {amount} дивидендов — Мэр-Банкир',
  'log.mayorUrbanist': '{player} получает {amount} кэшбэка и право на переброс — Мэр-Урбанист',
  'log.eventLuckySeven': 'Счастливая семёрка: {player} получает {amount} бонуса из банка!',
  'log.eventSocialAid': 'Социальный пакет: {player} получает поддержку из банка.',
  'log.eventTaxHike': 'Инфляция: {player} платит {amount} в банк.',
  'log.eventAntiMonopolyAid': 'Антимонопольный указ: {player} получает субсидию {amount}.',
  'log.turn': '— Ход {n}: {player} ({coins} {coinsWord}) —',
  'log.roll': '{player} бросает {dice} = {total}',
  'log.tunaRoll': 'Бросок Траулера: {total}.',
  'log.redTake': '{player} забирает {amount} у {from} — {card}{times}',
  'log.redTakeBroke': '{player} забирает {amount} у {from} — {card}{times} (у {from} больше нет монет)',
  'log.redTakeProtected': '{player} забирает {amount} у {from} — {card}{times} ({from} защитил 2 монеты благодаря Мэру-Ресторатору)',
  'log.gets': '{player} получает {amount} — {card}{times}',
  'log.pays': '{player} платит {amount} в банк — {card}{times}',
  'log.getsVia': '{player} получает {amount} — {card}{times} (через Выставочный зал)',
  'log.paysVia': '{player} платит {amount} — {card}{times} (через Выставочный зал)',
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
  'log.spacePortUsed': '{player} использует Космодром: сумма становится {total}.',
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
  'err.spacePortNotNow': 'Сейчас Космодром использовать нельзя.',
  'err.spacePortRange': 'Космодром меняет сумму на 1 и не опускает её ниже 1.',
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
  'ui.supplyBlurb': 'Рынок открывается одной картой и растёт на одну за ход, до 10, стопки пополняются из колоды',
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
  'ui.stackAndDeck': 'стопка: {stacks} · в колоде: {deck}',
  'ui.stacksAndDeck': 'стопок: {stacks} · в колоде: {deck}',
  'ui.cardsLeft': 'осталось {n}',
  'ui.soldOut': 'разобрали',
  'ui.newStack': 'новая',
  'ui.youOwn': 'у вас: {n}',
  'ui.noEstablishments': 'предприятий нет',
  'ui.takingTurn': 'сейчас ходит',
  'ui.cardAria': '{name}, срабатывает на {activates}, стоит {cost}',
  'ui.paidToBuild': 'за постройку платят вам',
  'ui.investedTitle': 'вложено в Технологический стартап: {n}',
  'ui.closedForRenovation': '(закрыто на ремонт: {n})',

  // spoken to screen readers; the dice and the log are otherwise just glyphs
  'ui.logLabel': 'Журнал игры',
  'ui.diceRolling': 'Кубики брошены…',
  'ui.diceRolled': 'Выпало {dice} — сумма {total}',

  'ui.phase.roll': '{player} бросает кубики',
  'ui.phase.reroll': '{player} может перебросить (Телебашня)',
  'ui.phase.spaceport': '{player} может использовать Космодром',
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
  'ui.spacePortPrompt': 'Космодром — изменить сумму на 1?',
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
  'ui.moveWindow': 'Перетащите заголовок, чтобы сдвинуть окно; двойной клик вернёт его в центр',

  // post-game stats
  'ui.statsButton': 'Итоги',
  'ui.statsTitle': 'Как строился город',
  'ui.statsClose': 'Закрыть',
  'ui.statsTurnsPlayed': 'Сыграно ходов: {n}.',
  'ui.statsBlurb':
    'По каждому зданию: сколько раз сработало, во сколько обошлось, сколько принесло и сколько забрало из кармана — включая чужие копии, которым вы платили.',
  'ui.statsLandmarks': '· достопримечательностей: {n}',
  'ui.colPlayer': 'Игрок',
  'ui.colTurns': 'Ходы',
  'ui.colEarned': 'Получено',
  'ui.colPaid': 'Отдано',
  'ui.colSpent': 'Постройки',
  'ui.colCost': 'Цена',
  'ui.colCoins': 'Осталось',
  'ui.colAvgRoll': 'Ср. бросок',
  'ui.colBuilding': 'Здание',
  'ui.colHits': 'Срабат.',
  'ui.colNet': 'Итого',
  'ui.statsNoBuildings': 'Ни одна монета так и не сдвинулась.',
  'ui.statsBest': 'Лучшее здание: {name} — плюс {amount}.',
  'ui.statsWorst': 'Больше всех съело: {name} — минус {amount}.',
  'ui.statsEarnedSplit': 'Получено {bank} из банка и {players} от соперников.',
  'ui.statsPaidSplit': 'Отдано {bank} в банк и {players} соперникам.',
  'ui.statsSpentSplit': 'На стройку ушло {total}: {cardCoins} на предприятия ({cards} шт.) и {landmarkCoins} на достопримечательности.',
  'ui.statsInvested': 'В Технологический стартап вложено: {n}.',
  'ui.statsPeak': 'Максимум монет на руках: {n}.',
  'ui.viewModeLabel': 'Вид',
  'ui.viewClassic': 'Классический',
  'ui.viewVisual': 'Карточки 3D',
  'ui.flipToRead': 'Перевернуть',
  'ui.flipBack': 'Назад',
  'ui.buyCard': 'Купить',
  'ui.doubles': 'Дубль!',
  'ui.extraTurnBadge': 'Ещё ход!',
  'ui.filterLabel': 'Показать',
  'ui.filterAll': 'Все',
  'ui.filterAffordable': 'По карману',
  'ui.sortLabel': 'Сортировка',
  'ui.sortByNumber': 'По числу',
  'ui.sortByCost': 'По цене',
  'ui.sortByColour': 'По цвету',
  'ui.boardShowing': '{shown} из {total}',
  'ui.othersOwn': 'у других: {n}',
  'ui.noCardsMatch': 'Сейчас вам ничего не по карману.',

  'ui.city': 'Город',
  'ui.incomeTitle': 'Доход по броскам',
  'ui.incomeBlurb':
    'Сколько ваш город получает на каждой сумме — в свой ход и в чужой. Синие карты платят в любой ход, зелёные — только в ваш.',
  'ui.incomeYours': 'ваш бросок',
  'ui.incomeTheirs': 'чужой бросок',
  'ui.incomeOdds': 'Шансы для',
  'ui.incomeOneDie': 'одного кубика',
  'ui.incomeTwoDice': 'двух кубиков',
  'ui.incomeUnreachable': 'недостижимо на одном кубике',
  'ui.incomeNothing': 'Ваш город пока ничего не приносит.',
  'ui.incomeExpected': 'В среднем за бросок: {mine} в свой ход и {theirs} в ход каждого соперника.',
  'ui.incomeRowAria': 'Сумма {total}: {mine} в свой бросок, {theirs} в чужой, вероятность {chance}%.',

  'ui.landmarkProgress': 'Построено достопримечательностей: {built} из {total}',
  'ui.awayCountdown': 'нет на месте — автоход через {n} с',
  'ui.awayNow': 'нет на месте — ход играется автоматически',

  'ui.themeLabel': 'Тема',
  'ui.themeAuto': 'Авто',
  'ui.themeLight': 'Светлая',
  'ui.themeDark': 'Тёмная',
  'ui.soundLabel': 'Звук',
  'ui.soundOn': 'Звук включён',
  'ui.soundOff': 'Звук выключен',

  'ui.confirmTitle': 'Вы уверены?',
  'ui.confirmDemolish': 'Снести {landmark}? Отстроить заново будет стоить {cost}.',
  'ui.confirmMoving': 'Отдать {card} игроку {target}? Обратно попросить не выйдет.',
  'ui.confirmYes': 'Да, давайте',
  'ui.confirmNo': 'Отмена',
  'ui.shortcuts': 'Клавиши: R бросок · T два кубика · E конец хода · S статистика',

  'ui.botLevel': 'Уровень ботов',
  'ui.botCasual': 'Спокойный',
  'ui.botCasualBlurb': 'Стратегия, написанная вручную. Пока учитесь — обыгрывается.',
  'ui.botTrained': 'Обученный',
  'ui.botTrainedBlurb': 'Настроен самообучением. Медленный старт не простит.',
  'ui.statsTitleLive': 'Как идёт стройка',

  // expansions & rules
  'ui.eventsName': 'События города',
  'ui.eventsBlurb': 'Новое глобальное событие каждый круг.',
  'ui.mayorsName': 'Мэры и Фракции',
  'ui.mayorsBlurb': 'Уникальные пассивные способности каждого игрока.',

  // post-game stats tabs & charts
  'ui.statsTabTable': 'Ведомость зданий',
  'ui.statsTabCharts': 'Графики и Аналитика',
  'ui.statsTabAwards': 'Награды и MVP',
  'ui.chartCapitalTitle': 'Динамика капитала (Монеты)',
  'ui.chartDiceTitle': 'Распределение бросков vs Теория',
  'ui.chartRoll': 'Сумма',
  'ui.chartCount': 'Выпало',
  'ui.chartExpected': 'Теория',

  // awards
  'ui.awardMvp': '🌟 MVP Предприятие',
  'ui.awardMvpDesc': 'Принесло чистыми {amount} монет',
  'ui.awardThief': '🦹 Главный рэкетир',
  'ui.awardThiefDesc': 'Собрал {amount} монет с соперников',
  'ui.awardPatron': '💸 Щедрый меценат',
  'ui.awardPatronDesc': 'Выплатил соперникам {amount} монет',
  'ui.awardLucky': '🎲 Любимчик фортуны',
  'ui.awardLuckyDesc': 'Выбросил {amount} дублей',
  'ui.awardArchitect': '🏛️ Главный архитектор',
  'ui.awardArchitectDesc': 'Построил {amount} достопримечательностей',

  // reactions
  'ui.reactionsTitle': 'Быстрые реакции',
  'ui.reactLuck': 'Удачи! 🎲',
  'ui.reactOhNo': 'О нет! 😱',
  'ui.reactThanks': 'Спасибо за монетки! 😈',
  'ui.reactRobbed': 'Ограбили! 💸',
  'ui.reactWinning': 'Почти победа! 👑',
  'ui.reactGg': 'Отличная игра! 🤝',
  'ui.reactYourTurn': 'Твой ход! ⏱️',
  'ui.reactFire': 'Огонь! 🔥',
  'ui.roundEvent': 'Событие {round}-го круга: {event}',
  'ui.mayorPower': 'Способность Мэра',
  'ui.chooseMayorTitle': 'Выберите своего мэра',
  'ui.chooseMayorBlurb': 'Уникальная пассивная способность на весь матч.',
  'ui.totalGain': 'Итоговый доход',
  'ui.victoryTitle': 'Победа!',
  'ui.victoryWinnerDesc': '{player} достроил(а) все достопримечательности и побеждает!',
  'ui.toLobby': 'Вернуться в лобби',
  'ui.inspectBoard': 'Посмотреть город',
  'ui.showVictory': '🏆 Итоги победы',
  'ui.nextMayorTitle': 'Выберите Мэра на следующую партию:',
  'ui.winnerMayor': 'Мэр-победитель',
};

const KK: Record<string, string> = {
  'rules.base': 'негізгі ойын',
  'rules.harbor': 'Айлақ',
  'rules.millionaires': 'Миллионерлер көшесі',
  'rules.events': 'Оқиғалар',
  'rules.mayors': 'Әкімдер',

  // log
  'log.gameOn': 'Ойын басталды — {rules}.',
  'log.turnOrder': 'Жүріс кезегі: {order}.',
  'log.variableSupply': 'Ауыспалы қор: базар бір үйіндіден ашылып, әр жүрісте біреуге өседі, {n} үйіндіге дейін.',
  'log.eventStart': 'Қалалық оқиға: {event} — {text}',
  'log.mayorAssigned': '{player} рөліне тағайындалды: {mayor}.',
  'log.mayorAgronomist': '{player} банктен {amount} алады — Агроном Әкім',
  'log.mayorBanker': '{player} {amount} дивиденд алады — Банкир Әкім',
  'log.mayorUrbanist': '{player} {amount} кэшбэк және қайта тастау құқығын алады — Урбанист Әкім',
  'log.eventLuckySeven': 'Сәтті жетілік: {player} банктен {amount} бонус алады!',
  'log.eventSocialAid': 'Әлеуметтік көмек: {player} банктен көмек алады.',
  'log.eventTaxHike': 'Салықтың өсуі: {player} банкке {amount} төлейді.',
  'log.eventAntiMonopolyAid': 'Монополияға қарсы заң: {player} {amount} субсидия алады.',
  'log.turn': '— {n}-жүріс: {player} ({coins} {coinsWord}) —',
  'log.roll': '{player} кубик тастады: {dice} = {total}',
  'log.tunaRoll': 'Тунец қайығының тастауы: {total}.',
  'log.redTake': '{player} {from} ойыншысынан {amount} алады — {card}{times}',
  'log.redTakeBroke': '{player} {from} ойыншысынан {amount} алады — {card}{times} ({from} ойыншысында монета қалмады)',
  'log.redTakeProtected': '{player} {from} ойыншысынан {amount} алады — {card}{times} ({from} Мейрамханашы Әкім арқасында 2 монетаны қорғап қалды)',
  'log.gets': '{player} {amount} алады — {card}{times}',
  'log.pays': '{player} банкке {amount} төлейді — {card}{times}',
  'log.getsVia': '{player} {amount} алады — {card}{times} (Көрме залы арқылы)',
  'log.paysVia': '{player} {amount} төлейді — {card}{times} (Көрме залы арқылы)',
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
  'log.spacePortUsed': '{player} Ғарыш айлағын пайдаланады: жиынтық {total} болды.',
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
  'err.spacePortNotNow': 'Қазір Ғарыш айлағын пайдалануға болмайды.',
  'err.spacePortRange': 'Ғарыш айлағы жиынтықты 1-ге ғана өзгертеді және оны 1-ден төмен түсірмейді.',
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
  'ui.supplyBlurb': 'Базар бір картадан ашылып, әр жүрісте біреуге өседі, 10-ға дейін, үйінділер колодадан толықтырылады',
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
  'ui.stackAndDeck': 'үйінді: {stacks} · колодада: {deck}',
  'ui.stacksAndDeck': 'үйінді: {stacks} · колодада: {deck}',
  'ui.cardsLeft': '{n} қалды',
  'ui.soldOut': 'бітті',
  'ui.newStack': 'жаңа',
  'ui.youOwn': 'сізде: {n}',
  'ui.noEstablishments': 'кәсіпорын жоқ',
  'ui.takingTurn': 'қазір жүріп жатыр',
  'ui.cardAria': '{name}, {activates} санында іске қосылады, бағасы {cost}',
  'ui.paidToBuild': 'салғаныңыз үшін сізге төлейді',
  'ui.investedTitle': 'Технологиялық стартапқа салынғаны: {n}',
  'ui.closedForRenovation': '(жөндеуге жабылғаны: {n})',

  // spoken to screen readers; the dice and the log are otherwise just glyphs
  'ui.logLabel': 'Ойын журналы',
  'ui.diceRolling': 'Кубиктер тасталуда…',
  'ui.diceRolled': '{dice} түсті — жиынтығы {total}',

  'ui.phase.roll': '{player} кубик тастап жатыр',
  'ui.phase.reroll': '{player} қайта тастай алады (Телемұнара)',
  'ui.phase.spaceport': '{player} Ғарыш айлағын пайдалана алады',
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
  'ui.spacePortPrompt': 'Ғарыш айлағы — жиынтықты 1-ге өзгертесіз бе?',
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
  'ui.moveWindow': 'Терезені жылжыту үшін тақырыбын сүйреңіз; қос шертсеңіз ортаға оралады',

  // post-game stats
  'ui.statsButton': 'Қорытынды',
  'ui.statsTitle': 'Қала қалай салынды',
  'ui.statsClose': 'Жабу',
  'ui.statsTurnsPlayed': 'Жасалған жүріс: {n}.',
  'ui.statsBlurb':
    'Әр ғимарат бойынша: неше рет іске қосылды, қаншаға түсті, қанша әкелді және қалтадан қаншасын алды — қарсыластың көшірмесіне төлегеніңіз де осында.',
  'ui.statsLandmarks': '· көрнекті нысан: {n}',
  'ui.colPlayer': 'Ойыншы',
  'ui.colTurns': 'Жүріс',
  'ui.colEarned': 'Алғаны',
  'ui.colPaid': 'Бергені',
  'ui.colSpent': 'Құрылыс',
  'ui.colCost': 'Бағасы',
  'ui.colCoins': 'Қалғаны',
  'ui.colAvgRoll': 'Орт. тас',
  'ui.colBuilding': 'Ғимарат',
  'ui.colHits': 'Қосылу',
  'ui.colNet': 'Жиыны',
  'ui.statsNoBuildings': 'Бірде-бір монета қозғалған жоқ.',
  'ui.statsBest': 'Ең пайдалы ғимарат: {name} — таза {amount}.',
  'ui.statsWorst': 'Ең көп жеген: {name} — минус {amount}.',
  'ui.statsEarnedSplit': 'Банктен {bank}, қарсыластардан {players} алынды.',
  'ui.statsPaidSplit': 'Банкке {bank}, қарсыластарға {players} берілді.',
  'ui.statsSpentSplit': 'Құрылысқа {total} кетті: кәсіпорындарға {cardCoins} ({cards} дана) және көрнекті нысандарға {landmarkCoins}.',
  'ui.statsInvested': 'Технологиялық стартапқа салынғаны: {n}.',
  'ui.statsPeak': 'Қолдағы ең көп монета: {n}.',
  'ui.viewModeLabel': 'Көрініс',
  'ui.viewClassic': 'Классикалық',
  'ui.viewVisual': 'Визуалды 3D',
  'ui.flipToRead': 'Аудару',
  'ui.flipBack': 'Артқа',
  'ui.buyCard': 'Сатып алу',
  'ui.doubles': 'Дубль!',
  'ui.extraTurnBadge': 'Тағы бір жүріс!',
  'ui.filterLabel': 'Көрсету',
  'ui.filterAll': 'Барлығы',
  'ui.filterAffordable': 'Қалтаға шақ',
  'ui.sortLabel': 'Сұрыптау',
  'ui.sortByNumber': 'Сан бойынша',
  'ui.sortByCost': 'Баға бойынша',
  'ui.sortByColour': 'Түс бойынша',
  'ui.boardShowing': '{total} ішінен {shown}',
  'ui.othersOwn': 'басқаларда: {n}',
  'ui.noCardsMatch': 'Қазір қалтаңызға шақ ештеңе жоқ.',

  'ui.city': 'Қала',
  'ui.incomeTitle': 'Түсім — сан бойынша',
  'ui.incomeBlurb':
    'Әр қосындыда қалаңыз қанша жинайды — өз кезегіңізде және қарсыластың кезегінде. Көк карталар кез келген кезекте төлейді, жасылдар тек сіздікінде.',
  'ui.incomeYours': 'өз тастауыңыз',
  'ui.incomeTheirs': 'бөтен тастау',
  'ui.incomeOdds': 'Ықтималдық:',
  'ui.incomeOneDie': 'бір сүйек',
  'ui.incomeTwoDice': 'екі сүйек',
  'ui.incomeUnreachable': 'бір сүйекпен қолжетімсіз',
  'ui.incomeNothing': 'Қалаңыз әзірге ештеңе әкелмейді.',
  'ui.incomeExpected': 'Бір тастауға орташа: өз кезегіңізде {mine}, әр қарсыластың кезегінде {theirs}.',
  'ui.incomeRowAria': 'Қосынды {total}: өз тастауыңызда {mine}, бөтен тастауда {theirs}, ықтималдығы {chance}%.',

  'ui.landmarkProgress': 'Салынған көрнекті нысандар: {total} ішінен {built}',
  'ui.awayCountdown': 'орнында жоқ — {n} с кейін автожүріс',
  'ui.awayNow': 'орнында жоқ — жүріс автоматты ойналуда',

  'ui.themeLabel': 'Тақырып',
  'ui.themeAuto': 'Авто',
  'ui.themeLight': 'Ашық',
  'ui.themeDark': 'Күңгірт',
  'ui.soundLabel': 'Дыбыс',
  'ui.soundOn': 'Дыбыс қосулы',
  'ui.soundOff': 'Дыбыс өшірулі',

  'ui.confirmTitle': 'Сенімдісіз бе?',
  'ui.confirmDemolish': '{landmark} нысанын бұзасыз ба? Қайта салу {cost} тұрады.',
  'ui.confirmMoving': '{card} картасын {target} ойыншысына бересіз бе? Кері қайтара алмайсыз.',
  'ui.confirmYes': 'Иә, болсын',
  'ui.confirmNo': 'Болдырмау',
  'ui.shortcuts': 'Пернелер: R тастау · T екі сүйек · E кезекті аяқтау · S статистика',

  'ui.botLevel': 'Боттар деңгейі',
  'ui.botCasual': 'Жеңіл',
  'ui.botCasualBlurb': 'Қолмен жазылған стратегия. Үйреніп жүргенде ұтуға болады.',
  'ui.botTrained': 'Жаттыққан',
  'ui.botTrainedBlurb': 'Өзімен ойнап бапталған. Баяу бастағанды кешірмейді.',
  'ui.statsTitleLive': 'Қала қалай салынып жатыр',

  // expansions & rules
  'ui.eventsName': 'Қалалық оқиғалар',
  'ui.eventsBlurb': 'Әр раундта қала ережелерін өзгертетін жаңа оқиға.',
  'ui.mayorsName': 'Әкімдер мен Фракциялар',
  'ui.mayorsBlurb': 'Әр ойыншының бірегей пассивті қабілеттері.',

  // post-game stats tabs & charts
  'ui.statsTabTable': 'Ғимараттар есебі',
  'ui.statsTabCharts': 'Графиктер мен Талдау',
  'ui.statsTabAwards': 'Марапаттар мен MVP',
  'ui.chartCapitalTitle': 'Капитал динамикасы (Монеталар)',
  'ui.chartDiceTitle': 'Кубиктердің түсуі vs Теория',
  'ui.chartRoll': 'Қосынды',
  'ui.chartCount': 'Түсті',
  'ui.chartExpected': 'Теория',

  // awards
  'ui.awardMvp': '🌟 MVP Кәсіпорын',
  'ui.awardMvpDesc': 'Таза {amount} монета әкелді',
  'ui.awardThief': '🦹 Бас бопсалаушы',
  'ui.awardThiefDesc': 'Қарсыластардан {amount} монета жинады',
  'ui.awardPatron': '💸 Жомарт меценат',
  'ui.awardPatronDesc': 'Қарсыластарға {amount} монета төледі',
  'ui.awardLucky': '🎲 Сәттілік еркесі',
  'ui.awardLuckyDesc': 'Выбросил {amount} дублей',
  'ui.awardArchitect': '🏛️ Бас сәулетші',
  'ui.awardArchitectDesc': '{amount} көрнекті нысан тұрғызды',

  // reactions
  'ui.reactionsTitle': 'Жылдам реакциялар',
  'ui.reactLuck': 'Сәттілік! 🎲',
  'ui.reactOhNo': 'Қап, әттеген-ай! 😱',
  'ui.reactThanks': 'Монеталар үшін рақмет! 😈',
  'ui.reactRobbed': 'Тонап кетті! 💸',
  'ui.reactWinning': 'Жеңіске аз қалды! 👑',
  'ui.reactGg': 'Керемет ойын! 🤝',
  'ui.reactYourTurn': 'Кезегіңіз! ⏱️',
  'ui.reactFire': 'От! 🔥',
  'ui.roundEvent': '{round}-раунд оқиғасы: {event}',
  'ui.mayorPower': 'Әкімнің қабілеті',
  'ui.chooseMayorTitle': 'Өз әкіміңізді таңдаңыз',
  'ui.chooseMayorBlurb': 'Бүкіл ойынға арналған бірегей пассивті қабілет.',
  'ui.totalGain': 'Жалпы табыс',
  'ui.victoryTitle': 'Жеңіс!',
  'ui.victoryWinnerDesc': '{player} барлық көрнекті нысандарды салып, жеңіске жетті!',
  'ui.toLobby': 'Лоббиге оралу',
  'ui.inspectBoard': 'Қаланы көру',
  'ui.showVictory': '🏆 Жеңіс нәтижесі',
  'ui.nextMayorTitle': 'Келесі ойынға Әкімді таңдаңыз:',
  'ui.winnerMayor': 'Жеңімпаз Әкім',
};

const TABLES: Record<Lang, Record<string, string>> = { en: EN, ru: RU, kk: KK };

/** Used by the tests to prove no message falls back to English by accident. */
export function hasTranslation(lang: Lang, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(TABLES[lang] ?? {}, key);
}

/**
 * The raw table for a language — templates, not rendered text. The tests walk it
 * to compare key coverage and placeholders against English.
 */
export function messages(lang: Lang): Readonly<Record<string, string>> {
  return TABLES[lang] ?? {};
}

/** The `{name}` slots a template expects, e.g. `{player}` and `{amount}`. */
export function placeholders(template: string): Set<string> {
  return new Set(Array.from(template.matchAll(/\{(\w+)\}/g), (m) => m[1]));
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

/**
 * Substitute `{placeholders}`. A name ending in `Word` is the coin word for the
 * number in the parameter it is named after, so `{shieldWord}` declines against
 * `{shield}` — which is what lets one sentence carry two different coin counts.
 */
function fill(lang: Lang, template: string, params?: Params): string {
  if (!params) return template;

  return template.replace(/\{(\w+)\}/g, (_match, name: string) => {
    if (name.endsWith('Word')) return coinsWord(lang, Number(params[name.slice(0, -4)] ?? 0));
    const value = params[name];
    if (value === undefined) return '';
    if (CARD_PARAMS.has(name)) return cardName(lang, value as CardId);
    if (name === 'landmark') return landmarkName(lang, value as LandmarkId);
    if (name === 'event') return eventName(lang, value as CityEventId);
    if (name === 'mayor') return mayorName(lang, value as MayorId);
    if (name === 'text' && params.event) return eventText(lang, params.event as CityEventId);
    if (name === 'rules') {
      return String(value)
        .split('+')
        .map((part) => t(lang, `rules.${part}`))
        .join(' + ');
    }
    return String(value);
  });
}

export function t(lang: Lang, key: string, params?: Params): string {
  return fill(lang, TABLES[lang]?.[key] ?? EN[key] ?? key, params);
}

/** Compact rules code stored in the log, expanded per language at render time. */
export function rulesCode(rules: RuleSet): string {
  return [
    'base',
    rules.harbor ? 'harbor' : '',
    rules.millionaires ? 'millionaires' : '',
    rules.events ? 'events' : '',
    rules.mayors ? 'mayors' : '',
  ]
    .filter(Boolean)
    .join('+');
}
