import GameView from './components/GameView';
import Landing from './components/Landing';
import Lobby from './components/Lobby';
import { useLang } from './lang';
import { useConnection } from './net';

export default function App() {
  const { t } = useLang();
  const { status, room, youId, error, send, dismissError } = useConnection();

  return (
    <>
      {status !== 'open' && (
        <div className="banner">{status === 'connecting' ? t('ui.connecting') : t('ui.connectionLost')}</div>
      )}

      {!room && <Landing send={send} />}
      {room && !room.game && <Lobby room={room} youId={youId} send={send} />}
      {room && room.game && <GameView room={room} youId={youId} send={send} />}

      {error && (
        <button type="button" className="toast" onClick={dismissError}>
          {t(error.key, error.params)}
        </button>
      )}
    </>
  );
}
