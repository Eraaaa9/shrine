import { existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { networkInterfaces } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { WebSocketServer, type WebSocket } from 'ws';
import { describeRules, maxPlayers, normaliseRules } from '../shared/cards';
import type { ClientMessage, ServerMessage } from '../shared/protocol';
import { MIN_PLAYERS } from '../shared/protocol';
import { createRoom, getRoom, roomCount, sweepRooms, type Room, type Seat } from './rooms';

const PORT = Number(process.env.PORT ?? 8080);
const here = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(here, '../../dist');

const app = express();
app.get('/health', (_req, res) => {
  res.json({ ok: true, rooms: roomCount() });
});

if (existsSync(clientDist)) {
  app.use(express.static(clientDist));
  // SPA fallback (Express 5 rejects bare '*' routes, so use a catch-all middleware)
  app.use((_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
} else {
  app.use((_req, res) =>
    res
      .status(503)
      .type('text/plain')
      .send('The client has not been built yet.\nRun `npm run dev` (dev) or `npm run play` (single-port build).')
  );
}

const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

interface Attachment {
  room: Room;
  seat: Seat;
}
const attached = new Map<WebSocket, Attachment>();

function send(ws: WebSocket, message: ServerMessage): void {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(message));
}

function fail(ws: WebSocket, message: string): void {
  send(ws, { t: 'error', message });
}

function attach(ws: WebSocket, room: Room, seat: Seat): void {
  const previous = seat.socket;
  if (previous && previous !== ws) {
    attached.delete(previous);
    send(previous, { t: 'left' });
  }
  seat.socket = ws;
  seat.disconnectedAt = null;
  attached.set(ws, { room, seat });
  send(ws, { t: 'joined', code: room.code, youId: seat.id, token: seat.token });
}

function detach(ws: WebSocket): void {
  const entry = attached.get(ws);
  if (!entry) return;
  attached.delete(ws);
  const { room, seat } = entry;
  if (seat.socket !== ws) return;
  seat.socket = null;
  seat.disconnectedAt = Date.now();
  if (!room.game) {
    // Nobody is committed to a game yet, so free the seat entirely.
    room.removeSeat(seat.id);
  } else if (room.hostId === seat.id) {
    // Keep host controls (rematch) reachable while the host is away.
    const standIn = room.seats.find((s) => s.socket && !s.isBot);
    if (standIn) room.hostId = standIn.id;
  }
  room.touch();
  room.broadcast();
}

function requireHost(ws: WebSocket, entry: Attachment): boolean {
  if (entry.room.hostId !== entry.seat.id) {
    fail(ws, 'Only the host can do that.');
    return false;
  }
  return true;
}

function handle(ws: WebSocket, msg: ClientMessage): void {
  const entry = attached.get(ws);

  switch (msg.t) {
    case 'create': {
      if (entry) detach(ws);
      const room = createRoom();
      room.rules = normaliseRules(msg.rules);
      const seat = room.addSeat(msg.name, false, ws);
      attach(ws, room, seat);
      room.broadcast();
      console.log(`[${room.code}] created by ${seat.name}`);
      return;
    }

    case 'join': {
      const room = getRoom(msg.code ?? '');
      if (!room) return fail(ws, 'No room with that code.');
      if (room.game && room.game.phase !== 'over') {
        return fail(ws, 'That game is already in progress. Ask for the rejoin link, or wait for the next game.');
      }
      if (room.seats.length >= room.maxPlayers) return fail(ws, 'That room is full.');
      if (entry) detach(ws);
      const seat = room.addSeat(msg.name, false, ws);
      attach(ws, room, seat);
      room.broadcast();
      return;
    }

    case 'rejoin': {
      const room = getRoom(msg.code ?? '');
      if (!room) return fail(ws, 'That room no longer exists.');
      const seat = room.seatByToken(msg.token ?? '');
      if (!seat) return fail(ws, 'Your seat in that room is gone.');
      attach(ws, room, seat);
      room.broadcast();
      return;
    }
  }

  if (!entry) return fail(ws, 'You are not in a room.');
  const { room, seat } = entry;

  switch (msg.t) {
    case 'setRules': {
      if (!requireHost(ws, entry)) return;
      if (room.game && room.game.phase !== 'over') return fail(ws, 'The game is already running.');
      const wanted = normaliseRules(msg.rules);
      if (room.seats.length > maxPlayers(wanted)) {
        return fail(ws, `The base game seats only ${maxPlayers(wanted)} players — remove someone first.`);
      }
      room.rules = wanted;
      break;
    }

    case 'addBot': {
      if (!requireHost(ws, entry)) return;
      if (room.game && room.game.phase !== 'over') return fail(ws, 'The game is already running.');
      if (room.seats.length >= room.maxPlayers) return fail(ws, 'The room is full.');
      room.addSeat(room.nextBotName(), true, null);
      break;
    }

    case 'kick': {
      if (!requireHost(ws, entry)) return;
      if (room.game && room.game.phase !== 'over') return fail(ws, 'The game is already running.');
      const target = room.seat(msg.playerId);
      if (!target) return fail(ws, 'No such player.');
      if (target.id === room.hostId) return fail(ws, 'The host cannot be removed.');
      if (target.socket) send(target.socket, { t: 'left' });
      if (target.socket) attached.delete(target.socket);
      room.removeSeat(target.id);
      break;
    }

    case 'start': {
      if (!requireHost(ws, entry)) return;
      if (room.seats.length < MIN_PLAYERS) return fail(ws, `You need at least ${MIN_PLAYERS} players.`);
      const error = room.start();
      if (error) return fail(ws, error);
      console.log(`[${room.code}] game started with ${room.seats.length} players (${describeRules(room.rules)})`);
      break;
    }

    case 'rematch': {
      if (!requireHost(ws, entry)) return;
      if (!room.game || room.game.phase !== 'over') return fail(ws, 'Finish this game first.');
      const error = room.start();
      if (error) return fail(ws, error);
      break;
    }

    case 'action': {
      const error = room.play(seat.id, msg.action);
      if (error) {
        fail(ws, error);
        return;
      }
      break;
    }

    case 'chat': {
      room.addChat(seat.name, msg.text ?? '');
      break;
    }

    case 'leave': {
      // Seats cannot be removed from a running game, so hand it to a bot for good.
      if (room.game && room.game.phase !== 'over') {
        seat.isBot = true;
        room.game.players.find((p) => p.id === seat.id)!.isBot = true;
        room.game.log.push({ id: room.game.nextLogId++, text: `${seat.name} left — a bot takes over.`, who: seat.id });
      }
      send(ws, { t: 'left' });
      detach(ws);
      return;
    }

    default:
      return fail(ws, 'Unknown message.');
  }

  room.broadcast();
}

wss.on('connection', (ws) => {
  ws.on('message', (raw) => {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(String(raw)) as ClientMessage;
    } catch {
      return fail(ws, 'Malformed message.');
    }
    try {
      handle(ws, msg);
    } catch (err) {
      console.error('handler error', err);
      fail(ws, 'Something went wrong on the server.');
    }
  });

  ws.on('close', () => detach(ws));
  ws.on('error', () => detach(ws));
});

setInterval(sweepRooms, 10 * 60 * 1000).unref();

server.listen(PORT, () => {
  const urls = ['localhost', ...lanAddresses()].map((host) => `  http://${host}:${PORT}`);
  console.log(`\n🎲 Machi Koro server listening on:\n${urls.join('\n')}\n`);
  if (!existsSync(clientDist)) {
    console.log('The client bundle is missing — run `npm run dev` in another terminal, or `npm run play` for one port.\n');
  }
});

function lanAddresses(): string[] {
  const out: string[] = [];
  for (const list of Object.values(networkInterfaces())) {
    for (const net of list ?? []) {
      if (net.family === 'IPv4' && !net.internal) out.push(net.address);
    }
  }
  return out;
}
