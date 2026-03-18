const CFG = window.PROGRADE_CONFIG || {};
const supabase = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY);
