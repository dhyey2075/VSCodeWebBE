import { supabase } from '../../config/supabase.js';
import { stopAndRemoveContainer } from './container.manager.js';

const DEFAULT_TIMEOUT_MS = process.env.CONTAINER_INACTIVITY_TIMEOUT_MS || 5 * 60 * 1000; // 5 minutes
const DEFAULT_CHECK_INTERVAL_MS = process.env.CONTAINER_INACTIVITY_CHECK_INTERVAL_MS || 5 * 60 * 1000; // 5 minutes

async function cleanupInactiveContainers() {
  const timeoutMs = Number(process.env.CONTAINER_INACTIVITY_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS;
  const threshold = new Date(Date.now() - timeoutMs).toISOString();

  const { data: workspaces, error } = await supabase
    .from('workspaces')
    .select('id')
    .not('containerId', 'eq', null)
    .lt('lastActiveAt', threshold);

  if (error) {
    console.warn('[container.inactivity] list failed:', error.message);
    return;
  }

  if (!workspaces?.length) return;

  for (const { id: workspaceId } of workspaces) {
    try {
      await stopAndRemoveContainer(workspaceId);
      console.log(`[container.inactivity] Stopped inactive container for workspace ${workspaceId}`);
    } catch (err) {
      console.warn(`[container.inactivity] Failed to stop workspace ${workspaceId}:`, err.message);
    }
  }
}

let intervalId = null;

/**
 * Start the periodic inactivity cleanup. Call once at server startup.
 */
export function startContainerInactivityCleanup() {
  if (intervalId) return;

  const intervalMs = Number(process.env.CONTAINER_INACTIVITY_CHECK_INTERVAL_MS) || DEFAULT_CHECK_INTERVAL_MS;
  const timeoutMs = Number(process.env.CONTAINER_INACTIVITY_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS;

  console.log(
    `[container.inactivity] Started: check every ${intervalMs / 1000}s, timeout ${timeoutMs / 1000}s`
  );

  cleanupInactiveContainers();
  intervalId = setInterval(cleanupInactiveContainers, intervalMs);
}

/**
 * Stop the cleanup interval (e.g. for graceful shutdown).
 */
export function stopContainerInactivityCleanup() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}
