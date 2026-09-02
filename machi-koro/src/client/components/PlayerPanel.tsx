import { ICON_GLYPH, cardsFor, landmarksFor, type RuleSet } from '../../shared/cards';
import { closedCopies, landmarkCost } from '../../shared/engine';
import { cardName, cardText, landmarkName, landmarkShort, landmarkText, mayorIcon, mayorName, mayorText } from '../../shared/i18n';
import type { GameState, PlayerState } from '../../shared/types';
import type { ReactionLine } from '../../shared/protocol';
import type { CoinDelta } from '../coinMotion';
import { useLang } from '../lang';
import { formatActivates } from './CardTile';

interface Props {
  game: GameState;
  player: PlayerState;
  rules: RuleSet;
  isActive: boolean;
  isYou: boolean;
  connected: boolean;
  diceTotal: number;
  /** Coin swings to float over the panel, newest last. */
  deltas: CoinDelta[];
  /** Seconds until the server plays this seat's turn for them, if it is counting. */
  awaySeconds: number | null;
  /** Recent reactions in room */
  recentReactions?: ReactionLine[];
}

export default function PlayerPanel({
  game,
  player,
  rules,
  isActive,
  isYou,
  connected,
  diceTotal,
  deltas,
  awaySeconds,
  recentReactions,
}: Props) {
  const { lang, t } = useLang();
  const owned = cardsFor(rules).filter((c) => (player.cards[c.id] ?? 0) > 0);
  const landmarks = landmarksFor(rules).filter((l) => !l.free);
  const built = landmarks.filter((l) => player.landmarks[l.id]).length;

  const classes = ['player'];
  if (isActive) classes.push('active');
  if (isYou) classes.push('you');

  return (
    <div className={classes.join(' ')}>
      {/* Income is the point of a turn, and the log scrolling past was the only
          sign of it. Deltas are decorative here — the log says it in words. */}
      {deltas.length > 0 && (
        <span className="coin-deltas" aria-hidden="true">
          {deltas.map((delta) => (
            <span key={delta.key} className={delta.amount > 0 ? 'coin-delta up' : 'coin-delta down'}>
              {delta.amount > 0 ? `+${delta.amount}` : delta.amount}
            </span>
          ))}
        </span>
      )}

      {recentReactions && (
        <span className="player-reactions" aria-hidden="true">
          {recentReactions
            .filter((r) => r.fromId === player.id && Date.now() - r.at < 3500)
            .map((r) => (
              <span key={r.id} className="reaction-bubble" title={r.text}>
                <span className="reaction-bubble-emoji">{r.emoji}</span>
                {r.text && <span className="reaction-bubble-text">{r.text}</span>}
              </span>
            ))}
        </span>
      )}

      <div className="player-head">
        <span className="dot" data-on={connected || player.isBot} />
        <span className="player-name">
          <span className="player-name-text">{player.name}</span>
          {isYou && <span className="tag you-tag">{t('ui.you')}</span>}
          {player.isBot && <span className="tag bot">{t('ui.bot')}</span>}
          {player.mayor && (
            <span
              className="tag mayor-badge"
              tabIndex={0}
              role="button"
              aria-label={`${mayorName(lang, player.mayor)}: ${mayorText(lang, player.mayor, game.players.length)}`}
            >
              {mayorIcon(player.mayor)}
              <span className="mayor-title-text">{mayorName(lang, player.mayor)}</span>
              <span className="mayor-tooltip">
                <strong>{mayorIcon(player.mayor)} {mayorName(lang, player.mayor)}</strong>
                <p>{mayorText(lang, player.mayor, game.players.length)}</p>
              </span>
            </span>
          )}
        </span>
        {player.investment > 0 && (
          <span className="investment" title={t('ui.investedTitle', { n: player.investment })}>
            🚀{player.investment}
          </span>
        )}
        <span className="coins" data-player-purse={player.id}>{player.coins}</span>
      </div>

      {player.mayor && isYou && (
        <div className="player-mayor-summary" title={mayorText(lang, player.mayor, game.players.length)}>
          <span className="mayor-summary-icon">{mayorIcon(player.mayor)}</span>
          <span className="mayor-summary-text">{mayorText(lang, player.mayor, game.players.length)}</span>
        </div>
      )}

      <div className="landmarks">
        {landmarks.map((l) => {
          const cost = landmarkCost(game, player, l);
          const isDiscounted = cost < l.cost;
          return (
            <span
              key={l.id}
              className={player.landmarks[l.id] ? 'lm built' : isDiscounted ? 'lm discounted' : 'lm'}
              title={`${landmarkName(lang, l.id)} (${cost}) — ${landmarkText(lang, l.id)}`}
            >
              {landmarkShort(lang, l.id)}
              <em>
                {isDiscounted && <s className="lm-old-cost">{l.cost}</s>}
                {cost}
              </em>
            </span>
          );
        })}
      </div>

      {/* A bare "3/7" made you do the arithmetic to see who was about to win. */}
      <div
        className="lm-track"
        role="img"
        aria-label={t('ui.landmarkProgress', { built, total: landmarks.length })}
        title={t('ui.landmarkProgress', { built, total: landmarks.length })}
      >
        <span className="lm-fill" style={{ width: `${(built / landmarks.length) * 100}%` }} />
        <span className="lm-count" aria-hidden="true">
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
              title={`${cardName(lang, c.id)} — ${cardText(lang, c.id)}${
                shut > 0 ? ` ${t('ui.closedForRenovation', { n: shut })}` : ''
              }`}
            >
              <b>{formatActivates(c.activates)}</b>
              {ICON_GLYPH[c.icon]}
              {count > 1 && <i>×{count}</i>}
              {shut > 0 && <span className="reno">🚧</span>}
            </span>
          );
        })}
        {owned.length === 0 && <span className="muted">{t('ui.noEstablishments')}</span>}
      </div>

      {/* The 45-second grace period used to run invisibly, so a turn playing
          itself looked like a bug rather than a rule. */}
      {awaySeconds !== null && (
        <div className="away-flag">
          {awaySeconds > 0 ? t('ui.awayCountdown', { n: awaySeconds }) : t('ui.awayNow')}
        </div>
      )}

      {isActive && <div className="turn-flag">{t('ui.takingTurn')}</div>}
    </div>
  );
}
