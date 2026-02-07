import 'dotenv/config';


const required = [
  'PORT',
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY'
];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`❌ Missing environment variable: ${key}`);
  }
}

export const env = {
  port: process.env.PORT,
  supabase: {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY
  }
};
