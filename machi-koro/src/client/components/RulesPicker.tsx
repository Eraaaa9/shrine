import { cardsFor, maxPlayers, winLandmarks, type RuleSet } from '../../shared/cards';

interface Props {
  rules: RuleSet;
  onChange: (rules: RuleSet) => void;
  disabled?: boolean;
}

export default function RulesPicker({ rules, onChange, disabled }: Props) {
  const set = (patch: Partial<RuleSet>) => {
    const next = { ...rules, ...patch };
    // the variable supply is what makes a 39-card game playable
    if (patch.millionaires === true) next.variableSupply = true;
    onChange(next);
  };

  return (
    <div className="rules-picker">
      <div className="choices">
        <button
          type="button"
          disabled={disabled}
          className={rules.harbor ? 'chip on' : 'chip'}
          onClick={() => set({ harbor: !rules.harbor })}
        >
          Harbor expansion <span className="switch">{rules.harbor ? 'on' : 'off'}</span>
          <small>Boats, City Hall, Airport, and a 5th seat</small>
        </button>
        <button
          type="button"
          disabled={disabled}
          className={rules.millionaires ? 'chip on' : 'chip'}
          onClick={() => set({ millionaires: !rules.millionaires })}
        >
          Millionaire’s Row <span className="switch">{rules.millionaires ? 'on' : 'off'}</span>
          <small>Wineries, demolition, renovation, Tech Startup</small>
        </button>
        <button
          type="button"
          disabled={disabled}
          className={rules.variableSupply ? 'chip on' : 'chip'}
          onClick={() => set({ variableSupply: !rules.variableSupply })}
        >
          Variable supply <span className="switch">{rules.variableSupply ? 'on' : 'off'}</span>
          <small>Only 10 different cards on offer at a time, refilled from a deck</small>
        </button>
      </div>
      <p className="muted rules-summary">
        {cardsFor(rules).length} establishments · {winLandmarks(rules).length} landmarks to win · up to{' '}
        {maxPlayers(rules)} players
      </p>
    </div>
  );
}
