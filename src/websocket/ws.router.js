import * as terminalGateway from '../modules/terminal/terminal.gateway.js';
import * as filesWs from '../modules/files/files.ws.js';
import { FILES_LIST } from './ws.events.js';

export async function routeMessage(socketId, msg, socket, user) {
  if (!msg || typeof msg.type !== 'string') return;

  const userEmail = user?.email ?? user?.sub;
  if (!userEmail) return;

  if (msg.type === FILES_LIST) {
    const workspaceId = msg.payload?.workspaceId;
    const path = msg.payload?.path ?? '/';
    if (workspaceId) {
      await filesWs.handleFilesList(workspaceId, path, socketId, socket, userEmail);
    }
    return;
  }

  const handled = await terminalGateway.handleMessage(socketId, msg, socket, userEmail);
  if (!handled && msg.type.startsWith('terminal.')) {
    socket.send(JSON.stringify({ type: 'error', payload: { message: 'Session not ready. Send terminal.attach with workspaceId first.' } }));
  }
}
