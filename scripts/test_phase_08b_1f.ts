/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Phase 08B-1F: AI Import Final Hardening & Release Gate Test Suite
 */

import {
  extractJsonCandidate,
  validateAndSanitizeRecognitionResponse,
  calculateRecognitionSummary,
  sanitizeString,
  validateConfidence,
} from '../src/services/timetableRecognitionValidator';
import {
  createReviewDraft,
  updateReviewCell,
  confirmReviewCell,
  restoreReviewCell,
  restoreAllReview,
  calculateReviewSummary,
  isCellNeedsReview,
  isReviewReady,
} from '../src/services/timetableReviewService';
import {
  buildTimetableApplyPlan,
  classifyCellChange,
  calculateApplySummary,
  applyPlanToDocumentState,
  createDefaultApplyOptions,
} from '../src/services/timetableApplyService';
import { timetableReducer, initialTimetableState } from '../src/reducer/timetableReducer';
import { historyReducer, HistoryState } from '../src/context/TimetableContext';
import { TimetableRecognitionResult } from '../src/types/timetableRecognition';
import { TimetableState } from '../src/types/timetable';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`PASS: ${message}`);
}

console.log('====================================================');
console.log('STARTING PHASE 08B-1F HARDENING & VERIFICATION TESTS');
console.log('====================================================\n');

// ----------------------------------------------------
// SECTION 1: JSON PARSER & RESILIENCE TESTS
// ----------------------------------------------------
console.log('--- 1. JSON Parser & Sanitization Resilience ---');

// Test 1.1: Empty string
const resEmpty = validateAndSanitizeRecognitionResponse('', {
  model: 'test',
  analyzedAt: new Date().toISOString(),
  imageWidth: 800,
  imageHeight: 600,
  rotationApplied: 0,
  durationMs: 100,
});
assert(resEmpty.valid === false, 'Test 1.1: Empty string is caught as invalid');
assert(resEmpty.error?.includes('rỗng') === true, 'Test 1.1: Error clearly indicates empty response');

// Test 1.2: Truncated JSON
const truncatedJson = '{"schemaVersion": "1.0", "days": [{"dayKey": "monday", "label": "Thứ 2"';
const resTrunc = validateAndSanitizeRecognitionResponse(truncatedJson, {
  model: 'test',
  analyzedAt: new Date().toISOString(),
  imageWidth: 800,
  imageHeight: 600,
  rotationApplied: 0,
  durationMs: 100,
});
assert(resTrunc.valid === false, 'Test 1.2: Truncated JSON rejected cleanly');
assert(resTrunc.error?.includes('cắt ngắn') === true, 'Test 1.2: Error message explains truncated JSON');

// Test 1.3: Markdown code fence with conversational prose before and after
const proseWithFencedJson = `
Xin chào, đây là kết quả trích xuất thời khóa biểu của bạn:
\`\`\`json
{
  "schemaVersion": "1.0",
  "documentType": "school_timetable",
  "language": "vi",
  "overallConfidence": 0.95,
  "sourceSummary": {
    "title": "TKB Lớp 10A1",
    "schoolName": "THPT Lê Quý Đôn",
    "className": "10A1"
  },
  "days": [
    { "dayKey": "monday", "label": "Thứ 2", "confidence": 0.98 },
    { "dayKey": "tuesday", "label": "Thứ 3", "confidence": 0.95 }
  ],
  "sessions": [
    {
      "sessionKey": "morning",
      "label": "Buổi sáng",
      "confidence": 0.96,
      "periods": [
        {
          "periodNumber": 1,
          "cells": [
            { "dayKey": "monday", "status": "recognized", "subjectRaw": "Toán", "confidence": 0.95 },
            { "dayKey": "tuesday", "status": "empty", "confidence": 0.99 }
          ]
        }
      ]
    }
  ],
  "warnings": []
}
\`\`\`
Hy vọng dữ liệu này chính xác. Chúc bạn học tốt!
`;

const resProse = validateAndSanitizeRecognitionResponse(proseWithFencedJson, {
  model: 'test',
  analyzedAt: new Date().toISOString(),
  imageWidth: 800,
  imageHeight: 600,
  rotationApplied: 0,
  durationMs: 100,
});
assert(resProse.valid === true, 'Test 1.3: Prose with markdown fence extracted successfully');
assert(resProse.data?.sourceSummary.title === 'TKB Lớp 10A1', 'Test 1.3: Title extracted accurately');
assert(resProse.data?.days.length === 2, 'Test 1.3: Days parsed accurately');

// Test 1.4: HTML and control character sanitization
const dirtyString = '<script>alert("hack")</script><b>Môn Toán</b>\u0000\u0007';
const sanitized = sanitizeString(dirtyString, 50);
assert(sanitized === 'Môn Toán', `Test 1.4: HTML & non-printable chars stripped properly (got "${sanitized}")`);

// Test 1.5: Confidence clamping
assert(validateConfidence(1.5) === 1, 'Test 1.5: Upper bound clamped to 1');
assert(validateConfidence(-0.5) === 0, 'Test 1.5: Lower bound clamped to 0');
assert(validateConfidence(NaN) === 0.5, 'Test 1.5: NaN falls back to 0.5');
assert(validateConfidence(0.854) === 0.85, 'Test 1.5: Rounds to 2 decimal places');

// Test 1.6: Excessive days / periods limits
const excessiveDaysJson = JSON.stringify({
  schemaVersion: '1.0',
  days: [
    { dayKey: 'monday' },
    { dayKey: 'tuesday' },
    { dayKey: 'wednesday' },
    { dayKey: 'thursday' },
    { dayKey: 'friday' },
    { dayKey: 'saturday' },
    { dayKey: 'sunday' },
    { dayKey: 'unknown' }, // 8 days > MAX_DAYS (7)
  ],
  sessions: [],
});
const resExcessive = validateAndSanitizeRecognitionResponse(excessiveDaysJson, {
  model: 'test',
  analyzedAt: new Date().toISOString(),
  imageWidth: 800,
  imageHeight: 600,
  rotationApplied: 0,
  durationMs: 100,
});
assert(resExcessive.valid === false, 'Test 1.6: Excessive days rejected by safety ceiling');

// ----------------------------------------------------
// SECTION 2: REVIEW GATE HARDENING
// ----------------------------------------------------
console.log('\n--- 2. Review Gate & Readiness Hardening ---');

const baseResult: TimetableRecognitionResult = {
  schemaVersion: '1.0',
  documentType: 'school_timetable',
  language: 'vi',
  overallConfidence: 0.9,
  sourceSummary: {
    title: 'TKB Thử Nghiệm',
    schoolName: 'Trường A',
    className: '12A',
    studentName: null,
    schoolYear: '2025-2026',
  },
  days: [
    { dayKey: 'monday', label: 'Thứ 2', confidence: 0.95 },
    { dayKey: 'tuesday', label: 'Thứ 3', confidence: 0.95 },
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
            { dayKey: 'monday', status: 'uncertain', subjectRaw: 'Lý?', subjectNormalized: 'Lý?', confidence: 0.65 },
            { dayKey: 'tuesday', status: 'recognized', subjectRaw: 'Hóa', subjectNormalized: 'Hóa học', confidence: 0.70 }, // Low confidence (<0.80)
          ],
        },
        {
          periodNumber: 2,
          cells: [
            { dayKey: 'monday', status: 'unreadable', subjectRaw: null, subjectNormalized: null, confidence: 0.20 },
            { dayKey: 'tuesday', status: 'recognized', subjectRaw: 'Văn', subjectNormalized: 'Ngữ văn', confidence: 0.92 }, // High confidence
          ],
        },
      ],
    },
  ],
  warnings: [],
  recognitionMeta: {
    model: 'gemini-3.8-flash',
    analyzedAt: new Date().toISOString(),
    imageWidth: 1000,
    imageHeight: 800,
    rotationApplied: 0,
    durationMs: 200,
  },
};

let draft = createReviewDraft(baseResult);
assert(!isReviewReady(draft), 'Test 2.1: Draft with uncertain, unreadable, and low-confidence cells is NOT ready');
assert(draft.reviewMeta.unresolvedCellCount === 3, `Test 2.1: Exactly 3 unresolved cells detected (got ${draft.reviewMeta.unresolvedCellCount})`);

// Resolve cell 1: 'uncertain' cell -> user confirms as 'recognized' with 'Vật lý'
draft = updateReviewCell(draft, 'morning_1_monday', { status: 'recognized', subject: 'Vật lý' });
assert(draft.reviewMeta.unresolvedCellCount === 2, 'Test 2.2: Resolving uncertain cell drops unresolved count to 2');

// Resolve cell 2: 'unreadable' cell -> user marks as 'empty'
draft = updateReviewCell(draft, 'morning_2_monday', { status: 'empty', subject: null });
assert(draft.reviewMeta.unresolvedCellCount === 1, 'Test 2.3: Marking unreadable as empty drops unresolved count to 1');

// Resolve cell 3: low confidence cell -> user confirms without text edit
draft = confirmReviewCell(draft, 'morning_1_tuesday');
assert(draft.reviewMeta.unresolvedCellCount === 0, 'Test 2.4: Confirming low-confidence cell drops unresolved count to 0');
assert(isReviewReady(draft), 'Test 2.5: Draft is now ready for Apply');

// Test 2.6: Restore single cell
draft = restoreReviewCell(draft, 'morning_1_monday');
assert(!isReviewReady(draft), 'Test 2.6: Restoring single cell brings back unresolved status');
assert(draft.cells['morning_1_monday'].current.status === 'uncertain', 'Test 2.6: Restored cell status matches original');

// Test 2.7: Restore all
draft = restoreAllReview(baseResult);
assert(draft.reviewMeta.unresolvedCellCount === 3, 'Test 2.7: Restore all resets entire draft to original');

// ----------------------------------------------------
// SECTION 3: APPLY PLANNING, STRATEGIES & CONFLICTS
// ----------------------------------------------------
console.log('\n--- 3. Apply Planning & Strategy Execution ---');

// Prepare ready draft for apply
draft = updateReviewCell(draft, 'morning_1_monday', { status: 'recognized', subject: 'Vật lý' });
draft = updateReviewCell(draft, 'morning_2_monday', { status: 'empty', subject: null });
draft = confirmReviewCell(draft, 'morning_1_tuesday');
assert(isReviewReady(draft), 'Draft verified ready for apply plan testing');

const dummyCurrentState: TimetableState = {
  ...initialTimetableState,
  meta: {
    ...initialTimetableState.meta,
    schoolName: 'Trường Ban Đầu',
  },
  config: {
    ...initialTimetableState.config,
    activeDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    morningPeriods: 5,
    afternoonPeriods: 4,
    afternoonEnabled: true,
  },
  schedule: {
    ...initialTimetableState.schedule,
    monday: {
      morning: {
        periods: [
          { subjectId: 'math', customLabel: 'Toán Học' }, // Existing content in period 1
          {},
          {},
          {},
          {},
        ],
      },
      afternoon: { periods: [{}, {}, {}, {}] },
    },
  },
};

// Strategy A: 'fill_empty_only' -> Existing cell 'Toán Học' on monday period 1 MUST NOT be overwritten
const optionsFill = createDefaultApplyOptions(draft);
optionsFill.cellStrategy = 'fill_empty_only';
const planFill = buildTimetableApplyPlan(dummyCurrentState, draft, optionsFill);

assert(planFill.isValid, 'Test 3.1: Apply plan is valid');
const monPeriod1Change = planFill.cellChanges.find((c) => c.cellId === 'morning_1_monday');
assert(monPeriod1Change !== undefined, 'Test 3.1: Change exists for morning_1_monday');
assert(monPeriod1Change?.classification === 'skip', 'Test 3.1: Existing cell skipped under fill_empty_only');
assert(monPeriod1Change?.finalSubject === 'Toán Học', 'Test 3.1: Existing cell content preserved');

// Strategy B: 'replace_all' -> Existing cell IS replaced by 'Vật lý'
const optionsReplace = { ...optionsFill, cellStrategy: 'replace_all' as const };
const planReplace = buildTimetableApplyPlan(dummyCurrentState, draft, optionsReplace);
const monPeriod1Replace = planReplace.cellChanges.find((c) => c.cellId === 'morning_1_monday');
assert(monPeriod1Replace?.classification === 'replace', 'Test 3.2: Cell classified as replace under replace_all');
assert(monPeriod1Replace?.finalSubject === 'Vật lý', 'Test 3.2: Replaced subject matches AI result');

// ----------------------------------------------------
// SECTION 4: ATOMIC COMMIT & SINGLE-STEP UNDO/REDO
// ----------------------------------------------------
console.log('\n--- 4. Atomic Commit & History Safety ---');

const nextState = applyPlanToDocumentState(dummyCurrentState, planReplace);

// Initialize history state
let historyState: HistoryState = {
  past: [],
  present: dummyCurrentState,
  future: [],
};

// Dispatch import action to history reducer
historyState = historyReducer(historyState, {
  type: 'APPLY_TIMETABLE_IMPORT',
  payload: { nextState },
});

assert(historyState.past.length === 1, 'Test 4.1: Exactly 1 entry pushed to undo history');
assert(historyState.future.length === 0, 'Test 4.2: Redo stack is empty');
assert(
  historyState.present.schedule.monday.morning.periods[0].customLabel === 'Vật lý',
  'Test 4.3: Present state contains newly applied timetable data'
);

// Undo action
historyState = historyReducer(historyState, { type: 'UNDO' });
assert(historyState.past.length === 0, 'Test 4.4: Past stack empty after single undo');
assert(historyState.future.length === 1, 'Test 4.5: Future stack has 1 entry for redo');
assert(
  historyState.present.schedule.monday.morning.periods[0].customLabel === 'Toán Học',
  'Test 4.6: Single UNDO restores original state perfectly'
);

// Redo action
historyState = historyReducer(historyState, { type: 'REDO' });
assert(historyState.past.length === 1, 'Test 4.7: Past stack has 1 entry after redo');
assert(historyState.future.length === 0, 'Test 4.8: Future stack empty after redo');
assert(
  historyState.present.schedule.monday.morning.periods[0].customLabel === 'Vật lý',
  'Test 4.9: Single REDO re-applies imported state perfectly'
);

// ----------------------------------------------------
// SECTION 5: PRIVACY & PERSISTENCE SAFETY
// ----------------------------------------------------
console.log('\n--- 5. Privacy & Persistence Verification ---');

// Verify that TimetableState document schema has NO transient AI fields
const stateKeys = Object.keys(historyState.present);
assert(!stateKeys.includes('apiKey'), 'Test 5.1: No apiKey in document state');
assert(!stateKeys.includes('imageBlob'), 'Test 5.2: No imageBlob in document state');
assert(!stateKeys.includes('imageUrl'), 'Test 5.3: No imageUrl in document state');
assert(!stateKeys.includes('reviewDraft'), 'Test 5.4: No reviewDraft in document state');
assert(!stateKeys.includes('recognitionResult'), 'Test 5.5: No recognitionResult in document state');

// Verify metadata has only allowed fields
const metaKeys = Object.keys(historyState.present.meta);
const allowedMeta = ['title', 'schoolName', 'className', 'studentName', 'schoolYear', 'grade', 'customGrade'];
for (const key of metaKeys) {
  assert(allowedMeta.includes(key), `Test 5.6: Meta field "${key}" is an authorized document field`);
}

console.log('\n====================================================');
console.log('ALL PHASE 08B-1F HARDENING & VERIFICATION TESTS PASS!');
console.log('====================================================\n');
