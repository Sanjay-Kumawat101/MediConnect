import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://zocfzbnpaoeykixbtlrk.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvY2Z6Ym5wYW9leWtpeGJ0bHJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3OTAxNzAsImV4cCI6MjA3NDM2NjE3MH0.lSpUZL-6PtHJGlg44FdYMQsfmSX8SeG0Tfpl5ShEQnc';

export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});


