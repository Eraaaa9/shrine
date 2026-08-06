import { useState } from 'react';
import { CARD_BY_ID, ICON_GLYPH, cardsFor, type CardId } from '../../shared/cards';
import { activationValue, closedCopies, copies, exhibitCandidates, openCopies, tradeableCards } from '../../shared/engine';
import type { GameAction, GameState, PlayerState } from '../../shared/types';
import { formatActivates } from './CardTile';

interface Props {
  game: GameState;
  you: PlayerState;
  act: (action: GameAction) => void;
}

function CardChips({
  ids,
  owner,
  selected,
  onPick,
}: {
  ids: CardId[];
  owner?: PlayerState;
  selected: CardId | null;
  onPick: (id: CardId) => void;
}) {
  return (
    <div className="trade-cards">
      {ids.map((id) => {
        const card = CARD_BY_ID[id];
        const count = owner ? copies(owner, id) : 0;
        return (
          <button
            type="button"
            key={id}
            className={selected === id ? `chip-card ${card.color} picked` : `chip-card ${card.color}`}
            onClick={() => onPick(id)}
            title={card.text}
          >
            <b>{formatActivates(card.activates)}</b>
            {ICON_GLYPH[card.icon]} {card.name}
            {count > 1 && <i>×{count}</i>}
          </button>
        );
      })}
      {ids.length === 0 && <span className="muted">nothing available</span>}
    </div>
  );
}

function Trade({ game, you, act }: Props) {
  const opponents = game.players.filter((p) => p.id !== you.id);
  const [targetId, setTargetId] = useState(opponents[0]?.id ?? '');
  const [give, setGive] = useState<CardId | null>(null);
  const [take, setTake] = useState<CardId | null>(null);
  const target = game.players.find((p) => p.id === targetId) ?? opponents[0];

  return (
    <>
      <h2>Business Center</h2>
      <p className="muted">Swap one of your establishments for one of theirs. Major establishments cannot be swapped.</p>

      <div className="trade-side">
        <h3>You give</h3>
        <CardChips ids={tradeableCards(you)} owner={you} selected={give} onPick={setGive} />
      </div>

      <div className="trade-side">
        <h3>You take from</h3>
        <div className="choices tight">
          {opponents.map((p) => (
            <button
              type="button"
              key={p.id}
              className={p.id === targetId ? 'chip on' : 'chip'}
              onClick={() => {
                setTargetId(p.id);
                setTake(null);
              }}
            >
              {p.name}
            </button>
          ))}
        </div>
        {target && <CardChips ids={tradeableCards(target)} owner={target} selected={take} onPick={setTake} />}
      </div>

      <div className="row end">
        <button
          type="button"
          className="primary"
          disabled={!give || !take || !target}
          onClick={() => give && take && target && act({ t: 'trade', targetId: target.id, give, take })}
        >
          Swap
        </button>
      </div>
    </>
  );
}

function Moving({ game, you, act }: Props) {
  const opponents = game.players.filter((p) => p.id !== you.id);
  const [targetId, setTargetId] = useState(opponents[0]?.id ?? '');
  const [give, setGive] = useState<CardId | null>(null);

  return (
    <>
      <h2>Moving Company</h2>
      <p className="muted">Give one establishment away, then take 4 coins from the bank.</p>

      <div className="trade-side">
        <h3>Give away</h3>
        <CardChips ids={tradeableCards(you)} owner={you} selected={give} onPick={setGive} />
      </div>

      <div className="trade-side">
        <h3>To</h3>
        <div className="choices tight">
          {opponents.map((p) => (
            <button
              type="button"
              key={p.id}
              className={p.id === targetId ? 'chip on' : 'chip'}
              onClick={() => setTargetId(p.id)}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      <div className="row end">
        <button
          type="button"
          className="primary"
          disabled={!give || !targetId}
          onClick={() => give && act({ t: 'moving', targetId, give })}
        >
          Hand it over (+4)
        </button>
      </div>
    </>
  );
}

function Renovation({ game, you, act }: Props) {
  const [pick, setPick] = useState<CardId | null>(null);
  const owned = cardsFor(game.rules).filter(
    (c) => c.icon !== 'major' && game.players.some((p) => openCopies(p, c.id) > 0)
  );
  const target = pick ? CARD_BY_ID[pick] : null;
  const takings = pick
    ? game.players
        .filter((p) => p.id !== you.id)
        .reduce((sum, p) => sum + Math.min(openCopies(p, pick), p.coins), 0)
    : 0;

  return (
    <>
      <h2>Renovation Company</h2>
      <p className="muted">
        Close every copy of one establishment for renovation. Each closed building skips its next activation, and every
        opponent pays you 1 coin per building of theirs you close — including your own copies.
      </p>

      <div className="trade-side">
        <h3>Close every</h3>
        <CardChips ids={owned.map((c) => c.id)} selected={pick} onPick={setPick} />
      </div>

      {target && (
        <p className="muted">
          {game.players
            .filter((p) => openCopies(p, target.id) > 0)
            .map((p) => `${p.name} ×${openCopies(p, target.id)}`)
            .join(', ')}{' '}
          — you collect about {takings}.
        </p>
      )}

      <div className="row end">
        <button type="button" className="primary" disabled={!pick} onClick={() => pick && act({ t: 'renovation', cardId: pick })}>
          Close for renovation
        </button>
      </div>
    </>
  );
}

function Exhibit({ game, you, act }: Props) {
  const [pick, setPick] = useState<CardId | null>(null);
  const candidates = exhibitCandidates(game, you);

  return (
    <>
      <h2>Exhibit Hall</h2>
      <p className="muted">
        You may activate one of your own establishments instead. If you do, the Exhibit Hall goes back to the supply.
      </p>

      <div className="trade-side">
        <h3>Activate</h3>
        <div className="trade-cards">
          {candidates.map((id) => {
            const card = CARD_BY_ID[id];
            const worth = activationValue(game, you, id);
            return (
              <button
                type="button"
                key={id}
                className={pick === id ? `chip-card ${card.color} picked` : `chip-card ${card.color}`}
                onClick={() => setPick(id)}
                title={card.text}
              >
                <b>{formatActivates(card.activates)}</b>
                {ICON_GLYPH[card.icon]} {card.name}
                <i>{worth >= 0 ? `+${worth}` : worth}</i>
              </button>
            );
          })}
        </div>
      </div>

      <div className="row end">
        <button type="button" className="ghost" onClick={() => act({ t: 'exhibit', cardId: null })}>
          Keep the Exhibit Hall
        </button>
        <button type="button" className="primary" disabled={!pick} onClick={() => pick && act({ t: 'exhibit', cardId: pick })}>
          Activate it
        </button>
      </div>
    </>
  );
}

/** The card effects that need a full-screen decision. */
export default function ChoiceModal(props: Props) {
  const { game, you } = props;
  const body =
    game.phase === 'trade' ? (
      <Trade {...props} />
    ) : game.phase === 'moving' ? (
      <Moving {...props} />
    ) : game.phase === 'renovation' ? (
      <Renovation {...props} />
    ) : game.phase === 'exhibit' ? (
      <Exhibit {...props} />
    ) : null;

  if (!body) return null;
  const closed = (Object.keys(you.closed) as CardId[]).filter((id) => closedCopies(you, id) > 0);

  return (
    <div className="modal-backdrop">
      <div className="modal">
        {body}
        {closed.length > 0 && (
          <p className="muted small-note">
            Closed for renovation: {closed.map((id) => CARD_BY_ID[id].name).join(', ')}
          </p>
        )}
      </div>
    </div>
  );
}
