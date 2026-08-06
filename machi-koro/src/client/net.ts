import { useCallback, useEffect, useRef, useState } from 'react';
import type { ClientMessage, RoomView, ServerMessage } from '../shared/protocol';

const STORAGE_KEY = 'machikoro.seat';

interface SavedSeat {
  code: string;
  token: string;
}

function loadSeat(): SavedSeat | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedSeat) : null;
  } catch {
    return null;
  }
}

function saveSeat(seat: SavedSeat | null): void {
  try {
    if (seat) localStorage.setItem(STORAGE_KEY, JSON.stringify(seat));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* private browsing */
  }
}

function setRoomInUrl(code: string | null): void {
  const url = new URL(location.href);
  if (code) url.searchParams.set('room', code);
  else url.searchParams.delete('room');
  history.replaceState(null, '', url.toString());
}

export function roomFromUrl(): string {
  return new URL(location.href).searchParams.get('room')?.toUpperCase() ?? '';
}

export interface Connection {
  status: 'connecting' | 'open' | 'closed';
  room: RoomView | null;
  youId: string | null;
  error: string | null;
  send: (message: ClientMessage) => void;
  dismissError: () => void;
}

export function useConnection(): Connection {
  const [status, setStatus] = useState<Connection['status']>('connecting');
  const [room, setRoom] = useState<RoomView | null>(null);
  const [youId, setYouId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const socket = useRef<WebSocket | null>(null);
  const outbox = useRef<ClientMessage[]>([]);
  const retry = useRef<number | undefined>(undefined);
  const joined = useRef(false);

  const send = useCallback((message: ClientMessage) => {
    const ws = socket.current;
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(message));
    else outbox.current.push(message);
  }, []);

  useEffect(() => {
    let disposed = false;

    const connect = () => {
      if (disposed) return;
      const scheme = location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${scheme}//${location.host}/ws`);
      socket.current = ws;
      setStatus('connecting');

      ws.onopen = () => {
        setStatus('open');
        const saved = loadSeat();
        if (saved) ws.send(JSON.stringify({ t: 'rejoin', code: saved.code, token: saved.token } satisfies ClientMessage));
        for (const queued of outbox.current.splice(0)) ws.send(JSON.stringify(queued));
      };

      ws.onmessage = (event) => {
        let message: ServerMessage;
        try {
          message = JSON.parse(String(event.data)) as ServerMessage;
        } catch {
          return;
        }
        switch (message.t) {
          case 'joined':
            joined.current = true;
            setYouId(message.youId);
            saveSeat({ code: message.code, token: message.token });
            setRoomInUrl(message.code);
            break;
          case 'room':
            setRoom(message.room);
            break;
          case 'left':
            joined.current = false;
            saveSeat(null);
            setRoomInUrl(null);
            setRoom(null);
            setYouId(null);
            break;
          case 'error':
            // A failed silent rejoin should not nag the player on page load.
            if (!joined.current) saveSeat(null);
            else setError(message.message);
            break;
        }
      };

      ws.onclose = () => {
        if (disposed) return;
        setStatus('closed');
        retry.current = window.setTimeout(connect, 1500);
      };
    };

    connect();
    return () => {
      disposed = true;
      window.clearTimeout(retry.current);
      socket.current?.close();
    };
  }, []);

  useEffect(() => {
    if (!error) return;
    const id = window.setTimeout(() => setError(null), 4500);
    return () => window.clearTimeout(id);
  }, [error]);

  return { status, room, youId, error, send, dismissError: () => setError(null) };
}
