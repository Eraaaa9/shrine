import { useEffect, useState } from 'react';
import { flyingCoins, type CoinFlightBatch } from '../flyingCoins';

export default function CoinFlightOverlay() {
  const [batches, setBatches] = useState<CoinFlightBatch[]>([]);

  useEffect(() => {
    return flyingCoins.subscribe(() => {
      setBatches([...flyingCoins.activeBatches]);
    });
  }, []);

  if (batches.length === 0) return null;

  return (
    <div className="coin-flight-overlay" aria-hidden="true">
      {batches.map((batch) =>
        batch.particles.map((coin) => (
          <div
            key={coin.id}
            className={`flying-coin ${coin.isSteal ? 'steal-coin' : ''}`}
            style={
              {
                '--from-x': `${coin.fromX}px`,
                '--from-y': `${coin.fromY}px`,
                '--curve-x': `${coin.curveX}px`,
                '--curve-y': `${coin.curveY}px`,
                '--to-x': `${coin.toX}px`,
                '--to-y': `${coin.toY}px`,
                '--delay': `${coin.delay}ms`,
                '--duration': `${coin.duration}ms`,
              } as React.CSSProperties
            }
          >
            <div className="flying-coin-inner">
              <span className="coin-shine" />
              <span className="coin-face">¤</span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
