/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

async function runPhase09CTests() {
  console.log('================================================================');
  console.log('PHASE 09C: LOCAL PRODUCTION BUILD & STANDALONE RUNTIME VERIFICATION');
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
  // 1. ARTIFACTS EXISTENCE CHECK
  // -------------------------------------------------------------------------
  console.log('--- 1. CLEAN PRODUCTION BUILD ARTIFACTS AUDIT ---');
  const distExists = fs.existsSync(path.join(process.cwd(), 'dist'));
  const indexHtmlExists = fs.existsSync(path.join(process.cwd(), 'dist', 'index.html'));
  const serverCjsExists = fs.existsSync(path.join(process.cwd(), 'dist', 'server.cjs'));
  const assetsDirExists = fs.existsSync(path.join(process.cwd(), 'dist', 'assets'));
  const serverMapExists = fs.existsSync(path.join(process.cwd(), 'dist', 'server.cjs.map'));

  assert(distExists && indexHtmlExists && serverCjsExists && assetsDirExists, 'Required production artifacts exist');
  assert(!serverMapExists, 'server.cjs.map is NOT generated');

  // Verify no .map files anywhere in dist
  const distFiles = fs.readdirSync(path.join(process.cwd(), 'dist', 'assets'));
  const hasMapFile = distFiles.some((f) => f.endsWith('.map'));
  assert(!hasMapFile, 'dist/assets contains NO .map files');

  // -------------------------------------------------------------------------
  // 2. PRODUCTION DEPENDENCY AUDIT
  // -------------------------------------------------------------------------
  console.log('\n--- 2. PRODUCTION DEPENDENCY AUDIT ---');
  const serverCjsCode = fs.readFileSync(path.join(process.cwd(), 'dist', 'server.cjs'), 'utf-8');
  const requiresInServer = [...serverCjsCode.matchAll(/require\(['"]([^'"]+)['"]\)/g)].map((m) => m[1]);
  console.log(`  Explicit requires in server.cjs: ${JSON.stringify(requiresInServer)}`);
  const onlyProdAllowed = requiresInServer.every((pkg) => ['express', 'path', 'vite', 'node:path', 'node:http'].includes(pkg));
  assert(onlyProdAllowed, 'server.cjs requires only production packages and node built-ins');

  // -------------------------------------------------------------------------
  // 3. START ACTUAL PRODUCTION SERVER (PORT=3100)
  // -------------------------------------------------------------------------
  console.log('\n--- 3. START PRODUCTION SERVER (PORT=3100) ---');
  // Note: Container dev server binds to 3000, so we test standalone production runtime
  // on custom ports 3100 and 3200 to verify full dynamic PORT & standalone execution.
  const port1 = 3100;
  let serverProcess1: ReturnType<typeof spawn> | null = null;

  try {
    const startupPromise1 = new Promise<string>((resolve, reject) => {
      serverProcess1 = spawn('node', ['dist/server.cjs'], {
        env: { ...process.env, NODE_ENV: 'production', PORT: String(port1) },
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let logs = '';
      serverProcess1.stdout?.on('data', (chunk) => {
        logs += chunk.toString();
        if (logs.includes('Listening on 0.0.0.0:3100') || logs.includes('Server running')) {
          resolve(logs);
        }
      });
      serverProcess1.stderr?.on('data', (chunk) => {
        console.error('  [server stderr]:', chunk.toString());
      });
      serverProcess1.on('error', (err) => reject(err));
      serverProcess1.on('exit', (code) => {
        if (code !== 0 && !logs) reject(new Error(`Server exited prematurely with code ${code}`));
      });
    });

    const startupLogs1 = await Promise.race([
      startupPromise1,
      new Promise<string>((_, reject) => setTimeout(() => reject(new Error('Server startup timeout')), 5000)),
    ]);

    assert(startupLogs1.includes('Listening on 0.0.0.0:3100'), 'Startup log confirms 0.0.0.0:3100');
    assert(startupLogs1.includes('Environment: production'), 'Startup log confirms Environment: production');
    assert(!startupLogs1.includes('key') && !startupLogs1.includes('secret'), 'Startup log exposes no secrets');

    const baseUrl1 = `http://127.0.0.1:${port1}`;

    // -------------------------------------------------------------------------
    // 4. HEALTH CHECK RUNTIME TEST
    // -------------------------------------------------------------------------
    console.log('\n--- 4. HEALTH CHECK RUNTIME TEST ---');
    const healthRes = await fetch(`${baseUrl1}/api/health`);
    const healthBody = await healthRes.json();
    assert(healthRes.status === 200, `/api/health returns HTTP 200`);
    assert(healthBody.ok === true, `/api/health returns { ok: true }`);
    assert(healthRes.headers.get('cache-control') === 'no-store', `/api/health has Cache-Control: no-store`);

    // -------------------------------------------------------------------------
    // 5. ROOT & PRODUCTION ASSETS RUNTIME TEST
    // -------------------------------------------------------------------------
    console.log('\n--- 5. ROOT & PRODUCTION ASSETS RUNTIME TEST ---');
    const rootRes = await fetch(`${baseUrl1}/`);
    const rootHtml = await rootRes.text();
    assert(rootRes.status === 200, `GET / returns HTTP 200`);
    assert(rootRes.headers.get('cache-control') === 'no-cache', `GET / has Cache-Control: no-cache`);
    assert(!rootHtml.includes('/@vite/client'), 'Root index.html does NOT contain /@vite/client');
    assert(!rootHtml.includes('__vite_plugin_react_preamble__'), 'Root index.html does NOT contain Vite dev preamble');

    // Extract JS and CSS asset URLs from HTML
    const jsMatch = rootHtml.match(/src="([^"]+\.js)"/);
    const cssMatch = rootHtml.match(/href="([^"]+\.css)"/);
    assert(Boolean(jsMatch && jsMatch[1]), `Found production JS bundle: ${jsMatch?.[1]}`);
    assert(Boolean(cssMatch && cssMatch[1]), `Found production CSS bundle: ${cssMatch?.[1]}`);

    if (jsMatch && jsMatch[1]) {
      const assetRes = await fetch(`${baseUrl1}${jsMatch[1]}`);
      const assetCache = assetRes.headers.get('cache-control');
      const assetType = assetRes.headers.get('content-type');
      assert(assetRes.status === 200, `JS bundle HTTP 200`);
      assert(
        assetCache?.includes('immutable') && assetCache?.includes('max-age=31536000'),
        `JS bundle has immutable 1-year cache (${assetCache})`
      );
      assert(assetType?.includes('javascript') === true, `JS bundle has correct MIME type (${assetType})`);
    }

    if (cssMatch && cssMatch[1]) {
      const cssRes = await fetch(`${baseUrl1}${cssMatch[1]}`);
      const cssCache = cssRes.headers.get('cache-control');
      const cssType = cssRes.headers.get('content-type');
      assert(cssRes.status === 200, `CSS bundle HTTP 200`);
      assert(
        cssCache?.includes('immutable') && cssCache?.includes('max-age=31536000'),
        `CSS bundle has immutable 1-year cache (${cssCache})`
      );
      assert(cssType?.includes('css') === true, `CSS bundle has text/css MIME type (${cssType})`);
    }

    // -------------------------------------------------------------------------
    // 6. SPA FALLBACK & UNKNOWN API JSON 404
    // -------------------------------------------------------------------------
    console.log('\n--- 6. SPA FALLBACK & UNKNOWN API 404 ---');
    const spaRes = await fetch(`${baseUrl1}/timetable/review/custom-path`);
    const spaHtml = await spaRes.text();
    assert(spaRes.status === 200, `Client SPA route returns HTTP 200`);
    assert(spaHtml.includes('<div id="root"></div>'), `Client SPA route serves production index.html`);
    assert(spaRes.headers.get('cache-control') === 'no-cache', `SPA route sends Cache-Control: no-cache`);

    const unknownApiRes = await fetch(`${baseUrl1}/api/unknown-action`);
    const unknownApiBody = await unknownApiRes.json();
    assert(unknownApiRes.status === 404, `Unknown API route returns HTTP 404`);
    assert(unknownApiBody.error === 'Not Found', `Unknown API returns JSON error (NOT HTML)`);
    assert(unknownApiRes.headers.get('cache-control') === 'no-store', `Unknown API sends Cache-Control: no-store`);

    // -------------------------------------------------------------------------
    // 7. SECURITY HEADERS TEST
    // -------------------------------------------------------------------------
    console.log('\n--- 7. SECURITY HEADERS TEST ---');
    const nosniff = rootRes.headers.get('x-content-type-options');
    const referrer = rootRes.headers.get('referrer-policy');
    const frameOptions = rootRes.headers.get('x-frame-options');
    const permissions = rootRes.headers.get('permissions-policy');
    assert(nosniff === 'nosniff', `X-Content-Type-Options: nosniff`);
    assert(referrer === 'strict-origin-when-cross-origin', `Referrer-Policy: strict-origin-when-cross-origin`);
    assert(frameOptions === 'SAMEORIGIN', `X-Frame-Options: SAMEORIGIN`);
    assert(permissions === 'camera=(self)', `Permissions-Policy: camera=(self)`);

    // -------------------------------------------------------------------------
    // 8. API KEY VERIFICATION ROUTE — PRODUCTION RUNTIME
    // -------------------------------------------------------------------------
    console.log('\n--- 8. API KEY VERIFICATION ROUTE TEST ---');
    const verifyRes = await fetch(`${baseUrl1}/api/gemini/verify-key`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: 'INVALID_TEST_KEY_NOT_REAL_FOR_TESTING' }),
    });
    const verifyBody = await verifyRes.json();
    assert(verifyRes.status === 200, `verify-key route exists and responds HTTP 200`);
    assert(verifyBody.verified === false, `Invalid fixture rejected with verified: false`);
    assert(verifyBody.status === 'invalid_key', `Status classified as invalid_key`);
    assert(!('apiKey' in verifyBody), `Response never echoes API key`);
    assert(verifyRes.headers.get('cache-control') === 'no-store', `verify-key has Cache-Control: no-store`);

    // Oversized body test on production server
    const largeBody = JSON.stringify({ apiKey: 'X'.repeat(25 * 1024) });
    const largeRes = await fetch(`${baseUrl1}/api/gemini/verify-key`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: largeBody,
    });
    const largeBodyJson = await largeRes.json();
    assert(largeRes.status === 413, `Oversized JSON rejected with HTTP 413 (got ${largeRes.status})`);
    assert(largeBodyJson.error === 'Payload Too Large', `Error message is safe`);
  } finally {
    // Graceful shutdown of server 1
    if (serverProcess1) {
      console.log('\n--- SHUTTING DOWN PORT 3000 INSTANCE ---');
      const exitPromise = new Promise<void>((resolve) => {
        (serverProcess1 as any).on('exit', () => resolve());
      });
      (serverProcess1 as any).kill('SIGTERM');
      await Promise.race([exitPromise, new Promise<void>((resolve) => setTimeout(resolve, 2000))]);
      console.log('  Instance 1 closed.');
    }
  }

  // -------------------------------------------------------------------------
  // 9. CLIENT PRODUCTION BUNDLE AUDIT
  // -------------------------------------------------------------------------
  console.log('\n--- 9. CLIENT PRODUCTION BUNDLE AUDIT ---');
  const jsFiles = distFiles.filter((f) => f.endsWith('.js'));
  let bundleContent = '';
  for (const jsFile of jsFiles) {
    bundleContent += fs.readFileSync(path.join(process.cwd(), 'dist', 'assets', jsFile), 'utf-8');
  }

  const hasLocalhostProductionDependency = bundleContent.includes('http://localhost:3000/api');
  const hasViteClientRef = bundleContent.includes('/@vite/client');
  const hasViteHmrWebsocket = bundleContent.includes('vite-hmr');
  const hasSourceMapUrl = bundleContent.includes('sourceMappingURL=');

  assert(!hasLocalhostProductionDependency, 'No hardcoded localhost API URLs in production client bundle');
  assert(!hasViteClientRef, 'No /@vite/client references in client bundle');
  assert(!hasViteHmrWebsocket, 'No Vite HMR websocket references in client bundle');
  assert(!hasSourceMapUrl, 'No public sourceMappingURL in client bundle');

  // -------------------------------------------------------------------------
  // 10. PRODUCTION STORAGE SMOKE AUDIT
  // -------------------------------------------------------------------------
  console.log('\n--- 10. PRODUCTION STORAGE AUDIT ---');
  // Check the app's canonical persistence keys in persistenceUtils.ts:
  // 'tkb-online-designer:v1:library' and 'tkb-online-designer:v1:current'
  const hasLibraryStorageKey =
    bundleContent.includes('tkb-online-designer:v1:library') ||
    bundleContent.includes('tkb_online_library_v1');
  const hasCurrentDocIdStorageKey =
    bundleContent.includes('tkb-online-designer:v1:current') ||
    bundleContent.includes('tkb_online_current_doc_id');
  assert(hasLibraryStorageKey && hasCurrentDocIdStorageKey, 'Canonical client storage keys present in bundle');

  // -------------------------------------------------------------------------
  // 11. AI IMPORT ARCHITECTURE SMOKE AUDIT
  // -------------------------------------------------------------------------
  console.log('\n--- 11. AI IMPORT ARCHITECTURE SMOKE AUDIT ---');
  const hasXGoogApiKey = bundleContent.includes('x-goog-api-key');
  const hasGoogleGenAiUrl = bundleContent.includes('generativelanguage.googleapis.com');
  const hasVerifyKeyApi = bundleContent.includes('/api/gemini/verify-key');
  assert(hasXGoogApiKey, 'x-goog-api-key header handling present in bundle');
  assert(hasGoogleGenAiUrl, 'generativelanguage.googleapis.com endpoint present in bundle');
  assert(hasVerifyKeyApi, '/api/gemini/verify-key client route present in bundle');

  // -------------------------------------------------------------------------
  // 12. PRINT CODE PATH AUDIT
  // -------------------------------------------------------------------------
  console.log('\n--- 12. PRINT CODE PATH AUDIT ---');
  const hasWindowPrint = bundleContent.includes('window.print');
  const hasPrintMount = bundleContent.includes('print-sheet-mount') || bundleContent.includes('printable-timetable-sheet');
  assert(hasWindowPrint, 'window.print API call present in bundle');
  assert(hasPrintMount, 'Print sheet mount DOM structure present in bundle');
  console.log('  [NOTICE] Native Print Dialog: REQUIRES MANUAL TEST (cannot be triggered in headless node script)');

  // -------------------------------------------------------------------------
  // 13. CUSTOM PORT PRODUCTION TEST (PORT=3200) & GRACEFUL SHUTDOWN
  // -------------------------------------------------------------------------
  console.log('\n--- 13. CUSTOM PORT PRODUCTION TEST (PORT=3200) ---');
  const port2 = 3200;
  let serverProcess2: ReturnType<typeof spawn> | null = null;

  try {
    const startupPromise2 = new Promise<string>((resolve, reject) => {
      serverProcess2 = spawn('node', ['dist/server.cjs'], {
        env: { ...process.env, NODE_ENV: 'production', PORT: String(port2) },
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let logs = '';
      serverProcess2.stdout?.on('data', (chunk) => {
        logs += chunk.toString();
        if (logs.includes('Listening on 0.0.0.0:3200') || logs.includes('Server running')) {
          resolve(logs);
        }
      });
      serverProcess2.stderr?.on('data', (chunk) => {
        console.error('  [server stderr]:', chunk.toString());
      });
      serverProcess2.on('error', (err) => reject(err));
      serverProcess2.on('exit', (code) => {
        if (code !== 0 && !logs) reject(new Error(`Server exited with code ${code}`));
      });
    });

    const startupLogs2 = await Promise.race([
      startupPromise2,
      new Promise<string>((_, reject) => setTimeout(() => reject(new Error('Server 3200 timeout')), 5000)),
    ]);

    assert(startupLogs2.includes('Listening on 0.0.0.0:3200'), 'Server starts on PORT=3200 correctly');

    const baseUrl2 = `http://127.0.0.1:${port2}`;
    const health2 = await fetch(`${baseUrl2}/api/health`);
    const health2Body = await health2.json();
    assert(health2.status === 200 && health2Body.ok === true, 'PORT=3200 health check 200');

    // Confirm port 3100 is no longer responding
    let port3100Dead = false;
    try {
      await fetch(`http://127.0.0.1:3100/api/health`, { signal: AbortSignal.timeout(500) });
    } catch {
      port3100Dead = true;
    }
    assert(port3100Dead, 'Port 3100 is no longer occupied after previous instance shutdown');

    // Test graceful shutdown on server 2 with SIGTERM
    console.log('\n--- 14. GRACEFUL SHUTDOWN TEST ---');
    const exitPromise2 = new Promise<number | null>((resolve) => {
      (serverProcess2 as any).on('exit', (code: number | null) => resolve(code));
    });
    (serverProcess2 as any).kill('SIGTERM');
    const exitCode = await Promise.race([
      exitPromise2,
      new Promise<number | null>((_, reject) => setTimeout(() => reject(new Error('Shutdown timeout')), 3000)),
    ]);
    assert(exitCode === 0, `Server closed and exited cleanly on SIGTERM with exit code 0`);
  } finally {
    if (serverProcess2 && !(serverProcess2 as any).killed) {
      try {
        (serverProcess2 as any).kill('SIGKILL');
      } catch {}
    }
  }

  // -------------------------------------------------------------------------
  // 15. MINIMUM PACKAGE VALIDATION
  // -------------------------------------------------------------------------
  console.log('\n--- 15. MINIMUM PACKAGE VALIDATION ---');
  const pkgJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8'));
  const prodDeps = Object.keys(pkgJson.dependencies || {});
  console.log(`  Declared production dependencies: ${JSON.stringify(prodDeps)}`);
  assert(prodDeps.includes('express'), 'express is in dependencies');
  assert(prodDeps.includes('react') && prodDeps.includes('react-dom'), 'react is in dependencies');
  assert(!('tsx' in (pkgJson.dependencies || {})), 'tsx is not in dependencies (only devDependencies)');

  console.log('\n================================================================');
  if (allPassed) {
    console.log('FINAL RESULT: PHASE 09C AUTOMATED TESTS ALL PASSED');
  } else {
    console.log('FINAL RESULT: PHASE 09C AUTOMATED TESTS FAILED');
    process.exit(1);
  }
  console.log('================================================================');
}

runPhase09CTests().catch((err) => {
  console.error('Fatal error in Phase 09C test runner:', err);
  process.exit(1);
});
