/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PATCH 08B-1F-10 — RELAX LOCAL API KEY SANITY CHECK TESTS
 *
 * Verification suite for minimal local sanity checks and opaque credential handling:
 * - CASE A: empty -> reject locally
 * - CASE B: spaces / whitespace-only -> reject locally
 * - CASE C: short junk (< 10 chars) -> reject locally
 * - CASE D: long prose containing spaces -> reject locally
 * - CASE E: long opaque no-space string -> accept locally
 * - CASE F: real Gemini API key fixture shape -> accept locally
 * - CASE G: accepted fake-looking opaque key -> zero network call at key entry
 * - CASE H: actual recognition auth failure (401/403) -> flags isAuthError, triggers recovery
 */

import assert from 'assert';
import {
  isMalformedApiKey,
  validateGeminiApiKey,
  executeTimetableRecognition,
} from '../src/services/geminiService';
import { PreparedImageData } from '../src/services/imagePreparationService';

async function runTests() {
  console.log('================================================================');
  console.log('STARTING PATCH 08B-1F-10: RELAXED LOCAL SANITY CHECK REGRESSION TESTS');
  console.log('================================================================\n');

  const originalFetch = globalThis.fetch;

  try {
    // -------------------------------------------------------------------------
    // CASE A: Empty string -> reject locally
    // -------------------------------------------------------------------------
    console.log('--- CASE A: Empty Key Rejection ---');
    assert.strictEqual(isMalformedApiKey(''), true, 'Empty key must be rejected');
    const resA = await validateGeminiApiKey('');
    assert.strictEqual(resA.state, 'invalid');
    assert.strictEqual(resA.probeStatus, 'local_check');
    console.log('✅ PASS: CASE A: Empty key correctly rejected locally\n');

    // -------------------------------------------------------------------------
    // CASE B: Spaces & whitespace-only -> reject locally
    // -------------------------------------------------------------------------
    console.log('--- CASE B: Whitespace-only & Internal Spaces Rejection ---');
    const spaceInputs = [
      '   ',
      '\t\t',
      '\n\r',
      'key with internal spaces',
      'AIzaSy Key With Spaces In Mid',
    ];
    for (const input of spaceInputs) {
      assert.strictEqual(
        isMalformedApiKey(input),
        true,
        `Whitespace input "${input}" must be rejected`
      );
      const resB = await validateGeminiApiKey(input);
      assert.strictEqual(resB.state, 'invalid');
    }
    console.log('✅ PASS: CASE B: Spaces and whitespace-only rejected locally\n');

    // -------------------------------------------------------------------------
    // CASE C: Short junk (< 10 characters) -> reject locally
    // -------------------------------------------------------------------------
    console.log('--- CASE C: Short Junk (< 10 characters) Rejection ---');
    const shortInputs = ['abc', '12345', 'short', 'abcdefghi']; // 9 chars
    for (const input of shortInputs) {
      assert.strictEqual(
        isMalformedApiKey(input),
        true,
        `Short input "${input}" (${input.length} chars) must be rejected`
      );
      const resC = await validateGeminiApiKey(input);
      assert.strictEqual(resC.state, 'invalid');
    }
    console.log('✅ PASS: CASE C: Short inputs under 10 chars rejected locally\n');

    // -------------------------------------------------------------------------
    // CASE D: Long prose containing spaces -> reject locally
    // -------------------------------------------------------------------------
    console.log('--- CASE D: Long Prose Containing Spaces Rejection ---');
    const proseInputs = [
      'this is not a key',
      'PATCH 08B-1F-08 — REPLACE SLOW KEY PRO',
      'Xin chào đây là một đoạn văn bản không phải là API key',
      'Lorem ipsum dolor sit amet consectetur adipiscing elit sed do',
    ];
    for (const input of proseInputs) {
      assert.strictEqual(
        isMalformedApiKey(input),
        true,
        `Prose input "${input}" must be rejected`
      );
      const resD = await validateGeminiApiKey(input);
      assert.strictEqual(resD.state, 'invalid');
    }
    console.log('✅ PASS: CASE D: Long prose containing spaces rejected locally\n');

    // -------------------------------------------------------------------------
    // CASE E: Long opaque no-space strings -> ACCEPT LOCALLY
    // -------------------------------------------------------------------------
    console.log('--- CASE E: Long Opaque No-Space Strings Acceptance ---');
    const opaqueInputs = [
      'abcdefghijklmnopqrstuvwxyz1234567890',
      'AbCdEfGhIjKlMnOpQrStUvWxYz123456',
      'opaque-random-string-with-dashes-12345',
      'opaque_random_string_with_underscores_67890',
      'randomKeyWithMixedPunctuation.and+symbols=123',
    ];
    for (const input of opaqueInputs) {
      assert.strictEqual(
        isMalformedApiKey(input),
        false,
        `Opaque string "${input}" must pass minimal local sanity check`
      );
      const resE = await validateGeminiApiKey(input);
      assert.strictEqual(
        resE.state === 'ready_unverified' || resE.state === 'candidate_ready',
        true,
        `Opaque string "${input}" must transition to ready_unverified`
      );
    }
    console.log('✅ PASS: CASE E: Long opaque no-space strings accepted locally\n');

    // -------------------------------------------------------------------------
    // CASE F: Real Gemini API key fixture shape -> ACCEPT LOCALLY
    // -------------------------------------------------------------------------
    console.log('--- CASE F: Real Gemini API Key Fixture Shape Acceptance ---');
    const realFixtureKeys = [
      // Standard Google API key length (39 chars) starting with AIzaSy
      'AIzaSyB0123456789abcdefghijklmnopqrstuv',
      'AIzaSyC_test-Key1234567890abcdefghijklm',
      // Future or alternative format keys without AIza prefix
      'GM-2026-prod-access-credential-xyz987654321',
      'sk-gemini-v1-9876543210abcdef0123456789',
    ];
    for (const key of realFixtureKeys) {
      assert.strictEqual(
        isMalformedApiKey(key),
        false,
        `Real fixture key shape "${key}" must NOT be rejected by local sanity check`
      );
      const resF = await validateGeminiApiKey(key);
      assert.strictEqual(
        resF.state === 'ready_unverified' || resF.state === 'candidate_ready',
        true,
        `Real fixture key "${key}" must transition to ready_unverified`
      );
    }
    console.log('✅ PASS: CASE F: Real Gemini API key fixture shapes accepted locally\n');

    // -------------------------------------------------------------------------
    // CASE G: Accepted fake-looking opaque key -> ZERO NETWORK CALL at key entry
    // -------------------------------------------------------------------------
    console.log('--- CASE G: Accepted Key Entry has ZERO Network Calls ---');
    let fetchCountG = 0;
    globalThis.fetch = (async () => {
      fetchCountG++;
      throw new Error('fetch MUST NOT be called at key entry!');
    }) as any;

    const fakeLookingOpaqueKey = 'AbCdEfGhIjKlMnOpQrStUvWxYz123456';
    assert.strictEqual(isMalformedApiKey(fakeLookingOpaqueKey), false);
    const resG = await validateGeminiApiKey(fakeLookingOpaqueKey);
    assert.strictEqual(
      resG.state === 'ready_unverified' || resG.state === 'candidate_ready',
      true
    );
    assert.strictEqual(fetchCountG, 0, 'ZERO network calls made on key entry');
    console.log('✅ PASS: CASE G: Zero network calls at key entry confirmed\n');

    // -------------------------------------------------------------------------
    // CASE H: Actual recognition auth failure -> key editor recovery
    // -------------------------------------------------------------------------
    console.log('--- CASE H: Actual Recognition Auth Failure Recovery ---');
    let recognitionFetchCount = 0;
    let authHeaderValue: string | null = null;
    let urlRequested: string | null = null;

    globalThis.fetch = (async (url: string, init?: RequestInit) => {
      recognitionFetchCount++;
      urlRequested = url;
      authHeaderValue = (init?.headers as Record<string, string>)?.[
        'x-goog-api-key'
      ] ?? null;

      // Simulate Gemini API 400 API_KEY_INVALID error
      return {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({
          error: {
            code: 400,
            message: 'API key not valid. Please pass a valid API key.',
            status: 'INVALID_ARGUMENT',
            details: [
              {
                '@type': 'type.googleapis.com/google.rpc.ErrorInfo',
                reason: 'API_KEY_INVALID',
              },
            ],
          },
        }),
      } as Response;
    }) as any;

    const dummyImage: PreparedImageData = {
      base64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      mimeType: 'image/jpeg',
      width: 800,
      height: 600,
      rotationApplied: 0,
    };

    const recResult = await executeTimetableRecognition(
      fakeLookingOpaqueKey,
      dummyImage,
      new AbortController().signal
    );

    assert.strictEqual(recognitionFetchCount, 1);
    assert.strictEqual(authHeaderValue, fakeLookingOpaqueKey);
    assert.strictEqual(
      urlRequested?.includes(fakeLookingOpaqueKey),
      false,
      'API key MUST NOT be present in the URL query string'
    );
    assert.strictEqual(
      recResult.isAuthError,
      true,
      'isAuthError must be true for 400 API_KEY_INVALID'
    );
    assert.strictEqual(
      recResult.errorMessage,
      'API Key không hợp lệ hoặc không có quyền truy cập Gemini.'
    );
    console.log('✅ PASS: CASE H: Recognition auth error correctly classified for recovery\n');

    console.log('================================================================');
    console.log('ALL PATCH 08B-1F-10 REGRESSION TESTS PASSED (100%)');
    console.log('================================================================');
  } finally {
    globalThis.fetch = originalFetch;
  }
}

runTests().catch((err) => {
  console.error('❌ TEST FAILURE:', err);
  process.exit(1);
});
