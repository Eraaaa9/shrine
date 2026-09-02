import { useMemo } from 'react';
import type { GameState, LogEntry, PlayerState } from '../../shared/types';
import type { CardId, LandmarkId } from '../../shared/cards';
import { cardName, landmarkName } from '../../shared/i18n';
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

    // Find entries since the latest 'turn' log
    let turnLogs: LogEntry[] = [];
    for (let i = game.log.length - 1; i >= 0; i--) {
      const entry = game.log[i];
      turnLogs.unshift(entry);
      if (entry.kind === 'turn' || entry.key.includes('log.turn')) {
        break;
      }
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
        detail: isDoubles ? '✨ ДУБЛЬ (+ХОД)' : undefined,
        highlight: isDoubles,
        colorClass: isDoubles ? 'step-doubles' : 'step-roll',
      });
    }

    // Step 3: Income / Steal Activations
    for (const l of turnLogs) {
      if (l.kind === 'income') {
        const cardId = l.params?.card as string | undefined;
        const cName = cardId ? cardName(lang, cardId as CardId) : '';
        const coins = l.params?.coins ?? l.params?.n ?? '';
        const payer = l.params?.payer as string | undefined;
        const receiver = l.params?.receiver as string | undefined;

        if (payer && receiver) {
          chain.push({
            id: `steal_${l.id}`,
            type: 'steal',
            icon: '☕',
            title: cName || 'Ресторан',
            detail: `${payer} ➔ ${receiver}: ${coins}¤`,
            colorClass: 'step-steal',
          });
        } else {
          chain.push({
            id: `income_${l.id}`,
            type: 'income',
            icon: '🪙',
            title: cName || t('ui.income'),
            detail: `+${coins}¤`,
            colorClass: 'step-income',
          });
        }
      } else if (l.kind === 'build') {
        const cardId = l.params?.card as string | undefined;
        const landmarkId = l.params?.landmark as string | undefined;
        if (landmarkId) {
          chain.push({
            id: `landmark_${l.id}`,
            type: 'build',
            icon: '🏛️',
            title: landmarkName(lang, landmarkId as LandmarkId),
            detail: t('ui.builtStatus'),
            highlight: true,
            colorClass: 'step-landmark',
          });
        } else if (cardId) {
          chain.push({
            id: `buy_${l.id}`,
            type: 'build',
            icon: '🛍️',
            title: cardName(lang, cardId as CardId),
            detail: `-${l.params?.cost ?? ''}¤`,
            colorClass: 'step-build',
          });
        }
      }
    }

    return chain;
  }, [game.log, game.turn, game.turnCount, game.diceTotal, game.rollId, lang, you, t]);

  if (steps.length === 0) return null;

  return (
    <div className="action-chain-hud" aria-label="Action Chain Flow">
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
