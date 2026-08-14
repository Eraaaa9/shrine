import { useEffect, useRef } from 'react';
import type { LogEntry } from '../../shared/types';
import { useLang } from '../lang';

interface Props {
  log: LogEntry[];
}

export default function LogPanel({ log }: Props) {
  const { lang, t } = useLang();
  const box = useRef<HTMLDivElement>(null);
  // The engine caps the log at 300 lines, so its length stops changing mid-game —
  // follow the newest id instead, and re-scroll when a language swap reflows the text.
  const newest = log.length > 0 ? log[log.length - 1].id : 0;

  useEffect(() => {
    const el = box.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [newest, lang]);

  return (
    // role="log" announces appended lines only, so a language switch reflowing
    // the whole history stays silent instead of replaying the entire game.
    <div className="log" ref={box} role="log" aria-live="polite" aria-relevant="additions" aria-label={t('ui.logLabel')}>
      {log.map((entry) => (
        <p key={entry.id} className={entry.kind ? `log-${entry.kind}` : undefined}>
          {t(entry.key, entry.params)}
        </p>
      ))}
    </div>
  );
}
