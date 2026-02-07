import { WebSocketServer } from 'ws';
import { supabase } from '../config/supabase.js';
import { routeMessage } from './ws.router.js';
import * as terminalGateway from '../modules/terminal/terminal.gateway.js';
import * as filesWs from '../modules/files/files.ws.js';

export function attachWsServer(httpServer) {
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url || '', `http://${request.headers.host}`);
    if (url.pathname !== '/ws') {
      socket.destroy();
      return;
    }

    const token = url.searchParams.get('token');
    if (!token) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    supabase.auth.getClaims(token).then(({ data, error }) => {
      if (error || !data?.claims) {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      }

      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request, data.claims);
      });
    }).catch(() => {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
    });
  });

  wss.on('connection', (ws, request, user) => {
    const socketId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        routeMessage(socketId, msg, ws, user);
      } catch {
        ws.send(JSON.stringify({ type: 'error', payload: { message: 'Invalid JSON' } }));
      }
    });

    ws.on('close', () => {
      terminalGateway.destroySession(socketId);
      filesWs.removeFileSubscriber(socketId);
    });

    ws.on('error', () => {
      terminalGateway.destroySession(socketId);
      filesWs.removeFileSubscriber(socketId);
    });
  });

  return wss;
}
