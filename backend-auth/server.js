import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './src/routes/auth.js';
import userRoutes from './src/routes/user.js';
import googleRoutes from './src/routes/google.js';
import { initFirebaseAdmin } from './src/firebaseAdmin.js';

dotenv.config();

const app = express();

app.use(express.json({ limit: '1mb' }));

const origins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:3000')
  .split(',')
  .map((o) => o.trim());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || origins.includes(origin)) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

const BASE_PORT = Number(process.env.PORT) || 3001;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/optionspro';

mongoose
  .connect(MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => {
    console.error('MongoDB connection error', err);
    process.exit(1);
  });

// Initialize Firebase Admin (will throw if creds missing)
try {
  initFirebaseAdmin();
  console.log('Firebase Admin initialized');
} catch (e) {
  console.warn('Firebase Admin not initialized:', e.message);
}

app.get('/health', (_req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/auth/google', googleRoutes);

const MAX_ATTEMPTS = 10;

function startServer(port = BASE_PORT, attempt = 1) {
  const server = app.listen(port, () => {
    console.log(`Backend Auth Service Running on PORT: ${port}`);
  });

  server.on('error', (err) => {
    if (err && err.code === 'EADDRINUSE' && attempt <= MAX_ATTEMPTS - 1) {
      const nextPort = port + 1;
      console.warn(`Port ${port} in use. Retrying on ${nextPort} (attempt ${attempt}/${MAX_ATTEMPTS})...`);
      setTimeout(() => startServer(nextPort, attempt + 1), 300);
    } else {
      console.error(err);
      process.exit(1);
    }
  });
}

startServer();
