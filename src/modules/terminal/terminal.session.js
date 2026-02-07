import pty from 'node-pty';
import path from 'node:path';
import { TERMINAL_OUTPUT, TERMINAL_CLOSE } from '../../websocket/ws.events.js';

function getWorkspaceCwd(workspaceId) {
  const base = path.join(process.cwd(), process.env.WORKSPACES_DIR || 'workspaces');
  return path.resolve(base, workspaceId);
}

export function createSession(workspaceId, socketId, socket) {
  const cwd = getWorkspaceCwd(workspaceId);
  const shell = process.platform === 'win32' ? 'powershell.exe' : process.env.SHELL || 'sh';

  const ptyProcess = pty.spawn(shell, [], {
    name: 'xterm-256color',
    cols: 80,
    rows: 24,
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

export function writeToSession(ptyProcess, data) {
  if (ptyProcess && !ptyProcess.killed) {
    ptyProcess.write(data);
  }
}

export function resizeSession(ptyProcess, cols, rows) {
  if (ptyProcess && !ptyProcess.killed) {
    ptyProcess.resize(cols, rows);
  }
}

export function destroySession(ptyProcess) {
  if (ptyProcess && !ptyProcess.killed) {
    ptyProcess.kill();
  }
}
