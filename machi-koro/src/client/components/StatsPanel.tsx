import { useState } from 'react';
import { CARD_BY_ID, type CardId } from '../../shared/cards';
import { landmarkCount } from '../../shared/engine';
import { statName } from '../../shared/i18n';
import type { GameState, PlayerState, StatKey } from '../../shared/types';
import { useLang } from '../lang';

interface Props {
  game: GameState;
  youId: string | null;
  onClose: () => void;
}

interface Row {
  key: StatKey;
  hits: number;
  earned: number;
  /** What it cost to put on the table — for the Tech Startup, invested coins too. */
  cost: number;
  /** Coins it took back out of the owner's pocket — usually an opponent's copy billing them. */
  paid: number;
  net: number;
}

type TabKey = 'table' | 'charts' | 'awards';

const PLAYER_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];

/** One row per building that ever cost or made this player a coin, best first. */
function buildingRows(p: PlayerState): Row[] {
  return (Object.keys(p.stats.byKey) as StatKey[])
    .map((key) => {
      const s = p.stats.byKey[key]!;
      return { key, hits: s.hits, earned: s.earned, cost: s.spent, paid: s.lost, net: s.earned - s.spent - s.lost };
    })
    .filter((r) => r.hits > 0 || r.earned > 0 || r.cost > 0 || r.paid > 0)
    .sort((a, b) => b.net - a.net || b.earned - a.earned);
}

function averageRoll(p: PlayerState): string {
  return p.stats.rolls > 0 ? (p.stats.pips / p.stats.rolls).toFixed(1) : '—';
}

function Signed({ n }: { n: number }) {
  return <span className={n > 0 ? 'stat-pos' : n < 0 ? 'stat-neg' : 'muted'}>{n > 0 ? `+${n}` : n}</span>;
}

function swatch(key: StatKey): string {
  const card = CARD_BY_ID[key as CardId];
  return card ? `stat-swatch ${card.color}` : 'stat-swatch landmark';
}

export default function StatsPanel({ game, youId, onClose }: Props) {
  const { lang, t } = useLang();
  const [activeTab, setActiveTab] = useState<TabKey>('table');
  const winner = game.players.find((p) => p.id === game.winnerId);
  const seated = game.players.find((p) => p.id === youId);
  const [pick, setPick] = useState((seated ?? winner ?? game.players[0]).id);
  const shown = game.players.find((p) => p.id === pick) ?? game.players[0];
  const rows = buildingRows(shown);
  const best = rows.find((r) => r.net > 0);
  const worst = [...rows].reverse().find((r) => r.net < 0);
  const spent = shown.stats.spentOnCards + shown.stats.spentOnLandmarks;

  // --- Awards Calculations ---
  // 1. MVP Building across all players
  let mvpCard: { key: StatKey; net: number; ownerName: string } | null = null;
  for (const p of game.players) {
    for (const key of Object.keys(p.stats.byKey) as StatKey[]) {
      const s = p.stats.byKey[key]!;
      const net = s.earned - s.spent - s.lost;
      if (!mvpCard || net > mvpCard.net) {
        mvpCard = { key, net, ownerName: p.name };
      }
    }
  }

  // 2. Master Thief (highest stolenFromOthers)
  const sortedByStolen = [...game.players].sort(
    (a, b) => (b.stats.stolenFromOthers ?? 0) - (a.stats.stolenFromOthers ?? 0)
  );
  const topThief = sortedByStolen[0]?.stats.stolenFromOthers ? sortedByStolen[0] : null;

  // 3. Generous Patron (highest paidToOthers)
  const sortedByPaid = [...game.players].sort(
    (a, b) => (b.stats.paidToOthers ?? 0) - (a.stats.paidToOthers ?? 0)
  );
  const topPatron = sortedByPaid[0]?.stats.paidToOthers ? sortedByPaid[0] : null;

  // 4. Fortune's Favorite (highest average roll / doubles)
  const sortedByLuck = [...game.players].sort((a, b) => {
    const aAvg = a.stats.rolls > 0 ? a.stats.pips / a.stats.rolls : 0;
    const bAvg = b.stats.rolls > 0 ? b.stats.pips / b.stats.rolls : 0;
    return bAvg - aAvg;
  });
  const topLucky = sortedByLuck[0]?.stats.rolls > 0 ? sortedByLuck[0] : null;

  // 5. Master Architect (most landmarks)
  const sortedByLandmarks = [...game.players].sort(
    (a, b) => landmarkCount(game, b) - landmarkCount(game, a)
  );
  const topArchitect = sortedByLandmarks[0];

  // --- Timeline Chart Parameters ---
  const timeline = game.capitalTimeline && game.capitalTimeline.length > 0
    ? game.capitalTimeline
    : [{ turn: 0, round: 1, coins: Object.fromEntries(game.players.map((p) => [p.id, p.coins])) }];

  const maxCoins = Math.max(
    10,
    ...timeline.flatMap((snap) => Object.values(snap.coins))
  );

  const chartW = 560;
  const chartH = 200;
  const padL = 40;
  const padR = 20;
  const padT = 20;
  const padB = 30;
  const plotW = chartW - padL - padR;
  const plotH = chartH - padT - padB;

  // --- Dice Histogram Parameters ---
  const totalRolls = Object.values(game.diceHistogram || {}).reduce((a, b) => a + b, 0);
  const theoretical2d6: Record<number, number> = {
    2: 1 / 36,
    3: 2 / 36,
    4: 3 / 36,
    5: 4 / 36,
    6: 5 / 36,
    7: 6 / 36,
    8: 5 / 36,
    9: 4 / 36,
    10: 3 / 36,
    11: 2 / 36,
    12: 1 / 36,
  };

  const diceKeys = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const maxDiceCount = Math.max(1, ...Object.values(game.diceHistogram || {}));

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal stats" onClick={(e) => e.stopPropagation()}>
        <div className="stats-head">
          <h2>{t(game.phase === 'over' ? 'ui.statsTitle' : 'ui.statsTitleLive')}</h2>
          <button type="button" className="ghost small" onClick={onClose}>
            {t('ui.statsClose')}
          </button>
        </div>
        <p className="muted">{t('ui.statsTurnsPlayed', { n: game.turnCount })}</p>

        {/* Main Tabs Header */}
        <div className="stats-main-nav">
          <button
            type="button"
            className={`tab-btn ${activeTab === 'table' ? 'active' : ''}`}
            onClick={() => setActiveTab('table')}
          >
            📊 {t('ui.statsTabTable')}
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'charts' ? 'active' : ''}`}
            onClick={() => setActiveTab('charts')}
          >
            📈 {t('ui.statsTabCharts')}
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'awards' ? 'active' : ''}`}
            onClick={() => setActiveTab('awards')}
          >
            🏆 {t('ui.statsTabAwards')}
          </button>
        </div>

        {/* TAB 1: TABLE */}
        {activeTab === 'table' && (
          <>
            <div className="stats-scroll">
              <table className="stats-table">
                <thead>
                  <tr>
                    <th>{t('ui.colPlayer')}</th>
                    <th>{t('ui.colTurns')}</th>
                    <th>{t('ui.colEarned')}</th>
                    <th>{t('ui.colPaid')}</th>
                    <th>{t('ui.colSpent')}</th>
                    <th>{t('ui.colCoins')}</th>
                    <th>{t('ui.colAvgRoll')}</th>
                  </tr>
                </thead>
                <tbody>
                  {game.players.map((p) => (
                    <tr key={p.id} className={p.id === shown.id ? 'on' : undefined}>
                      <th scope="row">
                        {p.id === game.winnerId ? '🏆 ' : ''}
                        {p.name}
                        <i className="muted"> {t('ui.statsLandmarks', { n: landmarkCount(game, p) })}</i>
                      </th>
                      <td>{p.stats.turns}</td>
                      <td className="stat-pos">{p.stats.earned}</td>
                      <td className="stat-neg">{p.stats.lost}</td>
                      <td>{p.stats.spentOnCards + p.stats.spentOnLandmarks}</td>
                      <td className="coins">{p.coins}</td>
                      <td>{averageRoll(p)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="stats-tabs">
              {game.players.map((p) => (
                <button
                  type="button"
                  key={p.id}
                  className={p.id === shown.id ? 'chip on' : 'chip'}
                  onClick={() => setPick(p.id)}
                >
                  {p.name}
                </button>
              ))}
            </div>

            <p className="muted small-note">{t('ui.statsBlurb')}</p>

            <div className="stats-scroll">
              <table className="stats-table">
                <thead>
                  <tr>
                    <th>{t('ui.colBuilding')}</th>
                    <th>{t('ui.colHits')}</th>
                    <th>{t('ui.colCost')}</th>
                    <th>{t('ui.colEarned')}</th>
                    <th>{t('ui.colPaid')}</th>
                    <th>{t('ui.colNet')}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.key}>
                      <th scope="row">
                        <span className={swatch(r.key)} />
                        {statName(lang, r.key)}
                      </th>
                      <td>{r.hits > 0 ? `×${r.hits}` : '—'}</td>
                      <td className="muted">{r.cost}</td>
                      <td className={r.earned > 0 ? 'stat-pos' : 'muted'}>{r.earned}</td>
                      <td className={r.paid > 0 ? 'stat-neg' : 'muted'}>{r.paid}</td>
                      <td>
                        <Signed n={r.net} />
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={6} className="muted">
                        {t('ui.statsNoBuildings')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <ul className="stats-notes">
              {best && (
                <li>{t('ui.statsBest', { name: statName(lang, best.key), amount: best.net })}</li>
              )}
              {worst && (
                <li>{t('ui.statsWorst', { name: statName(lang, worst.key), amount: -worst.net })}</li>
              )}
              <li>
                {t('ui.statsEarnedSplit', {
                  bank: shown.stats.fromBank,
                  players: shown.stats.earned - shown.stats.fromBank,
                })}
              </li>
              <li>
                {t('ui.statsPaidSplit', {
                  bank: shown.stats.toBank,
                  players: shown.stats.lost - shown.stats.toBank,
                })}
              </li>
              <li>
                {t('ui.statsSpentSplit', {
                  total: spent,
                  cardCoins: shown.stats.spentOnCards,
                  cards: shown.stats.cardsBought,
                  landmarkCoins: shown.stats.spentOnLandmarks,
                })}
              </li>
              {shown.stats.invested > 0 && <li>{t('ui.statsInvested', { n: shown.stats.invested })}</li>}
              <li>{t('ui.statsPeak', { n: shown.stats.peakCoins })}</li>
            </ul>
          </>
        )}

        {/* TAB 2: CHARTS */}
        {activeTab === 'charts' && (
          <div className="stats-charts-container">
            {/* Chart 1: Wealth Timeline */}
            <div className="chart-card">
              <h3>{t('ui.chartCapitalTitle')}</h3>
              <div className="chart-legend">
                {game.players.map((p, idx) => (
                  <span key={p.id} className="chart-legend-item">
                    <span
                      className="legend-color-dot"
                      style={{ backgroundColor: PLAYER_COLORS[idx % PLAYER_COLORS.length] }}
                    />
                    {p.name} ({p.coins})
                  </span>
                ))}
              </div>
              <svg className="analytics-svg" viewBox={`0 0 ${chartW} ${chartH}`}>
                {/* Horizontal Grid lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
                  const y = padT + plotH * (1 - pct);
                  const val = Math.round(maxCoins * pct);
                  return (
                    <g key={pct}>
                      <line x1={padL} y1={y} x2={chartW - padR} y2={y} stroke="rgba(150, 150, 150, 0.2)" strokeDasharray="3 3" />
                      <text x={padL - 6} y={y + 4} textAnchor="end" fontSize="10" fill="currentColor" opacity="0.6">
                        {val}
                      </text>
                    </g>
                  );
                })}

                {/* Player Lines */}
                {game.players.map((p, pIdx) => {
                  const color = PLAYER_COLORS[pIdx % PLAYER_COLORS.length];
                  const points = timeline.map((snap, sIdx) => {
                    const x = padL + (timeline.length > 1 ? (sIdx / (timeline.length - 1)) * plotW : plotW / 2);
                    const c = snap.coins[p.id] ?? 0;
                    const y = padT + plotH * (1 - c / maxCoins);
                    return `${x},${y}`;
                  }).join(' ');

                  return (
                    <g key={p.id}>
                      <polyline
                        fill="none"
                        stroke={color}
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={points}
                      />
                      {timeline.map((snap, sIdx) => {
                        const x = padL + (timeline.length > 1 ? (sIdx / (timeline.length - 1)) * plotW : plotW / 2);
                        const c = snap.coins[p.id] ?? 0;
                        const y = padT + plotH * (1 - c / maxCoins);
                        return (
                          <circle
                            key={sIdx}
                            cx={x}
                            cy={y}
                            r="3.5"
                            fill={color}
                            stroke="#fff"
                            strokeWidth="1"
                          >
                            <title>{`${p.name} (T${snap.turn}): ${c} coins`}</title>
                          </circle>
                        );
                      })}
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Chart 2: Dice Histogram */}
            <div className="chart-card">
              <h3>{t('ui.chartDiceTitle')}</h3>
              <div className="chart-legend">
                <span className="chart-legend-item">
                  <span className="legend-color-dot" style={{ backgroundColor: '#3b82f6' }} />
                  {t('ui.chartCount')} ({totalRolls})
                </span>
                <span className="chart-legend-item">
                  <span className="legend-color-dot" style={{ backgroundColor: '#ef4444', borderRadius: '0' }} />
                  {t('ui.chartExpected')}
                </span>
              </div>
              <svg className="analytics-svg" viewBox={`0 0 ${chartW} ${chartH}`}>
                {/* Axes and Bars */}
                {diceKeys.map((k, idx) => {
                  const barW = 26;
                  const x = padL + idx * ((plotW - barW) / (diceKeys.length - 1));
                  const count = game.diceHistogram[k] ?? 0;
                  const barHeight = maxDiceCount > 0 ? (count / maxDiceCount) * plotH : 0;
                  const y = padT + plotH - barHeight;

                  // Expected height
                  const expPct = theoretical2d6[k] ?? (k <= 6 ? 1 / 6 : 0);
                  const expCount = totalRolls * expPct;
                  const expY = padT + plotH - (maxDiceCount > 0 ? (expCount / maxDiceCount) * plotH : 0);

                  return (
                    <g key={k}>
                      {/* Bar */}
                      <rect
                        x={x}
                        y={y}
                        width={barW}
                        height={barHeight}
                        fill="#3b82f6"
                        rx="3"
                        opacity="0.85"
                      >
                        <title>{`Roll ${k}: ${count} rolls (${totalRolls > 0 ? ((count / totalRolls) * 100).toFixed(1) : 0}%)`}</title>
                      </rect>
                      {/* Count label above bar */}
                      {count > 0 && (
                        <text x={x + barW / 2} y={y - 4} textAnchor="middle" fontSize="10" fill="currentColor">
                          {count}
                        </text>
                      )}
                      {/* Expected line marker */}
                      {totalRolls > 0 && (
                        <line
                          x1={x - 2}
                          y1={expY}
                          x2={x + barW + 2}
                          y2={expY}
                          stroke="#ef4444"
                          strokeWidth="2"
                        />
                      )}
                      {/* X label */}
                      <text x={x + barW / 2} y={chartH - 8} textAnchor="middle" fontSize="11" fontWeight="600" fill="currentColor">
                        {k}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        )}

        {/* TAB 3: AWARDS & MVP */}
        {activeTab === 'awards' && (
          <div className="stats-awards-grid">
            {/* MVP Card */}
            {mvpCard && (
              <div className="award-card mvp">
                <div className="award-icon">🌟</div>
                <div className="award-body">
                  <h4>{t('ui.awardMvp')}</h4>
                  <div className="award-highlight">{statName(lang, mvpCard.key)}</div>
                  <p className="award-desc">
                    {t('ui.awardMvpDesc', { amount: mvpCard.net })} ({mvpCard.ownerName})
                  </p>
                </div>
              </div>
            )}

            {/* Master Thief */}
            {topThief && (
              <div className="award-card thief">
                <div className="award-icon">🦹</div>
                <div className="award-body">
                  <h4>{t('ui.awardThief')}</h4>
                  <div className="award-highlight">{topThief.name}</div>
                  <p className="award-desc">
                    {t('ui.awardThiefDesc', { amount: topThief.stats.stolenFromOthers ?? 0 })}
                  </p>
                </div>
              </div>
            )}

            {/* Generous Patron */}
            {topPatron && (
              <div className="award-card patron">
                <div className="award-icon">💸</div>
                <div className="award-body">
                  <h4>{t('ui.awardPatron')}</h4>
                  <div className="award-highlight">{topPatron.name}</div>
                  <p className="award-desc">
                    {t('ui.awardPatronDesc', { amount: topPatron.stats.paidToOthers ?? 0 })}
                  </p>
                </div>
              </div>
            )}

            {/* Lucky Rolls */}
            {topLucky && (
              <div className="award-card lucky">
                <div className="award-icon">🎲</div>
                <div className="award-body">
                  <h4>{t('ui.awardLucky')}</h4>
                  <div className="award-highlight">{topLucky.name}</div>
                  <p className="award-desc">
                    {t('ui.awardLuckyDesc', { amount: game.doublesCount ?? 0 })} (Avg {averageRoll(topLucky)})
                  </p>
                </div>
              </div>
            )}

            {/* Master Architect */}
            {topArchitect && (
              <div className="award-card architect">
                <div className="award-icon">🏛️</div>
                <div className="award-body">
                  <h4>{t('ui.awardArchitect')}</h4>
                  <div className="award-highlight">{topArchitect.name}</div>
                  <p className="award-desc">
                    {t('ui.awardArchitectDesc', { amount: landmarkCount(game, topArchitect) })}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
