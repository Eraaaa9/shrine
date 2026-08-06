import GameView from './components/GameView';
import Landing from './components/Landing';
import Lobby from './components/Lobby';
import { useConnection } from './net';

export default function App() {
  const { status, room, youId, error, send, dismissError } = useConnection();

  return (
    <>
      {status !== 'open' && (
        <div className="banner">{status === 'connecting' ? 'Connecting…' : 'Connection lost — retrying…'}</div>
      )}

      {!room && <Landing send={send} />}
      {room && !room.game && <Lobby room={room} youId={youId} send={send} />}
      {room && room.game && <GameView room={room} youId={youId} send={send} />}

      {error && (
        <button type="button" className="toast" onClick={dismissError}>
          {error}
        </button>
      )}
    </>
  );
}
