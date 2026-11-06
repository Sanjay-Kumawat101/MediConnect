import { Router } from 'express';
import { requireAdmin } from '../middleware/auth.js';
import { supabase } from '../lib/supabase.js';

const router = Router();

router.use(requireAdmin);

router.get('/doctors', async (req, res) => {
  const status = req.query.status || 'pending';
  if (!['all', 'pending', 'approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Status must be all, pending, approved, or rejected' });
  }

  let query = supabase
    .from('users')
    .select('id, name, email, phone, specialization, license_number, created_at, approval_status')
    .eq('role', 'doctor')
    .order('created_at', { ascending: false });
  if (status !== 'all') query = query.eq('approval_status', status);

  const { data, error } = await query;
  if (error) {
    console.error('Doctor application lookup failed:', error);
    return res.status(500).json({ error: 'Could not load doctor applications' });
  }
  res.json(data || []);
});

router.get('/summary', async (req, res) => {
  const statuses = ['pending', 'approved', 'rejected'];
  const results = await Promise.all(statuses.map(status =>
    supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'doctor')
      .eq('approval_status', status)
  ));

  const failedResult = results.find(result => result.error);
  if (failedResult) {
    console.error('Doctor application summary failed:', failedResult.error);
    return res.status(500).json({ error: 'Could not load doctor application summary' });
  }

  const summary = Object.fromEntries(statuses.map((status, index) => [status, results[index].count || 0]));
  summary.total = summary.pending + summary.approved + summary.rejected;
  res.json(summary);
});

router.patch('/doctors/:id', async (req, res) => {
  const { status } = req.body || {};
  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Status must be approved or rejected' });
  }

  const { data, error } = await supabase
    .from('users')
    .update({ approval_status: status })
    .eq('id', req.params.id)
    .eq('role', 'doctor')
    .eq('approval_status', 'pending')
    .select('id, name, email, approval_status')
    .maybeSingle();

  if (error) {
    console.error('Doctor verification update failed:', error);
    return res.status(500).json({ error: 'Could not update the doctor application' });
  }
  if (!data) {
    return res.status(404).json({ error: 'Pending doctor application not found' });
  }
  res.json(data);
});

export default router;
