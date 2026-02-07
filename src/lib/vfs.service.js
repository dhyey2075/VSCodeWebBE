import fs from 'node:fs/promises';
import path from 'node:path';
import { normalizePath, isPathAllowed } from './path.guard.js';

const WORKSPACES_BASE = process.env.WORKSPACES_DIR || path.join(process.cwd(), 'workspaces');

/**
 * Map workspace id + logical path to real filesystem path.
 * Logical path must be normalized (e.g. /main.js).
 * @param {string} workspaceId
 * @param {string} logicalPath - e.g. /main.js or /
 */
function toRealPath(workspaceId, logicalPath) {
  const relative = logicalPath === '/' ? '' : logicalPath.slice(1);
  return path.join(WORKSPACES_BASE, workspaceId, relative);
}

/**
 * Read file content. Returns string (UTF-8).
 * @param {string} workspaceId
 * @param {string} logicalPath - e.g. /main.js
 * @returns {Promise<{ content: string }>}
 * @throws if path invalid or file not found / not a file
 */
export async function readFile(workspaceId, logicalPath) {
  const normalized = normalizePath(logicalPath);
  if (!normalized || !isPathAllowed(logicalPath)) {
    const err = new Error('Invalid path');
    err.code = 'INVALID_PATH';
    throw err;
  }
  const realPath = toRealPath(workspaceId, normalized);
  try {
    const content = await fs.readFile(realPath, 'utf8');
    return { content };
  } catch (e) {
    if (e.code === 'ENOENT') {
      const err = new Error('File not found');
      err.code = 'NOT_FOUND';
      throw err;
    }
    if (e.code === 'EISDIR') {
      const err = new Error('Path is a directory');
      err.code = 'IS_DIRECTORY';
      throw err;
    }
    throw e;
  }
}

/**
 * Write file content. Creates parent directories if needed.
 * @param {string} workspaceId
 * @param {string} logicalPath - e.g. /src/main.js
 * @param {string} content
 */
export async function writeFile(workspaceId, logicalPath, content) {
  const normalized = normalizePath(logicalPath);
  if (!normalized || !isPathAllowed(logicalPath)) {
    const err = new Error('Invalid path');
    err.code = 'INVALID_PATH';
    throw err;
  }
  const realPath = toRealPath(workspaceId, normalized);
  await fs.mkdir(path.dirname(realPath), { recursive: true });
  await fs.writeFile(realPath, content, 'utf8');
}

/**
 * List entries in a directory. Returns workspace-relative paths only (no real paths).
 * @param {string} workspaceId
 * @param {string} logicalPath - e.g. / or /src
 * @returns {Promise<Array<{ name: string, type: 'file' | 'directory' }>>}
 */
export async function listFiles(workspaceId, logicalPath) {
  const normalized = normalizePath(logicalPath);
  if (normalized === null || !isPathAllowed(logicalPath)) {
    const err = new Error('Invalid path');
    err.code = 'INVALID_PATH';
    throw err;
  }
  const realPath = toRealPath(workspaceId, normalized);
  try {
    const entries = await fs.readdir(realPath, { withFileTypes: true });
    return entries.map((d) => ({
      name: d.name,
      type: d.isDirectory() ? 'directory' : 'file',
    }));
  } catch (e) {
    if (e.code === 'ENOENT') {
      const err = new Error('Directory not found');
      err.code = 'NOT_FOUND';
      throw err;
    }
    if (e.code === 'ENOTDIR') {
      const err = new Error('Path is not a directory');
      err.code = 'NOT_DIRECTORY';
      throw err;
    }
    throw e;
  }
}
