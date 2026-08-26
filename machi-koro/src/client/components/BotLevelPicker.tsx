import { BOT_LEVELS, type BotLevel } from '../../shared/protocol';
import { useLang } from '../lang';

interface Props {
  level: BotLevel;
  onChange: (level: BotLevel) => void;
  disabled?: boolean;
}

/**
 * How hard the bots play.
 *
 * Both strategies were already in the repo — the hand-written one the bot
 * shipped with, and the one self-play produced, which beats it 54% to 46% and
 * takes 14% off it head to head. Letting the host pick between them costs
 * nothing and gives a table of beginners an opponent they can actually beat.
 */
export default function BotLevelPicker({ level, onChange, disabled }: Props) {
  const { t } = useLang();

  const options: Record<BotLevel, { name: string; blurb: string }> = {
    casual: { name: t('ui.botCasual'), blurb: t('ui.botCasualBlurb') },
    trained: { name: t('ui.botTrained'), blurb: t('ui.botTrainedBlurb') },
  };

  return (
    <div className="rules-picker">
      <h3>{t('ui.botLevel')}</h3>
      <div className="choices">
        {BOT_LEVELS.map((option) => (
          <button
            type="button"
            key={option}
            disabled={disabled}
            className={option === level ? 'chip on' : 'chip'}
            aria-pressed={option === level}
            onClick={() => onChange(option)}
          >
            {options[option].name}
            <small>{options[option].blurb}</small>
          </button>
        ))}
      </div>
    </div>
  );
}
