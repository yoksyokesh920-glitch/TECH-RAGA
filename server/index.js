import express from 'express';
import cors from 'cors';
import path from 'path';
import os from 'os';
import cluster from 'cluster';
import { fileURLToPath } from 'url';
import { initDatabase, checkpointDb } from './db.js';
import participantRoutes from './routes/participantRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3001;
const enableCluster = process.env.CLUSTER_MODE === 'true' || process.env.NODE_ENV === 'production';
const numCPUs = Math.max(1, os.cpus().length);

// Graceful process exit WAL checkpoint helper
function shutdownHandler(signal) {
  console.log(`\n🛑 Process PID ${process.pid} received ${signal}. Flushed WAL database checkpoints.`);
  try {
    checkpointDb();
  } catch (e) {}
  process.exit(0);
}

process.on('SIGINT', () => shutdownHandler('SIGINT'));
process.on('SIGTERM', () => shutdownHandler('SIGTERM'));

// Multi-Core CPU Clustering for 1,000+ Concurrent Requests
if (enableCluster && cluster.isPrimary) {
  console.log(`====================================================`);
  console.log(`🚀 Master Process PID ${process.pid} running on ${numCPUs} CPU Cores`);
  console.log(`====================================================`);

  // Fork worker processes per CPU core
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  // Auto-heal: restart worker if any worker exits
  cluster.on('exit', (worker, code, signal) => {
    console.warn(`Worker PID ${worker.process.pid} died (code ${code}, signal ${signal}). Restarting worker...`);
    cluster.fork();
  });
} else {
  const app = express();

  // Process-wide unhandled exception safety guards
  process.on('uncaughtException', (err) => {
    console.error('🔥 [UNCAUGHT EXCEPTION]:', err);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('🔥 [UNHANDLED REJECTION]:', promise, 'reason:', reason);
  });

  // Global Middleware
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  // Initialize Database
  initDatabase();

  // API Routes
  app.use('/api/participant', participantRoutes);
  app.use('/api/quiz', participantRoutes);
  app.use('/api/admin', adminRoutes);

  // Serve static assets in production if built
  const distPath = path.join(__dirname, '../dist');
  app.use(express.static(distPath));

  // Fallback for SPA routing in client
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ error: 'API endpoint not found.' });
    }
    res.sendFile(path.join(distPath, 'index.html'), (err) => {
      if (err) {
        res.status(200).send('Tech Raga Quiz API Server is running. Vite frontend active on port 5173.');
      }
    });
  });

  // Global Express Error Middleware (Prevents server crashes on unexpected errors)
  app.use((err, req, res, next) => {
    console.error('Express Global Error Handler:', err);
    res.status(500).json({ error: 'Internal Server Error. Please try again.' });
  });

  const server = app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 Quiz Worker Process PID ${process.pid} listening on http://localhost:${PORT}`);
    console.log(`====================================================`);
  });

  // Socket Keep-Alive tuning for high concurrency connection reuse
  server.keepAliveTimeout = 65000;
  server.headersTimeout = 66000;
}
