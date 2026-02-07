import { supabase } from '../config/supabase.js';
import * as vfs from '../lib/vfs.service.js';

/**
 * Load workspace and verify the current user owns it.
 * @returns workspace row or null; sends 403/404 and returns null on failure
 */
async function getWorkspaceIfOwner(req, res, workspaceId) {
  const { data, error } = await supabase
    .from('workspaces')
    .select('id, ownerEmail')
    .eq('id', workspaceId)
    .single();

  if (error || !data) {
    res.status(404).json({ message: 'Workspace not found' });
    return null;
  }
  if (data.ownerEmail !== req.user?.email) {
    res.status(403).json({ message: 'Forbidden' });
    return null;
  }
  return data;
}

/**
 * GET /api/workspace/:id/files?path=/
 * Returns directory listing or file content. Path is workspace-relative (logical only).
 */
export async function getFileOrList(req, res) {
  const { id: workspaceId } = req.params;
  const pathParam = req.query.path ?? '/';

  const workspace = await getWorkspaceIfOwner(req, res, workspaceId);
  if (!workspace) return;

  try {
    // Try as directory first
    const entries = await vfs.listFiles(workspaceId, pathParam);
    return res.status(200).json({ type: 'directory', path: pathParam, entries });
  } catch (e) {
    if (e.code === 'NOT_DIRECTORY') {
      try {
        const { content } = await vfs.readFile(workspaceId, pathParam);
        return res.status(200).json({ type: 'file', path: pathParam, content });
      } catch (readErr) {
        if (readErr.code === 'NOT_FOUND') {
          return res.status(404).json({ message: 'Not found' });
        }
        throw readErr;
      }
    }
    if (e.code === 'NOT_FOUND') {
      return res.status(404).json({ message: 'Not found' });
    }
    if (e.code === 'INVALID_PATH') {
      return res.status(400).json({ message: 'Invalid path' });
    }
    throw e;
  }
}

/**
 * PUT /api/workspace/:id/files?path=/main.js
 * Body: raw string or { content: "..." }. Writes file at logical path.
 */
export async function writeFileHandler(req, res) {
  const { id: workspaceId } = req.params;
  const pathParam = req.query.path;

  if (!pathParam || pathParam === '/') {
    return res.status(400).json({ message: 'Query parameter path is required and cannot be root' });
  }

  const workspace = await getWorkspaceIfOwner(req, res, workspaceId);
  if (!workspace) return;

  const content = typeof req.body === 'string' ? req.body : req.body?.content;
  if (content === undefined) {
    return res.status(400).json({ message: 'Request body must be a string or { content: "..." }' });
  }

  try {
    await vfs.writeFile(workspaceId, pathParam, String(content));
    return res.status(200).json({ message: 'File written', path: pathParam });
  } catch (e) {
    if (e.code === 'INVALID_PATH') {
      return res.status(400).json({ message: 'Invalid path' });
    }
    throw e;
  }
}
