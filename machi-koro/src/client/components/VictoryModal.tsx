import { useState } from 'react';
import type { GameState } from '../../shared/types';
import type { MayorId } from '../../shared/mayors';
import type { ClientMessage, RoomView } from '../../shared/protocol';
import { winLandmarks } from '../../shared/cards';
import { landmarkCount } from '../../shared/engine';
import { mayorIcon, mayorName, mayorText } from '../../shared/i18n';
import { useLang } from '../lang';
import MayorPicker from './MayorPicker';

interface Props {
  game: GameState;
  room: RoomView;
  youId: string;
  isHost: boolean;
  onClose: () => void;
  onStats: () => void;
  send: (msg: ClientMessage) => void;
}

export default function VictoryModal({ game, room, youId, isHost, onClose, onStats, send }: Props) {
  const { lang, t } = useLang();
  const winner = game.players.find((p) => p.id === game.winnerId) ?? game.players[0];
  const you = game.players.find((p) => p.id === youId);
  const yourSeat = room.seats.find((s) => s.id === youId);
  const currentMayor: MayorId = yourSeat?.mayor ?? you?.mayor ?? 'agronomist';

  const [activeTab, setActiveTab] = useState<'winner' | 'mayor'>('winner');

  const totalLandmarks = winLandmarks(game.rules).length;
  const isWinnerYou = winner.id === youId;

  // Rank players: winner is #1, then by landmarks built desc, then coins desc, then earned desc
  const rankedPlayers = [...game.players].sort((a, b) => {
    if (a.id === game.winnerId) return -1;
    if (b.id === game.winnerId) return 1;
    const aLm = landmarkCount(game, a);
    const bLm = landmarkCount(game, b);
    if (bLm !== aLm) return bLm - aLm;
    if (b.coins !== a.coins) return b.coins - a.coins;
    return b.stats.earned - a.stats.earned;
  });

  return (
    <div className="modal-backdrop victory-backdrop" onClick={onClose}>
      <div className="modal victory-modal" onClick={(e) => e.stopPropagation()}>
        <div className="victory-confetti-container" aria-hidden="true">
          <span className="confetti c1">🎉</span>
          <span className="confetti c2">✨</span>
          <span className="confetti c3">⭐</span>
          <span className="confetti c4">🎊</span>
          <span className="confetti c5">🏆</span>
          <span className="confetti c6">✨</span>
        </div>

        <div className="victory-header">
          <div className="victory-trophy-badge">🏆</div>
          <h2 className="victory-title">{t('ui.victoryTitle')}</h2>
          <p className="victory-winner-announcement">
            <span className="winner-highlight-name">{winner.name}</span>{' '}
            {isWinnerYou ? '— вы одержали блестящую победу!' : 'побеждает в этой партии!'}
          </p>
        </div>

        {game.rules.mayors && (
          <div className="victory-nav-tabs">
            <button
              type="button"
              className={`tab-button ${activeTab === 'winner' ? 'active' : ''}`}
              onClick={() => setActiveTab('winner')}
            >
              🏆 {t('ui.showVictory')}
            </button>
            <button
              type="button"
              className={`tab-button ${activeTab === 'mayor' ? 'active' : ''}`}
              onClick={() => setActiveTab('mayor')}
            >
              🎭 {t('ui.nextMayorTitle')}
            </button>
          </div>
        )}

        {activeTab === 'winner' ? (
          <div className="victory-body">
            <div className="victory-card-card">
              <div className="winner-details-grid">
                <div className="winner-stat-card">
                  <span className="stat-icon">🏛️</span>
                  <span className="stat-label">Достопримечательности</span>
                  <span className="stat-value">{totalLandmarks} / {totalLandmarks}</span>
                </div>
                <div className="winner-stat-card">
                  <span className="stat-icon">🪙</span>
                  <span className="stat-label">Казна победителя</span>
                  <span className="stat-value">{winner.coins} ¤</span>
                </div>
                <div className="winner-stat-card">
                  <span className="stat-icon">⏱️</span>
                  <span className="stat-label">Длительность</span>
                  <span className="stat-value">{game.turnCount} ходов</span>
                </div>
                <div className="winner-stat-card">
                  <span className="stat-icon">🎲</span>
                  <span className="stat-label">Бросков кубиков</span>
                  <span className="stat-value">{winner.stats.rolls}</span>
                </div>
              </div>

              {winner.mayor && (
                <div className="winner-mayor-highlight">
                  <span className="winner-mayor-badge-icon">{mayorIcon(winner.mayor)}</span>
                  <div className="winner-mayor-info">
                    <div className="winner-mayor-label">{t('ui.winnerMayor')}: <b>{mayorName(lang, winner.mayor)}</b></div>
                    <div className="winner-mayor-desc">{mayorText(lang, winner.mayor, game.players.length)}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Standings table for all players and their mayors */}
            <div className="victory-standings">
              <div className="victory-standings-head">
                <span className="victory-standings-title">🏙️ {t('ui.matchStandings')}</span>
              </div>
              <div className="victory-standings-scroll">
                <table className="victory-standings-table">
                  <thead>
                    <tr>
                      <th className="th-rank">#</th>
                      <th className="th-player">{t('ui.colPlayer')}</th>
                      {game.rules.mayors && <th className="th-mayor">{t('ui.colMayor')}</th>}
                      <th className="th-lm">🏛️</th>
                      <th className="th-coins">🪙</th>
                      <th className="th-earned">{t('ui.colEarned')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rankedPlayers.map((p, idx) => {
                      const isWinner = p.id === game.winnerId;
                      const isYou = p.id === youId;
                      const builtLm = landmarkCount(game, p);
                      return (
                        <tr key={p.id} className={`${isWinner ? 'winner-row' : ''} ${isYou ? 'you-row' : ''}`}>
                          <td className="td-rank">
                            <span className={`rank-badge ${isWinner ? 'rank-1' : idx === 1 ? 'rank-2' : idx === 2 ? 'rank-3' : 'rank-other'}`}>
                              {isWinner ? '🏆 1' : `${idx + 1}`}
                            </span>
                          </td>
                          <td className="td-player">
                            <span className="player-cell-wrap">
                              <span className="player-name-val">{p.name}</span>
                              {isYou && <span className="tag you-tag">{t('ui.you')}</span>}
                              {p.isBot && <span className="tag bot">{t('ui.bot')}</span>}
                            </span>
                          </td>
                          {game.rules.mayors && (
                            <td className="td-mayor">
                              {p.mayor ? (
                                <span
                                  className="tag mayor-badge mayor-standings-badge"
                                  tabIndex={0}
                                  role="button"
                                  aria-label={`${mayorName(lang, p.mayor)}: ${mayorText(lang, p.mayor, game.players.length)}`}
                                >
                                  <span className="mayor-badge-icon">{mayorIcon(p.mayor)}</span>
                                  <span className="mayor-title-text">{mayorName(lang, p.mayor)}</span>
                                  <span className="mayor-tooltip">
                                    <strong>{mayorIcon(p.mayor)} {mayorName(lang, p.mayor)}</strong>
                                    <p>{mayorText(lang, p.mayor, game.players.length)}</p>
                                  </span>
                                </span>
                              ) : (
                                <span className="muted">—</span>
                              )}
                            </td>
                          )}
                          <td className="td-lm">
                            <b>{builtLm}</b>/{totalLandmarks}
                          </td>
                          <td className="td-coins coins">
                            {p.coins}
                          </td>
                          <td className="td-earned stat-pos">
                            +{p.stats.earned}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {game.rules.mayors && (
              <div className="next-game-mayor-preview">
                <div className="next-mayor-prompt">
                  <span>🎭 Ваш выбор на следующий матч: <b>{mayorName(lang, currentMayor)}</b> {mayorIcon(currentMayor)}</span>
                  <button type="button" className="ghost small" onClick={() => setActiveTab('mayor')}>
                    Сменить Мэра ➔
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="victory-body victory-mayor-tab">
            <div className="victory-mayor-chooser">
              <MayorPicker
                selected={currentMayor}
                onChange={(m) => send({ t: 'setMayor', mayor: m })}
                players={game.players.length}
              />
            </div>
          </div>
        )}

        <div className="victory-actions">
          <button type="button" className="ghost" onClick={onStats}>
            📊 {t('ui.statsButton')}
          </button>
          <button type="button" className="ghost" onClick={onClose}>
            🔍 {t('ui.inspectBoard')}
          </button>
          {isHost ? (
            <>
              <button type="button" className="secondary" onClick={() => send({ t: 'toLobby' })}>
                🏠 {t('ui.toLobby')}
              </button>
              <button type="button" className="primary pulse-btn" onClick={() => send({ t: 'rematch' })}>
                🔄 {t('ui.playAgain')}
              </button>
            </>
          ) : (
            <span className="muted rematch-waiting-badge">{t('ui.waitingRematch')}</span>
          )}
        </div>
      </div>
    </div>
  );
}
