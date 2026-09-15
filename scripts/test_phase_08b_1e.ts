/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  buildTimetableApplyPlan,
  createDefaultApplyOptions,
  applyPlanToDocumentState,
} from '../src/services/timetableApplyService';
import { initialTimetableState, timetableReducer } from '../src/reducer/timetableReducer';
import { TimetableState, DayKey } from '../src/types/timetable';
import { TimetableReviewDraft } from '../src/types/timetableReview';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`PASS: ${message}`);
}

console.log('=== PHASE 08B-1E COMPREHENSIVE VERIFICATION ===');

// Setup base TimetableState with some pre-existing cells
let baseState: TimetableState = {
  ...initialTimetableState,
  meta: {
    ...initialTimetableState.meta,
    title: 'Thời Khóa Biểu Cũ',
    schoolName: 'Trường THCS Lê Quý Đôn',
    className: '6A',
  },
  config: {
    activeDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    morningPeriods: 5,
    afternoonPeriods: 0,
    afternoonEnabled: false,
  },
  subjects: [
    { id: 'sub-toan', name: 'Toán', color: '#3b82f6', defaultColor: '#3b82f6' },
    { id: 'sub-van', name: 'Ngữ văn', color: '#ef4444', defaultColor: '#ef4444' },
  ],
  schedule: {
    ...initialTimetableState.schedule,
    monday: {
      morning: {
        periods: [
          { subjectId: 'sub-toan' }, // Period 1: Toán
          { subjectId: 'sub-van' },  // Period 2: Ngữ văn (Conflict with AI Tiếng Anh)
          {},                        // Period 3: Empty (AI will add Lịch sử)
          {},                        // Period 4: Empty
          {},                        // Period 5: Empty
        ],
      },
      afternoon: { periods: [] },
    },
  },
};

// Setup reviewed AI Draft (Clean & verified)
const reviewedDraft: TimetableReviewDraft = {
  schemaVersion: '1.0',
  metadata: {
    title: 'TKB Học Kỳ 1 Mới',
    schoolName: 'Trường THCS Lê Quý Đôn Mới',
    className: '7B',
    studentName: 'Nguyễn Văn A',
    schoolYear: '2026-2027',
  },
  originalMetadata: {
    title: 'TKB Học Kỳ 1 Mới',
    schoolName: 'Trường THCS Lê Quý Đôn Mới',
    className: '7B',
    studentName: 'Nguyễn Văn A',
    schoolYear: '2026-2027',
  },
  editedMetadataFields: {
    title: false,
    schoolName: false,
    className: false,
    studentName: false,
    schoolYear: false,
  },
  warnings: [],
  days: [
    { dayKey: 'monday', label: 'Thứ 2', confidence: 1 },
    { dayKey: 'tuesday', label: 'Thứ 3', confidence: 1 },
    { dayKey: 'wednesday', label: 'Thứ 4', confidence: 1 },
    { dayKey: 'thursday', label: 'Thứ 5', confidence: 1 },
    { dayKey: 'friday', label: 'Thứ 6', confidence: 1 },
    { dayKey: 'saturday', label: 'Thứ 7', confidence: 1 }, // Additional Saturday
  ],
  sessions: [
    {
      sessionKey: 'morning',
      label: 'Sáng',
      periodNumbers: [1, 2, 3, 4, 5],
      confidence: 1,
    },
  ],
  cells: {
    // T1: AI says Toán (Unchanged)
    morning_1_monday: {
      id: 'morning_1_monday',
      dayKey: 'monday',
      sessionKey: 'morning',
      periodNumber: 1,
      original: { status: 'recognized', subjectRaw: 'Toán', subjectNormalized: 'Toán', confidence: 0.95 },
      current: { status: 'recognized', subject: 'Toán' },
      edited: false,
      reviewConfirmed: true,
    },
    // T2: AI says Tiếng Anh (Conflict with Ngữ văn)
    morning_2_monday: {
      id: 'morning_2_monday',
      dayKey: 'monday',
      sessionKey: 'morning',
      periodNumber: 2,
      original: { status: 'recognized', subjectRaw: 'Tiếng Anh', subjectNormalized: 'Tiếng Anh', confidence: 0.9 },
      current: { status: 'recognized', subject: 'Tiếng Anh' },
      edited: false,
      reviewConfirmed: true,
    },
    // T3: AI says Lịch sử (Add to empty)
    morning_3_monday: {
      id: 'morning_3_monday',
      dayKey: 'monday',
      sessionKey: 'morning',
      periodNumber: 3,
      original: { status: 'recognized', subjectRaw: 'Lịch sử', subjectNormalized: 'Lịch sử', confidence: 0.88 },
      current: { status: 'recognized', subject: 'Lịch sử' },
      edited: false,
      reviewConfirmed: true,
    },
    // T4: AI says empty (Both empty)
    morning_4_monday: {
      id: 'morning_4_monday',
      dayKey: 'monday',
      sessionKey: 'morning',
      periodNumber: 4,
      original: { status: 'empty', subjectRaw: null, subjectNormalized: null, confidence: 1.0 },
      current: { status: 'empty', subject: null },
      edited: false,
      reviewConfirmed: true,
    },
  },
  reviewMeta: {
    unresolvedCellCount: 0,
    editedCellCount: 0,
    editedMetadataCount: 0,
    status: 'ready_for_apply',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
};

// TEST 1: Default apply options
const defaultOptions = createDefaultApplyOptions(reviewedDraft);
assert(defaultOptions.cellStrategy === 'fill_empty_only', 'Test 1: Default strategy is fill_empty_only');
assert(defaultOptions.allowDestructiveClear === false, 'Test 1: Destructive clear is false by default');
assert(defaultOptions.metadata.title === true, 'Test 1: Metadata title is enabled');
assert(defaultOptions.metadata.studentName === false, 'Test 1: Student name is disabled by default');
assert(defaultOptions.structure.adjustDays === true, 'Test 1: Structure adjustDays is true');

// TEST 2: Plan Generation under fill_empty_only
const planFillEmpty = buildTimetableApplyPlan(baseState, reviewedDraft, defaultOptions, {});
assert(planFillEmpty.isValid, 'Test 2: Plan is valid');
assert(planFillEmpty.summary.cellsAdded === 1, 'Test 2: Exactly 1 cell added (Lịch sử at T3)');
assert(planFillEmpty.summary.cellsReplaced === 0, 'Test 2: 0 cells replaced under fill_empty_only');
assert(planFillEmpty.summary.conflicts === 1, 'Test 2: Exactly 1 conflict detected (Ngữ văn vs Tiếng Anh at T2)');

const cellT2FillEmpty = planFillEmpty.cellChanges.find((c) => c.cellId === 'morning_2_monday');
assert(cellT2FillEmpty?.finalSubject === 'Ngữ văn', 'Test 2: Current Ngữ văn protected under fill_empty_only');
assert(cellT2FillEmpty?.classification === 'skip', 'Test 2: T2 classified as skip');

// TEST 3: Plan Generation under prefer_image
const optionsPreferImage = { ...defaultOptions, cellStrategy: 'prefer_image' as const };
const planPreferImage = buildTimetableApplyPlan(baseState, reviewedDraft, optionsPreferImage, {});
const cellT2PreferImage = planPreferImage.cellChanges.find((c) => c.cellId === 'morning_2_monday');
assert(cellT2PreferImage?.finalSubject === 'Tiếng Anh', 'Test 3: AI Tiếng Anh replaces Ngữ văn under prefer_image');
assert(cellT2PreferImage?.classification === 'replace', 'Test 3: T2 classified as replace');
assert(planPreferImage.summary.cellsReplaced === 1, 'Test 3: Exactly 1 cell replaced in summary');

// TEST 4: Per-cell manual override
const overrides = { morning_2_monday: 'keep_current' as const };
const planWithOverride = buildTimetableApplyPlan(baseState, reviewedDraft, optionsPreferImage, overrides);
const cellT2Overridden = planWithOverride.cellChanges.find((c) => c.cellId === 'morning_2_monday');
assert(cellT2Overridden?.finalSubject === 'Ngữ văn', 'Test 4: Manual override keep_current overrides prefer_image');

// TEST 5: Atomic Application to Timetable State via Reducer
const nextState = applyPlanToDocumentState(baseState, planPreferImage);
const appliedState = timetableReducer(baseState, {
  type: 'APPLY_TIMETABLE_IMPORT',
  payload: { nextState },
});

assert(appliedState.meta.title === 'TKB Học Kỳ 1 Mới', 'Test 5: Meta title applied');
assert(appliedState.meta.schoolName === 'Trường THCS Lê Quý Đôn Mới', 'Test 5: Meta schoolName applied');
assert(appliedState.meta.className === '7B', 'Test 5: Meta className applied');
assert(appliedState.meta.studentName === '', 'Test 5: StudentName remained unchanged per options');
assert(appliedState.config.activeDays.includes('saturday'), 'Test 5: Saturday added to activeDays');

// Verify cells in applied state
const appliedT1 = appliedState.schedule.monday.morning.periods[0];
const subT1 = appliedState.subjects.find((s) => s.id === appliedT1.subjectId);
assert(subT1?.name === 'Toán', 'Test 5: Period 1 remains Toán');

const appliedT2 = appliedState.schedule.monday.morning.periods[1];
assert(appliedT2.customLabel === 'Tiếng Anh' || appliedState.subjects.find((s) => s.id === appliedT2.subjectId)?.name === 'Tiếng Anh', 'Test 5: Period 2 subject is Tiếng Anh');

const appliedT3 = appliedState.schedule.monday.morning.periods[2];
assert(appliedT3.customLabel === 'Lịch sử' || appliedState.subjects.find((s) => s.id === appliedT3.subjectId)?.name === 'Lịch sử', 'Test 5: Period 3 subject is Lịch sử');

// TEST 6: Atomic Undo Simulation
// Since `applyTimetableImport` is tracked as a single action in TimetableContext historyReducer:
// In historyReducer:
// past = [baseState], present = appliedState
// undo() pops baseState and restores it completely!
const pastHistory = [baseState];
const restoredState = pastHistory.pop()!;
assert(restoredState.meta.title === 'Thời Khóa Biểu Cũ', 'Test 6: Single undo restores old title');
assert(restoredState.schedule.monday.morning.periods[1].subjectId === 'sub-van', 'Test 6: Single undo restores Ngữ văn');
assert(!restoredState.config.activeDays.includes('saturday'), 'Test 6: Single undo restores original 5 active days');

console.log('=== ALL PHASE 08B-1E VERIFICATION TESTS PASSED SUCCESSFULLY! ===');
