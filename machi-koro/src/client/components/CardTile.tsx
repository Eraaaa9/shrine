import { ICON_GLYPH, type CardDef } from '../../shared/cards';

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
  onBuy?: () => void;
}

export default function CardTile({ card, supply, owned, hot, buyable, onBuy }: Props) {
  const classes = ['card', card.color];
  if (hot) classes.push('hot');
  if (buyable) classes.push('buyable');
  if (supply <= 0) classes.push('empty');

  return (
    <button
      type="button"
      className={classes.join(' ')}
      disabled={!buyable}
      onClick={onBuy}
      title={card.text}
      aria-label={`${card.name}, activates on ${formatActivates(card.activates)}, costs ${card.cost}`}
    >
      <span className="card-head">
        <span className="activates">{formatActivates(card.activates)}</span>
        <span className="icon">{ICON_GLYPH[card.icon]}</span>
        {card.cost < 0 ? (
          <span className="cost paid" title="you are paid to build this">
            +{-card.cost}
          </span>
        ) : (
          <span className="cost">{card.cost}</span>
        )}
      </span>
      <span className="card-name">{card.name}</span>
      <span className="card-text">{card.text}</span>
      <span className="card-foot">
        <span>{supply} left</span>
        {owned > 0 && <span className="owned">you: {owned}</span>}
      </span>
    </button>
  );
}
