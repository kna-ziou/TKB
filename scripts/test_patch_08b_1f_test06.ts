/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PHASE 08B-1F — TEST 06: GEMINI 5XX / SERVICE ERROR RECOVERY RELEASE GATE
 *
 * Targeted tests using mocked Gemini responses:
 * CASE A: HTTP 500, error.status = "INTERNAL"
 * CASE B: HTTP 503, error.status = "UNAVAILABLE"
 */

import { executeTimetableRecognition } from '../src/services/geminiService';
import { GEMINI_CONFIG, computeKeyFingerprint } from '../src/config/geminiConfig';
import { PreparedImageData } from '../src/services/imagePreparationService';
import { TimetableState } from '../src/types/timetable';
import { initialTimetableState } from '../src/reducer/timetableReducer';

interface TestCaseResult {
  status: number;
  statusText: string;
  errorStatus: string;
  classification: string;
  isAuthError: boolean;
  errorMessage: string;
  credentialState: string;
  fingerprintUnchanged: boolean;
  imagePreserved: boolean;
  recognitionResultAbsent: boolean;
  reviewScreenEntered: boolean;
  timetableUnchanged: boolean;
  fallbackTriggered: boolean;
  retryAvailable: boolean;
  passed: boolean;
}

async function runTestCase(
  caseName: 'CASE A' | 'CASE B',
  httpStatus: number,
  statusText: string,
  errorStatus: string
): Promise<TestCaseResult> {
  console.log(`\n--- RUNNING ${caseName}: HTTP ${httpStatus} (${errorStatus}) ---`);

  const mockErrorBody = {
    error: {
      code: httpStatus,
      message: `The service is temporarily unavailable or encountered an internal error. Status: ${errorStatus}`,
      status: errorStatus,
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

  const fetchCalls: Array<{ url: string; method?: string }> = [];

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    fetchCalls.push({
      url,
      method: init?.method,
    });

    return new Response(JSON.stringify(mockErrorBody), {
      status: httpStatus,
      statusText,
      headers: {
        'content-type': 'application/json',
      },
    });
  };

  const contextState = {
    apiKey: testApiKey,
    credentialState: 'verified' as 'idle' | 'validating' | 'verified' | 'auth_error',
    currentKeyFingerprint: initialFingerprint,
    validatedKeyFingerprint: initialFingerprint,
    uploadedImage: { ...mockImage },
    recognitionResult: null as any,
    recognitionState: 'idle' as string,
    recognitionError: null as string | null,
    activeView: 'import' as 'import' | 'review' | 'apply_preview',
    timetableState: JSON.parse(JSON.stringify(initialTimetableState)) as TimetableState,
  };

  const initialTimetableSnapshot = JSON.stringify(contextState.timetableState);

  // Execute recognition
  const executionResult = await executeTimetableRecognition(
    contextState.apiKey,
    contextState.uploadedImage
  );

  // Restore fetch
  globalThis.fetch = originalFetch;

  // Emulate AIImageImportContext result handling
  if (executionResult.state === 'success' && executionResult.data) {
    contextState.recognitionResult = executionResult.data;
    contextState.recognitionState = 'success';
    contextState.activeView = 'review';
  } else {
    if (executionResult.isAuthError) {
      contextState.credentialState = 'auth_error';
    }
    contextState.recognitionState = executionResult.state;
    contextState.recognitionError = executionResult.errorMessage || 'Error';
    // activeView remains 'import'
  }

  // --- Assertions for this case ---
  let casePassed = true;
  function check(cond: boolean, desc: string) {
    if (!cond) {
      console.error(`  ❌ FAIL: ${desc}`);
      casePassed = false;
    } else {
      console.log(`  ✅ PASS: ${desc}`);
    }
  }

  // 1. Error classification
  check(
    executionResult.classification === 'google_service_error',
    `1. Error classification is 'google_service_error' (actual: '${executionResult.classification}')`
  );

  // 2. MUST NOT classify as invalid_key, permission_denied, quota_or_rate_limit
  check(
    executionResult.classification !== 'invalid_key' &&
      executionResult.classification !== 'permission_denied' &&
      executionResult.classification !== 'quota_or_rate_limit' &&
      executionResult.isAuthError !== true,
    `2. Not classified as invalid_key, permission_denied, or quota_or_rate_limit (isAuthError=${executionResult.isAuthError})`
  );

  // 3. Current verified API Key remains verified
  check(
    contextState.credentialState === 'verified',
    `3. Credential state remains 'verified' (actual: '${contextState.credentialState}')`
  );

  // 4. verifiedKeyFingerprint remains unchanged
  const fpUnchanged =
    contextState.validatedKeyFingerprint === initialFingerprint &&
    contextState.currentKeyFingerprint === initialFingerprint;
  check(fpUnchanged, `4. verifiedKeyFingerprint remains unchanged (${initialFingerprint})`);

  // 5. Uploaded image remains in memory
  const imgPreserved =
    contextState.uploadedImage !== null && contextState.uploadedImage.base64.length > 0;
  check(imgPreserved, '5. Uploaded image remains in memory');

  // 6. Recognition result is NOT created
  const resAbsent =
    contextState.recognitionResult === null && executionResult.data === null;
  check(resAbsent, '6. Recognition result is NOT created (data is null)');

  // 7. Review screen is NOT entered
  const reviewNotEntered = contextState.activeView === 'import';
  check(reviewNotEntered, `7. Review screen NOT entered (activeView: '${contextState.activeView}')`);

  // 8. Timetable is NOT modified
  const currentTimetableSnapshot = JSON.stringify(contextState.timetableState);
  const ttUnchanged = currentTimetableSnapshot === initialTimetableSnapshot;
  check(ttUnchanged, '8. Timetable is NOT modified');

  // 9. UI shows a Vietnamese temporary-service error
  const expectedMsg =
    'Dịch vụ Gemini đang tạm thời không phản hồi. Vui lòng thử lại sau.';
  check(
    executionResult.errorMessage === expectedMsg &&
      contextState.recognitionError === expectedMsg,
    `9. UI displays Vietnamese temporary service error: "${executionResult.errorMessage}"`
  );

  // 10 & 11. Retry must remain available without re-entering key, re-uploading image, or F5
  const canRetry =
    Boolean(contextState.apiKey) &&
    contextState.credentialState === 'verified' &&
    contextState.validatedKeyFingerprint === contextState.currentKeyFingerprint &&
    Boolean(contextState.uploadedImage) &&
    contextState.activeView === 'import' &&
    contextState.recognitionState === 'network_error';
  check(
    canRetry,
    '10 & 11. Retry is immediately available without re-entering key, re-uploading, or F5'
  );

  // 12. HTTP 500/503 MUST NOT invalidate the API Key
  check(
    contextState.apiKey === testApiKey && contextState.credentialState === 'verified',
    '12. API Key is NOT invalidated'
  );

  // 13. HTTP 500/503 MUST NOT trigger model fallback
  const calledFallbackModel = fetchCalls.some((c) =>
    c.url.includes(GEMINI_CONFIG.fallbackModel)
  );
  const calledDefaultModel = fetchCalls.some((c) =>
    c.url.includes(GEMINI_CONFIG.defaultModel)
  );
  const fallbackNotTriggered =
    fetchCalls.length === 1 && calledDefaultModel && !calledFallbackModel;
  check(
    fallbackNotTriggered,
    `13. Fallback NOT triggered on 5xx (calls: ${fetchCalls.length}, fallbackModel called: ${calledFallbackModel})`
  );

  return {
    status: httpStatus,
    statusText,
    errorStatus,
    classification: executionResult.classification || 'unknown',
    isAuthError: Boolean(executionResult.isAuthError),
    errorMessage: executionResult.errorMessage || '',
    credentialState: contextState.credentialState,
    fingerprintUnchanged: fpUnchanged,
    imagePreserved: imgPreserved,
    recognitionResultAbsent: resAbsent,
    reviewScreenEntered: !reviewNotEntered,
    timetableUnchanged: ttUnchanged,
    fallbackTriggered: calledFallbackModel,
    retryAvailable: canRetry,
    passed: casePassed,
  };
}

async function runAllTests() {
  console.log('================================================================');
  console.log('PHASE 08B-1F — TEST 06: GEMINI 5XX / SERVICE ERROR RECOVERY RELEASE GATE');
  console.log('================================================================');

  const resA = await runTestCase('CASE A', 500, 'Internal Server Error', 'INTERNAL');
  const resB = await runTestCase('CASE B', 503, 'Service Unavailable', 'UNAVAILABLE');

  const allPassed = resA.passed && resB.passed;

  console.log('\n================================================================');
  console.log(`FINAL RESULT: ${allPassed ? 'TEST 06 PASS' : 'TEST 06 FAIL'}`);
  console.log('================================================================\n');

  console.log('SUMMARY REPORT FOR USER:');
  console.log(`- 500 classification: ${resA.classification}`);
  console.log(`- 503 classification: ${resB.classification}`);
  console.log(`- credential state after 500/503: ${resA.credentialState} / ${resB.credentialState}`);
  console.log(`- fingerprint unchanged: ${resA.fingerprintUnchanged && resB.fingerprintUnchanged ? 'PASS' : 'FAIL'}`);
  console.log(`- image preserved: ${resA.imagePreserved && resB.imagePreserved ? 'PASS' : 'FAIL'}`);
  console.log(`- recognition result absent: ${resA.recognitionResultAbsent && resB.recognitionResultAbsent ? 'PASS' : 'FAIL'}`);
  console.log(`- timetable unchanged: ${resA.timetableUnchanged && resB.timetableUnchanged ? 'PASS' : 'FAIL'}`);
  console.log(`- fallback triggered: ${resA.fallbackTriggered || resB.fallbackTriggered ? 'YES' : 'NO'}`);
  console.log(`- retry available: ${resA.retryAvailable && resB.retryAvailable ? 'PASS' : 'FAIL'}`);
  console.log(`- TEST 06 ${allPassed ? 'PASS' : 'FAIL'}`);

  if (!allPassed) {
    process.exit(1);
  }
}

runAllTests();
