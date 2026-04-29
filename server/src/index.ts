import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import mongoose from 'mongoose';

import authRoutes from './routes/auth';

dotenv.config();

const app = express()
export { app };
const port = Number(process.env.PORT ?? 5000);
const mongoUri = process.env.MONGO_URI;

app.use(cors());
app.use(express.json());

app.use('/api/v1/auth', authRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'time-verifier-api' });
});

app.get('/api/time', (_req, res) => {
  const now = new Date();
  res.json({
    iso: now.toISOString(),
    unixMs: now.getTime(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
});

async function connectToDatabase(): Promise<void> {
  if (!mongoUri) {
    console.warn('MONGO_URI not set. Running without MongoDB connection.');
    return;
  }

  try {
    await mongoose.connect(mongoUri);
    console.log('MongoDB connected');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('MongoDB connection failed:', message);
  }
}

async function startServer(): Promise<void> {
  await connectToDatabase();

  app.listen(port, () => {
    console.log(`API server listening on http://localhost:${port}`);
  });
}

void startServer();
