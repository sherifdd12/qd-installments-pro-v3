import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://odeqbnntvogchzipniig.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kZXFibm50dm9nY2h6aXBuaWlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5Mjc5OTgsImV4cCI6MjA3MjUwMzk5OH0.phWW0hNm-ujEEsngjhf88us4suJv9boQ_9uh7ADhTXQ'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
