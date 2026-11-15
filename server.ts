import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { connectDatabase, getDbDiagnostics, getDbMode } from './server/db/connection.js';
import { seedDatabaseIfEmpty } from './server/seed.js';
import { seedMongoTestingData } from './server/seedTestingData.js';
import authRoutes from './server/routes/auth.js';
import schoolsAndAppsRoutes from './server/routes/schoolsAndApplications.js';
import academicsRoutes from './server/routes/academics.js';
import complaintsRoutes from './server/routes/complaints.js';
import inspectionsRoutes from './server/routes/inspections.js';
import adminAndAnalyticsRoutes from './server/routes/adminAndAnalytics.js';
import uploadsRoutes from './server/routes/uploads.js';

async function startServer() {
  const dbReadyPromise = (async () => {
    await connectDatabase();
    await seedDatabaseIfEmpty();
    if (getDbMode() === 'mongodb') {
      try {
        const result = await seedMongoTestingData();
        if (!result.skipped && result.summary) {
          console.log(
            `MongoDB testing dataset ready: ${result.summary.schools} schools, ${result.summary.parentsAndGuardians} parents/guardians, ${result.summary.raiders} raiders, ${result.summary.inspectionGroups} inspection group.`
          );
        }
      } catch (seedErr) {
        console.log('Testing data seed notice:', (seedErr as Error)?.message || 'skipped');
      }
    }
  })();

  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.set('trust proxy', 1);
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      frameguard: false, // Allow preview inside AI Studio iframe
    })
  );
  app.use(
    cors({
      origin: true,
      credentials: true,
    })
  );
  app.use(cookieParser());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  app.use('/api/v1', async (_req, _res, next) => {
    try {
      await dbReadyPromise;
      next();
    } catch (err) {
      next(err);
    }
  });

  // Health check
  app.get('/api/v1/health', (_req, res) => {
    res.json({ status: 'ok', ...getDbDiagnostics(), timestamp: new Date().toISOString() });
  });

  // API v1 Domain Routes
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1', schoolsAndAppsRoutes);
  app.use('/api/v1', academicsRoutes);
  app.use('/api/v1/complaints', complaintsRoutes);
  app.use('/api/v1', inspectionsRoutes);
  app.use('/api/v1', adminAndAnalyticsRoutes);
  app.use('/api/v1/uploads', uploadsRoutes);

  // Error handler for multer / JSON
  app.use((err: any, _req: any, res: any, _next: any) => {
    const status = err.status || 400;
    res.status(status).json({ error: err.message || 'Server error' });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`EduGuard server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start EduGuard server:', err);
  process.exit(1);
});
