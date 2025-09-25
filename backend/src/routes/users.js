import { Router } from 'express';
import { supabase } from '../lib/supabase.js';

const router = Router();

// List users (optionally by role)
router.get('/', async (req, res) => {
  const role = req.query.role;
  let query = supabase
    .from('users')
    .select('id, name, email, phone, role, gender');
  if (role) query = query.eq('role', role);
  const { data, error } = await query.order('name', { ascending: true });
  if (error) return res.status(500).json({ error: 'Failed to fetch users' });
  res.json(data || []);
});

// Optional: find user by email (for scheduling lookups)
router.get('/by-email/:email', async (req, res) => {
  const email = req.params.email.toLowerCase();
  const { data, error } = await supabase
    .from('users')
    .select('id, name, email, phone, role')
    .eq('email', email)
    .maybeSingle();
  if (error) return res.status(500).json({ error: 'Lookup failed' });
  if (!data) return res.status(404).json({ error: 'Not found' });
  res.json(data);
});

router.get('/:id', async (req, res) => {
  const { data: user, error } = await supabase
    .from('users')
    .select('id, name, email, phone, role, gender, dob, created_at, updated_at')
    .eq('id', req.params.id)
    .maybeSingle();
  if (!user) return res.status(404).json({ error: 'Not found' });
  res.json(user);
});

router.patch('/:id', async (req, res) => {
  const updates = req.body || {};
  delete updates.passwordHash;
  delete updates.password_hash;
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


