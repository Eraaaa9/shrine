import { useState } from 'react';
import { CARD_BY_ID, ICON_GLYPH, cardsFor, type CardId } from '../../shared/cards';
import { activationValue, closedCopies, copies, exhibitCandidates, openCopies, tradeableCards } from '../../shared/engine';
import { cardName, cardText } from '../../shared/i18n';
import type { GameAction, GameState, PlayerState } from '../../shared/types';
import { useLang } from '../lang';
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
  worth,
}: {
  ids: CardId[];
  owner?: PlayerState;
  selected: CardId | null;
  onPick: (id: CardId) => void;
  worth?: (id: CardId) => number;
}) {
  const { lang, t } = useLang();
  return (
    <div className="trade-cards">
      {ids.map((id) => {
        const card = CARD_BY_ID[id];
        const count = owner ? copies(owner, id) : 0;
        const value = worth?.(id);
        return (
          <button
            type="button"
            key={id}
            className={selected === id ? `chip-card ${card.color} picked` : `chip-card ${card.color}`}
            onClick={() => onPick(id)}
            title={cardText(lang, id)}
          >
            <b>{formatActivates(card.activates)}</b>
            {ICON_GLYPH[card.icon]} {cardName(lang, id)}
            {count > 1 && <i>×{count}</i>}
            {value !== undefined && <i>{value >= 0 ? `+${value}` : value}</i>}
          </button>
        );
      })}
      {ids.length === 0 && <span className="muted">{t('ui.nothingAvailable')}</span>}
    </div>
  );
}

function Trade({ game, you, act }: Props) {
  const { t } = useLang();
  const opponents = game.players.filter((p) => p.id !== you.id);
  const [targetId, setTargetId] = useState(opponents[0]?.id ?? '');
  const [give, setGive] = useState<CardId | null>(null);
  const [take, setTake] = useState<CardId | null>(null);
  const target = game.players.find((p) => p.id === targetId) ?? opponents[0];

  return (
    <>
      <h2>{t('ui.bcTitle')}</h2>
      <p className="muted">{t('ui.bcBlurb')}</p>

      <div className="trade-side">
        <h3>{t('ui.youGive')}</h3>
        <CardChips ids={tradeableCards(you)} owner={you} selected={give} onPick={setGive} />
      </div>

      <div className="trade-side">
        <h3>{t('ui.youTakeFrom')}</h3>
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
          {t('ui.swap')}
        </button>
      </div>
    </>
  );
}

function Moving({ game, you, act }: Props) {
  const { t } = useLang();
  const opponents = game.players.filter((p) => p.id !== you.id);
  const [targetId, setTargetId] = useState(opponents[0]?.id ?? '');
  const [give, setGive] = useState<CardId | null>(null);

  return (
    <>
      <h2>{t('ui.movingTitle')}</h2>
      <p className="muted">{t('ui.movingBlurb')}</p>

      <div className="trade-side">
        <h3>{t('ui.giveAway')}</h3>
        <CardChips ids={tradeableCards(you)} owner={you} selected={give} onPick={setGive} />
      </div>

      <div className="trade-side">
        <h3>{t('ui.to')}</h3>
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
          {t('ui.handOver')}
        </button>
      </div>
    </>
  );
}

function Renovation({ game, you, act }: Props) {
  const { t } = useLang();
  const [pick, setPick] = useState<CardId | null>(null);
  const owned = cardsFor(game.rules).filter(
    (c) => c.icon !== 'major' && game.players.some((p) => openCopies(p, c.id) > 0)
  );
  const takings = pick
    ? game.players
        .filter((p) => p.id !== you.id)
        .reduce((sum, p) => sum + Math.min(openCopies(p, pick), p.coins), 0)
    : 0;

  return (
    <>
      <h2>{t('ui.renovationTitle')}</h2>
      <p className="muted">{t('ui.renovationBlurb')}</p>

      <div className="trade-side">
        <h3>{t('ui.closeEvery')}</h3>
        <CardChips ids={owned.map((c) => c.id)} selected={pick} onPick={setPick} />
      </div>

      {pick && (
        <p className="muted">
          {t('ui.renovationPreview', {
            owners: game.players
              .filter((p) => openCopies(p, pick) > 0)
              .map((p) => `${p.name} ×${openCopies(p, pick)}`)
              .join(', '),
            amount: takings,
          })}
        </p>
      )}

      <div className="row end">
        <button type="button" className="primary" disabled={!pick} onClick={() => pick && act({ t: 'renovation', cardId: pick })}>
          {t('ui.closeForRenovation')}
        </button>
      </div>
    </>
  );
}

function Exhibit({ game, you, act }: Props) {
  const { t } = useLang();
  const [pick, setPick] = useState<CardId | null>(null);
  const candidates = exhibitCandidates(game, you);

  return (
    <>
      <h2>{t('ui.exhibitTitle')}</h2>
      <p className="muted">{t('ui.exhibitBlurb')}</p>

      <div className="trade-side">
        <h3>{t('ui.activate')}</h3>
        <CardChips
          ids={candidates}
          owner={you}
          selected={pick}
          onPick={setPick}
          worth={(id) => activationValue(game, you, id)}
        />
      </div>

      <div className="row end">
        <button type="button" className="ghost" onClick={() => act({ t: 'exhibit', cardId: null })}>
          {t('ui.keepExhibit')}
        </button>
        <button type="button" className="primary" disabled={!pick} onClick={() => pick && act({ t: 'exhibit', cardId: pick })}>
          {t('ui.activateIt')}
        </button>
      </div>
    </>
  );
}

/** The card effects that need a full-screen decision. */
export default function ChoiceModal(props: Props) {
  const { lang, t } = useLang();
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
            {t('ui.closedList', { cards: closed.map((id) => cardName(lang, id)).join(', ') })}
          </p>
        )}
      </div>
    </div>
  );
}
