import type { CardDef } from '../../shared/cards';
import { useLang } from '../lang';
import { usePrefs, type CardView } from '../prefs';

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
 * Filter, sort and view mode for the supply.
 */
export default function BoardControls({ filter, sort, onFilter, onSort, shown, total }: Props) {
  const { t } = useLang();
  const { cardView, setCardView } = usePrefs();

  const views: { key: CardView; label: string; icon: string }[] = [
    { key: 'visual', label: t('ui.viewVisual'), icon: '🃏' },
    { key: 'classic', label: t('ui.viewClassic'), icon: '📋' },
  ];

  const filters: { key: BoardFilter; label: string }[] = [
    { key: 'all', label: t('ui.filterAll') },
    { key: 'affordable', label: t('ui.filterAffordable') },
  ];
  const sorts: { key: BoardSort; label: string }[] = [
    { key: 'number', label: t('ui.sortByNumber') },
    { key: 'cost', label: t('ui.sortByCost') },
    { key: 'colour', label: t('ui.sortByColour') },
  ];

  return (
    <div className="board-controls">
      <div className="board-group" role="group" aria-label={t('ui.viewModeLabel')}>
        <span className="muted">{t('ui.viewModeLabel')}</span>
        {views.map((option) => (
          <button
            type="button"
            key={option.key}
            className={option.key === cardView ? 'chip on' : 'chip'}
            aria-pressed={option.key === cardView}
            onClick={() => setCardView(option.key)}
          >
            <span aria-hidden="true" style={{ marginRight: 4 }}>{option.icon}</span>
            {option.label}
          </button>
        ))}
      </div>

      <div className="board-group" role="group" aria-label={t('ui.filterLabel')}>
        <span className="muted">{t('ui.filterLabel')}</span>
        {filters.map((option) => (
          <button
            type="button"
            key={option.key}
            className={option.key === filter ? 'chip on' : 'chip'}
            aria-pressed={option.key === filter}
            onClick={() => onFilter(option.key)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="board-group" role="group" aria-label={t('ui.sortLabel')}>
        <span className="muted">{t('ui.sortLabel')}</span>
        {sorts.map((option) => (
          <button
            type="button"
            key={option.key}
            className={option.key === sort ? 'chip on' : 'chip'}
            aria-pressed={option.key === sort}
            onClick={() => onSort(option.key)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <span className="muted board-count">{t('ui.boardShowing', { shown, total })}</span>
    </div>
  );
}
