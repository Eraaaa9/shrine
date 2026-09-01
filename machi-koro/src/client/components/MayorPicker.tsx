import { MAYORS, type MayorId } from '../../shared/mayors';
import { mayorIcon, mayorName, mayorText } from '../../shared/i18n';
import { useLang } from '../lang';

interface Props {
  selected: MayorId;
  onChange: (mayor: MayorId) => void;
  /** Seats at the table: the abilities are worth different numbers at each size. */
  players: number;
  disabled?: boolean;
}

export default function MayorPicker({ selected, onChange, players, disabled }: Props) {
  const { lang, t } = useLang();

  return (
    <div className="mayor-picker">
      <div className="mayor-picker-head">
        <h3>{t('ui.chooseMayorTitle')}</h3>
        <p className="muted small-note">{t('ui.chooseMayorBlurb')}</p>
      </div>
      <div className="mayor-grid">
        {MAYORS.map((m) => {
          const isSelected = m.id === selected;
          return (
            <button
              type="button"
              key={m.id}
              disabled={disabled}
              className={`mayor-card ${isSelected ? 'selected' : ''}`}
              onClick={() => onChange(m.id)}
            >
              <div className="mayor-card-head">
                <span className="mayor-card-icon" aria-hidden="true">
                  {mayorIcon(m.id)}
                </span>
                <span className="mayor-card-name">{mayorName(lang, m.id)}</span>
                {isSelected && <span className="mayor-card-check">✓</span>}
              </div>
              <div className="mayor-card-desc">{mayorText(lang, m.id, players)}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
