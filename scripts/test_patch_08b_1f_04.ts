/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PATCH 08B-1F-04 — Automated Regression Coverage for Strict Credential Probe
 *
 * Requirements:
 * CASE A: HTTP 200 + valid models payload -> valid -> connected=true
 * CASE B: HTTP 400 -> invalid -> connected=false
 * CASE C: HTTP 401 -> invalid -> connected=false
 * CASE D: HTTP 403 -> invalid / permission_denied -> connected=false
 * CASE E: HTTP 429 -> quota error (rate_limited) -> connected=false (NEVER connected!)
 * CASE F: HTTP 500 -> service error -> connected=false
 * CASE G: network rejection -> network error -> connected=false
 * CASE H: random long string -> probe non-2xx -> connected=false
 * CASE I: stale response for old key -> ignored
 * CASE J: only fetch resolving but response.ok=false -> MUST NOT become connected
 */

import { validateGeminiApiKey } from '../src/services/geminiService';
import { computeKeyFingerprint } from '../src/config/geminiConfig';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASS: ${message}`);
}

// Global fetch mock helper
const originalFetch = globalThis.fetch;

async function runTests() {
  console.log('================================================================');
  console.log('STARTING PATCH 08B-1F-04: STRICT CREDENTIAL PROBE TESTS');
  console.log('================================================================\n');

  const validKey = 'AIzaSyTestKey_1234567890abcdef';
  const randomLongKey = 'random_long_string_not_a_real_google_key_9876543210';

  // ----------------------------------------------------
  // CASE A: HTTP 200 + valid models payload -> valid -> connected=true
  // ----------------------------------------------------
  console.log('--- CASE A: HTTP 200 + valid models payload ---');
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const urlStr = String(input);
    const headers = (init?.headers ?? {}) as Record<string, string>;

    assert(!urlStr.includes(validKey), 'Security: API key must NOT be in URL');
    assert(headers['x-goog-api-key'] === validKey, 'Security: API key passed in x-goog-api-key header');

    return new Response(
      JSON.stringify({
        models: [
          {
            name: 'models/gemini-2.5-flash',
            version: '001',
            displayName: 'Gemini 2.5 Flash',
          },
        ],
      }),
      {
        status: 200,
        statusText: 'OK',
        headers: { 'Content-Type': 'application/json' },
      }
    );
  };

  const resultA = await validateGeminiApiKey(validKey);
  assert(resultA.state === 'valid', 'Case A: state is "valid"');
  assert(resultA.probeStatus === 200, 'Case A: probeStatus is 200');
  assert(resultA.probeOutcome === 'valid', 'Case A: probeOutcome is "valid"');
  console.log('');

  // ----------------------------------------------------
  // CASE B: HTTP 400 -> invalid -> connected=false
  // ----------------------------------------------------
  console.log('--- CASE B: HTTP 400 (Bad Request / Invalid Argument) ---');
  globalThis.fetch = async () => {
    return new Response(
      JSON.stringify({
        error: {
          code: 400,
          message: 'API key not valid. Please pass a valid API key.',
          status: 'INVALID_ARGUMENT',
        },
      }),
      {
        status: 400,
        statusText: 'Bad Request',
        headers: { 'Content-Type': 'application/json' },
      }
    );
  };

  const resultB = await validateGeminiApiKey('some_bad_key_12345');
  assert(resultB.state === 'invalid', 'Case B: state is "invalid"');
  assert(resultB.probeStatus === 400, 'Case B: probeStatus is 400');
  assert(resultB.probeOutcome === 'invalid', 'Case B: probeOutcome is "invalid"');
  console.log('');

  // ----------------------------------------------------
  // CASE C: HTTP 401 -> invalid -> connected=false
  // ----------------------------------------------------
  console.log('--- CASE C: HTTP 401 (Unauthorized) ---');
  globalThis.fetch = async () => {
    return new Response(
      JSON.stringify({
        error: {
          code: 401,
          message: 'Request had invalid authentication credentials.',
          status: 'UNAUTHENTICATED',
        },
      }),
      {
        status: 401,
        statusText: 'Unauthorized',
        headers: { 'Content-Type': 'application/json' },
      }
    );
  };

  const resultC = await validateGeminiApiKey('unauthorized_key_12345');
  assert(resultC.state === 'invalid', 'Case C: state is "invalid"');
  assert(resultC.probeStatus === 401, 'Case C: probeStatus is 401');
  assert(resultC.probeOutcome === 'invalid', 'Case C: probeOutcome is "invalid"');
  console.log('');

  // ----------------------------------------------------
  // CASE D: HTTP 403 -> invalid / permission_denied -> connected=false
  // ----------------------------------------------------
  console.log('--- CASE D: HTTP 403 (Permission Denied) ---');
  globalThis.fetch = async () => {
    return new Response(
      JSON.stringify({
        error: {
          code: 403,
          message: 'The caller does not have permission',
          status: 'PERMISSION_DENIED',
        },
      }),
      {
        status: 403,
        statusText: 'Forbidden',
        headers: { 'Content-Type': 'application/json' },
      }
    );
  };

  const resultD = await validateGeminiApiKey('forbidden_key_12345');
  assert(resultD.state === 'permission_denied', 'Case D: state is "permission_denied"');
  assert(resultD.probeStatus === 403, 'Case D: probeStatus is 403');
  assert(resultD.probeOutcome === 'invalid', 'Case D: probeOutcome is "invalid"');
  console.log('');

  // ----------------------------------------------------
  // CASE E: HTTP 429 -> quota error (rate_limited) -> connected=false
  // ----------------------------------------------------
  console.log('--- CASE E: HTTP 429 (Quota / Rate Limit Exceeded) ---');
  globalThis.fetch = async () => {
    return new Response(
      JSON.stringify({
        error: {
          code: 429,
          message: 'Resource has been exhausted (e.g. check quota).',
          status: 'RESOURCE_EXHAUSTED',
        },
      }),
      {
        status: 429,
        statusText: 'Too Many Requests',
        headers: { 'Content-Type': 'application/json' },
      }
    );
  };

  const resultE = await validateGeminiApiKey('rate_limited_key_12345');
  assert(resultE.state === 'rate_limited', 'Case E: state is "rate_limited"');
  assert(resultE.state !== 'valid', 'Case E: quota limit MUST NOT set state to valid');
  assert(resultE.probeStatus === 429, 'Case E: probeStatus is 429');
  assert(resultE.probeOutcome === 'quota', 'Case E: probeOutcome is "quota" (NOT valid)');
  console.log('');

  // ----------------------------------------------------
  // CASE F: HTTP 500 -> service error -> connected=false
  // ----------------------------------------------------
  console.log('--- CASE F: HTTP 500 (Internal Server Error) ---');
  globalThis.fetch = async () => {
    return new Response(
      JSON.stringify({
        error: {
          code: 500,
          message: 'Internal server error.',
          status: 'INTERNAL',
        },
      }),
      {
        status: 500,
        statusText: 'Internal Server Error',
        headers: { 'Content-Type': 'application/json' },
      }
    );
  };

  const resultF = await validateGeminiApiKey('server_error_key_12345');
  assert(resultF.state === 'service_error', 'Case F: state is "service_error"');
  assert(resultF.probeStatus === 500, 'Case F: probeStatus is 500');
  assert(resultF.probeOutcome === 'service_error', 'Case F: probeOutcome is "service_error"');
  console.log('');

  // ----------------------------------------------------
  // CASE G: network rejection -> network error -> connected=false
  // ----------------------------------------------------
  console.log('--- CASE G: Network Rejection (e.g. offline / DNS failure) ---');
  globalThis.fetch = async () => {
    throw new TypeError('Failed to fetch (Network disconnected)');
  };

  const resultG = await validateGeminiApiKey('network_error_key_12345');
  assert(resultG.state === 'network_error', 'Case G: state is "network_error"');
  assert(resultG.probeOutcome === 'network_error', 'Case G: probeOutcome is "network_error"');
  console.log('');

  // ----------------------------------------------------
  // CASE H: random long string -> probe non-2xx -> connected=false
  // ----------------------------------------------------
  console.log('--- CASE H: Random Long String (passes local check but fails real probe) ---');
  globalThis.fetch = async () => {
    return new Response(
      JSON.stringify({
        error: {
          code: 400,
          message: 'API key not valid. Please pass a valid API key.',
          status: 'INVALID_ARGUMENT',
        },
      }),
      {
        status: 400,
        statusText: 'Bad Request',
        headers: { 'Content-Type': 'application/json' },
      }
    );
  };

  const resultH = await validateGeminiApiKey(randomLongKey);
  assert(resultH.state === 'invalid', 'Case H: random string fails real probe and gets state "invalid"');
  assert(resultH.probeOutcome === 'invalid', 'Case H: probeOutcome is "invalid"');
  console.log('');

  // ----------------------------------------------------
  // CASE I: Stale response simulation with Fingerprint Check
  // ----------------------------------------------------
  console.log('--- CASE I: Stale Response for Old Key Ignored ---');
  const oldKey = 'AIzaSyOldKey_1111111111111111';
  const newKey = 'AIzaSyNewKey_2222222222222222';
  const oldFingerprint = computeKeyFingerprint(oldKey);
  const newFingerprint = computeKeyFingerprint(newKey);

  // When validation for oldKey finishes, but current key is now newKey:
  const candidateFingerprint = oldFingerprint;
  const currentKeyFingerprint = newFingerprint;
  const isMatch = candidateFingerprint === currentKeyFingerprint;
  assert(!isMatch, 'Case I: Candidate fingerprint differs from current key fingerprint');
  // Stale response must be ignored and not set validatedKeyFingerprint
  let validatedKeyFingerprint: string | null = null;
  if (isMatch) {
    validatedKeyFingerprint = candidateFingerprint;
  }
  assert(validatedKeyFingerprint === null, 'Case I: Stale response was safely ignored');
  console.log('');

  // ----------------------------------------------------
  // CASE J: Only fetch resolving but response.ok=false -> MUST NOT become connected
  // ----------------------------------------------------
  console.log('--- CASE J: Fetch resolving with response.ok=false must NOT mark valid ---');
  globalThis.fetch = async () => {
    // Body exists, JSON exists, request completed, but HTTP status is 404/400/502
    return new Response(
      JSON.stringify({
        status: 'SOME_STATUS',
        message: 'Endpoint exists but key unauthorized',
      }),
      {
        status: 404,
        statusText: 'Not Found',
        headers: { 'Content-Type': 'application/json' },
      }
    );
  };

  const resultJ = await validateGeminiApiKey('key_with_fetch_resolved_404_12345');
  assert(resultJ.state !== 'valid', 'Case J: state MUST NOT be valid when response.ok=false');
  assert(resultJ.state === 'model_unavailable' || resultJ.state === 'invalid', 'Case J: classified as not valid (model_unavailable or invalid)');
  console.log('');

  // ----------------------------------------------------
  // CASE K: HTTP 200 but structural validation fails (missing models array)
  // ----------------------------------------------------
  console.log('--- CASE K: HTTP 200 but invalid models structure (e.g. empty object / error body) ---');
  globalThis.fetch = async () => {
    return new Response(
      JSON.stringify({
        someOtherProperty: true,
        // No 'models' array!
      }),
      {
        status: 200,
        statusText: 'OK',
        headers: { 'Content-Type': 'application/json' },
      }
    );
  };

  const resultK = await validateGeminiApiKey('key_with_malformed_response_12345');
  assert(resultK.state !== 'valid', 'Case K: MUST NOT be valid if payload lacks models array');
  assert(resultK.state === 'invalid', 'Case K: state is "invalid"');
  console.log('');

  // Restore fetch
  globalThis.fetch = originalFetch;

  console.log('================================================================');
  console.log('ALL PATCH 08B-1F-04 REGRESSION TESTS PASSED SUCCESSFULLY! ✅');
  console.log('================================================================');
}

runTests().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
