import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabase } from '../lib/supabase.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
const router = Router();

router.post('/register', async (req, res) => {
  try {
    const { name, email, phone, role, gender, dob, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email, password are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const { data: existing, error: existErr } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .maybeSingle();
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const { data: inserted, error: insErr } = await supabase
      .from('users')
      .insert({
        name,
        email: email.toLowerCase(),
        phone: phone || '',
        role: role || 'patient',
        gender: gender || '',
        dob: dob || '',
        password_hash: passwordHash
      })
      .select()
      .single();
    if (insErr) return res.status(500).json({ error: 'Registration failed' });

    const token = jwt.sign({ sub: inserted.id, email: inserted.email, role: inserted.role }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ user: { id: inserted.id, name: inserted.name, email: inserted.email, role: inserted.role }, token });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password are required' });

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .maybeSingle();
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ sub: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role }, token });
  } catch (err) {
    res.status(500).json({ error: 'Login failed' });
  }
});

export default router;


