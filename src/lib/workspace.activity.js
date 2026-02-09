import { supabase } from '../config/supabase.js';

export function touchWorkspaceActivity(workspaceId) {
  if (!workspaceId) return;
  supabase
    .from('workspaces')
    .update({ lastActiveAt: new Date().toISOString() })
    .eq('id', workspaceId)
    .then(({ error }) => {
      if (error) console.warn('[workspace.activity] touch failed:', error.message);
    });
}
