import { useMemo } from 'react';
import type { GameState, LogEntry, PlayerState } from '../../shared/types';
import type { CardId, LandmarkId } from '../../shared/cards';
import { cardName, landmarkName } from '../../shared/i18n';
import { coinFlow } from '../../shared/coinFlow';
import { useLang } from '../lang';

interface Props {
  game: GameState;
  you: PlayerState | null;
}

interface ActionStep {
  id: string;
  type: 'player' | 'roll' | 'income' | 'steal' | 'build' | 'pass' | 'special';
  icon: string;
  title: string;
  detail?: string;
  highlight?: boolean;
  colorClass?: string;
}

export default function ActionChainHUD({ game, you }: Props) {
  const { lang, t } = useLang();

  // Extract recent events for the active/latest turn
  const steps = useMemo(() => {
    if (game.log.length === 0) return [];

    const activePlayer = game.players[game.turn];
    const chain: ActionStep[] = [];

    // Step 1: Active Player
    if (activePlayer) {
      chain.push({
        id: `player_${game.turnCount}`,
        type: 'player',
        icon: '👤',
        title: activePlayer.name,
        detail: activePlayer.id === you?.id ? t('ui.you') : undefined,
        colorClass: 'step-player',
      });
    }

    // Back to the line that opened this turn, and no further.
    const turnLogs: LogEntry[] = [];
    for (let i = game.log.length - 1; i >= 0; i--) {
      const entry = game.log[i];
      turnLogs.unshift(entry);
      if (entry.kind === 'turn') break;
    }

    // Step 2: Dice Roll
    if (game.diceTotal > 0 || turnLogs.some((l) => l.kind === 'roll')) {
      const hasPark = Boolean(activePlayer?.landmarks.amusement_park || game.extraTurn);
      const isDoubles = game.dice.length === 2 && game.dice[0] === game.dice[1] && hasPark;
      const diceDisplay = game.dice.length > 0 ? game.dice.join('+') : `${game.diceTotal}`;
      chain.push({
        id: `roll_${game.rollId}`,
        type: 'roll',
        icon: '🎲',
        title: `${diceDisplay} = ${game.diceTotal}`,
        detail: isDoubles ? t('ui.chainDoubles') : undefined,
        highlight: isDoubles,
        colorClass: isDoubles ? 'step-doubles' : 'step-roll',
      });
    }

    // Step 3: where the coins went. The log says that in `coinFlow`, not in the
    // params — reading it here by hand is what left every step reading "+¤".
    const nameOf = (id?: string) => game.players.find((p) => p.id === id)?.name;

    for (const l of turnLogs) {
      const landmarkId = l.params?.landmark as string | undefined;
      if (landmarkId && (l.key === 'log.buildLandmark' || l.key === 'log.demolish')) {
        const built = l.key === 'log.buildLandmark';
        chain.push({
          id: `landmark_${l.id}`,
          type: 'build',
          icon: built ? '🏛️' : '💥',
          title: landmarkName(lang, landmarkId as LandmarkId),
          detail: built ? t('ui.builtStatus') : t('ui.chainDemolished'),
          highlight: built,
          colorClass: 'step-landmark',
        });
        continue;
      }

      const flow = coinFlow(l);
      if (!flow) continue;
      const cardId = l.params?.card as string | undefined;
      const cName = cardId ? cardName(lang, cardId as CardId) : '';
      const payer = nameOf(flow.fromId);
      const receiver = nameOf(flow.toId);

      if (payer && receiver) {
        chain.push({
          id: `steal_${l.id}`,
          type: 'steal',
          icon: '☕',
          title: cName || t('ui.chainTakes'),
          detail: `${payer} ➔ ${receiver}: ${flow.amount}¤`,
          colorClass: 'step-steal',
        });
      } else if (l.kind === 'build') {
        chain.push({
          id: `buy_${l.id}`,
          type: 'build',
          icon: '🛍️',
          title: cName || landmarkName(lang, (l.params?.landmark ?? '') as LandmarkId),
          detail: `-${flow.amount}¤`,
          colorClass: 'step-build',
        });
      } else if (receiver) {
        chain.push({
          id: `income_${l.id}`,
          type: 'income',
          icon: '🪙',
          title: cName || t('ui.income'),
          detail: `+${flow.amount}¤`,
          colorClass: 'step-income',
        });
      } else {
        chain.push({
          id: `pays_${l.id}`,
          type: 'income',
          icon: '💸',
          title: cName || t('ui.chainPays'),
          detail: `-${flow.amount}¤`,
          colorClass: 'step-build',
        });
      }
    }

    return chain;
  }, [game.log, game.players, game.turn, game.turnCount, game.dice, game.diceTotal, game.extraTurn, game.rollId, lang, you, t]);

  if (steps.length === 0) return null;

  return (
    <div className="action-chain-hud" aria-label={t('ui.chainLabel')}>
      <div className="action-chain-scroll">
        {steps.map((step, idx) => (
          <div key={step.id} className="action-step-wrapper">
            <div className={`action-step ${step.colorClass ?? ''} ${step.highlight ? 'step-glow' : ''}`}>
              <span className="step-icon">{step.icon}</span>
              <span className="step-title">{step.title}</span>
              {step.detail && <span className="step-detail">{step.detail}</span>}
            </div>
            {idx < steps.length - 1 && <span className="action-step-arrow">➔</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
