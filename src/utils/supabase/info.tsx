/**
 * Supabase Configuration
 * 
 * This file reads Supabase credentials from environment variables.
 * Make sure to set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.
 */

// Extract project ID from Supabase URL
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const functionName = import.meta.env.VITE_SUPABASE_FUNCTION_NAME || 'make-server-d5b5d02c';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your .env file.'
  );
}

// Extract project ID from URL (e.g., https://projectid.supabase.co -> projectid)
export const projectId = supabaseUrl.replace('https://', '').replace('.supabase.co', '');
export const publicAnonKey = supabaseAnonKey;
export const supabaseFunctionName = functionName;