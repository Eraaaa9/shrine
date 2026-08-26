import { useEffect, useRef } from 'react';
import { useLang } from '../lang';

interface Props {
  message: string;
  onYes: () => void;
  onNo: () => void;
}

/**
 * A last look before something that cannot be taken back.
 *
 * Millionaire's Row has two compulsory effects that destroy a player's own
 * property — the Demolition Company knocks a landmark down and the Moving
 * Company hands an establishment to an opponent — and both used to fire on a
 * single click. They are meant to be painful, not to be a misclick.
 */
export default function ConfirmDialog({ message, onYes, onNo }: Props) {
  const { t } = useLang();
  const cancel = useRef<HTMLButtonElement>(null);

  // Opens on the safe option, and Escape backs out, so the dangerous answer is
  // never the one a stray keypress reaches.
  useEffect(() => {
    cancel.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onNo();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onNo]);

  return (
    <div className="modal-backdrop confirm-backdrop" onClick={onNo}>
      <div className="modal confirm" role="alertdialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h2>{t('ui.confirmTitle')}</h2>
        <p>{message}</p>
        <div className="row end">
          <button type="button" className="ghost" ref={cancel} onClick={onNo}>
            {t('ui.confirmNo')}
          </button>
          <button type="button" className="primary" onClick={onYes}>
            {t('ui.confirmYes')}
          </button>
        </div>
      </div>
    </div>
  );
}
