import type { CardDef } from '../../shared/cards';
import { useLang } from '../lang';
import { usePrefs } from '../prefs';

export type BoardFilter = 'all' | 'affordable';
export type BoardSort = 'number' | 'cost' | 'colour';

/** Reading order for a colour sort: what pays you, then what pays everyone else. */
const COLOUR_ORDER: Record<CardDef['color'], number> = { blue: 0, green: 1, purple: 2, red: 3 };

/**
 * Cards in the order the player asked for. `cardsFor` already hands them back
 * by activation number, which is the default and the one the physical game uses.
 */
export function sortCards(cards: CardDef[], sort: BoardSort): CardDef[] {
  if (sort === 'number') return cards;
  const copy = [...cards];
  if (sort === 'cost') return copy.sort((a, b) => a.cost - b.cost || a.activates[0] - b.activates[0]);
  return copy.sort(
    (a, b) => COLOUR_ORDER[a.color] - COLOUR_ORDER[b.color] || a.activates[0] - b.activates[0] || a.cost - b.cost
  );
}

interface Props {
  filter: BoardFilter;
  sort: BoardSort;
  onFilter: (filter: BoardFilter) => void;
  onSort: (sort: BoardSort) => void;
  shown: number;
  total: number;
}

/**
 * Streamlined, single-line compact filter and sort controls for the supply.
 */
export default function BoardControls({ filter, sort, onFilter, onSort, shown, total }: Props) {
  const { t } = useLang();
  const { cardView, setCardView } = usePrefs();

  const isVisual = cardView === 'visual';

  return (
    <div className="board-controls-compact" aria-label="Фильтры рынка">
      <div className="segmented-group" title={t('ui.viewModeLabel')}>
        <button
          type="button"
          className={isVisual ? 'seg-btn on' : 'seg-btn'}
          onClick={() => setCardView('visual')}
          title={t('ui.viewVisual')}
          aria-pressed={isVisual}
        >
          🃏
        </button>
        <button
          type="button"
          className={!isVisual ? 'seg-btn on' : 'seg-btn'}
          onClick={() => setCardView('classic')}
          title={t('ui.viewClassic')}
          aria-pressed={!isVisual}
        >
          📋
        </button>
      </div>

      <div className="segmented-group" title={t('ui.filterLabel')}>
        <button
          type="button"
          className={filter === 'all' ? 'seg-btn on' : 'seg-btn'}
          onClick={() => onFilter('all')}
          aria-pressed={filter === 'all'}
        >
          {t('ui.filterAll')}
        </button>
        <button
          type="button"
          className={filter === 'affordable' ? 'seg-btn on' : 'seg-btn'}
          onClick={() => onFilter('affordable')}
          aria-pressed={filter === 'affordable'}
        >
          💰 {t('ui.filterAffordable')}
        </button>
      </div>

      <div className="segmented-group" title={t('ui.sortLabel')}>
        <button
          type="button"
          className={sort === 'number' ? 'seg-btn on' : 'seg-btn'}
          onClick={() => onSort('number')}
          title={t('ui.sortByNumber')}
          aria-pressed={sort === 'number'}
        >
          🎲 №
        </button>
        <button
          type="button"
          className={sort === 'cost' ? 'seg-btn on' : 'seg-btn'}
          onClick={() => onSort('cost')}
          title={t('ui.sortByCost')}
          aria-pressed={sort === 'cost'}
        >
          🏷️ {t('ui.sortByCost')}
        </button>
        <button
          type="button"
          className={sort === 'colour' ? 'seg-btn on' : 'seg-btn'}
          onClick={() => onSort('colour')}
          title={t('ui.sortByColour')}
          aria-pressed={sort === 'colour'}
        >
          🎨 {t('ui.sortByColour')}
        </button>
      </div>

      <span className="board-count-pill">{t('ui.boardShowing', { shown, total })}</span>
    </div>
  );
}
