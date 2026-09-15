/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { resolveServerPort } from '../src/server/serverConfig';
import { createExpressApp, startServer } from '../server';

async function runPhase09BTests() {
  console.log('================================================================');
  console.log('PHASE 09B: PRODUCTION CONFIGURATION & MINIMAL HARDENING TESTS');
  console.log('================================================================\n');

  let allPassed = true;
  function assert(condition: boolean, msg: string) {
    if (!condition) {
      console.error(`  [FAIL] ${msg}`);
      allPassed = false;
    } else {
      console.log(`  [PASS] ${msg}`);
    }
  }

  // -------------------------------------------------------------------------
  // TEST A: No PORT -> 3000
  // -------------------------------------------------------------------------
  console.log('--- TEST A: No PORT fallback ---');
  const portA = resolveServerPort(undefined);
  assert(portA === 3000, `Expected 3000, got ${portA}`);

  // -------------------------------------------------------------------------
  // TEST B: PORT=3100 -> 3100
  // -------------------------------------------------------------------------
  console.log('--- TEST B: Custom PORT ---');
  const portB = resolveServerPort('3100');
  assert(portB === 3100, `Expected 3100, got ${portB}`);

  // -------------------------------------------------------------------------
  // TEST C: Invalid PORT -> 3000
  // -------------------------------------------------------------------------
  console.log('--- TEST C: Invalid PORT fallback ---');
  const portC1 = resolveServerPort('not-a-number');
  const portC2 = resolveServerPort('-5');
  const portC3 = resolveServerPort('70000');
  const portC4 = resolveServerPort('');
  assert(portC1 === 3000, `Non-numeric port falls back to 3000 (got ${portC1})`);
  assert(portC2 === 3000, `Negative port falls back to 3000 (got ${portC2})`);
  assert(portC3 === 3000, `Out of range port falls back to 3000 (got ${portC3})`);
  assert(portC4 === 3000, `Empty port falls back to 3000 (got ${portC4})`);

  // Start temporary test server in production mode to test middleware & routes
  const originalNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  const testServerPort = 3199;
  const server = await startServer(testServerPort);

  const baseUrl = `http://127.0.0.1:${testServerPort}`;

  try {
    // -------------------------------------------------------------------------
    // TEST D: /api/health -> 200, minimal response, no Gemini call
    // -------------------------------------------------------------------------
    console.log('--- TEST D: /api/health endpoint ---');
    const healthRes = await fetch(`${baseUrl}/api/health`);
    const healthBody = await healthRes.json();
    assert(healthRes.status === 200, `Health check returns HTTP 200 (got ${healthRes.status})`);
    assert(healthBody.ok === true, `Health check body is minimal { ok: true } (got ${JSON.stringify(healthBody)})`);
    assert(!('gemini' in healthBody) && !('version' in healthBody), `Health check exposes no internals`);

    // -------------------------------------------------------------------------
    // TEST E: /api/gemini/verify-key behavior remains unchanged
    // -------------------------------------------------------------------------
    console.log('--- TEST E: /api/gemini/verify-key endpoint ---');
    // Test with missing / empty candidate key
    const verifyRes = await fetch(`${baseUrl}/api/gemini/verify-key`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: '' }),
    });
    const verifyBody = await verifyRes.json();
    assert(verifyRes.status === 200, `Verify key returns HTTP 200`);
    assert(verifyBody.verified === false, `Empty key returns verified: false`);
    assert(verifyBody.status === 'invalid_key', `Empty key returns status: invalid_key`);
    assert(!('apiKey' in verifyBody), `Response never echoes API key`);

    // -------------------------------------------------------------------------
    // TEST F: Unknown /api/* route -> JSON 404, NOT index.html
    // -------------------------------------------------------------------------
    console.log('--- TEST F: Unknown API routes catch-all ---');
    const unknownApiRes = await fetch(`${baseUrl}/api/nonexistent-endpoint`);
    const unknownApiBody = await unknownApiRes.json();
    assert(unknownApiRes.status === 404, `Unknown API route returns 404 (got ${unknownApiRes.status})`);
    assert(unknownApiBody.error === 'Not Found', `Unknown API returns JSON error, not HTML`);

    // -------------------------------------------------------------------------
    // TEST G: GET / -> index.html
    // -------------------------------------------------------------------------
    console.log('--- TEST G: Root GET / ---');
    const rootRes = await fetch(`${baseUrl}/`);
    const rootText = await rootRes.text();
    assert(rootRes.status === 200, `Root returns HTTP 200`);
    assert(rootText.includes('<div id="root"></div>') || rootText.includes('TKB Online Designer'), `Root serves index.html`);

    // -------------------------------------------------------------------------
    // TEST H: SPA client route -> index.html
    // -------------------------------------------------------------------------
    console.log('--- TEST H: SPA client routes ---');
    const spaRes = await fetch(`${baseUrl}/some-deep-client-route`);
    const spaText = await spaRes.text();
    assert(spaRes.status === 200, `Deep client route returns HTTP 200`);
    assert(spaText.includes('<div id="root"></div>') || spaText.includes('TKB Online Designer'), `SPA route serves index.html`);

    // -------------------------------------------------------------------------
    // TEST I: Hashed asset -> long immutable cache
    // -------------------------------------------------------------------------
    console.log('--- TEST I: Hashed asset cache headers ---');
    // Read dist/assets to get an actual hashed asset file
    const distAssetsDir = path.join(process.cwd(), 'dist', 'assets');
    if (fs.existsSync(distAssetsDir)) {
      const assetFiles = fs.readdirSync(distAssetsDir).filter((file) => {
        const fullPath = path.join(distAssetsDir, file);
        return fs.statSync(fullPath).isFile() && (file.endsWith('.js') || file.endsWith('.css'));
      });
      if (assetFiles.length > 0) {
        const testAsset = assetFiles[0];
        const assetRes = await fetch(`${baseUrl}/assets/${testAsset}`);
        const cacheControl = assetRes.headers.get('cache-control');
        assert(assetRes.status === 200, `Asset ${testAsset} served successfully`);
        assert(
          cacheControl?.includes('immutable') && cacheControl?.includes('max-age=31536000'),
          `Hashed asset has public, max-age=31536000, immutable cache (got: ${cacheControl})`
        );
      } else {
        console.log('  [SKIP] dist/assets has no js/css files, run build first');
      }
    } else {
      console.log('  [SKIP] dist/assets does not exist yet');
    }

    // -------------------------------------------------------------------------
    // TEST J: index.html -> no-cache
    // -------------------------------------------------------------------------
    console.log('--- TEST J: index.html cache headers ---');
    const htmlCache = rootRes.headers.get('cache-control');
    assert(htmlCache === 'no-cache', `index.html has Cache-Control: no-cache (got: ${htmlCache})`);

    // -------------------------------------------------------------------------
    // TEST K: Security headers present
    // -------------------------------------------------------------------------
    console.log('--- TEST K: Security headers ---');
    const nosniff = rootRes.headers.get('x-content-type-options');
    const referrer = rootRes.headers.get('referrer-policy');
    const frameOptions = rootRes.headers.get('x-frame-options');
    const permissions = rootRes.headers.get('permissions-policy');
    assert(nosniff === 'nosniff', `X-Content-Type-Options is nosniff (got: ${nosniff})`);
    assert(referrer === 'strict-origin-when-cross-origin', `Referrer-Policy is strict-origin-when-cross-origin`);
    assert(frameOptions === 'SAMEORIGIN', `X-Frame-Options is SAMEORIGIN`);
    assert(permissions === 'camera=(self)', `Permissions-Policy is camera=(self)`);

    // -------------------------------------------------------------------------
    // TEST L: Oversized JSON body -> 413 Payload Too Large
    // -------------------------------------------------------------------------
    console.log('--- TEST L: JSON body limit safety ---');
    const largeBody = JSON.stringify({ apiKey: 'A'.repeat(25 * 1024) }); // 25kb > 16kb limit
    const oversizedRes = await fetch(`${baseUrl}/api/gemini/verify-key`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: largeBody,
    });
    const oversizedBody = await oversizedRes.json();
    assert(oversizedRes.status === 413, `Oversized payload rejected with HTTP 413 (got ${oversizedRes.status})`);
    assert(oversizedBody.error === 'Payload Too Large', `Safe error message without stack traces`);
    assert(!('stack' in oversizedBody), `No stack trace leakage in 413 response`);

    // -------------------------------------------------------------------------
    // TEST M: Production build source map audit
    // -------------------------------------------------------------------------
    console.log('--- TEST M: Production build source map audit ---');
    const serverMapExists = fs.existsSync(path.join(process.cwd(), 'dist', 'server.cjs.map'));
    assert(!serverMapExists, `server.cjs.map is not generated in dist/ (exists: ${serverMapExists})`);

    // -------------------------------------------------------------------------
    // TEST N: Graceful shutdown handlers registered
    // -------------------------------------------------------------------------
    console.log('--- TEST N: Graceful shutdown signal handlers ---');
    const sigtermListeners = process.listeners('SIGTERM');
    const sigintListeners = process.listeners('SIGINT');
    assert(sigtermListeners.length > 0, `SIGTERM listener registered`);
    assert(sigintListeners.length > 0, `SIGINT listener registered`);

  } finally {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
    process.env.NODE_ENV = originalNodeEnv;
  }

  console.log('\n================================================================');
  if (allPassed) {
    console.log('FINAL RESULT: PHASE 09B TESTS ALL PASSED');
  } else {
    console.log('FINAL RESULT: PHASE 09B TESTS FAILED');
    process.exit(1);
  }
  console.log('================================================================');
}

runPhase09BTests().catch((err) => {
  console.error('Fatal error in Phase 09B tests:', err);
  process.exit(1);
});
