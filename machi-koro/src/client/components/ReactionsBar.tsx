import { useState } from 'react';
import { useLang } from '../lang';

interface Props {
  onSendReaction: (emoji: string, text?: string) => void;
  disabled?: boolean;
}

interface QuickReaction {
  emoji: string;
  key: string;
}

const REACTIONS: QuickReaction[] = [
  { emoji: '🎲', key: 'ui.reactLuck' },
  { emoji: '😱', key: 'ui.reactOhNo' },
  { emoji: '😈', key: 'ui.reactThanks' },
  { emoji: '💸', key: 'ui.reactRobbed' },
  { emoji: '👑', key: 'ui.reactWinning' },
  { emoji: '🤝', key: 'ui.reactGg' },
  { emoji: '⏱️', key: 'ui.reactYourTurn' },
  { emoji: '🔥', key: 'ui.reactFire' },
];

export default function ReactionsBar({ onSendReaction, disabled }: Props) {
  const { t } = useLang();
  const [cooldown, setCooldown] = useState(false);

  const handleSend = (r: QuickReaction) => {
    if (disabled || cooldown) return;
    const label = t(r.key);
    onSendReaction(r.emoji, label);
    setCooldown(true);
    setTimeout(() => setCooldown(false), 1200);
  };

  return (
    <div className="reactions-bar" role="toolbar" aria-label={t('ui.reactionsTitle')}>
      <span className="reactions-label">{t('ui.reactionsTitle')}:</span>
      <div className="reactions-buttons">
        {REACTIONS.map((r) => (
          <button
            key={r.emoji}
            type="button"
            className={`reaction-btn ${cooldown ? 'cooldown' : ''}`}
            onClick={() => handleSend(r)}
            disabled={disabled || cooldown}
            title={t(r.key)}
            aria-label={t(r.key)}
          >
            <span className="reaction-emoji">{r.emoji}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
