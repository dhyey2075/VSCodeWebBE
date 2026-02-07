import { supabase } from '../../config/supabase.js';
import * as terminalSession from './terminal.session.js';
import { TERMINAL_INPUT, TERMINAL_RESIZE, TERMINAL_ATTACH } from '../../websocket/ws.events.js';

const sessionsBySocketId = new Map();

export async function createSession(workspaceId, socketId, socket, userEmail) {
  const { data: workspace, error } = await supabase
    .from('workspaces')
    .select('id, ownerEmail')
    .eq('id', workspaceId)
    .single();

  if (error || !workspace || workspace.ownerEmail !== userEmail) {
    return false;
  }

  const session = terminalSession.createSession(workspaceId, socketId, socket);
  sessionsBySocketId.set(socketId, session);
  return true;
}

export async function handleMessage(socketId, msg, socket, userEmail) {
  if (msg.type === TERMINAL_ATTACH) {
    const workspaceId = msg.payload?.workspaceId;
    if (!workspaceId) return false;
    return createSession(workspaceId, socketId, socket, userEmail);
  }

  const session = sessionsBySocketId.get(socketId);
  if (!session) return false;

  if (msg.type === TERMINAL_INPUT && typeof msg.payload?.data === 'string') {
    terminalSession.writeToSession(session.ptyProcess, msg.payload.data);
    return true;
  }

  if (msg.type === TERMINAL_RESIZE) {
    const { cols, rows } = msg.payload || {};
    if (typeof cols === 'number' && typeof rows === 'number') {
      terminalSession.resizeSession(session.ptyProcess, cols, rows);
    }
    return true;
  }

  return false;
}

export function destroySession(socketId) {
  const session = sessionsBySocketId.get(socketId);
  if (session) {
    terminalSession.destroySession(session.ptyProcess);
    sessionsBySocketId.delete(socketId);
  }
}
