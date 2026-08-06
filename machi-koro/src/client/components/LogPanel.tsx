import { useEffect, useRef } from 'react';
import type { LogEntry } from '../../shared/types';
import { useLang } from '../lang';

interface Props {
  log: LogEntry[];
}

export default function LogPanel({ log }: Props) {
  const { t } = useLang();
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: 'end' });
  }, [log.length]);

  return (
    <div className="log">
      {log.map((entry) => (
        <p key={entry.id} className={entry.kind ? `log-${entry.kind}` : undefined}>
          {t(entry.key, entry.params)}
        </p>
      ))}
      <div ref={bottom} />
    </div>
  );
}
