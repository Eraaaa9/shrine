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
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: 'end' });
  }, [chat.length]);

  const submit = () => {
    if (!text.trim()) return;
    send({ t: 'chat', text });
    setText('');
  };

  return (
    <div className="chat">
      <div className="chat-lines">
        {chat.length === 0 && <p className="muted">{t('ui.sayHello')}</p>}
        {chat.map((line) => (
          <p key={line.id}>
            <b>{line.from}</b> {line.text}
          </p>
        ))}
        <div ref={bottom} />
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
