import { ICON_GLYPH, type CardDef } from '../../shared/cards';
import { cardName, cardText } from '../../shared/i18n';
import { useLang } from '../lang';
import type { CardMark } from '../supplyMotion';

export function formatActivates(activates: number[]): string {
  if (activates.length === 1) return String(activates[0]);
  return `${activates[0]}–${activates[activates.length - 1]}`;
}

interface Props {
  card: CardDef;
  supply: number;
  owned: number;
  /** The card triggers on the total currently showing on the dice. */
  hot?: boolean;
  buyable?: boolean;
  /** What just happened to this stack under the variable supply, if anything. */
  mark?: CardMark;
  onBuy?: () => void;
}

export default function CardTile({ card, supply, owned, hot, buyable, mark, onBuy }: Props) {
  const { lang, t } = useLang();
  const classes = ['card', card.color];
  if (hot) classes.push('hot');
  if (buyable) classes.push('buyable');
  if (supply <= 0) classes.push('empty');
  if (mark) classes.push(mark);

  const name = cardName(lang, card.id);

  return (
    <button
      type="button"
      className={classes.join(' ')}
      disabled={!buyable}
      onClick={onBuy}
      title={cardText(lang, card.id)}
      // A stack on its way out is already off the board as far as the rules go.
      aria-hidden={mark === 'gone' || undefined}
      aria-label={t('ui.cardAria', { name, activates: formatActivates(card.activates), cost: card.cost })}
    >
      {mark === 'gone' && <span className="card-flag">{t('ui.soldOut')}</span>}
      {mark === 'fresh' && <span className="card-flag">{t('ui.newStack')}</span>}
      <span className="card-head">
        <span className="activates">{formatActivates(card.activates)}</span>
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
      <span className="card-text">{cardText(lang, card.id)}</span>
      <span className="card-foot">
        <span className="cards-left">{t('ui.cardsLeft', { n: supply })}</span>
        {owned > 0 && <span className="owned">{t('ui.youOwn', { n: owned })}</span>}
      </span>
    </button>
  );
}
