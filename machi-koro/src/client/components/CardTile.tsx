import { useState } from 'react';
import { ICON_GLYPH, type CardDef } from '../../shared/cards';
import { cardName, cardText } from '../../shared/i18n';
import { getCardEmoji } from '../cardVisuals';
import { useLang } from '../lang';
import { usePrefs } from '../prefs';
import type { CardMark } from '../supplyMotion';

export function formatActivates(activates: number[]): string {
  if (activates.length === 1) return String(activates[0]);
  return `${activates[0]}–${activates[activates.length - 1]}`;
}

interface Props {
  card: CardDef;
  supply: number;
  owned: number;
  /**
   * Copies the rest of the table holds.
   */
  others: number;
  /** The card triggers on the total currently showing on the dice. */
  hot?: boolean;
  buyable?: boolean;
  /** What just happened to this stack under the variable supply, if anything. */
  mark?: CardMark;
  onBuy?: () => void;
}

export default function CardTile({ card, supply, owned, others, hot, buyable, mark, onBuy }: Props) {
  const { lang, t } = useLang();
  const { cardView } = usePrefs();
  const [flipped, setFlipped] = useState(false);

  const classes = ['card', card.color];
  if (hot) classes.push('hot');
  if (buyable) classes.push('buyable');
  if (supply <= 0) classes.push('empty');
  if (mark) classes.push(mark);
  if (cardView === 'visual') classes.push('visual-mode');
  if (flipped) classes.push('flipped');

  const name = cardName(lang, card.id);
  const text = cardText(lang, card.id);
  const emoji = getCardEmoji(card.id);
  const formattedAct = formatActivates(card.activates);

  // --- CLASSIC MODE (Plain Flat View) ---
  if (cardView === 'classic') {
    return (
      <button
        type="button"
        className={classes.join(' ')}
        disabled={!buyable}
        onClick={onBuy}
        title={text}
        aria-hidden={mark === 'gone' || undefined}
        aria-label={t('ui.cardAria', { name, activates: formattedAct, cost: card.cost })}
      >
        {mark === 'gone' && <span className="card-flag">{t('ui.soldOut')}</span>}
        {mark === 'fresh' && <span className="card-flag">{t('ui.newStack')}</span>}
        <span className="card-head">
          <span className="activates">{formattedAct}</span>
          <span className="icon">{ICON_GLYPH[card.icon]}</span>
          {card.cost < 0 ? (
            <span className="cost paid" title={t('ui.paidToBuild')}>
              +{-card.cost}
            </span>
          ) : (
            <span className="cost">{card.cost}</span>
          )}
        </span>
        <span className="card-name">{name}</span>
        <span className="card-text">{text}</span>
        <span className="card-foot">
          <span className="cards-left">{t('ui.cardsLeft', { n: supply })}</span>
          {owned > 0 && <span className="owned">{t('ui.youOwn', { n: owned })}</span>}
          {others > 0 && <span className="owned others">{t('ui.othersOwn', { n: others })}</span>}
        </span>
      </button>
    );
  }

  // --- VISUAL 3D FLIP MODE ---
  const handleCardClick = () => {
    setFlipped((prev) => !prev);
  };

  return (
    <div
      className={classes.join(' ')}
      aria-hidden={mark === 'gone' || undefined}
      aria-label={t('ui.cardAria', { name, activates: formattedAct, cost: card.cost })}
      onClick={handleCardClick}
      title={t('ui.flipToRead')}
    >
      {mark === 'gone' && <span className="card-flag">{t('ui.soldOut')}</span>}
      {mark === 'fresh' && <span className="card-flag">{t('ui.newStack')}</span>}

      <div className="card-3d-flipper">
        {/* FRONT FACE */}
        <div className="card-face card-face-front">
          <div className="card-head">
            <span className="activates">{formattedAct}</span>
            <span className="icon" title={card.icon}>{ICON_GLYPH[card.icon]}</span>
            {card.cost < 0 ? (
              <span className="cost paid" title={t('ui.paidToBuild')}>
                +{-card.cost}
              </span>
            ) : (
              <span className="cost">{card.cost}</span>
            )}
          </div>

          <div className="card-visual-center">
            <span className="card-big-emoji" aria-hidden="true">{emoji}</span>
            <span className="card-name">{name}</span>
          </div>

          <div className="card-foot">
            <div className="card-counts-row">
              <span className="cards-left">{t('ui.cardsLeft', { n: supply })}</span>
              {owned > 0 && <span className="owned">{t('ui.youOwn', { n: owned })}</span>}
              {others > 0 && <span className="owned others">{t('ui.othersOwn', { n: others })}</span>}
            </div>

            {buyable && onBuy && (
              <button
                type="button"
                className="card-buy-btn primary small"
                onClick={(e) => {
                  e.stopPropagation();
                  onBuy();
                }}
              >
                {t('ui.buyCard')}
              </button>
            )}
          </div>
        </div>

        {/* BACK FACE */}
        <div className="card-face card-face-back">
          <div className="card-back-head">
            <span className="activates">{formattedAct}</span>
            <span className="card-name-back">{name}</span>
            <span className="cost">{card.cost < 0 ? `+${-card.cost}` : card.cost}</span>
          </div>

          <div className="card-back-body">
            <div className="card-back-emoji-mini">{emoji}</div>
            <p className="card-back-text">{text}</p>
          </div>

          <div className="card-back-foot">
            <span className="card-back-hint muted">{t('ui.flipToRead')}</span>
            {buyable && onBuy && (
              <button
                type="button"
                className="card-buy-btn primary small"
                onClick={(e) => {
                  e.stopPropagation();
                  onBuy();
                }}
              >
                {t('ui.buyCard')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
