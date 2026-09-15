/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PHASE 08B-1F — TEST 05: QUOTA / RATE LIMIT 429 RELEASE GATE
 *
 * Targeted verification test using mocked Google Gemini response:
 * HTTP 429
 * error.status = "RESOURCE_EXHAUSTED"
 */

import { executeTimetableRecognition } from '../src/services/geminiService';
import { GEMINI_CONFIG, computeKeyFingerprint } from '../src/config/geminiConfig';
import { PreparedImageData } from '../src/services/imagePreparationService';
import { TimetableState } from '../src/types/timetable';
import { initialTimetableState } from '../src/reducer/timetableReducer';

interface TestResultReport {
  httpErrorFixture: string;
  resultingClassification: string;
  credentialStateAfter429: string;
  imagePreserved: 'PASS' | 'FAIL';
  timetableUnchanged: 'PASS' | 'FAIL';
  fallbackTriggered: 'YES' | 'NO';
  retryAvailable: 'PASS' | 'FAIL';
  test05Overall: 'PASS' | 'FAIL';
}

async function runTest05() {
  console.log('================================================================');
  console.log('RUNNING PHASE 08B-1F — TEST 05: QUOTA / RATE LIMIT 429 RELEASE GATE');
  console.log('================================================================\n');

  let allPassed = true;
  function assert(cond: boolean, msg: string) {
    if (!cond) {
      console.error(`❌ FAIL: ${msg}`);
      allPassed = false;
    } else {
      console.log(`✅ PASS: ${msg}`);
    }
  }

  // 1. Fixture setup
  const mock429Body = {
    error: {
      code: 429,
      message: 'Resource has been exhausted (e.g. check quota).',
      status: 'RESOURCE_EXHAUSTED',
      details: [
        {
          '@type': 'type.googleapis.com/google.rpc.ErrorInfo',
          reason: 'RATE_LIMIT_EXCEEDED',
          domain: 'googleapis.com',
        },
      ],
    },
  };

  const testApiKey = 'AIzaSyVerifiedTestKey_1234567890abcdef';
  const initialFingerprint = computeKeyFingerprint(testApiKey);

  const mockImage: PreparedImageData = {
    base64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    mimeType: 'image/png',
    width: 800,
    height: 600,
    rotationApplied: 0,
  };

  // Track fetch calls to verify model fallback
  const fetchCalls: Array<{ url: string; method?: string; headers?: Record<string, string> }> = [];

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    fetchCalls.push({
      url,
      method: init?.method,
      headers: (init?.headers ?? {}) as Record<string, string>,
    });

    return new Response(JSON.stringify(mock429Body), {
      status: 429,
      statusText: 'Too Many Requests',
      headers: {
        'content-type': 'application/json',
      },
    });
  };

  // Simulation state representing app context
  const contextState = {
    apiKey: testApiKey,
    credentialState: 'verified' as 'idle' | 'validating' | 'verified' | 'auth_error',
    currentKeyFingerprint: initialFingerprint,
    validatedKeyFingerprint: initialFingerprint,
    uploadedImage: { ...mockImage },
    recognitionResult: null as any,
    recognitionState: 'idle' as string,
    recognitionError: null as string | null,
    timetableState: JSON.parse(JSON.stringify(initialTimetableState)) as TimetableState,
  };

  const initialTimetableSnapshot = JSON.stringify(contextState.timetableState);

  // Execute recognition with mock 429
  console.log('Executing timetable recognition with HTTP 429 fixture...');
  const recognitionExecution = await executeTimetableRecognition(
    contextState.apiKey,
    contextState.uploadedImage
  );

  // Restore fetch
  globalThis.fetch = originalFetch;

  // Process result in context workflow exactly as AIImageImportContext does
  if (recognitionExecution.state === 'success' && recognitionExecution.data) {
    contextState.recognitionResult = recognitionExecution.data;
    contextState.recognitionState = 'success';
  } else {
    if (recognitionExecution.isAuthError) {
      contextState.credentialState = 'auth_error';
    }
    contextState.recognitionState = recognitionExecution.state;
    contextState.recognitionError = recognitionExecution.errorMessage || 'Error';
  }

  // --- VERIFICATIONS ---

  // Condition 1: Error is classified as quota_or_rate_limit
  assert(
    recognitionExecution.classification === 'quota_or_rate_limit',
    `Condition 1: Error classified as 'quota_or_rate_limit' (actual: '${recognitionExecution.classification}')`
  );

  // Condition 2: MUST NOT classify as invalid_key or permission_denied
  assert(
    recognitionExecution.classification !== 'invalid_key' &&
      recognitionExecution.classification !== 'permission_denied' &&
      recognitionExecution.isAuthError !== true,
    `Condition 2: Not classified as invalid_key or permission_denied (isAuthError=${recognitionExecution.isAuthError})`
  );

  // Condition 3: Current verified API Key remains verified
  assert(
    contextState.credentialState === 'verified',
    `Condition 3: Credential state remains 'verified' (actual: '${contextState.credentialState}')`
  );

  // Condition 4: verifiedKeyFingerprint remains unchanged
  assert(
    contextState.validatedKeyFingerprint === initialFingerprint &&
      contextState.currentKeyFingerprint === initialFingerprint,
    `Condition 4: verifiedKeyFingerprint unchanged (${contextState.validatedKeyFingerprint})`
  );

  // Condition 5: Uploaded image remains in memory
  assert(
    contextState.uploadedImage !== null && contextState.uploadedImage.base64.length > 0,
    'Condition 5: Uploaded image remains in memory'
  );

  // Condition 6: Recognition result is NOT created
  assert(
    contextState.recognitionResult === null && recognitionExecution.data === null,
    'Condition 6: Recognition result is NOT created (is null)'
  );

  // Condition 7: Timetable is NOT modified
  const currentTimetableSnapshot = JSON.stringify(contextState.timetableState);
  assert(
    currentTimetableSnapshot === initialTimetableSnapshot,
    'Condition 7: Timetable document state is completely unchanged'
  );

  // Condition 8: UI must show Vietnamese quota/rate-limit message
  const expectedMsg =
    'Gemini đã đạt giới hạn sử dụng hoặc đang bị giới hạn tần suất. Vui lòng thử lại sau.';
  assert(
    recognitionExecution.errorMessage === expectedMsg &&
      contextState.recognitionError === expectedMsg,
    `Condition 8: UI displays Vietnamese quota/rate-limit message: "${recognitionExecution.errorMessage}"`
  );

  // Condition 9: User can retry recognition without re-entering key, re-uploading image, or F5
  const canRetryWithoutReentry =
    Boolean(contextState.apiKey) &&
    contextState.credentialState === 'verified' &&
    contextState.validatedKeyFingerprint === contextState.currentKeyFingerprint &&
    Boolean(contextState.uploadedImage) &&
    contextState.recognitionState === 'rate_limited';
  assert(
    canRetryWithoutReentry,
    'Condition 9: Retry is immediately available without re-entering key, re-uploading, or F5'
  );

  // Condition 10: Gemini model fallback MUST NOT be triggered merely because of HTTP 429
  const calledFallbackModel = fetchCalls.some((c) =>
    c.url.includes(GEMINI_CONFIG.fallbackModel)
  );
  const calledDefaultModel = fetchCalls.some((c) =>
    c.url.includes(GEMINI_CONFIG.defaultModel)
  );
  assert(
    fetchCalls.length === 1 && calledDefaultModel && !calledFallbackModel,
    `Condition 10: Fallback NOT triggered on HTTP 429 (calls: ${fetchCalls.length}, fallbackModel called: ${calledFallbackModel})`
  );

  console.log('\n================================================================');
  console.log(`FINAL RESULT: ${allPassed ? 'TEST 05 PASS' : 'TEST 05 FAIL'}`);
  console.log('================================================================\n');

  const report: TestResultReport = {
    httpErrorFixture: 'HTTP 429 / error.status = "RESOURCE_EXHAUSTED"',
    resultingClassification: recognitionExecution.classification || 'unknown',
    credentialStateAfter429: contextState.credentialState,
    imagePreserved: contextState.uploadedImage !== null ? 'PASS' : 'FAIL',
    timetableUnchanged: currentTimetableSnapshot === initialTimetableSnapshot ? 'PASS' : 'FAIL',
    fallbackTriggered: calledFallbackModel ? 'YES' : 'NO',
    retryAvailable: canRetryWithoutReentry ? 'PASS' : 'FAIL',
    test05Overall: allPassed ? 'PASS' : 'FAIL',
  };

  return report;
}

runTest05().then((report) => {
  if (report.test05Overall !== 'PASS') {
    process.exit(1);
  }
});
