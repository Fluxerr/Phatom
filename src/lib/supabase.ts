import { createClient } from "@supabase/supabase-js";

// Default credentials to ensure mobile PWAs and deployed builds always connect to Supabase
const DEFAULT_URL = "https://hbgcgubayjdlmzdsfmxk.supabase.co";
const DEFAULT_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhiZ2NndWJheWpkbG16ZHNmbXhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk2NzYxMjEsImV4cCI6MjEwNTI1MjEyMX0.VFvzxy6efU8_v58Drcrb5rxb4gU78mV3WupTRDEBdX4";

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_URL;
const SUPABASE_URL = rawUrl.replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const isSupabaseConfigured = () => {
  return SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;
};
