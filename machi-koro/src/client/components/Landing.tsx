import { useState } from 'react';
import { DEFAULT_RULES, type RuleSet } from '../../shared/cards';
import type { ClientMessage } from '../../shared/protocol';
import { roomFromUrl } from '../net';
import RulesPicker from './RulesPicker';

const NAME_KEY = 'machikoro.name';

interface Props {
  send: (message: ClientMessage) => void;
}

export default function Landing({ send }: Props) {
  const [name, setName] = useState(() => localStorage.getItem(NAME_KEY) ?? '');
  const [code, setCode] = useState(roomFromUrl);
  const [rules, setRules] = useState<RuleSet>({ ...DEFAULT_RULES });

  const remember = () => localStorage.setItem(NAME_KEY, name.trim());

  const create = () => {
    remember();
    send({ t: 'create', name: name.trim() || 'Player', rules });
  };

  const join = () => {
    remember();
    send({ t: 'join', code: code.trim().toUpperCase(), name: name.trim() || 'Player' });
  };

  return (
    <div className="landing">
      <h1>
        <span className="die">⚂</span> Machi Koro
      </h1>
      <p className="tagline">Roll dice, build your city, beat your friends to all the landmarks.</p>

      <div className="panel">
        <label className="field">
          <span>Your name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={16}
            placeholder="Player"
            autoComplete="nickname"
          />
        </label>

        <div className="split">
          <section>
            <h2>Start a game</h2>
            <RulesPicker rules={rules} onChange={setRules} />
            <button type="button" className="primary" onClick={create}>
              Create room
            </button>
          </section>

          <section>
            <h2>Join a game</h2>
            <input
              className="code-input"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 4))}
              placeholder="CODE"
              maxLength={4}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && code.length === 4) join();
              }}
            />
            <button type="button" className="primary" disabled={code.trim().length !== 4} onClick={join}>
              Join room
            </button>
          </section>
        </div>
      </div>

      <p className="fineprint">
        A fan implementation of the board game for private play. Rules only — no original artwork or card text.
      </p>
    </div>
  );
}
