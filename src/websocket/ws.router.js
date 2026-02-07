import * as terminalGateway from '../modules/terminal/terminal.gateway.js';

export async function routeMessage(socketId, msg, socket, user) {
  if (!msg || typeof msg.type !== 'string') return;

  const userEmail = user?.email ?? user?.sub;
  if (!userEmail) return;

  const handled = await terminalGateway.handleMessage(socketId, msg, socket, userEmail);
  if (!handled && msg.type.startsWith('terminal.')) {
    socket.send(JSON.stringify({ type: 'error', payload: { message: 'Session not ready. Send terminal.attach with workspaceId first.' } }));
  }
}
