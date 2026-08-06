import { landmarksFor } from '../../shared/cards';
import { canBuild, demolishable } from '../../shared/engine';
import type { ClientMessage } from '../../shared/protocol';
import type { GameAction, GameState, PlayerState } from '../../shared/types';

const DIE_FACE = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

interface Props {
  game: GameState;
  you: PlayerState | null;
  yourTurn: boolean;
  isHost: boolean;
  act: (action: GameAction) => void;
  send: (message: ClientMessage) => void;
}

export function phaseHint(game: GameState): string {
  const name = game.players[game.turn]?.name ?? '';
  switch (game.phase) {
    case 'roll':
      return `${name} is rolling`;
    case 'reroll':
      return `${name} may re-roll (Radio Tower)`;
    case 'harbor':
      return `${name} may use the Harbor`;
    case 'tv':
      return `${name} is choosing a TV Station target`;
    case 'trade':
      return `${name} is choosing a Business Center swap`;
    case 'moving':
      return `${name} is giving an establishment away`;
    case 'demolish':
      return `${name} must demolish a landmark`;
    case 'renovation':
      return `${name} is closing an establishment for renovation`;
    case 'exhibit':
      return `${name} is using the Exhibit Hall`;
    case 'invest':
      return `${name} may invest in the Tech Startup`;
    case 'build':
      return `${name} is building`;
    case 'over':
      return 'Game over';
  }
}

export default function Controls({ game, you, yourTurn, isHost, act, send }: Props) {
  const active = game.players[game.turn];
  const opponents = game.players.filter((p) => p.id !== you?.id);
  const landmarks = landmarksFor(game.rules);

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
            <span className="winner">🏆 {game.players.find((p) => p.id === game.winnerId)?.name} wins!</span>
            {isHost ? (
              <button type="button" className="primary" onClick={() => send({ t: 'rematch' })}>
                Play again
              </button>
            ) : (
              <span className="muted">Waiting for the host to start a rematch…</span>
            )}
          </>
        ) : !yourTurn ? (
          <span className="muted">{phaseHint(game)}…</span>
        ) : (
          <>
            {game.phase === 'roll' && (
              <>
                <span className="prompt">Your turn — roll:</span>
                <button type="button" className="primary" onClick={() => act({ t: 'roll', dice: 1 })}>
                  Roll 1 die
                </button>
                <button
                  type="button"
                  className="primary"
                  disabled={!you?.landmarks.train_station}
                  title={you?.landmarks.train_station ? '' : 'Needs the Train Station'}
                  onClick={() => act({ t: 'roll', dice: 2 })}
                >
                  Roll 2 dice
                </button>
              </>
            )}

            {game.phase === 'reroll' && (
              <>
                <span className="prompt">Radio Tower — re-roll?</span>
                <button type="button" onClick={() => act({ t: 'reroll', again: false })}>
                  Keep {game.diceTotal}
                </button>
                <button type="button" className="primary" onClick={() => act({ t: 'reroll', again: true })}>
                  Re-roll
                </button>
              </>
            )}

            {game.phase === 'harbor' && (
              <>
                <span className="prompt">Harbor — add 2 to the total?</span>
                <button type="button" onClick={() => act({ t: 'harbor', add: false })}>
                  Keep {game.diceTotal}
                </button>
                <button type="button" className="primary" onClick={() => act({ t: 'harbor', add: true })}>
                  Make it {game.diceTotal + 2}
                </button>
              </>
            )}

            {game.phase === 'tv' && (
              <>
                <span className="prompt">TV Station — take 5 coins from:</span>
                {opponents.map((p) => (
                  <button type="button" key={p.id} className="primary" onClick={() => act({ t: 'tv', targetId: p.id })}>
                    {p.name} <em>({p.coins})</em>
                  </button>
                ))}
              </>
            )}

            {game.phase === 'demolish' && you && (
              <>
                <span className="prompt">Demolition Company — knock one down for 8 coins:</span>
                {demolishable(game, you).map((id) => (
                  <button
                    type="button"
                    key={id}
                    className="landmark-buy"
                    onClick={() => act({ t: 'demolish', landmarkId: id })}
                  >
                    {landmarks.find((l) => l.id === id)!.name} <em>{landmarks.find((l) => l.id === id)!.cost}</em>
                  </button>
                ))}
              </>
            )}

            {game.phase === 'invest' && you && (
              <>
                <span className="prompt">Tech Startup — invested {you.investment}. Add another coin?</span>
                <button type="button" className="primary" onClick={() => act({ t: 'invest', amount: 1 })}>
                  Invest 1
                </button>
                <button type="button" onClick={() => act({ t: 'invest', amount: 0 })}>
                  End turn
                </button>
              </>
            )}

            {(game.phase === 'trade' || game.phase === 'moving' || game.phase === 'renovation' || game.phase === 'exhibit') && (
              <span className="prompt">{phaseHint(game)}…</span>
            )}

            {game.phase === 'build' && you && (
              <>
                <span className="prompt">Buy a card, build a landmark, or end your turn:</span>
                {landmarks
                  .filter((l) => !l.free && !you.landmarks[l.id])
                  .map((l) => (
                    <button
                      type="button"
                      key={l.id}
                      className="landmark-buy"
                      disabled={!canBuild(game, you, l.id)}
                      title={l.text}
                      onClick={() => act({ t: 'landmark', landmarkId: l.id })}
                    >
                      {l.name} <em>{l.cost}</em>
                    </button>
                  ))}
                <button type="button" className="ghost" onClick={() => act({ t: 'pass' })}>
                  {you.landmarks.airport ? 'End turn (+10 Airport)' : 'End turn'}
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
            <span className="muted">your coins</span>
          </>
        ) : (
          <span className="muted">spectating {active.name}</span>
        )}
      </div>
    </div>
  );
}
