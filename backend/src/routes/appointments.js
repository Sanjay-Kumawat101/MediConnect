import { Router } from 'express';
import { supabase } from '../lib/supabase.js';

const router = Router();

// GET appointments (optionally filter out completed by default)
router.get('/', async (req, res) => {
  let query = supabase.from('appointments').select('*').order('date', { ascending: true });
  query = req.user.role === 'doctor'
    ? query.eq('doctor_id', req.user.sub)
    : query.eq('user_id', req.user.sub);
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
  if (req.user.role !== 'patient') {
    return res.status(403).json({ error: 'Only patients can book appointments' });
  }
  if (userId && userId !== req.user.sub) {
    return res.status(403).json({ error: 'Cannot book an appointment for another patient' });
  }
  if (!doctorId || !date || !time) {
    return res.status(400).json({ error: 'doctorId, date, and time are required' });
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
    .eq('approval_status', 'approved')
    .maybeSingle();
  if (docErr) {
    console.error('Appointment doctor lookup failed:', docErr);
    return res.status(500).json({ error: 'Could not verify the selected doctor' });
  }
  if (!doctor) return res.status(400).json({ error: 'Selected doctor is not registered' });

  // Ensure patient exists
  const { data: patient, error: patErr } = await supabase
    .from('users')
    .select('id, name, email, phone, gender, dob')
    .eq('id', req.user.sub)
    .maybeSingle();
  if (patErr) {
    console.error('Appointment patient lookup failed:', patErr);
    return res.status(500).json({ error: 'Could not verify the patient account' });
  }
  if (!patient) return res.status(400).json({ error: 'Invalid user' });
  if (!patient.name || !patient.phone || !patient.gender || !patient.dob) {
    return res.status(400).json({
      error: 'Complete your name, phone number, gender, and date of birth before booking',
      code: 'PROFILE_REQUIRED'
    });
  }

  const { data, error } = await supabase
    .from('appointments')
    .insert({
      user_id: req.user.sub,
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
  if (Object.keys(updates).some(field => field !== 'status')) {
    return res.status(400).json({ error: 'Only appointment status can be changed' });
  }
  if (req.user.role === 'doctor' && !['upcoming', 'cancelled'].includes(updates.status)) {
    return res.status(403).json({ error: 'Doctors can only confirm or cancel pending appointments' });
  }
  // Fetch existing to detect status change and user_id
  const { data: existing, error: getErr } = await supabase
    .from('appointments')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (getErr) {
    console.error('Appointment lookup failed:', getErr);
    return res.status(500).json({ error: 'Could not load the appointment' });
  }
  if (!existing) return res.status(404).json({ error: 'Not found' });
  if (req.user.role === 'doctor' && existing.doctor_id !== req.user.sub) {
    return res.status(403).json({ error: 'Cannot update another doctor’s appointment' });
  }
  if (req.user.role === 'patient' && existing.user_id !== req.user.sub) {
    return res.status(403).json({ error: 'Cannot update another patient’s appointment' });
  }
  if (req.user.role === 'patient' && updates.status !== 'completed') {
    return res.status(403).json({ error: 'Patients can only mark a confirmed appointment completed' });
  }
  if (req.user.role === 'doctor' && updates.status === 'completed') {
    return res.status(403).json({ error: 'Only the patient can mark an appointment completed' });
  }
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
    .eq('id', id)
    .eq(req.user.role === 'doctor' ? 'doctor_id' : 'user_id', req.user.sub);
  if (error) return res.status(400).json({ error: 'Delete failed' });
  res.status(204).send();
});

export default router;
