import { supabase } from '../lib/supabase.js';
import { isConfiguredAdmin } from '../lib/admin.js';

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ error: 'Invalid or expired session' });

    if (isConfiguredAdmin(user.email)) {
      req.user = { sub: user.id, email: user.email, role: 'admin' };
      return next();
    }

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('role, approval_status')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      console.error('Authenticated profile lookup failed:', profileError);
      return res.status(500).json({ error: 'Could not verify the account profile' });
    }
    if (!profile) {
      return res.status(403).json({ error: 'Complete your account profile before using the app', code: 'PROFILE_REQUIRED' });
    }
    if (profile.role === 'doctor' && profile.approval_status !== 'approved') {
      return res.status(403).json({ error: 'Your doctor account is waiting for admin approval', code: 'DOCTOR_PENDING' });
    }

    req.user = { sub: user.id, email: user.email, role: profile.role };
    next();
  } catch (error) {
    console.error('Authentication verification failed:', error);
    res.status(500).json({ error: 'Could not verify the session' });
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Administrator access required' });
  }
  next();
}
