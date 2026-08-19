import { useState } from 'react';
import { cardsFor } from '../../shared/cards';
import { incomeAt } from '../../shared/engine';
import type { GameState, PlayerState } from '../../shared/types';
import { useLang } from '../lang';

interface Props {
  game: GameState;
  you: PlayerState | null;
}

/** Chance of each total on two dice, out of 36. */
const TWO_DICE: Record<number, number> = {
  2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6, 8: 5, 9: 4, 10: 3, 11: 2, 12: 1,
};

function chance(total: number, twoDice: boolean): number {
  if (twoDice) return (TWO_DICE[total] ?? 0) / 36;
  return total >= 1 && total <= 6 ? 1 / 6 : 0;
}

/** One coin figure, rounded for reading rather than for accounting. */
function coins(n: number): string {
  if (n === 0) return '—';
  const rounded = Math.abs(n) < 10 ? Math.round(n * 10) / 10 : Math.round(n);
  return rounded > 0 ? `+${rounded}` : String(rounded);
}

/**
 * A city's income curve, total by total.
 *
 * The two-dice decision is the one that decides the game — the bots' own
 * training notes put it at 12 to 20 points of win rate — and until now a player
 * had to hold the whole board in their head to make it. This lays the two
 * halves of it out: what a total pays when you roll it, what it pays when
 * somebody else does, and how likely it is under each die count.
 */
export default function IncomePanel({ game, you }: Props) {
  const { t } = useLang();
  const twoDiceAvailable = Boolean(you?.landmarks.train_station);
  const [twoDice, setTwoDice] = useState(twoDiceAvailable);

  if (!you) return <p className="muted income-empty">{t('ui.incomeNothing')}</p>;

  // The Harbor and the boats push activations past 12, so ask the cards in play
  // rather than assuming the base game's range.
  const highest = cardsFor(game.rules).reduce((max, card) => Math.max(max, ...card.activates), 6);
  const totals = Array.from({ length: highest }, (_, i) => i + 1);

  const rows = totals.map((total) => {
    const { onYourTurn, onTheirTurn } = incomeAt(game, you, total);
    return { total, mine: onYourTurn, theirs: onTheirTurn, p: chance(total, twoDice) };
  });

  const scale = Math.max(1, ...rows.map((r) => Math.max(Math.abs(r.mine), r.theirs)));
  const anything = rows.some((r) => r.mine !== 0 || r.theirs !== 0);
  const expectedMine = rows.reduce((sum, r) => sum + r.mine * r.p, 0);
  const expectedTheirs = rows.reduce((sum, r) => sum + r.theirs * r.p, 0);

  return (
    <div className="income">
      <p className="muted income-blurb">{t('ui.incomeBlurb')}</p>

      <div className="income-modes">
        <span className="muted">{t('ui.incomeOdds')}</span>
        <button type="button" className={twoDice ? 'chip' : 'chip on'} onClick={() => setTwoDice(false)}>
          {t('ui.incomeOneDie')}
        </button>
        <button
          type="button"
          className={twoDice ? 'chip on' : 'chip'}
          onClick={() => setTwoDice(true)}
          disabled={!twoDiceAvailable}
          title={twoDiceAvailable ? '' : t('ui.needsTrainStation')}
        >
          {t('ui.incomeTwoDice')}
        </button>
      </div>

      <div className="income-legend">
        <span className="income-key mine" /> {t('ui.incomeYours')}
        <span className="income-key theirs" /> {t('ui.incomeTheirs')}
      </div>

      {anything ? (
        <ul className="income-rows">
          {rows.map((row) => (
            <li
              key={row.total}
              className={row.p === 0 ? 'income-row unreachable' : 'income-row'}
              title={row.p === 0 ? t('ui.incomeUnreachable') : undefined}
            >
              <span className="income-total" aria-hidden="true">
                {row.total}
              </span>
              <span className="income-bars" aria-hidden="true">
                {/* Losses point the same way as gains but wear the red of the
                    restaurants that caused them — the sign is on the figure. */}
                <span
                  className={row.mine < 0 ? 'income-bar mine negative' : 'income-bar mine'}
                  style={{ width: `${(Math.abs(row.mine) / scale) * 100}%` }}
                />
                <span className="income-bar theirs" style={{ width: `${(row.theirs / scale) * 100}%` }} />
              </span>
              <span className="income-figures" aria-hidden="true">
                <b className={row.mine < 0 ? 'stat-neg' : row.mine > 0 ? 'stat-pos' : 'muted'}>{coins(row.mine)}</b>
                <i className={row.theirs > 0 ? 'stat-pos' : 'muted'}>{coins(row.theirs)}</i>
              </span>
              <span className="sr-only">
                {t('ui.incomeRowAria', {
                  total: row.total,
                  mine: coins(row.mine),
                  theirs: coins(row.theirs),
                  chance: Math.round(row.p * 100),
                })}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted income-empty">{t('ui.incomeNothing')}</p>
      )}

      <p className="muted small-note">
        {t('ui.incomeExpected', { mine: coins(expectedMine), theirs: coins(expectedTheirs) })}
      </p>
    </div>
  );
}
