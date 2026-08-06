import { ICON_GLYPH, cardsFor, landmarksFor, type RuleSet } from '../../shared/cards';
import { closedCopies } from '../../shared/engine';
import type { PlayerState } from '../../shared/types';
import { formatActivates } from './CardTile';

interface Props {
  player: PlayerState;
  rules: RuleSet;
  isActive: boolean;
  isYou: boolean;
  connected: boolean;
  diceTotal: number;
}

export default function PlayerPanel({ player, rules, isActive, isYou, connected, diceTotal }: Props) {
  const owned = cardsFor(rules).filter((c) => (player.cards[c.id] ?? 0) > 0);
  const landmarks = landmarksFor(rules).filter((l) => !l.free);
  const built = landmarks.filter((l) => player.landmarks[l.id]).length;

  const classes = ['player'];
  if (isActive) classes.push('active');
  if (isYou) classes.push('you');

  return (
    <div className={classes.join(' ')}>
      <div className="player-head">
        <span className="dot" data-on={connected || player.isBot} />
        <span className="player-name">
          {player.name}
          {isYou && <span className="tag you-tag">you</span>}
          {player.isBot && <span className="tag bot">bot</span>}
        </span>
        {player.investment > 0 && (
          <span className="investment" title={`${player.investment} invested in the Tech Startup`}>
            🚀{player.investment}
          </span>
        )}
        <span className="coins" title="coins">
          {player.coins}
        </span>
      </div>

      <div className="landmarks">
        {landmarks.map((l) => (
          <span
            key={l.id}
            className={player.landmarks[l.id] ? 'lm built' : 'lm'}
            title={`${l.name} (${l.cost}) — ${l.text}`}
          >
            {l.name.split(' ')[0]}
            <em>{l.cost}</em>
          </span>
        ))}
        <span className="lm-count">
          {built}/{landmarks.length}
        </span>
      </div>

      <div className="owned-cards">
        {owned.map((c) => {
          const count = player.cards[c.id] ?? 0;
          const shut = closedCopies(player, c.id);
          const hot = diceTotal > 0 && c.activates.includes(diceTotal);
          const classNames = ['chip-card', c.color];
          if (hot) classNames.push('hot');
          if (shut >= count) classNames.push('shut');
          return (
            <span
              key={c.id}
              className={classNames.join(' ')}
              title={`${c.name} — ${c.text}${shut > 0 ? ` (${shut} closed for renovation)` : ''}`}
            >
              <b>{formatActivates(c.activates)}</b>
              {ICON_GLYPH[c.icon]}
              {count > 1 && <i>×{count}</i>}
              {shut > 0 && <span className="reno">🚧</span>}
            </span>
          );
        })}
        {owned.length === 0 && <span className="muted">no establishments</span>}
      </div>

      {isActive && <div className="turn-flag">taking their turn</div>}
    </div>
  );
}
