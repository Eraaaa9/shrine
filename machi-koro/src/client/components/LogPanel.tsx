import { useEffect, useRef } from 'react';
import type { LogEntry } from '../../shared/types';

interface Props {
  log: LogEntry[];
}

export default function LogPanel({ log }: Props) {
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: 'end' });
  }, [log.length]);

  return (
    <div className="log">
      {log.map((entry) => (
        <p key={entry.id} className={entry.kind ? `log-${entry.kind}` : undefined}>
          {entry.text}
        </p>
      ))}
      <div ref={bottom} />
    </div>
  );
}
