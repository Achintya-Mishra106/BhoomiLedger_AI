import { createClient } from
    "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL =
    "https://omojvagpcsebnjlunvtk.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9tb2p2YWdwY3NlYm5qbHVudnRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0MTQ2NTcsImV4cCI6MjEwMzk5MDY1N30.KRHJqXhapEWgD2NvbHM_tyVTRtxmg6aI1zbrHNWwWsY" ;

export const supabase =
    createClient(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY
    );
