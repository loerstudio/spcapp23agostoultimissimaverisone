import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabaseUrl = 'https://qfpmckovlzfxgnqeibde.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmcG1ja292bHpmeGducWVpYmRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2MDA2NDgsImV4cCI6MjA3MTE3NjY0OH0.flXM7thLPwKCmZzhOL92q2r2Oe84UgiHm0JGCIvSm00';

const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;
