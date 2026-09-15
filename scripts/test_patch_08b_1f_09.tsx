/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PATCH 08B-1F-09 — REMOVE REMOTE PRE-VALIDATION / VERIFY ON FIRST GEMINI CALL
 *
 * Test cases:
 * CASE A: Malformed / prose rejection at local sanity check -> fetch count = 0
 * CASE B: Valid-looking key entry -> local check passes, candidate_ready, fetch count = 0
 * CASE C: First real recognition call -> 401/403 auth error -> isAuthError: true, clear Vietnamese message
 * CASE D: First real recognition call -> 429 rate limit -> isAuthError: false, rate limit message, key NOT marked invalid
 * CASE E: First real recognition call -> 200 success -> valid data, remoteConfirmed ready
 * CASE F: Security & header enforcement -> x-goog-api-key header only, NEVER in URL
 */

import assert from 'assert';
import {
  validateGeminiApiKey,
  executeTimetableRecognition,
  isMalformedApiKey,
} from '../src/services/geminiService';
import { PreparedImageData } from '../src/services/imagePreparationService';

async function runTests() {
  console.log('================================================================');
  console.log('STARTING PATCH 08B-1F-09: LOCAL ENTRY & RECOGNITION-TIME AUTH TESTS');
  console.log('================================================================\n');

  const originalFetch = globalThis.fetch;

  try {
    // -------------------------------------------------------------------------
    // CASE A: Malformed / prose rejection at local sanity check -> fetch count = 0
    // -------------------------------------------------------------------------
    console.log('--- CASE A: Malformed / Prose Local Rejection (fetch count 0) ---');
    let fetchCountA = 0;
    globalThis.fetch = (async () => {
      fetchCountA++;
      throw new Error('fetch MUST NOT be called for malformed inputs');
    }) as any;

    const testMalformedInputs = [
      'khóa học mới sau PATCH 08B-1F-09',
      'AIzaSy with spaces inside key',
      'short',
      '',
      '   \n\t  ',
      'AIzaSyKeyWithNewline\n12345',
      'tabs\tinside\tkey',
    ];

    for (const input of testMalformedInputs) {
      assert.strictEqual(
        isMalformedApiKey(input.trim()),
        true,
        `"${input}" must be flagged as malformed`
      );

      const res = await validateGeminiApiKey(input);
      assert.strictEqual(res.state, 'invalid', `"${input}" must produce invalid state`);
      assert.strictEqual(res.probeStatus, 'local_check', 'Status must be local_check');
      assert.strictEqual(res.probeOutcome, 'invalid', 'Outcome must be invalid');
    }

    assert.strictEqual(fetchCountA, 0, 'Fetch count MUST be 0 for all malformed inputs');
    console.log('✅ PASS: CASE A: Prose & malformed inputs rejected locally with fetch count = 0\n');

    // -------------------------------------------------------------------------
    // CASE B: Valid-looking key entry -> NO REMOTE FETCH AT ENTRY
    // -------------------------------------------------------------------------
    console.log('--- CASE B: Valid-looking Key Entry (fetch count 0, candidate_ready) ---');
    let fetchCountB = 0;
    globalThis.fetch = (async () => {
      fetchCountB++;
      throw new Error('fetch MUST NOT be called at key entry!');
    }) as any;

    const validCandidateKeys = [
      'AIzaSyB1234567890abcdef1234567890',
      'AIzaSyTestCandidateKey98765432100',
      'AIzaSyCleanKeyWithoutSpaces123456',
    ];

    for (const candidate of validCandidateKeys) {
      assert.strictEqual(
        isMalformedApiKey(candidate),
        false,
        `"${candidate}" must pass local sanity check`
      );

      const res = await validateGeminiApiKey(candidate);
      assert.strictEqual(
        res.state === 'ready_unverified' || res.state === 'candidate_ready',
        true,
        `"${candidate}" must return ready_unverified without remote probe`
      );
      assert.strictEqual(res.probeStatus, 'local_ready');
      assert.strictEqual(res.probeOutcome, 'valid');
      assert.strictEqual(res.durationMs, 0);
    }

    assert.strictEqual(fetchCountB, 0, 'Fetch count MUST be 0 at key entry for all candidate keys');
    console.log('✅ PASS: CASE B: Valid candidate keys ready immediately with ZERO network fetch\n');

    // Mock dummy image for recognition calls
    const mockImage: PreparedImageData = {
      base64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      mimeType: 'image/jpeg',
      width: 800,
      height: 600,
      rotationApplied: 0,
    };

    // -------------------------------------------------------------------------
    // CASE C: First Real Recognition Call -> 401/403 Auth Error
    // -------------------------------------------------------------------------
    console.log('--- CASE C: First Real Recognition Call -> 401/403 Auth Error ---');
    let fetchCountC = 0;
    let requestHeadersC: Record<string, string> = {};
    let requestUrlC = '';

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      fetchCountC++;
      requestUrlC = String(input);
      requestHeadersC = (init?.headers ?? {}) as Record<string, string>;

      return new Response(
        JSON.stringify({
          error: {
            code: 403,
            message: 'The caller does not have permission / API_KEY_INVALID',
            status: 'PERMISSION_DENIED',
          },
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }) as any;

    const authErrorResult = await executeTimetableRecognition('AIzaSyBadKey1234567890', mockImage);

    assert.strictEqual(fetchCountC >= 1, true, 'At least one request executed during recognition');
    assert.strictEqual(authErrorResult.isAuthError, true, 'isAuthError must be true for 403');
    assert.strictEqual(
      authErrorResult.errorMessage,
      'API Key không hợp lệ hoặc không có quyền truy cập Gemini.',
      'Must provide exact user-facing Vietnamese error message'
    );
    assert.strictEqual(
      requestHeadersC['x-goog-api-key'],
      'AIzaSyBadKey1234567890',
      'Must authenticate via x-goog-api-key header'
    );
    assert.strictEqual(!requestUrlC.includes('AIzaSyBadKey'), true, 'API Key must NEVER appear in URL');
    console.log('✅ PASS: CASE C: 401/403 correctly flagged as isAuthError with user-friendly message\n');

    // -------------------------------------------------------------------------
    // CASE D: First Real Recognition Call -> 429 Rate Limit (NOT auth error!)
    // -------------------------------------------------------------------------
    console.log('--- CASE D: First Real Recognition Call -> 429 Rate Limit ---');
    let fetchCountD = 0;

    globalThis.fetch = (async () => {
      fetchCountD++;
      return new Response(
        JSON.stringify({
          error: {
            code: 429,
            message: 'Resource has been exhausted (e.g. check quota).',
            status: 'RESOURCE_EXHAUSTED',
          },
        }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }) as any;

    const rateLimitResult = await executeTimetableRecognition('AIzaSyValidKeyUnderQuota_123', mockImage);

    assert.strictEqual(fetchCountD >= 1, true, 'Request executed');
    assert.strictEqual(rateLimitResult.state, 'rate_limited', 'State must be rate_limited');
    assert.strictEqual(rateLimitResult.isAuthError, false, 'isAuthError MUST BE FALSE for 429 quota errors!');
    assert.strictEqual(
      rateLimitResult.errorMessage,
      'Đã vượt hạn mức yêu cầu Gemini (Rate Limit / Quota). Vui lòng thử lại sau giây lát.',
      'Must show quota notice without claiming key is invalid'
    );
    console.log('✅ PASS: CASE D: 429 rate limit correctly distinguished from auth error\n');

    // -------------------------------------------------------------------------
    // CASE E: First Real Recognition Call -> 200 Success
    // -------------------------------------------------------------------------
    console.log('--- CASE E: First Real Recognition Call -> 200 Success ---');
    const mockSuccessResponse = {
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  schemaVersion: '1.0',
                  documentType: 'school_timetable',
                  language: 'vi',
                  overallConfidence: 0.95,
                  sourceSummary: {
                    title: 'TKB Lớp 10A1',
                    schoolName: 'THPT Chuyên Lê Hồng Phong',
                    className: '10A1',
                    schoolYear: '2025-2026',
                  },
                  days: [
                    { dayKey: 'monday', label: 'Thứ 2', confidence: 0.98 },
                    { dayKey: 'tuesday', label: 'Thứ 3', confidence: 0.95 },
                  ],
                  sessions: [
                    {
                      sessionKey: 'morning',
                      label: 'Buổi sáng',
                      confidence: 0.96,
                      periods: [
                        {
                          periodNumber: 1,
                          cells: [
                            {
                              dayKey: 'monday',
                              status: 'recognized',
                              subjectRaw: 'Toán',
                              confidence: 0.95,
                            },
                            {
                              dayKey: 'tuesday',
                              status: 'empty',
                              confidence: 0.99,
                            },
                          ],
                        },
                      ],
                    },
                  ],
                  warnings: [],
                }),
              },
            ],
          },
        },
      ],
    };

    globalThis.fetch = (async () => {
      return new Response(JSON.stringify(mockSuccessResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as any;

    const successResult = await executeTimetableRecognition('AIzaSyValidWorkingKey_123', mockImage);

    assert.strictEqual(successResult.state, 'success', 'State must be success');
    assert.strictEqual(successResult.data !== null, true, 'Data must be parsed');
    assert.strictEqual(successResult.data?.sourceSummary.className, '10A1');
    assert.strictEqual(successResult.data?.days.length, 2);
    assert.strictEqual(
      successResult.data?.sessions[0].periods[0].cells[0].subjectRaw,
      'Toán'
    );
    console.log('✅ PASS: CASE E: 200 response yields successful structured recognition data\n');

    console.log('================================================================');
    console.log('ALL PATCH 08B-1F-09 REGRESSION TESTS PASSED (100%)');
    console.log('================================================================');
  } finally {
    globalThis.fetch = originalFetch;
  }
}

runTests().catch((err) => {
  console.error('❌ TEST FAILURE:', err);
  process.exit(1);
});
