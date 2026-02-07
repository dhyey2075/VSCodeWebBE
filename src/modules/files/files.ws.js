import fs from 'node:fs';
import { supabase } from '../../config/supabase.js';
import * as vfs from '../../lib/vfs.service.js';
import { FILES_LIST, FILES_LIST_RESULT, FILES_CHANGED } from '../../websocket/ws.events.js';

/** @type {Map<string, Map<string, import('ws').WebSocket>>} workspaceId -> (socketId -> socket) */
const subscribersByWorkspace = new Map();
/** @type {Map<string, fs.FSWatcher>} workspaceId -> watcher */
const watchersByWorkspace = new Map();

function startWatching(workspaceId) {
  if (watchersByWorkspace.has(workspaceId)) return;
  const rootPath = vfs.getWorkspaceRootPath(workspaceId);
  try {
    const watcher = fs.watch(rootPath, { recursive: true }, () => {
      notifyFileChange(workspaceId);
    });
    watchersByWorkspace.set(workspaceId, watcher);
  } catch {
    // workspace dir may not exist yet
  }
}

function stopWatching(workspaceId) {
  const w = watchersByWorkspace.get(workspaceId);
  if (w) {
    w.close();
    watchersByWorkspace.delete(workspaceId);
  }
}

export function notifyFileChange(workspaceId) {
  const subs = subscribersByWorkspace.get(workspaceId);
  if (!subs) return;
  const payload = JSON.stringify({ type: FILES_CHANGED, payload: { workspaceId } });
  for (const socket of subs.values()) {
    if (socket.readyState === 1) socket.send(payload);
  }
}

export function registerFileSubscriber(workspaceId, socketId, socket) {
  if (!subscribersByWorkspace.has(workspaceId)) {
    subscribersByWorkspace.set(workspaceId, new Map());
  }
  subscribersByWorkspace.get(workspaceId).set(socketId, socket);
  startWatching(workspaceId);
}

export function removeFileSubscriber(socketId) {
  for (const [workspaceId, subs] of subscribersByWorkspace) {
    subs.delete(socketId);
    if (subs.size === 0) {
      subscribersByWorkspace.delete(workspaceId);
      stopWatching(workspaceId);
    }
  }
}

export async function handleFilesList(workspaceId, path, socketId, socket, userEmail) {
  const { data: workspace, error } = await supabase
    .from('workspaces')
    .select('id, ownerEmail')
    .eq('id', workspaceId)
    .single();

  if (error || !workspace || workspace.ownerEmail !== userEmail) {
    socket.send(JSON.stringify({ type: 'error', payload: { message: 'Forbidden' } }));
    return;
  }

  registerFileSubscriber(workspaceId, socketId, socket);

  try {
    const entries = await vfs.listFiles(workspaceId, path || '/');
    socket.send(JSON.stringify({
      type: FILES_LIST_RESULT,
      payload: { workspaceId, path: path || '/', entries },
    }));
  } catch (e) {
    socket.send(JSON.stringify({
      type: 'error',
      payload: { message: e.code === 'NOT_FOUND' ? 'Not found' : e.message || 'List failed' },
    }));
  }
}
