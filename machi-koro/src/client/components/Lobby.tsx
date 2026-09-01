import { useState } from 'react';
import { maxPlayers } from '../../shared/cards';
import { mayorIcon, mayorName, mayorText, rulesCode } from '../../shared/i18n';
import type { ClientMessage, RoomView } from '../../shared/protocol';
import { MIN_PLAYERS } from '../../shared/protocol';
import { LangSwitch, useLang } from '../lang';
import { SoundSwitch, ThemeSwitch } from '../prefs';
import BotLevelPicker from './BotLevelPicker';
import Chat from './Chat';
import MayorPicker from './MayorPicker';
import RulesPicker from './RulesPicker';

interface Props {
  room: RoomView;
  youId: string | null;
  send: (message: ClientMessage) => void;
}

export default function Lobby({ room, youId, send }: Props) {
  const { lang, t } = useLang();
  const [copied, setCopied] = useState(false);
  const isHost = room.hostId === youId;
  const max = maxPlayers(room.rules);
  const inviteUrl = `${location.origin}${location.pathname}?room=${room.code}`;
  const youSeat = room.seats.find((s) => s.id === youId);

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
        <h1>{t('ui.room', { code: room.code })}</h1>
        <SoundSwitch />
        <ThemeSwitch />
        <LangSwitch />
        <button type="button" className="ghost" onClick={() => send({ t: 'leave' })}>
          {t('ui.leave')}
        </button>
      </header>

      <div className="panel invite">
        <p className="muted">{t('ui.inviteHint')}</p>
        <div className="invite-row">
          <input readOnly value={inviteUrl} onFocus={(e) => e.currentTarget.select()} />
          <button type="button" onClick={copy}>
            {copied ? t('ui.copied') : t('ui.copy')}
          </button>
        </div>
      </div>

      <div className="panel">
        <h2>
          {t('ui.players')}{' '}
          <span className="muted">
            {room.seats.length}/{max}
          </span>
        </h2>
        <ul className="seats">
          {room.seats.map((seat) => (
            <li key={seat.id} className={seat.id === youId ? 'you' : undefined}>
              <span className="dot" data-on={seat.connected || seat.isBot} />
              <span className="seat-name">{seat.name}</span>
              {seat.isHost && <span className="tag">{t('ui.host')}</span>}
              {seat.isBot && <span className="tag bot">{t('ui.bot')}</span>}
              {seat.id === youId && <span className="tag you-tag">{t('ui.you')}</span>}
              {seat.mayor && (
                <span
                  className="tag mayor-badge"
                  title={`${mayorName(lang, seat.mayor)}: ${mayorText(lang, seat.mayor)}`}
                >
                  {mayorIcon(seat.mayor)} {mayorName(lang, seat.mayor)}
                </span>
              )}
              {isHost && !seat.isHost && (
                <button type="button" className="ghost small" onClick={() => send({ t: 'kick', playerId: seat.id })}>
                  {t('ui.remove')}
                </button>
              )}
            </li>
          ))}
        </ul>

        {/* Mayor Selection for Current Player */}
        <MayorPicker
          selected={youSeat?.mayor ?? 'agronomist'}
          onChange={(mayor) => send({ t: 'setMayor', mayor })}
        />

        {isHost ? (
          <>
            <RulesPicker rules={room.rules} onChange={(rules) => send({ t: 'setRules', rules })} />
            <BotLevelPicker level={room.botLevel} onChange={(level) => send({ t: 'setBotLevel', level })} />
            <div className="row">
              <button type="button" onClick={() => send({ t: 'addBot' })} disabled={room.seats.length >= max}>
                {t('ui.addBot')}
              </button>
              <button
                type="button"
                className="primary"
                onClick={() => send({ t: 'start' })}
                disabled={room.seats.length < MIN_PLAYERS}
              >
                {t('ui.startTheGame')}
              </button>
            </div>
          </>
        ) : (
          <>
            <RulesPicker rules={room.rules} onChange={() => undefined} disabled />
            <BotLevelPicker level={room.botLevel} onChange={() => undefined} disabled />
            <p className="muted">{t('ui.waitingForHost', { rules: rulesCode(room.rules) })}</p>
          </>
        )}
      </div>

      <div className="panel">
        <Chat chat={room.chat} send={send} />
      </div>
    </div>
  );
}
