/**
 * Unit verification script for Phase 08B-1E Apply Logic
 */
import {
  classifyCellChange,
  buildTimetableApplyPlan,
  calculateApplySummary,
  applyPlanToDocumentState,
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

console.log('--- RUNNING DEV LOGIC TESTS A through H ---');

// Fixture A: current empty / AI occupied -> ADD
const changeA = classifyCellChange(
  'cell_1',
  'monday',
  'morning',
  1,
  0,
  null,
  'Toán',
  'fill_empty_only',
  false,
  'auto'
);
assert(changeA.classification === 'add', 'Fixture A: classification === add');
assert(changeA.finalSubject === 'Toán', 'Fixture A: finalSubject === Toán');
assert(!changeA.isConflict, 'Fixture A: isConflict === false');

// Fixture B: current "Toán" / AI "Toán" -> UNCHANGED
const changeB = classifyCellChange(
  'cell_2',
  'monday',
  'morning',
  1,
  0,
  'Toán',
  'Toán',
  'fill_empty_only',
  false,
  'auto'
);
assert(changeB.classification === 'unchanged', 'Fixture B: classification === unchanged');
assert(changeB.finalSubject === 'Toán', 'Fixture B: finalSubject === Toán');
assert(!changeB.isConflict, 'Fixture B: isConflict === false');

// Fixture C: current "Văn" / AI "Ngữ văn" -> conflict/replace depending on strategy
// Under 'fill_empty_only':
const changeC_fill = classifyCellChange(
  'cell_3',
  'monday',
  'morning',
  1,
  0,
  'Văn',
  'Ngữ văn',
  'fill_empty_only',
  false,
  'auto'
);
assert(changeC_fill.isConflict === true, 'Fixture C (fill_empty): isConflict === true');
assert(changeC_fill.classification === 'skip', 'Fixture C (fill_empty): classification === skip');
assert(changeC_fill.finalSubject === 'Văn', 'Fixture C (fill_empty): finalSubject === current "Văn"');

// Under 'prefer_image':
const changeC_prefer = classifyCellChange(
  'cell_3',
  'monday',
  'morning',
  1,
  0,
  'Văn',
  'Ngữ văn',
  'prefer_image',
  false,
  'auto'
);
assert(changeC_prefer.isConflict === true, 'Fixture C (prefer_image): isConflict === true');
assert(changeC_prefer.classification === 'replace', 'Fixture C (prefer_image): classification === replace');
assert(changeC_prefer.finalSubject === 'Ngữ văn', 'Fixture C (prefer_image): finalSubject === AI "Ngữ văn"');

// Under manual override 'use_image' under fill_empty_only:
const changeC_override = classifyCellChange(
  'cell_3',
  'monday',
  'morning',
  1,
  0,
  'Văn',
  'Ngữ văn',
  'fill_empty_only',
  false,
  'use_image'
);
assert(changeC_override.classification === 'replace', 'Fixture C (override use_image): classification === replace');
assert(changeC_override.finalSubject === 'Ngữ văn', 'Fixture C (override use_image): finalSubject === Ngữ văn');

// Fixture D: current "Toán" / AI empty -> protected under default strategy
const changeD_default = classifyCellChange(
  'cell_4',
  'monday',
  'morning',
  1,
  0,
  'Toán',
  null,
  'fill_empty_only',
  false,
  'auto'
);
assert(changeD_default.classification === 'skip', 'Fixture D (default): classification === skip');
assert(changeD_default.finalSubject === 'Toán', 'Fixture D (default): finalSubject === current "Toán" (protected)');
assert(changeD_default.isConflict === true, 'Fixture D (default): isConflict === true');

// If allowDestructiveClear is false, even override 'clear_cell' cannot clear:
const changeD_attemptClear = classifyCellChange(
  'cell_4',
  'monday',
  'morning',
  1,
  0,
  'Toán',
  null,
  'fill_empty_only',
  false,
  'clear_cell'
);
assert(changeD_attemptClear.finalSubject === 'Toán', 'Fixture D (destructive toggle off): protected even on clear_cell');

// If allowDestructiveClear is true and override is 'clear_cell':
const changeD_clearConfirmed = classifyCellChange(
  'cell_4',
  'monday',
  'morning',
  1,
  0,
  'Toán',
  null,
  'fill_empty_only',
  true,
  'clear_cell'
);
assert(changeD_clearConfirmed.classification === 'clear_conflict', 'Fixture D (destructive allowed): classification === clear_conflict');
assert(changeD_clearConfirmed.finalSubject === null, 'Fixture D (destructive allowed): finalSubject === null');

// Fixture E: current empty / AI empty -> EMPTY_UNCHANGED
const changeE = classifyCellChange(
  'cell_5',
  'monday',
  'morning',
  1,
  0,
  null,
  null,
  'fill_empty_only',
  false,
  'auto'
);
assert(changeE.classification === 'empty_unchanged', 'Fixture E: classification === empty_unchanged');
assert(changeE.finalSubject === null, 'Fixture E: finalSubject === null');
assert(!changeE.isConflict, 'Fixture E: isConflict === false');

// Fixture F: AI period 7 while app max 6 -> BLOCKING ISSUE
const mockDraftOverLimit: TimetableReviewDraft = {
  schemaVersion: '1.0',
  metadata: { title: null, schoolName: null, className: null, studentName: null, schoolYear: null },
  originalMetadata: { title: null, schoolName: null, className: null, studentName: null, schoolYear: null },
  editedMetadataFields: { title: false, schoolName: false, className: false, studentName: false, schoolYear: false },
  warnings: [],
  days: [{ dayKey: 'monday', label: 'Thứ 2', confidence: 1 }],
  sessions: [
    {
      sessionKey: 'morning',
      label: 'Sáng',
      periodNumbers: [1, 2, 3, 4, 5, 6, 7],
      confidence: 1,
    },
  ],
  cells: {
    cell_p7: {
      id: 'cell_p7',
      sessionKey: 'morning',
      periodNumber: 7,
      dayKey: 'monday',
      original: { status: 'recognized', subjectRaw: 'Tin', subjectNormalized: 'Tin', confidence: 0.95 },
      current: { status: 'recognized', subject: 'Tin' },
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

const planF = buildTimetableApplyPlan(
  initialTimetableState,
  mockDraftOverLimit,
  {
    metadata: { title: false, schoolName: false, className: false, studentName: false, schoolYear: false },
    structure: { adjustDays: true, adjustPeriods: true },
    cellStrategy: 'fill_empty_only',
    allowDestructiveClear: false,
  }
);
assert(!planF.isValid, 'Fixture F: plan is invalid when morning period > 6');
assert(
  planF.blockingIssues.some((b) => b.includes('vượt quá giới hạn tối đa 6 tiết')),
  'Fixture F: blocking issue mentions max 6 periods'
);

// Fixture G: review not ready -> apply invalid
const mockDraftUnresolved: TimetableReviewDraft = {
  ...mockDraftOverLimit,
  sessions: [
    {
      sessionKey: 'morning',
      label: 'Sáng',
      periodNumbers: [1, 2, 3, 4],
      confidence: 1,
    },
  ],
  cells: {
    cell_unresolved: {
      id: 'cell_unresolved',
      sessionKey: 'morning',
      periodNumber: 1,
      dayKey: 'monday',
      original: { status: 'uncertain', subjectRaw: null, subjectNormalized: null, confidence: 0.4 },
      current: { status: 'uncertain', subject: null },
      edited: false,
      reviewConfirmed: false,
    },
  },
  reviewMeta: {
    unresolvedCellCount: 1,
    editedCellCount: 0,
    editedMetadataCount: 0,
    status: 'reviewing',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
};

const planG = buildTimetableApplyPlan(
  initialTimetableState,
  mockDraftUnresolved,
  {
    metadata: { title: false, schoolName: false, className: false, studentName: false, schoolYear: false },
    structure: { adjustDays: true, adjustPeriods: true },
    cellStrategy: 'fill_empty_only',
    allowDestructiveClear: false,
  }
);
assert(!planG.isValid, 'Fixture G: plan is invalid when unresolvedCellCount > 0');
assert(
  planG.blockingIssues.some((b) => b.includes('Dữ liệu kiểm tra chưa hoàn tất')),
  'Fixture G: blocking issue mentions incomplete review'
);

// Fixture H: unsupported session "other" -> warning/blocking, never silently mapped
const mockDraftUnsupportedSession: TimetableReviewDraft = {
  ...mockDraftOverLimit,
  sessions: [
    {
      sessionKey: 'other' as any,
      label: 'Tối',
      periodNumbers: [1],
      confidence: 1,
    },
  ],
  cells: {},
};
const planH = buildTimetableApplyPlan(
  initialTimetableState,
  mockDraftUnsupportedSession,
  {
    metadata: { title: false, schoolName: false, className: false, studentName: false, schoolYear: false },
    structure: { adjustDays: true, adjustPeriods: true },
    cellStrategy: 'fill_empty_only',
    allowDestructiveClear: false,
  }
);
assert(!planH.isValid, 'Fixture H: plan is invalid with unsupported session');
assert(
  planH.blockingIssues.some((b) => b.includes('other')),
  'Fixture H: blocking issue mentions unsupported session other'
);

console.log('ALL DEV LOGIC TESTS A-H PASSED SUCCESSFULLY!');
