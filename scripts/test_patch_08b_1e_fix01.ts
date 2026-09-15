/**
 * Regression fixture verification script for PATCH 08B-1E-FIX01
 * Verifies Occupied -> AI Empty clear behavior, classification, and safety guards.
 */

import {
  classifyCellChange,
  calculateApplySummary,
  applyPlanToDocumentState,
  buildTimetableApplyPlan,
} from '../src/services/timetableApplyService';
import { TimetableState } from '../src/types/timetable';
import { TimetableReviewDraft } from '../src/types/timetableReview';
import { initialTimetableState } from '../src/reducer/timetableReducer';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`PASS: ${message}`);
}

console.log('=== TEST PATCH 08B-1E-FIX01: OCCUPIED -> AI EMPTY CLEAR BEHAVIOR ===\n');

// Standard Reproduction Setup:
// current timetable cell: Thứ 6 / Buổi sáng / Tiết 5 = "Toán"
// reviewed AI cell: EMPTY (null)
const cellId = 'morning_5_friday';
const currentSubject = 'Toán';
const reviewSubject = null; // empty

// -------------------------------------------------------------
// Test Matrix 1: Global Strategy combinations with auto override
// -------------------------------------------------------------

console.log('--- 1. Verification of Required Clear Logic Matrix ---');

// 1. fill_empty_only + clear OFF -> KEEP
const c1 = classifyCellChange(
  cellId, 'friday', 'morning', 5, 4,
  currentSubject, reviewSubject,
  'fill_empty_only', false, 'auto'
);
assert(c1.classification === 'skip', '1. fill_empty_only + clear OFF: classification === skip');
assert(c1.finalSubject === 'Toán', '1. fill_empty_only + clear OFF: finalSubject === Toán (KEEP)');
assert(c1.currentValue === 'Toán', '1. fill_empty_only + clear OFF: currentValue === Toán');
assert(c1.reviewValue === null, '1. fill_empty_only + clear OFF: reviewValue === null (empty)');
assert(c1.resultValue === 'Toán', '1. fill_empty_only + clear OFF: resultValue === Toán');
assert(c1.isConflict === true, '1. fill_empty_only + clear OFF: isConflict === true');

// 2. fill_empty_only + clear ON -> KEEP (Never clear under fill_empty_only)
const c2 = classifyCellChange(
  cellId, 'friday', 'morning', 5, 4,
  currentSubject, reviewSubject,
  'fill_empty_only', true, 'auto'
);
assert(c2.classification === 'skip', '2. fill_empty_only + clear ON: classification === skip');
assert(c2.finalSubject === 'Toán', '2. fill_empty_only + clear ON: finalSubject === Toán (KEEP)');
assert(c2.currentValue === 'Toán', '2. fill_empty_only + clear ON: currentValue === Toán');
assert(c2.reviewValue === null, '2. fill_empty_only + clear ON: reviewValue === null (empty)');
assert(c2.resultValue === 'Toán', '2. fill_empty_only + clear ON: resultValue === Toán');
assert(c2.isConflict === true, '2. fill_empty_only + clear ON: isConflict === true');

// 3. prefer_image + clear OFF -> KEEP
const c3 = classifyCellChange(
  cellId, 'friday', 'morning', 5, 4,
  currentSubject, reviewSubject,
  'prefer_image', false, 'auto'
);
assert(c3.classification === 'skip', '3. prefer_image + clear OFF: classification === skip');
assert(c3.finalSubject === 'Toán', '3. prefer_image + clear OFF: finalSubject === Toán (KEEP)');
assert(c3.currentValue === 'Toán', '3. prefer_image + clear OFF: currentValue === Toán');
assert(c3.reviewValue === null, '3. prefer_image + clear OFF: reviewValue === null (empty)');
assert(c3.resultValue === 'Toán', '3. prefer_image + clear OFF: resultValue === Toán');
assert(c3.isConflict === true, '3. prefer_image + clear OFF: isConflict === true');

// 4. prefer_image + clear ON -> CLEAR
const c4 = classifyCellChange(
  cellId, 'friday', 'morning', 5, 4,
  currentSubject, reviewSubject,
  'prefer_image', true, 'auto'
);
assert(c4.classification === 'clear_conflict', '4. prefer_image + clear ON: classification === clear_conflict (CLEAR)');
assert(c4.finalSubject === null, '4. prefer_image + clear ON: finalSubject === null (CLEAR)');
assert(c4.currentValue === 'Toán', '4. prefer_image + clear ON: currentValue === Toán');
assert(c4.reviewValue === null, '4. prefer_image + clear ON: reviewValue === null (empty)');
assert(c4.resultValue === null, '4. prefer_image + clear ON: resultValue === null (CLEAR)');
assert(c4.isConflict === true, '4. prefer_image + clear ON: isConflict === true');

// 5. replace_all + clear OFF -> KEEP
const c5 = classifyCellChange(
  cellId, 'friday', 'morning', 5, 4,
  currentSubject, reviewSubject,
  'replace_all', false, 'auto'
);
assert(c5.classification === 'skip', '5. replace_all + clear OFF: classification === skip');
assert(c5.finalSubject === 'Toán', '5. replace_all + clear OFF: finalSubject === Toán (KEEP)');
assert(c5.currentValue === 'Toán', '5. replace_all + clear OFF: currentValue === Toán');
assert(c5.reviewValue === null, '5. replace_all + clear OFF: reviewValue === null (empty)');
assert(c5.resultValue === 'Toán', '5. replace_all + clear OFF: resultValue === Toán');
assert(c5.isConflict === true, '5. replace_all + clear OFF: isConflict === true');

// 6. replace_all + clear ON -> CLEAR
const c6 = classifyCellChange(
  cellId, 'friday', 'morning', 5, 4,
  currentSubject, reviewSubject,
  'replace_all', true, 'auto'
);
assert(c6.classification === 'clear_conflict', '6. replace_all + clear ON: classification === clear_conflict (CLEAR)');
assert(c6.finalSubject === null, '6. replace_all + clear ON: finalSubject === null (CLEAR)');
assert(c6.currentValue === 'Toán', '6. replace_all + clear ON: currentValue === Toán');
assert(c6.reviewValue === null, '6. replace_all + clear ON: reviewValue === null (empty)');
assert(c6.resultValue === null, '6. replace_all + clear ON: resultValue === null (CLEAR)');
assert(c6.isConflict === true, '6. replace_all + clear ON: isConflict === true');

// -------------------------------------------------------------
// Test Matrix 2: Per-Cell Override Safety & Guards
// -------------------------------------------------------------

console.log('\n--- 2. Verification of Per-Cell Override Safety Guards ---');

// Override: keep_current with clear ON -> KEEP
const c_ovr_keep = classifyCellChange(
  cellId, 'friday', 'morning', 5, 4,
  currentSubject, reviewSubject,
  'prefer_image', true, 'keep_current'
);
assert(c_ovr_keep.classification === 'skip', 'Override keep_current: classification === skip');
assert(c_ovr_keep.finalSubject === 'Toán', 'Override keep_current: finalSubject === Toán');
assert(c_ovr_keep.currentValue === 'Toán', 'Override keep_current: currentValue === Toán');
assert(c_ovr_keep.reviewValue === null, 'Override keep_current: reviewValue === null');

// Override: use_image with clear OFF -> MUST NOT CLEAR (Safety guard prevents bypass)
const c_ovr_use_image_guarded = classifyCellChange(
  cellId, 'friday', 'morning', 5, 4,
  currentSubject, reviewSubject,
  'prefer_image', false, 'use_image'
);
assert(c_ovr_use_image_guarded.classification === 'skip', 'Override use_image when clear OFF: protected by safety guard (skip)');
assert(c_ovr_use_image_guarded.finalSubject === 'Toán', 'Override use_image when clear OFF: preserved Toán');
assert(c_ovr_use_image_guarded.currentValue === 'Toán', 'Override use_image when clear OFF: currentValue === Toán');
assert(c_ovr_use_image_guarded.reviewValue === null, 'Override use_image when clear OFF: reviewValue === null');

// Override: use_image with clear ON -> CLEAR
const c_ovr_use_image_allowed = classifyCellChange(
  cellId, 'friday', 'morning', 5, 4,
  currentSubject, reviewSubject,
  'fill_empty_only', true, 'use_image'
);
assert(c_ovr_use_image_allowed.classification === 'clear_conflict', 'Override use_image when clear ON: allowed (clear_conflict)');
assert(c_ovr_use_image_allowed.finalSubject === null, 'Override use_image when clear ON: finalSubject === null');

// -------------------------------------------------------------
// Test Matrix 3: Summary Metrics Counting
// -------------------------------------------------------------

console.log('\n--- 3. Verification of Summary Metrics Counting ---');

// Summary with c4 (cleared)
const summaryCleared = calculateApplySummary([], [], [c4]);
assert(summaryCleared.cellsCleared === 1, 'Summary with cleared cell: cellsCleared === 1');
assert(summaryCleared.cellsSkipped === 0, 'Summary with cleared cell: cellsSkipped === 0');
assert(summaryCleared.cellsReplaced === 0, 'Summary with cleared cell: cellsReplaced === 0');
assert(summaryCleared.cellsUnchanged === 0, 'Summary with cleared cell: cellsUnchanged === 0');
assert(summaryCleared.conflicts === 1, 'Summary with cleared cell: conflicts === 1');

// Summary with c3 (kept)
const summaryKept = calculateApplySummary([], [], [c3]);
assert(summaryKept.cellsCleared === 0, 'Summary with kept cell: cellsCleared === 0');
assert(summaryKept.cellsSkipped === 1, 'Summary with kept cell: cellsSkipped === 1');
assert(summaryKept.cellsReplaced === 0, 'Summary with kept cell: cellsReplaced === 0');
assert(summaryKept.conflicts === 1, 'Summary with kept cell: conflicts === 1');

// -------------------------------------------------------------
// Test Matrix 4: Final Apply Safety (applyPlanToDocumentState)
// -------------------------------------------------------------

console.log('\n--- 4. Verification of Final Apply Safety ---');

// Mock timetable with Friday Morning Period 5 = "Toán"
const testTimetable: TimetableState = JSON.parse(JSON.stringify(initialTimetableState));
const mathSub = testTimetable.subjects.find((s) => s.name === 'Toán') || testTimetable.subjects[0];
testTimetable.schedule.friday.morning.periods[4] = { subjectId: mathSub.id };

// Case A: Apply plan with CLEAR
const planClear: import('../src/types/timetableApply').TimetableApplyPlan = {
  id: 'test-plan-clear',
  draftVersion: '1.0',
  createdAt: new Date().toISOString(),
  source: {},
  options: {
    metadata: { title: false, schoolName: false, className: false, studentName: false, schoolYear: false },
    structure: { adjustDays: false, adjustPeriods: false },
    cellStrategy: 'prefer_image',
    allowDestructiveClear: true,
  },
  overrides: {},
  metadataChanges: [],
  structureChanges: [],
  cellChanges: [c4],
  summary: summaryCleared,
  warnings: [],
  blockingIssues: [],
  isValid: true,
};

const stateAfterClear = applyPlanToDocumentState(testTimetable, planClear);
const clearedCell = stateAfterClear.schedule.friday.morning.periods[4];
assert(!clearedCell || !clearedCell.subjectId, 'State after clear: period 5 is cleared (empty)');

// Case B: Apply plan with KEEP
const planKeep: import('../src/types/timetableApply').TimetableApplyPlan = {
  id: 'test-plan-keep',
  draftVersion: '1.0',
  createdAt: new Date().toISOString(),
  source: {},
  options: {
    metadata: { title: false, schoolName: false, className: false, studentName: false, schoolYear: false },
    structure: { adjustDays: false, adjustPeriods: false },
    cellStrategy: 'prefer_image',
    allowDestructiveClear: false,
  },
  overrides: {},
  metadataChanges: [],
  structureChanges: [],
  cellChanges: [c3],
  summary: summaryKept,
  warnings: [],
  blockingIssues: [],
  isValid: true,
};

const stateAfterKeep = applyPlanToDocumentState(testTimetable, planKeep);
const keptCell = stateAfterKeep.schedule.friday.morning.periods[4];
assert(keptCell && keptCell.subjectId === mathSub.id, 'State after keep: period 5 still contains Toán');

console.log('\n=== ALL FIX01 REGRESSION TESTS PASSED PERFECTLY ===');
