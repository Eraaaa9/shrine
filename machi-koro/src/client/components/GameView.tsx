import { useState } from 'react';
import { cardsFor } from '../../shared/cards';
import { canBuy } from '../../shared/engine';
import { describeRulesIn } from '../../shared/i18n';
import type { ClientMessage, RoomView } from '../../shared/protocol';
import type { GameAction } from '../../shared/types';
import { LangSwitch, useLang } from '../lang';
import CardTile from './CardTile';
import Chat from './Chat';
import ChoiceModal from './ChoiceModal';
import Controls, { phaseHint } from './Controls';
import LogPanel from './LogPanel';
import PlayerPanel from './PlayerPanel';

const MODAL_PHASES = ['trade', 'moving', 'renovation', 'exhibit'];

interface Props {
  room: RoomView;
  youId: string | null;
  send: (message: ClientMessage) => void;
}

export default function GameView({ room, youId, send }: Props) {
  const { lang, t } = useLang();
  const game = room.game!;
  const [tab, setTab] = useState<'log' | 'chat'>('log');

  const you = game.players.find((p) => p.id === youId) ?? null;
  const active = game.players[game.turn];
  const yourTurn = you !== null && active.id === you.id && game.phase !== 'over';
  const act = (action: GameAction) => send({ t: 'action', action });
  const connected = new Map(room.seats.map((s) => [s.id, s.connected]));

  const onOffer = cardsFor(game.rules).filter(
    (card) => !game.rules.variableSupply || (game.supply[card.id] ?? 0) > 0
  );

  return (
    <div className={yourTurn ? 'game my-turn' : 'game'}>
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
        <LangSwitch />
        <button type="button" className="ghost small" onClick={() => send({ t: 'leave' })}>
          {t('ui.leave')}
        </button>
      </header>

      <main className="board">
        <div className="cards">
          {onOffer.map((card) => (
            <CardTile
              key={card.id}
              card={card}
              supply={game.supply[card.id] ?? 0}
              owned={you?.cards[card.id] ?? 0}
              hot={game.diceTotal > 0 && card.activates.includes(game.diceTotal)}
              buyable={Boolean(yourTurn && game.phase === 'build' && you && canBuy(game, you, card.id))}
              onBuy={() => act({ t: 'buy', cardId: card.id })}
            />
          ))}
        </div>
      </main>

      <aside className="side">
        <div className="players">
          {game.players.map((p) => (
            <PlayerPanel
              key={p.id}
              player={p}
              rules={game.rules}
              isActive={p.id === active.id && game.phase !== 'over'}
              isYou={p.id === youId}
              connected={connected.get(p.id) ?? false}
              diceTotal={game.diceTotal}
            />
          ))}
        </div>

        <div className="tabs">
          <button type="button" className={tab === 'log' ? 'on' : ''} onClick={() => setTab('log')}>
            {t('ui.log')}
          </button>
          <button type="button" className={tab === 'chat' ? 'on' : ''} onClick={() => setTab('chat')}>
            {t('ui.chat')}
            {room.chat.length > 0 ? ` (${room.chat.length})` : ''}
          </button>
        </div>
        {tab === 'log' ? <LogPanel log={game.log} /> : <Chat chat={room.chat} send={send} />}
      </aside>

      <footer className="controls-bar">
        <Controls game={game} you={you} yourTurn={yourTurn} isHost={room.hostId === youId} act={act} send={send} />
      </footer>

      {yourTurn && you && MODAL_PHASES.includes(game.phase) && <ChoiceModal game={game} you={you} act={act} />}
    </div>
  );
}
