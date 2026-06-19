import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://qhuaspfozceamlenkazs.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_aQzsnJTf-3suCUzcuZbZ0Q_xHg8y6H3'

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
)