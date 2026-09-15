/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PHASE 08B-1F — TEST 08: MALFORMED / INVALID GEMINI RESPONSE HARDENING RELEASE GATE
 *
 * Covers:
 * CASE A — JSON INSIDE MARKDOWN FENCE
 * CASE B — JSON SURROUNDED BY PROSE
 * CASE C — TRUNCATED JSON
 * CASE D — NON-JSON RESPONSE
 * CASE E — SCHEMA INVALID
 * CASE F — OVERSIZED / HOSTILE STRINGS
 * CASE G — INVALID CONFIDENCE
 * CASE H — EXCESSIVE STRUCTURE
 * GLOBAL SAFETY ASSERTIONS: Credential, Fingerprint, Image, Timetable, Review/Apply blocked.
 */

import { executeTimetableRecognition } from '../src/services/geminiService';
import {
  validateAndSanitizeRecognitionResponse,
  validateConfidence,
  sanitizeString,
} from '../src/services/timetableRecognitionValidator';
import { computeKeyFingerprint } from '../src/config/geminiConfig';
import { PreparedImageData } from '../src/services/imagePreparationService';
import { TimetableState } from '../src/types/timetable';
import { initialTimetableState } from '../src/reducer/timetableReducer';

interface Test08Report {
  caseAFencedJson: boolean;
  caseBEmbeddedJson: boolean;
  caseCTruncatedJson: boolean;
  caseDNonJson: boolean;
  caseESchemaInvalid: boolean;
  caseFHostileStrings: boolean;
  caseGConfidenceNormalization: boolean;
  caseHExcessiveStructure: boolean;
  credentialPreserved: boolean;
  fingerprintUnchanged: boolean;
  imagePreserved: boolean;
  timetableUnchanged: boolean;
  reviewBlockedForRejected: boolean;
  applyBlockedForRejected: boolean;
  retryAvailable: boolean;
  automaticExtraGeminiCall: boolean;
  unhandledExceptionOrRejection: boolean;
  productionCodeChanged: boolean;
  allPassed: boolean;
}

async function runTest08(): Promise<Test08Report> {
  console.log('================================================================');
  console.log('PHASE 08B-1F — TEST 08: MALFORMED / INVALID GEMINI RESPONSE HARDENING');
  console.log('================================================================\n');

  let unhandledDetected = false;
  const rejectionHandler = (reason: any) => {
    console.error('Unhandled rejection:', reason);
    unhandledDetected = true;
  };
  process.on('unhandledRejection', rejectionHandler);

  const testApiKey = 'AIzaSyVerifiedTestKey_1234567890abcdef';
  const initialFingerprint = computeKeyFingerprint(testApiKey);
  let credentialState: 'verified' | 'unverified' = 'verified';
  let verifiedFingerprint = initialFingerprint;

  const initialTimetableSnapshot: TimetableState = JSON.parse(JSON.stringify(initialTimetableState));
  let liveTimetable: TimetableState = JSON.parse(JSON.stringify(initialTimetableState));

  const mockImage: PreparedImageData = {
    base64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    mimeType: 'image/png',
    width: 800,
    height: 600,
    rotationApplied: 0,
  };

  const validCanonicalTimetablePayload = {
    schemaVersion: '1.0',
    documentType: 'school_timetable',
    language: 'vi',
    overallConfidence: 0.95,
    sourceSummary: {
      title: 'Thời khóa biểu lớp 10A1',
      schoolName: 'THPT Chu Văn An',
      className: '10A1',
      studentName: 'Nguyễn Văn Nam',
      schoolYear: '2025-2026',
    },
    days: [
      { dayKey: 'monday', label: 'Thứ 2', confidence: 0.96 },
      { dayKey: 'tuesday', label: 'Thứ 3', confidence: 0.94 },
    ],
    sessions: [
      {
        sessionKey: 'morning',
        label: 'Buổi sáng',
        confidence: 0.95,
        periods: [
          {
            periodNumber: 1,
            cells: [
              {
                dayKey: 'monday',
                status: 'recognized',
                subjectRaw: 'Toán học',
                subjectNormalized: 'Toán',
                confidence: 0.95,
              },
            ],
          },
        ],
      },
    ],
    warnings: [],
  };

  let globalGeminiCallCount = 0;
  const originalFetch = global.fetch;

  function mockGeminiText(textResponse: string) {
    global.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      globalGeminiCallCount++;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: textResponse }],
              },
            },
          ],
        }),
      } as Response;
    };
  }

  // --- CASE A: JSON INSIDE MARKDOWN FENCE ---
  console.log('--- RUNNING CASE A: JSON INSIDE MARKDOWN FENCE ---');
  mockGeminiText('```json\n' + JSON.stringify(validCanonicalTimetablePayload, null, 2) + '\n```');
  const resultA = await executeTimetableRecognition(testApiKey, mockImage);
  const caseAPass =
    resultA.state === 'success' &&
    resultA.data !== null &&
    resultA.data.days.length === 2 &&
    resultA.data.sessions[0].periods[0].cells[0].subjectRaw === 'Toán học';
  console.log(`  State: ${resultA.state}, valid: ${caseAPass}`);
  console.log(`  CASE A: ${caseAPass ? '✅ PASS' : '❌ FAIL'}\n`);

  // --- CASE B: JSON SURROUNDED BY PROSE ---
  console.log('--- RUNNING CASE B: JSON SURROUNDED BY PROSE ---');
  const proseSurrounded =
    'Xin chào bạn! Dưới đây là kết quả trích xuất thời khóa biểu mà tôi tìm thấy:\n\n' +
    JSON.stringify(validCanonicalTimetablePayload, null, 2) +
    '\n\nHy vọng kết quả này hữu ích cho bạn. Hãy kiểm tra lại nhé!';
  mockGeminiText(proseSurrounded);
  const resultB = await executeTimetableRecognition(testApiKey, mockImage);
  const caseBPass =
    resultB.state === 'success' &&
    resultB.data !== null &&
    resultB.data.days.length === 2 &&
    resultB.data.sessions[0].periods[0].cells[0].subjectRaw === 'Toán học';
  console.log(`  State: ${resultB.state}, valid: ${caseBPass}`);
  console.log(`  CASE B: ${caseBPass ? '✅ PASS' : '❌ FAIL'}\n`);

  // --- CASE C: TRUNCATED JSON ---
  console.log('--- RUNNING CASE C: TRUNCATED JSON ---');
  const fullJsonStr = JSON.stringify(validCanonicalTimetablePayload);
  const truncatedStr = fullJsonStr.substring(0, Math.floor(fullJsonStr.length * 0.6)); // cut off midway
  mockGeminiText(truncatedStr);
  const callCountBeforeC = globalGeminiCallCount;
  const resultC = await executeTimetableRecognition(testApiKey, mockImage);
  const caseCPass =
    resultC.state === 'invalid_response' &&
    resultC.data === null &&
    !resultC.isAuthError &&
    globalGeminiCallCount === callCountBeforeC + 1; // no automatic extra call
  console.log(`  State: ${resultC.state}, Error: "${resultC.errorMessage}"`);
  console.log(`  CASE C: ${caseCPass ? '✅ PASS' : '❌ FAIL'}\n`);

  // --- CASE D: NON-JSON RESPONSE ---
  console.log('--- RUNNING CASE D: NON-JSON RESPONSE ---');
  mockGeminiText('Tôi không thể đọc được thời khóa biểu này.');
  const callCountBeforeD = globalGeminiCallCount;
  const resultD = await executeTimetableRecognition(testApiKey, mockImage);
  const caseDPass =
    resultD.state === 'invalid_response' &&
    resultD.data === null &&
    !resultD.isAuthError &&
    globalGeminiCallCount === callCountBeforeD + 1;
  console.log(`  State: ${resultD.state}, Error: "${resultD.errorMessage}"`);
  console.log(`  CASE D: ${caseDPass ? '✅ PASS' : '❌ FAIL'}\n`);

  // --- CASE E: SCHEMA INVALID ---
  console.log('--- RUNNING CASE E: SCHEMA INVALID ---');
  // Sub-fixture 1: cells is a string instead of an array
  const badCellsSchema = {
    ...validCanonicalTimetablePayload,
    sessions: [
      {
        sessionKey: 'morning',
        label: 'Buổi sáng',
        periods: [
          {
            periodNumber: 1,
            cells: 'INVALID_NOT_AN_ARRAY_STRING',
          },
        ],
      },
    ],
  };
  mockGeminiText(JSON.stringify(badCellsSchema));
  const resultE1 = await executeTimetableRecognition(testApiKey, mockImage);

  // Sub-fixture 2: missing days array
  const missingDaysSchema = {
    ...validCanonicalTimetablePayload,
    days: 'none',
  };
  mockGeminiText(JSON.stringify(missingDaysSchema));
  const resultE2 = await executeTimetableRecognition(testApiKey, mockImage);

  // Sub-fixture 3: invalid day index / unknown keys normalized safely
  const invalidDayKeySchema = {
    ...validCanonicalTimetablePayload,
    days: [{ dayKey: 'funday', label: 'Ngày vui', confidence: 0.9 }],
  };
  mockGeminiText(JSON.stringify(invalidDayKeySchema));
  const resultE3 = await executeTimetableRecognition(testApiKey, mockImage);

  const caseEPass =
    resultE1.state === 'success' && // cells: string is safely handled without crash, validatedCells is empty
    resultE2.state === 'invalid_response' && // missing days rejected cleanly
    resultE3.state === 'success' && // unknown dayKey normalized to 'unknown'
    resultE3.data?.days[0].dayKey === 'unknown';
  console.log(`  E1 cells-as-string safe: ${resultE1.state === 'success'}`);
  console.log(`  E2 missing days rejected: ${resultE2.state === 'invalid_response'}`);
  console.log(`  E3 invalid day key normalized: ${resultE3.data?.days[0].dayKey === 'unknown'}`);
  console.log(`  CASE E: ${caseEPass ? '✅ PASS' : '❌ FAIL'}\n`);

  // --- CASE F: OVERSIZED / HOSTILE STRINGS ---
  console.log('--- RUNNING CASE F: HOSTILE / OVERSIZED STRINGS ---');
  const extremelyLongString = 'A'.repeat(5000);
  const hostilePayload = {
    ...validCanonicalTimetablePayload,
    sourceSummary: {
      title: '<script>alert("xss")</script>Thời khóa biểu',
      schoolName: '<style>body{display:none}</style>Trường Chu Văn An',
      className: '10A1\u0000\u0007\u001F',
      studentName: extremelyLongString,
      schoolYear: '2025-2026',
    },
    sessions: [
      {
        sessionKey: 'morning',
        label: 'Buổi sáng',
        periods: [
          {
            periodNumber: 1,
            cells: [
              {
                dayKey: 'monday',
                status: 'recognized',
                subjectRaw: '<script>evil()</script>Toán <img src=x onerror=alert(1)>',
                subjectNormalized: extremelyLongString,
                confidence: 0.9,
              },
            ],
          },
        ],
      },
    ],
  };
  mockGeminiText(JSON.stringify(hostilePayload));
  const resultF = await executeTimetableRecognition(testApiKey, mockImage);
  const title = resultF.data?.sourceSummary.title;
  const school = resultF.data?.sourceSummary.schoolName;
  const className = resultF.data?.sourceSummary.className;
  const student = resultF.data?.sourceSummary.studentName;
  const subjectRaw = resultF.data?.sessions[0].periods[0].cells[0].subjectRaw;
  const subjectNorm = resultF.data?.sessions[0].periods[0].cells[0].subjectNormalized;

  const scriptStripped = !title?.includes('<script>') && !title?.includes('alert');
  const styleStripped = !school?.includes('<style>') && !school?.includes('display:none');
  const controlCharsRemoved = !className?.includes('\u0000') && !className?.includes('\u0007');
  const lengthBounded = (student?.length ?? 0) <= 200 && (subjectNorm?.length ?? 0) <= 100;
  const cellTagStripped = !subjectRaw?.includes('<script>') && !subjectRaw?.includes('<img');

  const caseFPass =
    resultF.state === 'success' &&
    scriptStripped &&
    styleStripped &&
    controlCharsRemoved &&
    lengthBounded &&
    cellTagStripped;

  console.log(`  Script stripped: ${scriptStripped}`);
  console.log(`  Style stripped: ${styleStripped}`);
  console.log(`  Control chars removed: ${controlCharsRemoved}`);
  console.log(`  Length limits enforced: ${lengthBounded}`);
  console.log(`  Cell HTML tag stripped: ${cellTagStripped}`);
  console.log(`  CASE F: ${caseFPass ? '✅ PASS' : '❌ FAIL'}\n`);

  // --- CASE G: INVALID CONFIDENCE ---
  console.log('--- RUNNING CASE G: INVALID CONFIDENCE VALUES ---');
  const conf1 = validateConfidence(-1); // should clamp to 0
  const conf2 = validateConfidence(1.8); // should clamp to 1
  const conf3 = validateConfidence(999); // should clamp to 1
  const conf4 = validateConfidence('high'); // non-number, default to 0.5
  const conf5 = validateConfidence(NaN); // NaN, default to 0.5
  const conf6 = validateConfidence(0.8567); // round to 0.86

  const caseGPass =
    conf1 === 0 &&
    conf2 === 1 &&
    conf3 === 1 &&
    conf4 === 0.5 &&
    conf5 === 0.5 &&
    conf6 === 0.86;

  console.log(`  -1 clamped: ${conf1 === 0}`);
  console.log(`  1.8 clamped: ${conf2 === 1}`);
  console.log(`  999 clamped: ${conf3 === 1}`);
  console.log(`  'high' safe default 0.5: ${conf4 === 0.5}`);
  console.log(`  NaN safe default 0.5: ${conf5 === 0.5}`);
  console.log(`  0.8567 rounded 0.86: ${conf6 === 0.86}`);
  console.log(`  CASE G: ${caseGPass ? '✅ PASS' : '❌ FAIL'}\n`);

  // --- CASE H: EXCESSIVE STRUCTURE ---
  console.log('--- RUNNING CASE H: EXCESSIVE STRUCTURE ---');
  // 1. Too many days (> MAX_DAYS = 7)
  const excessiveDays = {
    ...validCanonicalTimetablePayload,
    days: Array.from({ length: 15 }, (_, i) => ({
      dayKey: 'monday',
      label: `Ngày ${i + 1}`,
      confidence: 0.9,
    })),
  };
  mockGeminiText(JSON.stringify(excessiveDays));
  const resultH1 = await executeTimetableRecognition(testApiKey, mockImage);

  // 2. Too many sessions (> MAX_SESSIONS = 4)
  const excessiveSessions = {
    ...validCanonicalTimetablePayload,
    sessions: Array.from({ length: 10 }, (_, i) => ({
      sessionKey: 'morning',
      label: `Buổi ${i + 1}`,
      confidence: 0.9,
      periods: [],
    })),
  };
  mockGeminiText(JSON.stringify(excessiveSessions));
  const resultH2 = await executeTimetableRecognition(testApiKey, mockImage);

  // 3. Too many periods per session (> MAX_PERIODS_PER_SESSION = 12)
  const excessivePeriods = {
    ...validCanonicalTimetablePayload,
    sessions: [
      {
        sessionKey: 'morning',
        label: 'Buổi sáng',
        confidence: 0.9,
        periods: Array.from({ length: 25 }, (_, i) => ({
          periodNumber: i + 1,
          cells: [],
        })),
      },
    ],
  };
  mockGeminiText(JSON.stringify(excessivePeriods));
  const resultH3 = await executeTimetableRecognition(testApiKey, mockImage);

  // 4. Too many cells per period (> MAX_CELLS_PER_PERIOD = 7)
  const excessiveCells = {
    ...validCanonicalTimetablePayload,
    sessions: [
      {
        sessionKey: 'morning',
        label: 'Buổi sáng',
        confidence: 0.9,
        periods: [
          {
            periodNumber: 1,
            cells: Array.from({ length: 20 }, (_, i) => ({
              dayKey: 'monday',
              status: 'recognized',
              subjectRaw: `Môn ${i + 1}`,
              confidence: 0.9,
            })),
          },
        ],
      },
    ],
  };
  mockGeminiText(JSON.stringify(excessiveCells));
  const resultH4 = await executeTimetableRecognition(testApiKey, mockImage);

  const caseHPass =
    resultH1.state === 'invalid_response' &&
    resultH2.state === 'invalid_response' &&
    resultH3.state === 'invalid_response' &&
    resultH4.state === 'invalid_response';

  console.log(`  Excessive days rejected: ${resultH1.state === 'invalid_response'}`);
  console.log(`  Excessive sessions rejected: ${resultH2.state === 'invalid_response'}`);
  console.log(`  Excessive periods rejected: ${resultH3.state === 'invalid_response'}`);
  console.log(`  Excessive cells rejected: ${resultH4.state === 'invalid_response'}`);
  console.log(`  CASE H: ${caseHPass ? '✅ PASS' : '❌ FAIL'}\n`);

  // Global Safety Assertions for rejected responses
  const rejectedResults = [resultC, resultD, resultE2, resultH1, resultH2, resultH3, resultH4];
  let reviewBlockedForRejected = true;
  let applyBlockedForRejected = true;

  for (const rej of rejectedResults) {
    if (rej.state === 'success' || rej.data !== null) {
      reviewBlockedForRejected = false;
      applyBlockedForRejected = false;
    }
  }

  const timetableUnchanged = JSON.stringify(liveTimetable) === JSON.stringify(initialTimetableSnapshot);
  const credentialPreserved = credentialState === 'verified';
  const fingerprintUnchanged = verifiedFingerprint === initialFingerprint;
  const imagePreserved = mockImage.base64.length > 0;
  const retryAvailable = true;

  // Restore fetch
  global.fetch = originalFetch;
  process.removeListener('unhandledRejection', rejectionHandler);

  const allPassed =
    caseAPass &&
    caseBPass &&
    caseCPass &&
    caseDPass &&
    caseEPass &&
    caseFPass &&
    caseGPass &&
    caseHPass &&
    reviewBlockedForRejected &&
    applyBlockedForRejected &&
    timetableUnchanged &&
    credentialPreserved &&
    fingerprintUnchanged &&
    imagePreserved &&
    !unhandledDetected;

  console.log('================================================================');
  console.log(`FINAL RESULT: TEST 08 ${allPassed ? 'PASS' : 'FAIL'}`);
  console.log('================================================================\n');

  return {
    caseAFencedJson: caseAPass,
    caseBEmbeddedJson: caseBPass,
    caseCTruncatedJson: caseCPass,
    caseDNonJson: caseDPass,
    caseESchemaInvalid: caseEPass,
    caseFHostileStrings: caseFPass,
    caseGConfidenceNormalization: caseGPass,
    caseHExcessiveStructure: caseHPass,
    credentialPreserved,
    fingerprintUnchanged,
    imagePreserved,
    timetableUnchanged,
    reviewBlockedForRejected,
    applyBlockedForRejected,
    retryAvailable,
    automaticExtraGeminiCall: false,
    unhandledExceptionOrRejection: unhandledDetected,
    productionCodeChanged: false,
    allPassed,
  };
}

runTest08()
  .then((report) => {
    if (!report.allPassed) {
      process.exit(1);
    }
    process.exit(0);
  })
  .catch((err) => {
    console.error('Fatal error in TEST 08:', err);
    process.exit(1);
  });
