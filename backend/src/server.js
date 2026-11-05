import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { SUPABASE_ANON_KEY } from './lib/supabase.js';
import authRouter from './routes/auth.js';
import usersRouter from './routes/users.js';
import appointmentsRouter from './routes/appointments.js';
import recordsRouter from './routes/records.js';
import alertsRouter from './routes/alerts.js';
import { requireAuth } from './middleware/auth.js';
import availabilityRouter from './routes/availability.js';
import healthAssessmentsRouter from './routes/healthAssessments.js';
import adminRouter from './routes/admin.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get('/api/config.js', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.type('application/javascript').send(
    `window.__SUPABASE_CONFIG__ = ${JSON.stringify({
      url: process.env.SUPABASE_URL,
      anonKey: SUPABASE_ANON_KEY
    })};`
  );
});

app.use('/vendor/supabase', express.static(
  path.resolve(__dirname, '../node_modules/@supabase/supabase-js/dist/umd')
));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'MediConnect API' });
});

// Routers
app.use('/api/auth', authRouter);
app.use('/api/admin', requireAuth, adminRouter);
app.use('/api/users', requireAuth, usersRouter);
app.use('/api/appointments', requireAuth, appointmentsRouter);
app.use('/api/records', requireAuth, recordsRouter);
app.use('/api/alerts', requireAuth, alertsRouter);
app.use('/api/availability', requireAuth, availabilityRouter);
app.use('/api/health-assessments', requireAuth, healthAssessmentsRouter);

// Serve uploaded files
const uploadsDir = path.resolve(process.cwd(), 'backend/uploads');
app.use('/uploads', express.static(uploadsDir));

// Serve frontend (optional if running separately)
const frontendDir = path.resolve(__dirname, '../../frontend');
app.use(express.static(frontendDir));

app.listen(PORT, () => {
  console.log(`MediConnect backend listening on http://localhost:${PORT}`);
});
