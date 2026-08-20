import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and Anon Key must be configured in environment variables.');
}

console.log('Supabase URL configured:', !!supabaseUrl);
console.log('Supabase anon key configured:', !!supabaseAnonKey);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

