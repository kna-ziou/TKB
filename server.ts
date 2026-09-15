/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { verifyCandidateKeyWithGoogle } from './src/server/geminiVerifyService';
import {
  resolveServerPort,
  securityHeadersMiddleware,
  apiErrorHandler,
} from './src/server/serverConfig';

export async function createExpressApp() {
  const app = express();

  // 1. Security Headers (applied globally)
  app.use(securityHeadersMiddleware);

  // 2. Strict JSON body limit (16kb for API key verification payload)
  app.use(express.json({ limit: '16kb' }));

  // 3. Health check endpoint (minimal, no sensitive info, no Gemini calls)
  app.get('/api/health', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json({ ok: true });
  });

  // 4. Server-side Gemini API key verification endpoint
  app.post('/api/gemini/verify-key', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const candidateApiKey = req.body?.apiKey;
    const result = await verifyCandidateKeyWithGoogle(candidateApiKey);

    // DEV safe log - never includes candidate key or headers
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[GeminiKeyVerify] durationMs=${result.durationMs} status=${result.status}`);
    }

    if (result.verified) {
      res.json({
        verified: true,
        status: 'verified',
      });
    } else {
      res.json({
        verified: false,
        status: result.status,
        message: result.message,
      });
    }
  });

  // 5. Unknown /api/* routes catch-all: return JSON 404, never fallback to index.html
  app.all('/api/*', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.status(404).json({
      error: 'Not Found',
      message: 'API endpoint không tồn tại.',
    });
  });

  // 6. Safe API error handling middleware (handles 413, invalid JSON, etc.)
  app.use(apiErrorHandler);

  // 7. Vite middleware for development vs optimized static build in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');

    // Static assets with differentiated caching
    app.use(
      express.static(distPath, {
        setHeaders: (res, filePath) => {
          // Hashed assets in /dist/assets/ -> 1 year immutable cache
          if (filePath.includes(`${path.sep}assets${path.sep}`) || filePath.includes('/assets/')) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          } else if (filePath.endsWith('.html')) {
            // HTML entry points -> no-cache (always revalidate)
            res.setHeader('Cache-Control', 'no-cache');
          }
        },
      })
    );

    // SPA wildcard fallback for direct navigation & client routes
    app.get('*', (_req, res) => {
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  return app;
}

export async function startServer(customPort?: number) {
  const PORT = customPort ?? resolveServerPort(process.env.PORT);
  const app = await createExpressApp();

  const server = app.listen(PORT, '0.0.0.0', () => {
    if (process.env.NODE_ENV === 'production') {
      console.log('TKB Online Designer');
      console.log('Environment: production');
      console.log(`Listening on 0.0.0.0:${PORT}`);
    } else {
      console.log(`Server running on http://localhost:${PORT}`);
    }
  });

  // Graceful shutdown handling on SIGINT & SIGTERM
  const handleShutdown = (signal: string) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`Received ${signal}, shutting down HTTP server...`);
    }
    server.close((err) => {
      if (err) {
        process.exit(1);
      }
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));

  return server;
}

// Only start the server if executed directly as entrypoint
const isDirectRun =
  typeof process !== 'undefined' &&
  Boolean(
    process.argv[1] &&
      (process.argv[1].endsWith('server.ts') ||
        process.argv[1].endsWith('server.cjs') ||
        process.argv[1].endsWith('server.js'))
  );

if (isDirectRun && process.env.NODE_ENV !== 'test') {
  startServer().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}

