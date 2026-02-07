import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';
import dotenv from 'dotenv';

export const supabase = createClient(
  env.supabase.url,
  env.supabase.serviceRoleKey 
);
