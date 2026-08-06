import { landmarksFor } from '../../shared/cards';
import { canBuild, demolishable } from '../../shared/engine';
import { landmarkName, landmarkText, type Lang } from '../../shared/i18n';
import type { ClientMessage } from '../../shared/protocol';
import type { GameAction, GameState, PlayerState } from '../../shared/types';
import { useLang } from '../lang';

const DIE_FACE = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

interface Props {
  game: GameState;
  you: PlayerState | null;
  yourTurn: boolean;
  isHost: boolean;
  act: (action: GameAction) => void;
  send: (message: ClientMessage) => void;
}

/** Translation key describing what the table is waiting for. */
export function phaseKey(game: GameState): string {
  return `ui.phase.${game.phase}`;
}

export function phaseHint(
  game: GameState,
  t: (key: string, params?: Record<string, string | number>) => string
): string {
  return t(phaseKey(game), { player: game.players[game.turn]?.name ?? '' });
}

export default function Controls({ game, you, yourTurn, isHost, act, send }: Props) {
  const { lang, t } = useLang();
  const active = game.players[game.turn];
  const opponents = game.players.filter((p) => p.id !== you?.id);
  const landmarks = landmarksFor(game.rules);
  const modalPhase = ['trade', 'moving', 'renovation', 'exhibit'].includes(game.phase);

  return (
    <div className="controls">
      <div className="dice-tray">
        {game.dice.map((d, i) => (
          <span key={i} className="die-face">
            {DIE_FACE[d]}
          </span>
        ))}
        {game.dice.length > 0 && <span className="dice-total">{game.diceTotal}</span>}
      </div>

      <div className="actions">
        {game.phase === 'over' ? (
          <>
            <span className="winner">
              {t('ui.wins', { player: game.players.find((p) => p.id === game.winnerId)?.name ?? '' })}
            </span>
            {isHost ? (
              <button type="button" className="primary" onClick={() => send({ t: 'rematch' })}>
                {t('ui.playAgain')}
              </button>
            ) : (
              <span className="muted">{t('ui.waitingRematch')}</span>
            )}
          </>
        ) : !yourTurn ? (
          <span className="muted">{phaseHint(game, t)}…</span>
        ) : (
          <>
            {game.phase === 'roll' && (
              <>
                <span className="prompt">{t('ui.rollPrompt')}</span>
                <button type="button" className="primary" onClick={() => act({ t: 'roll', dice: 1 })}>
                  {t('ui.rollOne')}
                </button>
                <button
                  type="button"
                  className="primary"
                  disabled={!you?.landmarks.train_station}
                  title={you?.landmarks.train_station ? '' : t('ui.needsTrainStation')}
                  onClick={() => act({ t: 'roll', dice: 2 })}
                >
                  {t('ui.rollTwo')}
                </button>
              </>
            )}

            {game.phase === 'reroll' && (
              <>
                <span className="prompt">{t('ui.rerollPrompt')}</span>
                <button type="button" onClick={() => act({ t: 'reroll', again: false })}>
                  {t('ui.keepTotal', { total: game.diceTotal })}
                </button>
                <button type="button" className="primary" onClick={() => act({ t: 'reroll', again: true })}>
                  {t('ui.reroll')}
                </button>
              </>
            )}

            {game.phase === 'harbor' && (
              <>
                <span className="prompt">{t('ui.harborPrompt')}</span>
                <button type="button" onClick={() => act({ t: 'harbor', add: false })}>
                  {t('ui.keepTotal', { total: game.diceTotal })}
                </button>
                <button type="button" className="primary" onClick={() => act({ t: 'harbor', add: true })}>
                  {t('ui.makeIt', { total: game.diceTotal + 2 })}
                </button>
              </>
            )}

            {game.phase === 'tv' && (
              <>
                <span className="prompt">{t('ui.tvPrompt')}</span>
                {opponents.map((p) => (
                  <button type="button" key={p.id} className="primary" onClick={() => act({ t: 'tv', targetId: p.id })}>
                    {p.name} <em>({p.coins})</em>
                  </button>
                ))}
              </>
            )}

            {game.phase === 'demolish' && you && (
              <>
                <span className="prompt">{t('ui.demolishPrompt')}</span>
                {demolishable(game, you).map((id) => (
                  <button
                    type="button"
                    key={id}
                    className="landmark-buy"
                    onClick={() => act({ t: 'demolish', landmarkId: id })}
                  >
                    {landmarkName(lang as Lang, id)} <em>{landmarks.find((l) => l.id === id)!.cost}</em>
                  </button>
                ))}
              </>
            )}

            {game.phase === 'invest' && you && (
              <>
                <span className="prompt">{t('ui.investPrompt', { n: you.investment })}</span>
                <button type="button" className="primary" onClick={() => act({ t: 'invest', amount: 1 })}>
                  {t('ui.investOne')}
                </button>
                <button type="button" onClick={() => act({ t: 'invest', amount: 0 })}>
                  {t('ui.endTurn')}
                </button>
              </>
            )}

            {modalPhase && <span className="prompt">{phaseHint(game, t)}…</span>}

            {game.phase === 'build' && you && (
              <>
                <span className="prompt">{t('ui.buildPrompt')}</span>
                {landmarks
                  .filter((l) => !l.free && !you.landmarks[l.id])
                  .map((l) => (
                    <button
                      type="button"
                      key={l.id}
                      className="landmark-buy"
                      disabled={!canBuild(game, you, l.id)}
                      title={landmarkText(lang, l.id)}
                      onClick={() => act({ t: 'landmark', landmarkId: l.id })}
                    >
                      {landmarkName(lang, l.id)} <em>{l.cost}</em>
                    </button>
                  ))}
                <button type="button" className="ghost" onClick={() => act({ t: 'pass' })}>
                  {you.landmarks.airport ? t('ui.endTurnAirport') : t('ui.endTurn')}
                </button>
              </>
            )}
          </>
        )}
      </div>

      <div className="you-coins">
        {you ? (
          <>
            <span className="coins big">{you.coins}</span>
            <span className="muted">{t('ui.yourCoins')}</span>
          </>
        ) : (
          <span className="muted">{t('ui.spectating', { player: active.name })}</span>
        )}
      </div>
    </div>
  );
}
