import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config'

/**
 * Singleton Supabase client using the anon key (client-side safe).
 * RLS policies on session_metrics ensure users only access their own data.
 */
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
