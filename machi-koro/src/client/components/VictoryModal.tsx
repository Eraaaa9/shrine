import { useState } from 'react';
import type { GameState } from '../../shared/types';
import type { MayorId } from '../../shared/mayors';
import type { ClientMessage, RoomView } from '../../shared/protocol';
import { winLandmarks } from '../../shared/cards';
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
