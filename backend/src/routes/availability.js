import { Router } from 'express';
import { supabase } from '../lib/supabase.js';

const router = Router();

// List availability. If doctorId not provided, use authenticated user
router.get('/', async (req, res) => {
  const doctorId = req.query.doctorId || req.user?.sub;
  const { data, error } = await supabase
    .from('availability')
    .select('*')
    .eq('doctor_id', doctorId)
    .order('date', { ascending: true })
    .order('time', { ascending: true });
  if (error) return res.status(500).json({ error: 'Failed to fetch availability' });
  res.json(data || []);
});

// Create availability for authenticated doctor
router.post('/', async (req, res) => {
  const doctorId = req.user?.sub;
  const { date, time, notes } = req.body || {};
  if (!date || !time) return res.status(400).json({ error: 'date and time are required' });
  const d = new Date(date);
  const today = new Date();
  today.setHours(0,0,0,0);
  if (isNaN(d.getTime()) || d < today) return res.status(400).json({ error: 'Date must be today or future' });
  const { data, error } = await supabase
    .from('availability')
    .insert({ doctor_id: doctorId, date, time, notes: notes || '' })
    .select()
    .single();
  if (error) return res.status(500).json({ error: 'Failed to add availability' });
  res.status(201).json(data);
});

// Delete availability by id (must own)
router.delete('/:id', async (req, res) => {
  const doctorId = req.user?.sub;
  const { error } = await supabase
    .from('availability')
    .delete()
    .eq('id', req.params.id)
    .eq('doctor_id', doctorId);
  if (error) return res.status(400).json({ error: 'Delete failed' });
  res.status(204).send();
});

export default router;


