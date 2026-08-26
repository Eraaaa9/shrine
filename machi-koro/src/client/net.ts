import { useCallback, useEffect, useRef, useState } from 'react';
import type { Params } from '../shared/i18n';
import type { ClientMessage, RoomView, ServerMessage } from '../shared/protocol';
import { mergeLog } from '../shared/protocol';
import type { LogEntry } from '../shared/types';

export interface UiError {
  key: string;
  params?: Params;
}

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
  error: UiError | null;
  send: (message: ClientMessage) => void;
  dismissError: () => void;
}

/**
 * Puts the whole log back on a room view that carries only the new lines. An
 * update that added none hands back the very same array, so the panel that
 * renders it and the effects that watch it see nothing move.
 */
function withFullLog(room: RoomView, log: { current: LogEntry[] }): RoomView {
  const full = mergeLog(log.current, room);
  log.current = full;
  return room.game && room.logAppend ? { ...room, game: { ...room.game, log: full } } : room;
}

export function useConnection(): Connection {
  const [status, setStatus] = useState<Connection['status']>('connecting');
  const [room, setRoom] = useState<RoomView | null>(null);
  const [youId, setYouId] = useState<string | null>(null);
  const [error, setError] = useState<UiError | null>(null);

  // The history this client has stitched together. The server sends it in full
  // once per socket and only the new lines after that, so it lives out here
  // rather than being read back off the last room view.
  const log = useRef<LogEntry[]>([]);
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
            setRoom(withFullLog(message.room, log));
            break;
          case 'left':
            joined.current = false;
            log.current = [];
            saveSeat(null);
            setRoomInUrl(null);
            setRoom(null);
            setYouId(null);
            break;
          case 'error':
            // A failed silent rejoin should not nag the player on page load.
            if (!joined.current) saveSeat(null);
            else setError({ key: message.key, params: message.params });
            break;
        }
      };

      ws.onclose = () => {
        if (disposed) return;
        // The next socket is sent the history in full, so drop what we have
        // rather than risk stitching the old lines onto the new ones.
        log.current = [];
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
