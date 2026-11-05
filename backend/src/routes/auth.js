import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { isConfiguredAdmin } from '../lib/admin.js';

const router = Router();
const allowedGenders = new Set(['male', 'female', 'other', 'prefer-not-to-say']);

async function getAuthUser(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return { user: null, error: 'Authorization token required' };

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return { user: null, error: 'Invalid or expired session' };
  return { user, error: null };
}

async function readProfile(userId) {
  const { data, error } = await supabase
    .from('users')
    .select('id, name, email, phone, role, gender, dob, specialization, approval_status, created_at, updated_at')
    .eq('id', userId)
    .maybeSingle();
  return { profile: data, error };
}

router.get('/profile', async (req, res) => {
  try {
    const { user, error: authError } = await getAuthUser(req);
    if (authError) return res.status(401).json({ error: authError });

    if (isConfiguredAdmin(user.email)) {
      return res.json({
        id: user.id,
        name: user.user_metadata?.full_name || user.user_metadata?.name || 'Administrator',
        email: user.email,
        role: 'admin',
        approval_status: 'approved'
      });
    }

    const { profile, error } = await readProfile(user.id);
    if (error) {
      console.error('Profile lookup failed:', error);
      return res.status(500).json({ error: 'Could not load the account profile' });
    }
    if (!profile) return res.status(404).json({ error: 'Complete your account profile', code: 'PROFILE_REQUIRED' });
    res.json(profile);
  } catch (error) {
    console.error('Profile lookup failed:', error);
    res.status(500).json({ error: 'Could not load the account profile' });
  }
});

router.post('/profile', async (req, res) => {
  try {
    const { user, error: authError } = await getAuthUser(req);
    if (authError) return res.status(401).json({ error: authError });
    if (isConfiguredAdmin(user.email)) {
      return res.status(403).json({ error: 'Administrator accounts do not use patient or doctor profiles' });
    }

    const { profile: existing, error: lookupError } = await readProfile(user.id);
    if (lookupError) {
      console.error('Profile lookup before save failed:', lookupError);
      return res.status(500).json({ error: 'Could not load the account profile' });
    }

    const metadata = user.user_metadata || {};
    const body = req.body || {};
    const name = String(body.name || metadata.name || metadata.full_name || '').trim();
    const phone = String(body.phone || '').trim();
    const role = body.role;
    const gender = body.gender;
    const dob = body.dob;
    const specialization = String(body.specialization || '').trim();
    const licenseNumber = String(body.licenseNumber || '').trim();
    const isGoogleUser = metadata.provider === 'google' ||
      user.identities?.some(identity => identity.provider === 'google');

    if (existing && role !== existing.role) {
      return res.status(403).json({ error: 'Account role cannot be changed' });
    }
    if (isGoogleUser && !existing && role !== 'patient') {
      return res.status(403).json({ error: 'Google registration is available for patients only' });
    }
    if (role === 'patient' && isGoogleUser) {
      const patientName = name || 'Google Patient';
      if (patientName.length < 2 || !user.email) {
        return res.status(400).json({ error: 'A name and verified email are required' });
      }
      if (gender && !allowedGenders.has(gender)) {
        return res.status(400).json({ error: 'Enter a valid gender' });
      }
      if (dob) {
        const birthDate = new Date(`${dob}T00:00:00`);
        if (Number.isNaN(birthDate.getTime()) || birthDate > new Date()) {
          return res.status(400).json({ error: 'Enter a valid date of birth in the past' });
        }
      }

      const { data, error } = await supabase
        .from('users')
        .upsert({
          id: user.id,
          name: patientName,
          email: user.email.toLowerCase(),
          phone: phone || existing?.phone || null,
          role: 'patient',
          gender: gender || existing?.gender || null,
          dob: dob || existing?.dob || null,
          specialization: null,
          license_number: null,
          approval_status: existing?.approval_status || 'approved'
        }, { onConflict: 'id' })
        .select('id, name, email, phone, role, gender, dob, specialization, approval_status, created_at, updated_at')
        .single();

      if (error) {
        console.error('Google patient profile save failed:', error);
        return res.status(500).json({ error: 'Could not create your patient account' });
      }
      return res.status(existing ? 200 : 201).json(data);
    }

    if (!['patient', 'doctor'].includes(role) || name.length < 2 || !phone ||
        !allowedGenders.has(gender) || !dob) {
      return res.status(400).json({ error: 'Name, phone, role, gender, and date of birth are required' });
    }
    const birthDate = new Date(`${dob}T00:00:00`);
    if (Number.isNaN(birthDate.getTime()) || birthDate > new Date()) {
      return res.status(400).json({ error: 'Enter a valid date of birth in the past' });
    }
    if (role === 'doctor' && (!specialization || !licenseNumber)) {
      return res.status(400).json({ error: 'Doctor specialization and medical license number are required' });
    }
    if (!user.email) return res.status(400).json({ error: 'A verified email address is required' });

    const approvalStatus = existing?.approval_status || (role === 'doctor' ? 'pending' : 'approved');
    const { data, error } = await supabase
      .from('users')
      .upsert({
        id: user.id,
        name,
        email: user.email.toLowerCase(),
        phone,
        role,
        gender,
        dob,
        specialization: role === 'doctor' ? specialization : null,
        license_number: role === 'doctor' ? licenseNumber : null,
        approval_status: approvalStatus
      }, { onConflict: 'id' })
      .select('id, name, email, phone, role, gender, dob, specialization, approval_status, created_at, updated_at')
      .single();

    if (error) {
      console.error('Profile save failed:', error);
      return res.status(500).json({ error: 'Could not save your profile. Check the Supabase setup and server logs.' });
    }
    res.status(existing ? 200 : 201).json(data);
  } catch (error) {
    console.error('Profile save failed:', error);
    res.status(500).json({ error: 'Could not save your profile' });
  }
});

export default router;
