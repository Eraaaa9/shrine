import { useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { CARD_BY_ID, ICON_GLYPH, cardsFor, type CardId } from '../../shared/cards';
import { activationValue, closedCopies, copies, exhibitCandidates, openCopies, payable, tradeableCards } from '../../shared/engine';
import { mayorTuning } from '../../shared/mayors';
import { cardName, cardText } from '../../shared/i18n';
import type { GameAction, GameState, PlayerState } from '../../shared/types';
import { useLang } from '../lang';
import useWindowDrag from '../windowDrag';
import { formatActivates } from './CardTile';
import ConfirmDialog from './ConfirmDialog';

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
            {value !== undefined && <i className="chip-worth">{value >= 0 ? `+${value} ¤` : `${value} ¤`}</i>}
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
  const { lang, t } = useLang();
  const opponents = game.players.filter((p) => p.id !== you.id);
  const [targetId, setTargetId] = useState(opponents[0]?.id ?? '');
  const [give, setGive] = useState<CardId | null>(null);
  // Handing a building to an opponent is compulsory and permanent; ask first.
  const [confirming, setConfirming] = useState(false);
  const target = game.players.find((p) => p.id === targetId);

  return (
    <>
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

      {give && target && (
        <p className="muted">
          {cardName(lang, give)} ➔ {target.name} (<b>+4 ¤</b>)
        </p>
      )}

      <div className="row end">
        <button
          type="button"
          className="primary"
          disabled={!give || !targetId}
          onClick={() => give && setConfirming(true)}
        >
          {t('ui.handOver')} (+4 ¤)
        </button>
      </div>

      {confirming && give && target && (
        <ConfirmDialog
          message={t('ui.confirmMoving', { card: give, target: target.name })}
          onYes={() => {
            setConfirming(false);
            act({ t: 'moving', targetId, give });
          }}
          onNo={() => setConfirming(false)}
        />
      )}
    </>
  );
}

function Renovation({ game, you, act }: Props) {
  const { lang, t } = useLang();
  const [pick, setPick] = useState<CardId | null>(null);
  // What closing every copy would pay: each opponent hands over a coin per copy
  // of theirs, less what a broke player has not got and what the Restaurateur
  // keeps back. How much that is moves with the table size, so ask `payable`
  // rather than quoting the two-player figure at every table.
  const takingsFrom = (p: PlayerState, id: CardId) => {
    const count = openCopies(p, id);
    if (count <= 0) return 0;
    return Math.min(count, payable(game, p));
  };
  const takings = (id: CardId) =>
    game.players.filter((p) => p.id !== you.id).reduce((sum, p) => sum + takingsFrom(p, id), 0);

  // Best payout first, and where two pay the same, the pricier building — closing
  // it costs the table more.
  const owned = cardsFor(game.rules)
    .filter((c) => c.icon !== 'major' && game.players.some((p) => openCopies(p, c.id) > 0))
    .sort((a, b) => takings(b.id) - takings(a.id) || b.cost - a.cost);

  return (
    <>
      <p className="muted">{t('ui.renovationBlurb')}</p>

      <div className="trade-side">
        <h3>{t('ui.closeEvery')}</h3>
        <CardChips ids={owned.map((c) => c.id)} selected={pick} onPick={setPick} worth={takings} />
      </div>

      {pick && (
        <div className="muted" style={{ margin: '8px 0', fontSize: '12px' }}>
          <div>
            <b>{cardName(lang, pick)}:</b> {t('ui.totalGain')}: <b style={{ color: 'var(--green)' }}>+{takings(pick)} ¤</b>
          </div>
          <div style={{ marginTop: '3px' }}>
            {game.players
              .filter((p) => p.id !== you.id && openCopies(p, pick) > 0)
              .map((p) => {
                const count = openCopies(p, pick);
                const pays = takingsFrom(p, pick);
                const shield =
                  p.mayor === 'restaurateur'
                    ? `, ${t('ui.shieldTag', { n: mayorTuning(game.players.length).restaurateurShield })}`
                    : '';
                return `${p.name} ×${count} (➔ +${pays} ¤${shield})`;
              })
              .join(' · ')}
          </div>
        </div>
      )}

      <div className="row end">
        <button
          type="button"
          className="primary"
          disabled={!pick}
          onClick={() => pick && act({ t: 'renovation', cardId: pick })}
        >
          {t('ui.closeForRenovation')}{pick ? ` (+${takings(pick)} ¤)` : ''}
        </button>
      </div>
    </>
  );
}

function Exhibit({ game, you, act }: Props) {
  const { t } = useLang();
  const [pick, setPick] = useState<CardId | null>(null);
  // Same order as the Renovation list: biggest payout first, ties to the pricier card.
  const candidates = [...exhibitCandidates(game, you)].sort(
    (a, b) => activationValue(game, you, b) - activationValue(game, you, a) || CARD_BY_ID[b].cost - CARD_BY_ID[a].cost
  );

  return (
    <>
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
        <button
          type="button"
          className="primary"
          disabled={!pick}
          onClick={() => pick && act({ t: 'exhibit', cardId: pick })}
        >
          {t('ui.activateIt')}{pick ? ` (+${activationValue(game, you, pick)} ¤)` : ''}
        </button>
      </div>
    </>
  );
}

/** The nudge an arrow key gives the window, and a bigger one with Shift held. */
const STEP = 24;
const STRIDE = 96;

/** The card effects that stop the turn for a decision. */
export default function ChoiceModal(props: Props) {
  const { lang, t } = useLang();
  const { game, you } = props;
  const drag = useWindowDrag();
  const panel =
    game.phase === 'trade'
      ? { title: 'ui.bcTitle', body: <Trade {...props} /> }
      : game.phase === 'moving'
        ? { title: 'ui.movingTitle', body: <Moving {...props} /> }
        : game.phase === 'renovation'
          ? { title: 'ui.renovationTitle', body: <Renovation {...props} /> }
          : game.phase === 'exhibit'
            ? { title: 'ui.exhibitTitle', body: <Exhibit {...props} /> }
            : null;

  if (!panel) return null;
  const closed = (Object.keys(you.closed) as CardId[]).filter((id) => closedCopies(you, id) > 0);

  const onGripKey = (event: ReactKeyboardEvent) => {
    const step = event.shiftKey ? STRIDE : STEP;
    const by: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const move = by[event.key];
    if (!move) return;
    event.preventDefault();
    drag.nudge(move[0], move[1]);
  };

  // No scrim and no backdrop catching clicks: these windows cover half the board,
  // and the whole point of being able to shove one aside is to read what is under it.
  return (
    <div className="modal-layer">
      <div className="modal choice-window" ref={drag.ref} style={drag.style}>
        <div className={drag.dragging ? 'window-bar dragging' : 'window-bar'} {...drag.handle}>
          <h2>{t(panel.title)}</h2>
          <button
            type="button"
            className="window-grip"
            aria-label={t('ui.moveWindow')}
            title={t('ui.moveWindow')}
            onKeyDown={onGripKey}
          >
            ⠿
          </button>
        </div>
        <div className="window-body">
          {panel.body}
          {closed.length > 0 && (
            <p className="muted small-note">
              {t('ui.closedList', { cards: closed.map((id) => cardName(lang, id)).join(', ') })}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
