import { useState } from 'react';
import { describeRules, maxPlayers } from '../../shared/cards';
import type { ClientMessage, RoomView } from '../../shared/protocol';
import { MIN_PLAYERS } from '../../shared/protocol';
import Chat from './Chat';
import RulesPicker from './RulesPicker';

interface Props {
  room: RoomView;
  youId: string | null;
  send: (message: ClientMessage) => void;
}

export default function Lobby({ room, youId, send }: Props) {
  const [copied, setCopied] = useState(false);
  const isHost = room.hostId === youId;
  const max = maxPlayers(room.rules);
  const inviteUrl = `${location.origin}${location.pathname}?room=${room.code}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="lobby">
      <header>
        <h1>Room {room.code}</h1>
        <button type="button" className="ghost" onClick={() => send({ t: 'leave' })}>
          Leave
        </button>
      </header>

      <div className="panel invite">
        <p className="muted">Send this link to your friends:</p>
        <div className="invite-row">
          <input readOnly value={inviteUrl} onFocus={(e) => e.currentTarget.select()} />
          <button type="button" onClick={copy}>
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      <div className="panel">
        <h2>
          Players <span className="muted">{room.seats.length}/{max}</span>
        </h2>
        <ul className="seats">
          {room.seats.map((seat) => (
            <li key={seat.id} className={seat.id === youId ? 'you' : undefined}>
              <span className="dot" data-on={seat.connected || seat.isBot} />
              <span className="seat-name">{seat.name}</span>
              {seat.isHost && <span className="tag">host</span>}
              {seat.isBot && <span className="tag bot">bot</span>}
              {seat.id === youId && <span className="tag you-tag">you</span>}
              {isHost && !seat.isHost && (
                <button type="button" className="ghost small" onClick={() => send({ t: 'kick', playerId: seat.id })}>
                  remove
                </button>
              )}
            </li>
          ))}
        </ul>

        {isHost ? (
          <>
            <RulesPicker rules={room.rules} onChange={(rules) => send({ t: 'setRules', rules })} />
            <div className="row">
              <button type="button" onClick={() => send({ t: 'addBot' })} disabled={room.seats.length >= max}>
                Add bot
              </button>
              <button
                type="button"
                className="primary"
                onClick={() => send({ t: 'start' })}
                disabled={room.seats.length < MIN_PLAYERS}
              >
                Start game
              </button>
            </div>
          </>
        ) : (
          <>
            <RulesPicker rules={room.rules} onChange={() => undefined} disabled />
            <p className="muted">Waiting for the host to start — {describeRules(room.rules)}…</p>
          </>
        )}
      </div>

      <div className="panel">
        <Chat chat={room.chat} send={send} />
      </div>
    </div>
  );
}
