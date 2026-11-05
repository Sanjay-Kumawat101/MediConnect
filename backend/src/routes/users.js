import { Router } from 'express';
import { supabase } from '../lib/supabase.js';

const router = Router();

// List users (optionally by role)
router.get('/', async (req, res) => {
  if (req.query.role !== 'doctor') {
    return res.status(400).json({ error: 'Only approved doctors can be listed' });
  }
  let query = supabase
    .from('users')
    .select('id, name, role, gender, specialization')
    .eq('role', 'doctor')
    .eq('approval_status', 'approved');
  const { data, error } = await query.order('name', { ascending: true });
  if (error) return res.status(500).json({ error: 'Failed to fetch users' });
  res.json(data || []);
});

// Optional: find user by email (for scheduling lookups)
router.get('/by-email/:email', async (req, res) => {
  if (req.user.role !== 'doctor') {
    return res.status(403).json({ error: 'Only approved doctors can look up patients' });
  }
  const email = req.params.email.toLowerCase();
  const { data, error } = await supabase
    .from('users')
    .select('id, name, email, phone, role')
    .eq('email', email)
    .maybeSingle();
  if (error) return res.status(500).json({ error: 'Lookup failed' });
  if (!data) return res.status(404).json({ error: 'Not found' });
  const { data: appointment, error: appointmentError } = await supabase
    .from('appointments')
    .select('id')
    .eq('doctor_id', req.user.sub)
    .eq('user_id', data.id)
    .limit(1)
    .maybeSingle();
  if (appointmentError) return res.status(500).json({ error: 'Lookup failed' });
  if (!appointment) return res.status(404).json({ error: 'Not found' });
  res.json(data);
});

router.get('/:id', async (req, res) => {
  if (req.user?.sub !== req.params.id) {
    return res.status(403).json({ error: 'You can only view your own profile' });
  }
  const { data: user, error } = await supabase
    .from('users')
    .select('id, name, email, phone, role, gender, dob, created_at, updated_at')
    .eq('id', req.params.id)
    .maybeSingle();
  if (!user) return res.status(404).json({ error: 'Not found' });
  res.json(user);
});

router.patch('/:id', async (req, res) => {
  if (req.user?.sub !== req.params.id) {
    return res.status(403).json({ error: 'You can only update your own profile' });
  }
  const body = req.body || {};
  const updates = {};
  for (const field of ['name', 'phone', 'gender', 'dob']) {
    if (body[field] !== undefined) updates[field] = body[field];
  }
  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No editable profile fields provided' });
  }
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', req.params.id)
    .select('id, name, email, phone, role, gender, dob, created_at, updated_at')
    .single();
  if (error) return res.status(400).json({ error: 'Update failed' });
  res.json(data);
});

export default router;
