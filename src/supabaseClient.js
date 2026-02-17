import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://gbupfinaclihgcqkbweq.supabase.co'
const supabaseAnonKey = 'sb_publishable_9AVxBkpA_ofBoPDwAF7gnA_30Tkafh-'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
