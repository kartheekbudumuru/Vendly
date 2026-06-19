import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder-url-please-configure-vercel.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key-please-configure-vercel'

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
)