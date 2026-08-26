import { useState } from 'react';
import { DEFAULT_RULES, type RuleSet } from '../../shared/cards';
import type { ClientMessage } from '../../shared/protocol';
import { LangSwitch, useLang } from '../lang';
import { SoundSwitch, ThemeSwitch } from '../prefs';
import { roomFromUrl } from '../net';
import RulesPicker from './RulesPicker';

const NAME_KEY = 'machikoro.name';

interface Props {
  send: (message: ClientMessage) => void;
}

export default function Landing({ send }: Props) {
  const { t } = useLang();
  const [name, setName] = useState(() => localStorage.getItem(NAME_KEY) ?? '');
  const [code, setCode] = useState(roomFromUrl);
  const [rules, setRules] = useState<RuleSet>({ ...DEFAULT_RULES });

  const remember = () => localStorage.setItem(NAME_KEY, name.trim());

  const create = () => {
    remember();
    send({ t: 'create', name: name.trim() || t('ui.playerPlaceholder'), rules });
  };

  const join = () => {
    remember();
    send({ t: 'join', code: code.trim().toUpperCase(), name: name.trim() || t('ui.playerPlaceholder') });
  };

  return (
    <div className="landing">
      <div className="landing-head">
        <h1>
          <span className="die">⚂</span> {t('ui.title')}
        </h1>
        <SoundSwitch />
        <ThemeSwitch />
        <LangSwitch />
      </div>
      <p className="tagline">{t('ui.tagline')}</p>

      <div className="panel">
        <label className="field">
          <span>{t('ui.yourName')}</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={16}
            placeholder={t('ui.playerPlaceholder')}
            autoComplete="nickname"
          />
        </label>

        <div className="split">
          <section>
            <h2>{t('ui.startGame')}</h2>
            <RulesPicker rules={rules} onChange={setRules} />
            <button type="button" className="primary" onClick={create}>
              {t('ui.createRoom')}
            </button>
          </section>

          <section>
            <h2>{t('ui.joinGame')}</h2>
            <input
              className="code-input"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 4))}
              placeholder={t('ui.code')}
              maxLength={4}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && code.length === 4) join();
              }}
            />
            <button type="button" className="primary" disabled={code.trim().length !== 4} onClick={join}>
              {t('ui.joinRoom')}
            </button>
          </section>
        </div>
      </div>

      <p className="fineprint">{t('ui.fineprint')}</p>
    </div>
  );
}
