import { useEffect, useRef, useState } from 'react';
import { useLang } from '../lang';

const DIE_FACE = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
const TUMBLE_MS = 620;
const FLIP_MS = 70;

interface Props {
  dice: number[];
  total: number;
  /** Bumped by the engine on every throw, so a reroll of the same faces still animates. */
  rollId: number;
  /** Extra turn earned (e.g. doubles with Amusement Park). */
  extraTurn?: boolean;
}

function reducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * The dice tumble through random faces for a beat before settling on what the
 * server actually rolled — the result is never in doubt, it just lands late.
 */
export default function DiceTray({ dice, total, rollId, extraTurn }: Props) {
  const { t } = useLang();
  const [tumbling, setTumbling] = useState<number[] | null>(null);
  const seen = useRef(rollId);
  // Bots keep the room updating mid-throw; reading the dice through a ref keeps
  // those updates from restarting (or cancelling) the animation.
  const count = useRef(dice.length);
  count.current = dice.length;

  useEffect(() => {
    // Only animate throws that happen while we are watching: a fresh join or a
    // reconnect should show the dice already lying on the table.
    const isNewRoll = rollId > seen.current;
    seen.current = rollId;
    if (!isNewRoll || count.current === 0 || reducedMotion()) return;

    const faces = () => Array.from({ length: count.current }, () => 1 + Math.floor(Math.random() * 6));
    setTumbling(faces());
    const flip = setInterval(() => setTumbling(faces()), FLIP_MS);
    const land = setTimeout(() => {
      clearInterval(flip);
      setTumbling(null);
    }, TUMBLE_MS);

    return () => {
      clearInterval(flip);
      clearTimeout(land);
      setTumbling(null);
    };
  }, [rollId]);

  const shown = tumbling ?? dice;
  const isDoubles = !tumbling && dice.length === 2 && dice[0] === dice[1];

  return (
    <div className="dice-tray">
      {/* The faces are decorative: mid-tumble they are random, and a screen
          reader would spell out glyphs. The live region below says the result
          once, when it is actually true. */}
      <span className="dice-faces" aria-hidden="true">
        {shown.map((d, i) => (
          <span key={i} className={tumbling ? 'die-face tumbling' : isDoubles ? 'die-face landed doubles' : 'die-face landed'}>
            {DIE_FACE[d]}
          </span>
        ))}
        {dice.length > 0 && (
          <span className={tumbling ? 'dice-total pending' : 'dice-total'}>{tumbling ? '…' : total}</span>
        )}
        {isDoubles && (
          <span
            className={extraTurn ? 'doubles-badge extra-turn' : 'doubles-badge'}
            title={extraTurn ? t('ui.extraTurnBadge') : t('ui.doubles')}
          >
            ✨ {t('ui.doubles')}
            {extraTurn ? ` (${t('ui.extraTurnBadge')})` : ''}
          </span>
        )}
      </span>
      <span className="sr-only" role="status">
        {dice.length === 0 ? '' : tumbling ? t('ui.diceRolling') : t('ui.diceRolled', { dice: dice.join(' + '), total })}
      </span>
    </div>
  );
}
