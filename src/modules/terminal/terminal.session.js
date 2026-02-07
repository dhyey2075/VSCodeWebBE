import pty from 'node-pty';
import path from 'node:path';
import { TERMINAL_OUTPUT, TERMINAL_CLOSE } from '../../websocket/ws.events.js';
import * as executer from '../execution/executer.service.js';

function getWorkspaceCwd(workspaceId) {
  const base = path.join(process.cwd(), process.env.WORKSPACES_DIR || 'workspaces');
  return path.resolve(base, workspaceId);
}

/**
 * Create a terminal session. If containerId is provided, uses interactive exec inside container; otherwise PTY on host.
 * @param {string} workspaceId
 * @param {string} socketId
 * @param {import('ws').WebSocket} socket
 * @param {string|null} [containerId]
 * @param {{ cols: number, rows: number }} [size]
 * @returns {Promise<{ workspaceId: string, socketId: string, ptyProcess?: import('node-pty').IPty, execSession?: ReturnType<typeof executer.createInteractiveExec> extends Promise<infer T> ? T : never }>}
 */
export async function createSession(workspaceId, socketId, socket, containerId = null, size = { cols: 80, rows: 24 }) {
  if (containerId) {
    const execSession = await executer.createInteractiveExec(containerId, socket, size);
    return { workspaceId, socketId, execSession };
  }

  const cwd = getWorkspaceCwd(workspaceId);
  const shell = process.platform === 'win32' ? 'powershell.exe' : process.env.SHELL || 'sh';

  const ptyProcess = pty.spawn(shell, [], {
    name: 'xterm-256color',
    cols: size.cols,
    rows: size.rows,
    cwd: cwd || process.env.HOME || process.cwd(),
  });

  ptyProcess.onData((data) => {
    if (socket.readyState === 1) {
      socket.send(JSON.stringify({ type: TERMINAL_OUTPUT, payload: { data } }));
    }
  });

  ptyProcess.onExit(() => {
    if (socket.readyState === 1) {
      socket.send(JSON.stringify({ type: TERMINAL_CLOSE }));
    }
  });

  return { workspaceId, socketId, ptyProcess };
}

export function writeToSession(session, data) {
  if (session.ptyProcess && !session.ptyProcess.killed) {
    session.ptyProcess.write(data);
  } else if (session.execSession) {
    session.execSession.write(data);
  }
}

export function resizeSession(session, cols, rows) {
  if (session.ptyProcess && !session.ptyProcess.killed) {
    session.ptyProcess.resize(cols, rows);
  } else if (session.execSession) {
    session.execSession.resize(cols, rows);
  }
}

export function destroySession(session) {
  if (session.ptyProcess && !session.ptyProcess.killed) {
    session.ptyProcess.kill();
  } else if (session.execSession) {
    session.execSession.destroy();
  }
}
