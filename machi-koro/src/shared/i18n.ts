/**
 * Translations. Game state carries message *keys* rather than sentences, so the
 * log reads in each player's own language even though the server writes it once.
 */
import { CARD_BY_ID, LANDMARK_BY_ID, type CardId, type LandmarkId, type RuleSet } from './cards';

export type Lang = 'en' | 'ru';
export const LANGS: Lang[] = ['en', 'ru'];
export const LANG_NAMES: Record<Lang, string> = { en: 'English', ru: 'Русский' };

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

export function cardName(lang: Lang, id: CardId): string {
  return lang === 'ru' ? CARDS_RU[id]?.name ?? CARD_BY_ID[id].name : CARD_BY_ID[id].name;
}

export function cardText(lang: Lang, id: CardId): string {
  return lang === 'ru' ? CARDS_RU[id]?.text ?? CARD_BY_ID[id].text : CARD_BY_ID[id].text;
}

export function landmarkName(lang: Lang, id: LandmarkId): string {
  return lang === 'ru' ? LANDMARKS_RU[id]?.name ?? LANDMARK_BY_ID[id].name : LANDMARK_BY_ID[id].name;
}

export function landmarkText(lang: Lang, id: LandmarkId): string {
  return lang === 'ru' ? LANDMARKS_RU[id]?.text ?? LANDMARK_BY_ID[id].text : LANDMARK_BY_ID[id].text;
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

const TABLES: Record<Lang, Record<string, string>> = { en: EN, ru: RU };

/** Used by the tests to prove no message falls back to English by accident. */
export function hasTranslation(lang: Lang, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(TABLES[lang] ?? {}, key);
}

/** Russian needs three forms; English two. */
function coinsWord(lang: Lang, n: number): string {
  if (lang === 'en') return n === 1 ? 'coin' : 'coins';
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
