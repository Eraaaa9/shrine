import { cardsFor, maxPlayers, winLandmarks, type RuleSet } from '../../shared/cards';
import { useLang } from '../lang';

interface Props {
  rules: RuleSet;
  onChange: (rules: RuleSet) => void;
  disabled?: boolean;
}

export default function RulesPicker({ rules, onChange, disabled }: Props) {
  const { t } = useLang();

  const set = (patch: Partial<RuleSet>) => {
    const next = { ...rules, ...patch };
    // the variable supply is what makes a 39-card game playable
    if (patch.millionaires === true) next.variableSupply = true;
    onChange(next);
  };

  const options: { key: keyof RuleSet; name: string; blurb: string }[] = [
    { key: 'harbor', name: t('ui.harborName'), blurb: t('ui.harborBlurb') },
    { key: 'millionaires', name: t('ui.rowName'), blurb: t('ui.rowBlurb') },
    { key: 'variableSupply', name: t('ui.supplyName'), blurb: t('ui.supplyBlurb') },
    { key: 'events', name: t('ui.eventsName'), blurb: t('ui.eventsBlurb') },
    { key: 'mayors', name: t('ui.mayorsName'), blurb: t('ui.mayorsBlurb') },
  ];

  return (
    <div className="rules-picker">
      <div className="choices">
        {options.map((option) => (
          <button
            type="button"
            key={option.key}
            disabled={disabled}
            className={rules[option.key] ? 'chip on' : 'chip'}
            onClick={() => set({ [option.key]: !rules[option.key] } as Partial<RuleSet>)}
          >
            {option.name} <span className="switch">{rules[option.key] ? t('ui.on') : t('ui.off')}</span>
            <small>{option.blurb}</small>
          </button>
        ))}
      </div>
      <p className="muted rules-summary">
        {t('ui.rulesSummary', {
          cards: cardsFor(rules).length,
          landmarks: winLandmarks(rules).length,
          players: maxPlayers(rules),
        })}
      </p>
    </div>
  );
}
