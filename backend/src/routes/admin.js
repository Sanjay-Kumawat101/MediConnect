import { Router } from 'express';
import { requireAdmin } from '../middleware/auth.js';
import { supabase } from '../lib/supabase.js';

const router = Router();

router.use(requireAdmin);

router.get('/doctors', async (req, res) => {
  const { data, error } = await supabase
    .from('users')
    .select('id, name, email, phone, specialization, license_number, created_at')
    .eq('role', 'doctor')
    .eq('approval_status', 'pending')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Pending doctor lookup failed:', error);
    return res.status(500).json({ error: 'Could not load pending doctor applications' });
  }
  res.json(data || []);
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
