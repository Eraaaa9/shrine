import { useEffect, useRef, useState } from 'react';
import { cardsFor, type CardId } from '../../shared/cards';
import { canBuy, cardCost } from '../../shared/engine';
import { describeRulesIn } from '../../shared/i18n';
import type { ClientMessage, RoomView, SeatView } from '../../shared/protocol';
import type { GameAction } from '../../shared/types';
import useCoinDeltas from '../coinMotion';
import { LangSwitch, useLang } from '../lang';
import { CardViewSwitch, ChainSwitch, FxSwitch, SoundSwitch, ThemeSwitch, usePrefs } from '../prefs';
import useSupplyMotion from '../supplyMotion';
import { flyingCoins } from '../flyingCoins';
import { gameJuice } from '../gameJuice';
import ActionChainHUD from './ActionChainHUD';
import BoardControls, { sortCards, type BoardFilter, type BoardSort } from './BoardControls';
import CardTile from './CardTile';
import Chat from './Chat';
import ChoiceModal from './ChoiceModal';
import CoinFlightOverlay from './CoinFlightOverlay';
import Controls, { phaseHint } from './Controls';
import EventBanner from './EventBanner';
import IncomePanel from './IncomePanel';
import LogPanel from './LogPanel';
import PlayerPanel from './PlayerPanel';
import ReactionsBar from './ReactionsBar';
import StatsPanel from './StatsPanel';
import VictoryModal from './VictoryModal';

const MODAL_PHASES = ['trade', 'moving', 'renovation', 'exhibit'];

type Tab = 'log' | 'chat' | 'city';

interface Props {
  room: RoomView;
  youId: string | null;
  send: (message: ClientMessage) => void;
}

export default function GameView({ room, youId, send }: Props) {
  const { lang, t } = useLang();
  const { cue, actionChain } = usePrefs();
  const game = room.game!;
  const [tab, setTab] = useState<Tab>('log');
  const [showStats, setShowStats] = useState(false);
  const [showVictory, setShowVictory] = useState(true);
  const [filter, setFilter] = useState<BoardFilter>('all');
  const [sort, setSort] = useState<BoardSort>('number');

  // The table opens itself once the game ends; closing it leaves the button.
  const over = game.phase === 'over';
  useEffect(() => {
    if (over) setShowStats(true);
  }, [over]);

  const you = game.players.find((p) => p.id === youId) ?? null;
  const active = game.players[game.turn];
  const yourTurn = you !== null && active.id === you.id && game.phase !== 'over';
  const act = (action: GameAction) => send({ t: 'action', action });
  const seats = new Map(room.seats.map((s) => [s.id, s]));

  const marks = useSupplyMotion(game.supply, game.rules.variableSupply);
  const deltas = useCoinDeltas(game.players, game.turnCount);

  // ---- Game Juice & Screen Shake -------------------------------------------
  const [shakeClass, setShakeClass] = useState('');
  useEffect(() => {
    return gameJuice.subscribe(() => {
      setShakeClass(gameJuice.shakeClass);
    });
  }, []);

  // ---- Flying Coins Launch from Log ----------------------------------------
  const processedLogId = useRef(game.log.length > 0 ? game.log[game.log.length - 1].id : 0);
  useEffect(() => {
    if (game.log.length === 0) return;
    const newLogs = game.log.filter((l) => l.id > processedLogId.current);
    if (newLogs.length === 0) return;
    processedLogId.current = game.log[game.log.length - 1].id;

    for (const l of newLogs) {
      if (l.kind === 'income') {
        const coins = Number(l.params?.coins ?? l.params?.n ?? 2);
        const payerName = l.params?.payer as string | undefined;
        const receiverName = l.params?.receiver as string | undefined;
        const targetPlayerName = (l.params?.name ?? l.params?.player) as string | undefined;

        if (payerName && receiverName) {
          const payerPlayer = game.players.find((p) => p.name === payerName);
          const receiverPlayer = game.players.find((p) => p.name === receiverName);
          if (payerPlayer && receiverPlayer) {
            const payerEl = document.querySelector(`[data-player-purse="${payerPlayer.id}"]`);
            const receiverEl = document.querySelector(`[data-player-purse="${receiverPlayer.id}"]`);
            if (payerEl && receiverEl) {
              flyingCoins.launch(payerEl.getBoundingClientRect(), receiverEl.getBoundingClientRect(), coins, receiverPlayer.id, true);
              gameJuice.flashSteal(payerPlayer.id);
            }
          }
        } else {
          const player = game.players.find((p) => p.name === targetPlayerName) ?? active;
          const diceEl = document.querySelector('[data-dice-tray="true"]');
          const purseEl = document.querySelector(`[data-player-purse="${player.id}"]`);
          if (purseEl) {
            const bankRect = diceEl ? diceEl.getBoundingClientRect() : { x: window.innerWidth / 2, y: window.innerHeight / 2 };
            // If coins are gained from bank: Bank ➔ Player
            flyingCoins.launch(bankRect, purseEl.getBoundingClientRect(), coins, player.id, false);
          }
        }
      } else if (l.kind === 'build') {
        const cost = Number(l.params?.cost ?? 2);
        const buyerName = (l.params?.name ?? l.params?.player) as string | undefined;
        const buyer = game.players.find((p) => p.name === buyerName) ?? active;
        const purseEl = document.querySelector(`[data-player-purse="${buyer.id}"]`);
        const diceEl = document.querySelector('[data-dice-tray="true"]');
        if (purseEl) {
          // When spending money, coins fly back to the central bank / dice tray (where distribution came from)
          const bankRect = diceEl ? diceEl.getBoundingClientRect() : { x: window.innerWidth / 2, y: window.innerHeight / 2 };
          flyingCoins.launch(purseEl.getBoundingClientRect(), bankRect, cost, undefined, false);
        }
        if (l.params?.landmark) {
          gameJuice.shake('medium');
        }
      }
    }
  }, [game.log, game.players, active]);

  // ---- the away countdown -------------------------------------------------
  // Timestamps come from the server's clock, so the offset between the two is
  // measured once per update rather than trusting the browser's idea of now.
  const skew = useRef(0);
  useEffect(() => {
    skew.current = room.now - Date.now();
  }, [room.now]);

  const activeSeat = seats.get(active.id);
  const activeIsAway =
    !over && Boolean(activeSeat) && !activeSeat!.isBot && !activeSeat!.connected && activeSeat!.awaySince !== null;

  const [, retick] = useState(0);
  useEffect(() => {
    if (!activeIsAway) return;
    const id = window.setInterval(() => retick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, [activeIsAway]);

  /** Seconds left before the server plays this seat's turn, or null if it is not counting. */
  const awaySecondsFor = (seat: SeatView | undefined): number | null => {
    if (!seat || seat.id !== active.id || !activeIsAway) return null;
    const left = seat.awaySince! + room.autoplayAfterMs - (Date.now() + skew.current);
    return Math.max(0, Math.ceil(left / 1000));
  };

  // ---- sound --------------------------------------------------------------
  // Every cue is keyed off something that only moves forward, so a re-render or
  // a reconnect cannot replay the turn that has already happened.
  const heardRoll = useRef(game.rollId);
  const heardLog = useRef(game.log.length > 0 ? game.log[game.log.length - 1].id : 0);
  const heardCoins = useRef(you?.coins ?? 0);
  const heardWin = useRef(over);
  const heardReactions = useRef(room.reactions?.length ?? 0);

  useEffect(() => {
    if (game.rollId > heardRoll.current) {
      const activeP = game.players[game.turn];
      const hasPark = Boolean(activeP?.landmarks.amusement_park || game.extraTurn);
      if (game.dice.length === 2 && game.dice[0] === game.dice[1] && hasPark) {
        cue('doubles');
      } else if (game.dice.length === 2) {
        cue('dice2');
      } else {
        cue('dice');
      }
    }
    heardRoll.current = game.rollId;
  }, [game.rollId, game.dice, game.players, game.turn, game.extraTurn, cue]);

  useEffect(() => {
    const newest = game.log.length > 0 ? game.log[game.log.length - 1] : null;
    if (newest && newest.id > heardLog.current) {
      if (newest.key === 'log.buildLandmark') cue('landmark');
      else if (newest.kind === 'build') cue('build');
      else if (newest.kind === 'event') cue('event');
    }
    if (newest) heardLog.current = newest.id;
  }, [game.log, cue]);

  useEffect(() => {
    const coins = you?.coins ?? heardCoins.current;
    if (coins > heardCoins.current) cue('coin');
    else if (coins < heardCoins.current) {
      const newest = game.log.length > 0 ? game.log[game.log.length - 1] : null;
      if (newest && (newest.key.includes('redTake') || newest.key.includes('stadium') || newest.key.includes('tvTake'))) {
        cue('steal');
      } else {
        cue('lose');
      }
    }
    heardCoins.current = coins;
  }, [you?.coins, game.log, cue]);

  useEffect(() => {
    const rCount = room.reactions?.length ?? 0;
    if (rCount > heardReactions.current) {
      cue('reaction');
    }
    heardReactions.current = rCount;
  }, [room.reactions, cue]);

  useEffect(() => {
    if (over && !heardWin.current) cue('win');
    heardWin.current = over;
  }, [over, cue]);

  // ---- keyboard -----------------------------------------------------------
  const modalOpen = showStats || (yourTurn && MODAL_PHASES.includes(game.phase));
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      // Never steal a key from the chat box or any other field.
      if (target && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))) return;

      const key = event.key.toLowerCase();
      if (key === 's') {
        event.preventDefault();
        setShowStats((open) => !open);
        return;
      }
      if (modalOpen || !yourTurn || !you) return;
      if (key === 'r' && game.phase === 'roll') {
        event.preventDefault();
        act({ t: 'roll', dice: 1 });
      } else if (key === 't' && game.phase === 'roll' && you.landmarks.train_station) {
        event.preventDefault();
        act({ t: 'roll', dice: 2 });
      } else if (key === 'e' && game.phase === 'build') {
        event.preventDefault();
        act({ t: 'pass' });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // ---- the supply ---------------------------------------------------------
  const inPlay = cardsFor(game.rules);
  const onOffer = inPlay.filter((card) => !game.rules.variableSupply || (game.supply[card.id] ?? 0) > 0);
  // A stack that has just run out keeps its slot until its mark expires, so you
  // can see which card left the board instead of it blinking out mid-turn.
  const onBoard = game.rules.variableSupply
    ? inPlay.filter((card) => (game.supply[card.id] ?? 0) > 0 || marks.get(card.id) === 'gone')
    : onOffer;
  const affordable = (id: CardId) => Boolean(you && canBuy(game, you, id));
  const shown = sortCards(
    filter === 'affordable' ? onBoard.filter((card) => affordable(card.id)) : onBoard,
    sort
  );

  /** Copies of a card the rest of the table is holding. */
  const othersOwn = (id: CardId) =>
    game.players.reduce((n, p) => (p.id === youId ? n : n + (p.cards[id] ?? 0)), 0);

  return (
    <div className={`${yourTurn ? 'game my-turn' : 'game'} ${shakeClass}`}>
      <CoinFlightOverlay />
      <header className="topbar">
        <span className="room-code" title="room code">
          {room.code}
        </span>
        <span className="turn-info">
          {game.phase === 'over' ? (
            <b>{t('ui.wins', { player: game.players.find((p) => p.id === game.winnerId)?.name ?? '' })}</b>
          ) : yourTurn ? (
            <b className="your-turn">{t('ui.yourTurn')}</b>
          ) : (
            <span>{phaseHint(game, t)}…</span>
          )}
        </span>
        <span className="rules-note" title={describeRulesIn(lang, game.rules)}>
          {game.rules.variableSupply
            ? t('ui.stacksAndDeck', { stacks: onOffer.length, deck: game.deck.length })
            : describeRulesIn(lang, game.rules)}
        </span>
        <CardViewSwitch />
        <ChainSwitch />
        <FxSwitch />
        <SoundSwitch />
        <ThemeSwitch />
        <LangSwitch />
        <button type="button" className="ghost small" onClick={() => setShowStats(true)}>
          {t('ui.statsButton')}
        </button>
        <button type="button" className="ghost small" onClick={() => send({ t: 'leave' })}>
          {t('ui.leave')}
        </button>
      </header>

      <main className="board">
        {game.rules.events && game.currentEvent && (
          <EventBanner eventId={game.currentEvent} round={game.eventRound} />
        )}
        {actionChain && <ActionChainHUD game={game} you={you} />}
        <BoardControls
          filter={filter}
          sort={sort}
          onFilter={setFilter}
          onSort={setSort}
          shown={shown.length}
          total={onBoard.length}
        />
        <div className="cards">
          {shown.map((card) => (
            <CardTile
              key={card.id}
              card={card}
              effectiveCost={you ? cardCost(game, you, card) : card.cost}
              supply={game.supply[card.id] ?? 0}
              owned={you?.cards[card.id] ?? 0}
              others={othersOwn(card.id)}
              hot={game.diceTotal > 0 && card.activates.includes(game.diceTotal)}
              buyable={Boolean(yourTurn && game.phase === 'build' && you && canBuy(game, you, card.id))}
              mark={marks.get(card.id)}
              onBuy={() => act({ t: 'buy', cardId: card.id })}
            />
          ))}
        </div>
        {shown.length === 0 && <p className="muted board-empty">{t('ui.noCardsMatch')}</p>}
      </main>

      <div className="players">
        {game.players.map((p) => (
          <PlayerPanel
            key={p.id}
            game={game}
            player={p}
            rules={game.rules}
            isActive={p.id === active.id && game.phase !== 'over'}
            isYou={p.id === youId}
            connected={seats.get(p.id)?.connected ?? false}
            diceTotal={game.diceTotal}
            deltas={deltas.get(p.id) ?? []}
            awaySeconds={awaySecondsFor(seats.get(p.id))}
            recentReactions={room.reactions}
          />
        ))}
      </div>

      <aside className="side">
        <div className="tabs">
          <button type="button" className={tab === 'log' ? 'on' : ''} onClick={() => setTab('log')}>
            {t('ui.log')}
          </button>
          <button type="button" className={tab === 'city' ? 'on' : ''} onClick={() => setTab('city')}>
            {t('ui.city')}
          </button>
          <button type="button" className={tab === 'chat' ? 'on' : ''} onClick={() => setTab('chat')}>
            {t('ui.chat')}
            {room.chat.length > 0 ? ` (${room.chat.length})` : ''}
          </button>
        </div>
        {tab === 'log' && <LogPanel log={game.log} />}
        {tab === 'city' && <IncomePanel game={game} you={you} />}
        {tab === 'chat' && <Chat chat={room.chat} send={send} />}
      </aside>

      <footer className="controls-bar">
        <ReactionsBar
          onSendReaction={(emoji, text) => send({ t: 'reaction', emoji, text })}
          disabled={game.phase === 'over'}
        />
        <Controls
          game={game}
          you={you}
          yourTurn={yourTurn}
          isHost={room.hostId === youId}
          act={act}
          send={send}
          onStats={() => setShowStats(true)}
          onOpenVictory={() => setShowVictory(true)}
        />
      </footer>

      {yourTurn && you && MODAL_PHASES.includes(game.phase) && <ChoiceModal game={game} you={you} act={act} />}
      {showStats && <StatsPanel game={game} youId={youId} onClose={() => setShowStats(false)} />}
      {over && showVictory && (
        <VictoryModal
          game={game}
          room={room}
          youId={youId ?? ''}
          isHost={room.hostId === youId}
          onClose={() => setShowVictory(false)}
          onStats={() => setShowStats(true)}
          send={send}
        />
      )}
    </div>
  );
}
