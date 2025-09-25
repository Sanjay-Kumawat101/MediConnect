import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import authRouter from './routes/auth.js';
import usersRouter from './routes/users.js';
import appointmentsRouter from './routes/appointments.js';
import recordsRouter from './routes/records.js';
import alertsRouter from './routes/alerts.js';
import { requireAuth } from './middleware/auth.js';
import availabilityRouter from './routes/availability.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'MediConnect API' });
});

// Routers
app.use('/api/auth', authRouter);
app.use('/api/users', requireAuth, usersRouter);
app.use('/api/appointments', requireAuth, appointmentsRouter);
app.use('/api/records', requireAuth, recordsRouter);
app.use('/api/alerts', requireAuth, alertsRouter);
app.use('/api/availability', requireAuth, availabilityRouter);

// Serve frontend (optional if running separately)
const frontendDir = path.resolve(__dirname, '../../frontend');
app.use('/uploads', express.static(path.resolve(process.cwd(), 'backend/uploads')));
app.use(express.static(frontendDir));

app.listen(PORT, () => {
  console.log(`MediConnect backend listening on http://localhost:${PORT}`);
});


