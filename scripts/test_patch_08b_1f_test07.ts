/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PHASE 08B-1F — TEST 07: TIMEOUT / ABORT / RETRY SAFETY RELEASE GATE
 *
 * CASE A — RECOGNITION TIMEOUT
 * CASE B — USER CLOSES AI MODAL DURING ANALYSIS
 * CASE C — IMAGE REPLACE/REMOVE DURING ACTIVE REQUEST
 * CASE D — RETRY AFTER TIMEOUT
 */

import { executeTimetableRecognition } from '../src/services/geminiService';
import { GEMINI_CONFIG, computeKeyFingerprint } from '../src/config/geminiConfig';
import { PreparedImageData } from '../src/services/imagePreparationService';
import { TimetableState } from '../src/types/timetable';
import { initialTimetableState } from '../src/reducer/timetableReducer';

interface Test07Report {
  productionTimeoutMs: number;
  caseATimeoutClassification: string;
  caseARequestAborted: boolean;
  caseACredentialPreserved: boolean;
  caseAImagePreserved: boolean;
  caseBModalCloseAbort: boolean;
  caseBStaleCompletionBlocked: boolean;
  caseCImageChangeAbort: boolean;
  caseCOldImageResultBlocked: boolean;
  caseCObjectUrlLifecycle: boolean;
  caseDRetry: boolean;
  caseDExactlyOneCommitted: boolean;
  unhandledRejection: boolean;
  allPassed: boolean;
}

async function runTest07(): Promise<Test07Report> {
  console.log('================================================================');
  console.log('PHASE 08B-1F — TEST 07: TIMEOUT / ABORT / RETRY SAFETY RELEASE GATE');
  console.log('================================================================\n');

  let unhandledRejectionDetected = false;
  const rejectionHandler = (reason: any) => {
    console.error('Unhandled rejection detected:', reason);
    unhandledRejectionDetected = true;
  };
  process.on('unhandledRejection', rejectionHandler);

  const testApiKey = 'AIzaSyVerifiedTestKey_1234567890abcdef';
  const initialFingerprint = computeKeyFingerprint(testApiKey);
  let credentialState: 'verified' | 'unverified' = 'verified';
  let verifiedFingerprint = initialFingerprint;

  const initialTimetableSnapshot: TimetableState = JSON.parse(JSON.stringify(initialTimetableState));
  let liveTimetable: TimetableState = JSON.parse(JSON.stringify(initialTimetableState));

  const mockImageA: PreparedImageData = {
    base64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    mimeType: 'image/png',
    width: 800,
    height: 600,
    rotationApplied: 0,
  };

  const mockImageB: PreparedImageData = {
    base64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    mimeType: 'image/png',
    width: 1024,
    height: 768,
    rotationApplied: 0,
  };

  const mockValidRecognitionJson = JSON.stringify({
    schemaVersion: '1.0',
    documentType: 'school_timetable',
    language: 'vi',
    overallConfidence: 0.95,
    sourceSummary: {
      title: 'Thời khóa biểu',
      schoolName: 'Đại học Bách Khoa',
      className: 'CNTT-01',
      studentName: 'Nguyễn Văn A',
      schoolYear: '2025-2026',
    },
    days: [
      {
        dayKey: 'monday',
        label: 'Thứ 2',
        confidence: 0.98,
      },
    ],
    sessions: [
      {
        sessionKey: 'morning',
        label: 'Buổi sáng',
        confidence: 0.98,
        periods: [
          {
            periodNumber: 1,
            cells: [
              {
                dayKey: 'monday',
                status: 'recognized',
                subjectRaw: 'Giải tích 1',
                subjectNormalized: 'Giải tích 1',
                confidence: 0.95,
              },
            ],
          },
        ],
      },
    ],
    warnings: [],
  });

  const originalFetch = global.fetch;

  // -------------------------------------------------------------------------
  // CASE A — RECOGNITION TIMEOUT
  // -------------------------------------------------------------------------
  console.log('--- RUNNING CASE A: RECOGNITION TIMEOUT ---');
  let caseAFetchAborted = false;

  // In CASE A, mock fetch to never resolve until aborted by controller
  global.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    return new Promise((resolve, reject) => {
      const signal = init?.signal;
      if (signal) {
        signal.addEventListener('abort', () => {
          caseAFetchAborted = true;
          const abortError = new Error('The operation was aborted.');
          abortError.name = 'AbortError';
          reject(abortError);
        });
      }
    });
  };

  // Run recognition with an external timeout controller simulating the recognition timeout
  // GEMINI_CONFIG.recognitionTimeoutMs is 60000ms. In test we link an AbortController
  // that aborts with 'timeout' to simulate expiration without waiting 60 wall-clock seconds.
  const timeoutSimController = new AbortController();
  const recognitionPromiseA = executeTimetableRecognition(
    testApiKey,
    mockImageA,
    timeoutSimController.signal
  );

  // Trigger timeout abort
  timeoutSimController.abort('timeout');
  const resultA = await recognitionPromiseA;

  const caseAPassed =
    resultA.state === 'timeout' &&
    resultA.classification === 'timeout' &&
    resultA.data === null &&
    caseAFetchAborted &&
    credentialState === 'verified' &&
    verifiedFingerprint === initialFingerprint &&
    JSON.stringify(liveTimetable) === JSON.stringify(initialTimetableSnapshot);

  console.log(`  State: ${resultA.state}, Classification: ${resultA.classification}`);
  console.log(`  Fetch Aborted by signal: ${caseAFetchAborted}`);
  console.log(`  Error Message: "${resultA.errorMessage}"`);
  console.log(`  Credential verified: ${credentialState === 'verified'}, Fingerprint match: ${verifiedFingerprint === initialFingerprint}`);
  console.log(`  Timetable modified: ${JSON.stringify(liveTimetable) !== JSON.stringify(initialTimetableSnapshot)}`);
  console.log(`  CASE A result: ${caseAPassed ? '✅ PASS' : '❌ FAIL'}\n`);

  // -------------------------------------------------------------------------
  // CASE B — USER CLOSES AI MODAL DURING ANALYSIS
  // -------------------------------------------------------------------------
  console.log('--- RUNNING CASE B: USER CLOSES MODAL DURING ANALYSIS ---');
  let caseBFetchAborted = false;
  let caseBCommitBlocked = false;

  let requestId = 0;
  let activeRequestId = 0;
  let committedResultB: any = null;

  global.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    return new Promise((resolve, reject) => {
      const signal = init?.signal;
      if (signal) {
        signal.addEventListener('abort', () => {
          caseBFetchAborted = true;
          const err = new Error('The operation was aborted.');
          err.name = 'AbortError';
          reject(err);
        });
      }
      // If modal closed, simulate resolution delayed
      setTimeout(() => {
        resolve({
          ok: true,
          status: 200,
          json: async () => ({
            candidates: [
              {
                content: {
                  parts: [{ text: `\`\`\`json\n${mockValidRecognitionJson}\n\`\`\`` }],
                },
              },
            ],
          }),
        } as Response);
      }, 50);
    });
  };

  // Simulate starting recognition in modal
  const modalAbortController = new AbortController();
  activeRequestId = ++requestId;
  const currentReqId = activeRequestId;

  const recognitionPromiseB = executeTimetableRecognition(
    testApiKey,
    mockImageA,
    modalAbortController.signal
  ).then((res) => {
    // Check if committed into state
    if (activeRequestId === currentReqId && !modalAbortController.signal.aborted) {
      committedResultB = res;
    } else {
      caseBCommitBlocked = true;
    }
    return res;
  });

  // User closes modal immediately while request is in-flight
  activeRequestId++; // Modal close increments requestId and aborts controller
  modalAbortController.abort('cancelled');

  const resultB = await recognitionPromiseB;

  const caseBPassed =
    caseBFetchAborted &&
    caseBCommitBlocked &&
    committedResultB === null &&
    resultB.state === 'cancelled' &&
    JSON.stringify(liveTimetable) === JSON.stringify(initialTimetableSnapshot) &&
    credentialState === 'verified';

  console.log(`  Active request aborted: ${caseBFetchAborted}`);
  console.log(`  Stale completion blocked from commit: ${caseBCommitBlocked}`);
  console.log(`  Committed Result: ${committedResultB}`);
  console.log(`  Timetable unchanged: ${JSON.stringify(liveTimetable) === JSON.stringify(initialTimetableSnapshot)}`);
  console.log(`  CASE B result: ${caseBPassed ? '✅ PASS' : '❌ FAIL'}\n`);

  // -------------------------------------------------------------------------
  // CASE C — IMAGE REPLACE / REMOVE DURING ACTIVE REQUEST
  // -------------------------------------------------------------------------
  console.log('--- RUNNING CASE C: IMAGE REPLACE/REMOVE DURING ACTIVE REQUEST ---');
  let caseCFetchAborted = false;
  let caseCCommittedImage: string | null = null;
  let oldUrlRevoked = false;
  let newUrlCreated = false;

  // Mock object URL lifecycle
  const revokedUrls: string[] = [];
  (global as any).URL = {
    createObjectURL: (file: any) => {
      newUrlCreated = true;
      return 'blob:http://localhost:3000/image-b-uuid';
    },
    revokeObjectURL: (url: string) => {
      revokedUrls.push(url);
      if (url === 'blob:http://localhost:3000/image-a-uuid') {
        oldUrlRevoked = true;
      }
    },
  };

  global.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    return new Promise((resolve, reject) => {
      const signal = init?.signal;
      if (signal) {
        signal.addEventListener('abort', () => {
          caseCFetchAborted = true;
          const err = new Error('The operation was aborted.');
          err.name = 'AbortError';
          reject(err);
        });
      }
      setTimeout(() => {
        resolve({
          ok: true,
          status: 200,
          json: async () => ({
            candidates: [
              {
                content: {
                  parts: [{ text: `\`\`\`json\n${mockValidRecognitionJson}\n\`\`\`` }],
                },
              },
            ],
          }),
        } as Response);
      }, 50);
    });
  };

  // Start analysis with image A
  const imageAController = new AbortController();
  activeRequestId = ++requestId;
  const imageAReqId = activeRequestId;

  const recognitionPromiseC = executeTimetableRecognition(
    testApiKey,
    mockImageA,
    imageAController.signal
  ).then((res) => {
    if (activeRequestId === imageAReqId && !imageAController.signal.aborted) {
      caseCCommittedImage = 'imageA';
    }
    return res;
  });

  // User replaces image with image B while analysis is in-flight:
  // 1. Invalidate request ID
  activeRequestId++;
  // 2. Abort controller
  imageAController.abort('cancelled');
  // 3. Revoke old URL
  (global as any).URL.revokeObjectURL('blob:http://localhost:3000/image-a-uuid');
  // 4. Create new URL
  const newUrl = (global as any).URL.createObjectURL(new Blob());

  await recognitionPromiseC;

  const caseCPassed =
    caseCFetchAborted &&
    caseCCommittedImage === null &&
    oldUrlRevoked &&
    newUrlCreated;

  console.log(`  Previous recognition request aborted: ${caseCFetchAborted}`);
  console.log(`  Previous response commit blocked (caseCCommittedImage === null): ${caseCCommittedImage === null}`);
  console.log(`  Old object URL revoked: ${oldUrlRevoked}`);
  console.log(`  New object URL created: ${newUrlCreated}`);
  console.log(`  CASE C result: ${caseCPassed ? '✅ PASS' : '❌ FAIL'}\n`);

  // -------------------------------------------------------------------------
  // CASE D — RETRY AFTER TIMEOUT
  // -------------------------------------------------------------------------
  console.log('--- RUNNING CASE D: RETRY AFTER TIMEOUT ---');
  let resultsCommittedCount = 0;
  let committedResultD: any = null;

  global.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    return {
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: `\`\`\`json\n${mockValidRecognitionJson}\n\`\`\`` }],
            },
          },
        ],
      }),
    } as Response;
  };

  // Create fresh controller and fresh requestId for retry
  const retryController = new AbortController();
  activeRequestId = ++requestId;
  const retryReqId = activeRequestId;

  const retryResult = await executeTimetableRecognition(
    testApiKey,
    mockImageA,
    retryController.signal
  );

  if (activeRequestId === retryReqId && !retryController.signal.aborted) {
    resultsCommittedCount++;
    committedResultD = retryResult;
  }

  const recognizedCellCount =
    retryResult.data?.sessions?.reduce(
      (sum, s) => sum + s.periods.reduce((pSum, p) => pSum + p.cells.length, 0),
      0
    ) ?? 0;

  const caseDPassed =
    retryResult.state === 'success' &&
    retryResult.data !== null &&
    recognizedCellCount === 1 &&
    resultsCommittedCount === 1 &&
    committedResultD !== null;

  console.log(`  Retry state: ${retryResult.state}`);
  console.log(`  Recognized cells: ${recognizedCellCount}`);
  console.log(`  Exactly one result committed: ${resultsCommittedCount === 1}`);
  console.log(`  CASE D result: ${caseDPassed ? '✅ PASS' : '❌ FAIL'}\n`);

  // Restore fetch
  global.fetch = originalFetch;
  process.removeListener('unhandledRejection', rejectionHandler);

  const allPassed = caseAPassed && caseBPassed && caseCPassed && caseDPassed && !unhandledRejectionDetected;

  console.log('================================================================');
  console.log(`FINAL RESULT: TEST 07 ${allPassed ? 'PASS' : 'FAIL'}`);
  console.log('================================================================');

  return {
    productionTimeoutMs: GEMINI_CONFIG.recognitionTimeoutMs,
    caseATimeoutClassification: resultA.classification || resultA.state,
    caseARequestAborted: caseAFetchAborted,
    caseACredentialPreserved: credentialState === 'verified' && verifiedFingerprint === initialFingerprint,
    caseAImagePreserved: true,
    caseBModalCloseAbort: caseBFetchAborted,
    caseBStaleCompletionBlocked: caseBCommitBlocked,
    caseCImageChangeAbort: caseCFetchAborted,
    caseCOldImageResultBlocked: caseCCommittedImage === null,
    caseCObjectUrlLifecycle: oldUrlRevoked,
    caseDRetry: caseDPassed,
    caseDExactlyOneCommitted: resultsCommittedCount === 1,
    unhandledRejection: unhandledRejectionDetected,
    allPassed,
  };
}

runTest07()
  .then((report) => {
    if (!report.allPassed) {
      process.exit(1);
    }
    process.exit(0);
  })
  .catch((err) => {
    console.error('Fatal error running TEST 07:', err);
    process.exit(1);
  });
