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

// POST /api/health-assessments/symptom-analysis
router.post('/symptom-analysis', async (req, res) => {
  const { symptoms } = req.body;
  if (!symptoms || typeof symptoms !== 'string' || !symptoms.trim()) {
    return res.status(400).json({ error: 'Missing or invalid symptoms description.' });
  }
  
  try {
    // Simple rule-based symptom analysis (no API key required)
    const analysis = generateSymptomAnalysis(symptoms.toLowerCase());
    
    res.json({
      analysis,
      disclaimer: 'This analysis is for informational purposes only and is not a diagnosis. Always consult a healthcare professional for medical advice.'
    });
  } catch (err) {
    console.error('Symptom analysis error:', err);
    res.status(500).json({ error: 'Failed to analyze symptoms.' });
  }
});

// Simple rule-based symptom analysis function
function generateSymptomAnalysis(symptoms) {
  const urgentKeywords = ['chest pain', 'difficulty breathing', 'severe headache', 'unconscious', 'bleeding', 'severe pain', 'emergency'];
  const moderateKeywords = ['fever', 'cough', 'headache', 'nausea', 'dizziness', 'fatigue', 'pain'];
  const mildKeywords = ['mild', 'slight', 'minor', 'tired', 'sleepy'];
  
  let urgency = 'Low';
  let possibleCauses = [];
  let generalAdvice = [];
  
  // Check for urgent symptoms
  if (urgentKeywords.some(keyword => symptoms.includes(keyword))) {
    urgency = 'High - Seek immediate medical attention';
    possibleCauses = ['Serious medical condition', 'Emergency situation'];
    generalAdvice = [
      'Call emergency services (108) immediately',
      'Do not delay seeking medical help',
      'Stay calm and follow emergency protocols'
    ];
  }
  // Check for moderate symptoms
  else if (moderateKeywords.some(keyword => symptoms.includes(keyword))) {
    urgency = 'Moderate - Schedule appointment soon';
    possibleCauses = ['Common illness', 'Viral infection', 'Stress-related condition'];
    generalAdvice = [
      'Rest and stay hydrated',
      'Monitor symptoms closely',
      'Schedule an appointment with your doctor within 24-48 hours',
      'Avoid strenuous activities'
    ];
  }
  // Check for mild symptoms
  else if (mildKeywords.some(keyword => symptoms.includes(keyword))) {
    urgency = 'Low - Monitor and self-care';
    possibleCauses = ['Minor condition', 'Lifestyle factors', 'Temporary discomfort'];
    generalAdvice = [
      'Get adequate rest',
      'Maintain a healthy diet',
      'Stay hydrated',
      'Monitor symptoms for 2-3 days',
      'See a doctor if symptoms worsen or persist'
    ];
  }
  // Default response
  else {
    urgency = 'Low - General monitoring recommended';
    possibleCauses = ['Various possible causes'];
    generalAdvice = [
      'Keep track of your symptoms',
      'Note when symptoms occur and their duration',
      'Maintain a healthy lifestyle',
      'Consult a healthcare professional for proper evaluation'
    ];
  }
  
  // Add specific advice based on common symptoms
  if (symptoms.includes('fever')) {
    generalAdvice.push('Use fever-reducing medication as directed');
    generalAdvice.push('Keep cool and drink plenty of fluids');
  }
  if (symptoms.includes('cough')) {
    generalAdvice.push('Stay hydrated to help with throat irritation');
    generalAdvice.push('Consider cough drops or honey for throat relief');
  }
  if (symptoms.includes('headache')) {
    generalAdvice.push('Rest in a quiet, dark room');
    generalAdvice.push('Apply cold compress to forehead');
  }
  if (symptoms.includes('nausea')) {
    generalAdvice.push('Eat small, bland meals');
    generalAdvice.push('Avoid strong smells and spicy foods');
  }
  
  return `Possible causes:
${possibleCauses.map(cause => `- ${cause}`).join('\n')}

Urgency: ${urgency}

General advice:
${generalAdvice.map(advice => `- ${advice}`).join('\n')}`;
}

export default router;
