/**
 * Verification script for PATCH 08B-1E-UI01: Explicit Metadata Change Preview
 */
import {
  buildTimetableApplyPlan,
  createDefaultApplyOptions,
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

console.log('=== RUNNING PATCH 08B-1E-UI01 ACCEPTANCE VERIFICATION ===');

// Setup Real Test Data
const baseCurrentTimetable: TimetableState = {
  ...initialTimetableState,
  meta: {
    ...initialTimetableState.meta,
    title: 'Thời khóa biểu HK2',
    schoolName: 'Bình Thọ',
    className: '7TH1',
    studentName: 'Dương Minh Khang',
    schoolYear: '2025-2026',
  },
  config: {
    ...initialTimetableState.config,
    activeDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    morningPeriods: 5,
    afternoonPeriods: 0,
  },
};

// Clone before test to ensure no mutation occurs (Test E)
const originalSnapshot = JSON.stringify(baseCurrentTimetable);

const testReviewDraft: TimetableReviewDraft = {
  schemaVersion: '1.0',
  metadata: {
    title: 'Thời khóa biểu HK2',
    schoolName: 'THCS BÌNH THỌ',
    className: '7TH1',
    studentName: '', // blank / empty per specification
    schoolYear: '2025-2026',
  },
  originalMetadata: {
    title: 'Thời khóa biểu HK2',
    schoolName: 'THCS BÌNH THỌ',
    className: '7TH1',
    studentName: '',
    schoolYear: '2025-2026',
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
  ],
  sessions: [
    { sessionKey: 'morning', label: 'Sáng', periodNumbers: [1, 2, 3, 4, 5], confidence: 1 },
  ],
  cells: {},
  reviewMeta: {
    unresolvedCellCount: 0,
    editedCellCount: 0,
    editedMetadataCount: 0,
    status: 'ready_for_apply',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
};

// --------------------------------------------------------------------------
// TEST A — Trường checked
// --------------------------------------------------------------------------
console.log('\n--- TEST A: Trường checked ---');
const optionsA = createDefaultApplyOptions(testReviewDraft);
// Verify default has schoolName true because AI draft has 'THCS BÌNH THỌ'
assert(optionsA.metadata.schoolName === true, 'Test A: optionsA.metadata.schoolName is true');

const planA = buildTimetableApplyPlan(baseCurrentTimetable, testReviewDraft, optionsA);
const schoolChangeA = planA.metadataChanges.find((m) => m.field === 'schoolName')!;

assert(schoolChangeA !== undefined, 'Test A: schoolChange found in plan');
assert(schoolChangeA.currentValue === 'Bình Thọ', 'Test A: Current === Bình Thọ');
assert(schoolChangeA.aiValue === 'THCS BÌNH THỌ', 'Test A: AI === THCS BÌNH THỌ');
assert(schoolChangeA.finalValue === 'THCS BÌNH THỌ', 'Test A: Result === THCS BÌNH THỌ');
assert(schoolChangeA.isChanged === true, 'Test A: isChanged === true');
assert(schoolChangeA.enabled === true, 'Test A: enabled === true');
assert(planA.summary.metadataChanged >= 1, 'Test A: metadataChanged count includes schoolName');

// --------------------------------------------------------------------------
// TEST B — Uncheck Trường
// --------------------------------------------------------------------------
console.log('\n--- TEST B: Uncheck Trường ---');
const optionsB = {
  ...optionsA,
  metadata: {
    ...optionsA.metadata,
    schoolName: false,
  },
};

const planB = buildTimetableApplyPlan(baseCurrentTimetable, testReviewDraft, optionsB);
const schoolChangeB = planB.metadataChanges.find((m) => m.field === 'schoolName')!;

assert(schoolChangeB.currentValue === 'Bình Thọ', 'Test B: Current === Bình Thọ');
assert(schoolChangeB.aiValue === 'THCS BÌNH THỌ', 'Test B: AI === THCS BÌNH THỌ');
assert(schoolChangeB.finalValue === 'Bình Thọ', 'Test B: Result === Bình Thọ (Giữ nguyên)');
assert(schoolChangeB.isChanged === false, 'Test B: isChanged === false when unchecked');
assert(schoolChangeB.enabled === false, 'Test B: enabled === false');
assert(planB.summary.metadataChanged === planA.summary.metadataChanged - 1, 'Test B: metadataChanged count decreases by 1');

// --------------------------------------------------------------------------
// TEST C — Check Trường again
// --------------------------------------------------------------------------
console.log('\n--- TEST C: Check Trường again ---');
const optionsC = {
  ...optionsB,
  metadata: {
    ...optionsB.metadata,
    schoolName: true,
  },
};

const planC = buildTimetableApplyPlan(baseCurrentTimetable, testReviewDraft, optionsC);
const schoolChangeC = planC.metadataChanges.find((m) => m.field === 'schoolName')!;

assert(schoolChangeC.finalValue === 'THCS BÌNH THỌ', 'Test C: Result returns to THCS BÌNH THỌ');
assert(schoolChangeC.isChanged === true, 'Test C: isChanged === true again');
assert(planC.summary.metadataChanged === planA.summary.metadataChanged, 'Test C: metadataChanged restored');

// --------------------------------------------------------------------------
// TEST D — Học sinh (Blank AI value)
// --------------------------------------------------------------------------
console.log('\n--- TEST D: Học sinh (Blank AI value) ---');
const studentChange = planA.metadataChanges.find((m) => m.field === 'studentName')!;

assert(studentChange.currentValue === 'Dương Minh Khang', 'Test D: Current === Dương Minh Khang');
assert(studentChange.aiValue === null, 'Test D: AI === null (Không có dữ liệu)');
assert(studentChange.hasAiValue === false, 'Test D: hasAiValue === false');
assert(studentChange.finalValue === 'Dương Minh Khang', 'Test D: Result === Dương Minh Khang (Giữ nguyên)');
assert(studentChange.isChanged === false, 'Test D: isChanged === false');
assert(optionsA.metadata.studentName === false, 'Test D: default option disabled for blank AI value');

// Even if user artificially forces studentName: true in options, blank AI must NOT erase current metadata!
const optionsD_Forced = {
  ...optionsA,
  metadata: {
    ...optionsA.metadata,
    studentName: true,
  },
};
const planD_Forced = buildTimetableApplyPlan(baseCurrentTimetable, testReviewDraft, optionsD_Forced);
const forcedStudentChange = planD_Forced.metadataChanges.find((m) => m.field === 'studentName')!;
assert(
  forcedStudentChange.finalValue === 'Dương Minh Khang',
  'Test D: Blank AI metadata MUST NOT clear existing metadata even if enabled'
);
assert(
  forcedStudentChange.hasAiValue === false,
  'Test D: hasAiValue is strictly false'
);

// --------------------------------------------------------------------------
// TEST E — No timetable mutation during preview plan generation
// --------------------------------------------------------------------------
console.log('\n--- TEST E: No Timetable Mutation ---');
assert(
  JSON.stringify(baseCurrentTimetable) === originalSnapshot,
  'Test E: TimetableState is completely immutable during plan calculation'
);

// --------------------------------------------------------------------------
// TEST F — Equivalent / Unchanged values (Lớp 7TH1)
// --------------------------------------------------------------------------
console.log('\n--- TEST F: Equivalent metadata values ---');
const classChange = planA.metadataChanges.find((m) => m.field === 'className')!;
assert(classChange.currentValue === '7TH1', 'Test F: Current === 7TH1');
assert(classChange.aiValue === '7TH1', 'Test F: AI === 7TH1');
assert(classChange.finalValue === '7TH1', 'Test F: Result === 7TH1');
assert(classChange.isChanged === false, 'Test F: isChanged === false (Không đổi)');
assert(classChange.hasAiValue === true, 'Test F: hasAiValue === true');

console.log('\n=== ALL PATCH 08B-1E-UI01 ACCEPTANCE TESTS PASSED! ===');
