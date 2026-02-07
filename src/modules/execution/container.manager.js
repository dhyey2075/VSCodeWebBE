import path from 'node:path';
import Docker from 'dockerode';
import { supabase } from '../../config/supabase.js';

const CONTAINER_WORKSPACE_PATH = '/workspace';

const DEFAULT_IMAGE = 'node:alpine';
const DEFAULT_MEMORY_BYTES = 256 * 1024 * 1024; // 256 MB
const DEFAULT_NANO_CPUS = 500_000_000; // 0.5 CPU
const DEFAULT_PIDS_LIMIT = 100;


function getWorkspaceHostPath(workspaceId) {
  const base = path.join(process.cwd(), process.env.WORKSPACES_DIR || 'workspaces');
  return path.resolve(base, workspaceId);
}

export async function startWorkspaceContainer(workspaceId, image = DEFAULT_IMAGE) {
  const docker = new Docker();
  const hostWorkspacePath = getWorkspaceHostPath(workspaceId); 

  const { data: workspaceData, error: workspaceError } = await supabase.from('workspaces').select('containerId').eq('id', workspaceId).single();

  if (workspaceError) {
    throw new Error(workspaceError.message);
  }

  if (workspaceData.containerId) {
    throw new Error(`Workspace ${workspaceId} already has a container`);
  }

  const container = await docker.createContainer({
    Image: image,
    Hostname: workspaceId,
    Cmd: ['sleep', 'infinity'],
    Env: [
      `WORKSPACE_ID=${workspaceId}`,
      `WORKSPACE_DIR=${CONTAINER_WORKSPACE_PATH}`,
    ],
    WorkingDir: CONTAINER_WORKSPACE_PATH,
    HostConfig: {
      Binds: [`${hostWorkspacePath}:${CONTAINER_WORKSPACE_PATH}`],
      Memory: DEFAULT_MEMORY_BYTES,
      NanoCpus: DEFAULT_NANO_CPUS,
      PidsLimit: DEFAULT_PIDS_LIMIT,
      NetworkMode: 'none',
    },
  });

  await container.start();

  const { data, error } = await supabase.from('workspaces').update({
    containerId: container.id,
    status: 'ACTIVE',
  }).eq('id', workspaceId);

  if (error) {
    await container.remove();
    throw new Error(error.message);
  }

  console.log(`Container ${container.id} started`);
  return container;
}

export async function startContainer(containerId) {
  const docker = new Docker();
  const container = docker.getContainer(containerId);
  await container.start();
}

export async function stopContainer(containerId) {
  const docker = new Docker();
  const container = docker.getContainer(containerId);
  await container.stop();
}

export async function stopAndRemoveContainer(workspaceId) {

  const { data: workspaceData, error: workspaceError } = await supabase.from('workspaces').select('containerId').eq('id', workspaceId).single();
  if (workspaceError) {
    throw new Error(workspaceError.message);
  }
  if (!workspaceData.containerId) {
    throw new Error(`Workspace ${workspaceId} does not have a container`);
  }
  const containerId = workspaceData.containerId;

  const docker = new Docker();
  const container = docker.getContainer(containerId);
  await container.stop();
  await container.remove();
  await supabase.from('workspaces').update({
    containerId: null,
    status: 'STOPPED',
  }).eq('id', workspaceId);
}

export async function getContainer(workspaceId) {
  const docker = new Docker();
  const container = docker.getContainer(workspaceId);
  return container;
}