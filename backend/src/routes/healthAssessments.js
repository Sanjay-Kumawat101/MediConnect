import { Router } from 'express';
import { supabase } from '../lib/supabase.js';

const router = Router();

// POST /api/health-assessments
router.post('/', async (req, res) => {
  const userId = req.user?.sub;
  const { score, result, details } = req.body;
  if (!userId || typeof score !== 'number' || !result) {
    return res.status(400).json({ error: 'Missing user, score, or result' });
  }
  const { data, error } = await supabase
    .from('health_assessments')
    .insert({ user_id: userId, score, result, details: details || null })
    .select()
    .single();
  if (error) return res.status(500).json({ error: 'Failed to save assessment' });
  res.status(201).json(data);
});

// GET /api/health-assessments/recent
router.get('/recent', async (req, res) => {
  const userId = req.user?.sub;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  const { data, error } = await supabase
    .from('health_assessments')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return res.status(500).json({ error: 'Failed to fetch assessment' });
  res.json(data || null);
});

export default router;
