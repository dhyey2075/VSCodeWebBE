import { supabase } from '../config/supabase.js';
import { stopAndRemoveContainer } from '../modules/execution/container.manager.js';

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
 * POST /api/workspace/:id/container/stop
 * Stop and remove the workspace container; clear containerId in DB.
 */
export async function stopContainer(req, res) {
  const { id: workspaceId } = req.params;
  const workspace = await getWorkspaceIfOwner(req, res, workspaceId);
  if (!workspace) return;

  try {
    await stopAndRemoveContainer(workspaceId);
    return res.status(200).json({ message: 'Container stopped and removed' });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Failed to stop container' });
  }
}
