import express from 'express';
import cors from 'cors';
import compression from 'compression';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import projectsRouter from './routes/projects.js';
import charactersRouter from './routes/characters.js';
import scenesRouter from './routes/scenes.js';
import generateRouter from './routes/generate.js';
import profileRouter from './routes/profile.js';
import shareRouter from './routes/share.js';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',')
  : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:4173'];

app.use(cors({
  origin: (origin, callback) => {
    // In production the frontend is served by the same Express process,
    // so same-origin requests arrive with no Origin header (or with the
    // Render hostname). Allow both cases.
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // Allow any onrender.com subdomain (covers the deployed Render URL)
    if (origin.endsWith('.onrender.com')) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(compression());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use('/api/projects', projectsRouter);
app.use('/api', charactersRouter);
app.use('/api', scenesRouter);
app.use('/api', generateRouter);
app.use('/api', profileRouter);
app.use('/api', shareRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

if (process.env.NODE_ENV === 'production') {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  app.use(express.static(path.join(__dirname, '../dist')));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });
}

// Safety-net error handler — catches anything a route forgot to try/catch
// itself, so a bug never surfaces as a hung connection or a raw stack trace.
// Must be registered last, after all routes/middleware, with 4 args so
// Express recognizes it as an error handler.
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  if (res.headersSent) return;
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
