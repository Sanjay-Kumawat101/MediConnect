import { Router } from 'express';
import { supabase } from '../lib/supabase.js';

const router = Router();

// GET appointments (optionally filter out completed by default)
router.get('/', async (req, res) => {
  let query = supabase.from('appointments').select('*').order('date', { ascending: true });
  // By default, hide completed appointments unless requested
  if (!req.query.showCompleted || req.query.showCompleted !== 'true') {
    query = query.neq('status', 'completed');
  }
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: 'Failed to fetch appointments' });
  res.json(data || []);
});

router.post('/', async (req, res) => {
  const { userId, doctorId, date, time, reason } = req.body;
  if (!userId || !doctorId || !date || !time) {
    return res.status(400).json({ error: 'userId, doctorId, date, time required' });
  }

  const selectedDate = new Date(date);
  const today = new Date();
  today.setHours(0,0,0,0);
  if (isNaN(selectedDate.getTime()) || selectedDate < today) {
    return res.status(400).json({ error: 'Cannot book past dates' });
  }

  // Ensure doctor exists and is registered as doctor
  const { data: doctor, error: docErr } = await supabase
    .from('users')
    .select('id, role, name')
    .eq('id', doctorId)
    .eq('role', 'doctor')
    .maybeSingle();
  if (!doctor) return res.status(400).json({ error: 'Selected doctor is not registered' });

  // Ensure patient exists
  const { data: patient, error: patErr } = await supabase
    .from('users')
    .select('id, name, email')
    .eq('id', userId)
    .maybeSingle();
  if (!patient) return res.status(400).json({ error: 'Invalid user' });

  const { data, error } = await supabase
    .from('appointments')
    .insert({
      user_id: userId,
      doctor_id: doctorId,
      date,
      time,
      reason: reason || '',
      status: 'pending'
    })
    .select()
    .single();
  if (error) return res.status(500).json({ error: 'Failed to create appointment' });
  res.status(201).json(data);
});

// PATCH appointment status, lock after cancelled/completed, allow only upcoming->completed
router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body || {};
  // Fetch existing to detect status change and user_id
  const { data: existing, error: getErr } = await supabase
    .from('appointments')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const prevStatus = existing.status;
  const nextStatus = updates.status;
  // Prevent updates if locked (cancelled, completed)
  if (['cancelled', 'completed'].includes(prevStatus)) {
    return res.status(403).json({ error: 'Appointment cannot be changed' });
  }
  // Once confirmed, only allow moving to completed
  if (prevStatus === 'upcoming' && nextStatus && nextStatus !== 'completed') {
    return res.status(403).json({ error: 'Only "Mark as Visited" allowed after confirmation' });
  }
  if (prevStatus !== 'upcoming' && nextStatus === 'completed') {
    return res.status(403).json({ error: 'Only confirmed appointments can be marked completed' });
  }
  const { data, error } = await supabase
    .from('appointments')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) return res.status(400).json({ error: 'Update failed' });

  // Create patient alert on doctor confirmation/cancellation
  if (updates.status && updates.status !== prevStatus) {
    let message = null;
    if (updates.status === 'upcoming') {
      message = `Your appointment on ${data.date} at ${data.time} was confirmed.`;
    } else if (updates.status === 'cancelled') {
      message = `Your appointment on ${data.date} at ${data.time} was cancelled.`;
    } else if (updates.status === 'completed') {
      message = `Your appointment on ${data.date} at ${data.time} is marked as completed.`;
    }
    if (message) {
      await supabase
        .from('alerts')
        .insert({
          user_id: data.user_id,
          title: 'Appointment Update',
          message,
          severity: updates.status === 'cancelled' ? 'warning' : 'info',
        });
    }
  }
  res.json(data);
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase
    .from('appointments')
    .delete()
    .eq('id', id);
  if (error) return res.status(400).json({ error: 'Delete failed' });
  res.status(204).send();
});

export default router;


