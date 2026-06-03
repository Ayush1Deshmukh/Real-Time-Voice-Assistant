// Central configuration — all environment URLs live here.
// Why: Prevents hardcoded localhost strings from leaking into production builds.
export const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
