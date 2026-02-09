import { supabase } from '../../config/supabase.js';
import * as terminalSession from './terminal.session.js';
import * as filesWs from '../files/files.ws.js';
import { ensureWorkspaceContainer } from '../execution/container.manager.js';
import { touchWorkspaceActivity } from '../../lib/workspace.activity.js';
import { TERMINAL_INPUT, TERMINAL_RESIZE, TERMINAL_ATTACH, TERMINAL_ATTACHED } from '../../websocket/ws.events.js';

const sessionsBySocketId = new Map();

export async function handleMessage(socketId, msg, socket, userEmail) {
  if (msg.type === TERMINAL_ATTACH) {
    const workspaceId = msg.payload?.workspaceId;
    if (!workspaceId) return false;

    const { data: workspace, error } = await supabase
      .from('workspaces')
      .select('id, ownerEmail')
      .eq('id', workspaceId)
      .single();

    if (error || !workspace || workspace.ownerEmail !== userEmail) {
      if (socket.readyState === 1) {
        socket.send(JSON.stringify({ type: 'error', payload: { message: 'Workspace not found or access denied' } }));
      }
      return true;
    }

    try {
      touchWorkspaceActivity(workspaceId);
      const { containerId } = await ensureWorkspaceContainer(workspaceId);
      const session = await terminalSession.createSession(workspaceId, socketId, socket, containerId, { cols: 80, rows: 24 });
      sessionsBySocketId.set(socketId, session);
      filesWs.registerFileSubscriber(workspaceId, socketId, socket);
      if (socket.readyState === 1) {
        socket.send(JSON.stringify({ type: TERMINAL_ATTACHED, payload: { workspaceId } }));
      }
    } catch (err) {
      if (socket.readyState === 1) {
        socket.send(JSON.stringify({ type: 'error', payload: { message: err.message || 'Failed to start container' } }));
      }
    }
    return true;
  }

  const session = sessionsBySocketId.get(socketId);
  if (!session) return false;

  if (msg.type === TERMINAL_INPUT && typeof msg.payload?.data === 'string') {
    touchWorkspaceActivity(session.workspaceId);
    const data = msg.payload.data;
    const isClearCmd = /^cls\s*(\r\n|\r|\n)|^clear\s*(\r\n|\r|\n)/i.test(data);
    if (isClearCmd && socket.readyState === 1) {
      socket.send(JSON.stringify({ type: 'terminal.output', payload: { data: '\x1b[2J\x1b[H' } }));
    }
    terminalSession.writeToSession(session, data);
    return true;
  }

  if (msg.type === TERMINAL_RESIZE) {
    touchWorkspaceActivity(session.workspaceId);
    const { cols, rows } = msg.payload || {};
    if (typeof cols === 'number' && typeof rows === 'number') {
      terminalSession.resizeSession(session, cols, rows);
    }
    return true;
  }

  return false;
}

export function destroySession(socketId) {
  const session = sessionsBySocketId.get(socketId);
  if (session) {
    terminalSession.destroySession(session);
    sessionsBySocketId.delete(socketId);
  }
}
