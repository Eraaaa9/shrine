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
  /** What it cost to build. */
  cost: number;
  /** Coins it took back out of the owner's pocket — usually an opponent's copy billing them. */
  paid: number;
  net: number;
}

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

/** Coins with a sign, so a row reads as profit or loss at a glance. */
function Signed({ n }: { n: number }) {
  return <span className={n > 0 ? 'stat-pos' : n < 0 ? 'stat-neg' : 'muted'}>{n > 0 ? `+${n}` : n}</span>;
}

function swatch(key: StatKey): string {
  const card = CARD_BY_ID[key as CardId];
  return card ? `stat-swatch ${card.color}` : 'stat-swatch landmark';
}

export default function StatsPanel({ game, youId, onClose }: Props) {
  const { lang, t } = useLang();
  const winner = game.players.find((p) => p.id === game.winnerId);
  const seated = game.players.find((p) => p.id === youId);
  const [pick, setPick] = useState((seated ?? winner ?? game.players[0]).id);
  const shown = game.players.find((p) => p.id === pick) ?? game.players[0];
  const rows = buildingRows(shown);
  const best = rows.find((r) => r.net > 0);
  const worst = [...rows].reverse().find((r) => r.net < 0);
  const spent = shown.stats.spentOnCards + shown.stats.spentOnLandmarks;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal stats" onClick={(e) => e.stopPropagation()}>
        <div className="stats-head">
          <h2>{t('ui.statsTitle')}</h2>
          <button type="button" className="ghost small" onClick={onClose}>
            {t('ui.statsClose')}
          </button>
        </div>
        <p className="muted">{t('ui.statsTurnsPlayed', { n: game.turnCount })}</p>

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
      </div>
    </div>
  );
}
