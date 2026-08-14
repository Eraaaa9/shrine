import { useEffect, useRef, useState } from 'react';
import type { ChatLine, ClientMessage } from '../../shared/protocol';
import { useLang } from '../lang';

interface Props {
  chat: ChatLine[];
  send: (message: ClientMessage) => void;
}

export default function Chat({ chat, send }: Props) {
  const { t } = useLang();
  const [text, setText] = useState('');
  const box = useRef<HTMLDivElement>(null);
  // The room keeps only the last 60 lines, so the length alone stops changing.
  const newest = chat.length > 0 ? chat[chat.length - 1].id : 0;

  useEffect(() => {
    const el = box.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [newest]);

  const submit = () => {
    if (!text.trim()) return;
    send({ t: 'chat', text });
    setText('');
  };

  return (
    <div className="chat">
      <div className="chat-lines" ref={box}>
        {chat.length === 0 && <p className="muted">{t('ui.sayHello')}</p>}
        {chat.map((line) => (
          <p key={line.id}>
            <b>{line.from}</b> {line.text}
          </p>
        ))}
      </div>
      <div className="chat-input">
        <input
          value={text}
          maxLength={200}
          placeholder={t('ui.message')}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
          }}
        />
        <button type="button" onClick={submit}>
          {t('ui.send')}
        </button>
      </div>
    </div>
  );
}
