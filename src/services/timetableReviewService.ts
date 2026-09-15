/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TimetableRecognitionResult } from '../types/timetableRecognition';
import {
  ReviewCell,
  ReviewMetadata,
  ReviewSession,
  ReviewSummaryCounts,
  TimetableReviewDraft,
  REVIEW_CONFIDENCE_THRESHOLD,
} from '../types/timetableReview';
import { sanitizeString } from './timetableRecognitionValidator';

const MAX_METADATA_LENGTH = 200;
const MAX_SUBJECT_LENGTH = 100;

/**
 * Determines whether a cell currently requires user review or action.
 * Rule:
 * - Status is 'uncertain' or 'unreadable'
 * - Status is 'recognized' but subject is empty
 * - Status is 'recognized' with original confidence < 0.80, unless user has confirmed or edited it.
 */
export function isCellNeedsReview(cell: ReviewCell): boolean {
  if (cell.current.status === 'uncertain' || cell.current.status === 'unreadable') {
    return true;
  }

  if (cell.current.status === 'recognized') {
    if (!cell.current.subject || cell.current.subject.trim() === '') {
      return true;
    }
    if (
      cell.original.confidence < REVIEW_CONFIDENCE_THRESHOLD &&
      !cell.reviewConfirmed &&
      !cell.edited
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Calculates review counts and unresolved status locally from a draft.
 * Does not trust any external counters.
 */
export function calculateReviewSummary(draft: {
  cells: Record<string, ReviewCell>;
  editedMetadataFields: TimetableReviewDraft['editedMetadataFields'];
}): ReviewSummaryCounts {
  const cellList = Object.values(draft.cells);
  let recognizedCount = 0;
  let emptyCount = 0;
  let unresolvedCount = 0;
  let editedCount = 0;

  for (const cell of cellList) {
    if (cell.current.status === 'recognized') {
      recognizedCount++;
    } else if (cell.current.status === 'empty') {
      emptyCount++;
    }

    if (cell.edited) {
      editedCount++;
    }

    if (isCellNeedsReview(cell)) {
      unresolvedCount++;
    }
  }

  const editedMetadataCount = Object.values(draft.editedMetadataFields).filter(Boolean).length;

  return {
    totalCells: cellList.length,
    recognizedCount,
    emptyCount,
    unresolvedCount,
    editedCount,
    editedMetadataCount,
  };
}

/**
 * Creates a new TimetableReviewDraft working copy derived from an immutable TimetableRecognitionResult.
 */
export function createReviewDraft(
  recognitionResult: TimetableRecognitionResult
): TimetableReviewDraft {
  const now = new Date().toISOString();

  const metadata: ReviewMetadata = {
    title: sanitizeString(recognitionResult.sourceSummary.title, MAX_METADATA_LENGTH),
    schoolName: sanitizeString(recognitionResult.sourceSummary.schoolName, MAX_METADATA_LENGTH),
    className: sanitizeString(recognitionResult.sourceSummary.className, MAX_METADATA_LENGTH),
    studentName: sanitizeString(recognitionResult.sourceSummary.studentName, MAX_METADATA_LENGTH),
    schoolYear: sanitizeString(recognitionResult.sourceSummary.schoolYear, MAX_METADATA_LENGTH),
  };

  const originalMetadata: ReviewMetadata = { ...metadata };

  const editedMetadataFields = {
    title: false,
    schoolName: false,
    className: false,
    studentName: false,
    schoolYear: false,
  };

  const cells: Record<string, ReviewCell> = {};
  const sessions: ReviewSession[] = [];

  for (const session of recognitionResult.sessions) {
    const periodNumbers: number[] = [];

    for (const period of session.periods) {
      periodNumbers.push(period.periodNumber);

      for (const cell of period.cells) {
        const cellId = `${session.sessionKey}_${period.periodNumber}_${cell.dayKey}`;
        const initialSubject = cell.subjectNormalized || cell.subjectRaw || null;

        cells[cellId] = {
          id: cellId,
          dayKey: cell.dayKey,
          sessionKey: session.sessionKey,
          periodNumber: period.periodNumber,
          original: {
            status: cell.status,
            subjectRaw: cell.subjectRaw,
            subjectNormalized: cell.subjectNormalized,
            confidence: cell.confidence,
          },
          current: {
            status: cell.status,
            subject: initialSubject,
          },
          edited: false,
          reviewConfirmed: false,
        };
      }
    }

    sessions.push({
      sessionKey: session.sessionKey,
      label: session.label,
      confidence: session.confidence,
      periodNumbers,
    });
  }

  const summary = calculateReviewSummary({ cells, editedMetadataFields });

  return {
    schemaVersion: '1.0',
    metadata,
    originalMetadata,
    editedMetadataFields,
    days: recognitionResult.days.map((d) => ({ ...d })),
    sessions,
    cells,
    warnings: [...recognitionResult.warnings],
    reviewMeta: {
      createdAt: now,
      updatedAt: now,
      editedCellCount: summary.editedCount,
      editedMetadataCount: summary.editedMetadataCount,
      unresolvedCellCount: summary.unresolvedCount,
      status: summary.unresolvedCount === 0 ? 'ready_for_apply' : 'reviewing',
    },
  };
}

/**
 * Updates a single cell within the review draft, recomputing edited flags and readiness summary.
 */
export function updateReviewCell(
  draft: TimetableReviewDraft,
  cellId: string,
  updates: {
    status: ReviewCell['current']['status'];
    subject: string | null;
  }
): TimetableReviewDraft {
  const existingCell = draft.cells[cellId];
  if (!existingCell) return draft;

  let cleanSubject = sanitizeString(updates.subject, MAX_SUBJECT_LENGTH);

  // If status is empty or unreadable, force subject to null
  if (updates.status === 'empty' || updates.status === 'unreadable') {
    cleanSubject = null;
  }

  // Compare against original Gemini values
  const origSubject =
    existingCell.original.subjectNormalized || existingCell.original.subjectRaw || null;
  const isStatusChanged = updates.status !== existingCell.original.status;
  const isSubjectChanged = (cleanSubject || null) !== (origSubject || null);
  const edited = isStatusChanged || isSubjectChanged;

  const updatedCell: ReviewCell = {
    ...existingCell,
    current: {
      status: updates.status,
      subject: cleanSubject,
    },
    edited,
    // If the user actively resolved or edited a low-confidence recognized cell, mark it confirmed
    reviewConfirmed:
      updates.status === 'recognized' && Boolean(cleanSubject)
        ? true
        : existingCell.reviewConfirmed,
  };

  const newCells = {
    ...draft.cells,
    [cellId]: updatedCell,
  };

  const summary = calculateReviewSummary({
    cells: newCells,
    editedMetadataFields: draft.editedMetadataFields,
  });

  return {
    ...draft,
    cells: newCells,
    reviewMeta: {
      ...draft.reviewMeta,
      updatedAt: new Date().toISOString(),
      editedCellCount: summary.editedCount,
      unresolvedCellCount: summary.unresolvedCount,
      status: summary.unresolvedCount === 0 ? 'ready_for_apply' : 'reviewing',
    },
  };
}

/**
 * Confirms that a low-confidence recognized cell is correct without changing text.
 */
export function confirmReviewCell(
  draft: TimetableReviewDraft,
  cellId: string
): TimetableReviewDraft {
  const existingCell = draft.cells[cellId];
  if (!existingCell) return draft;

  const updatedCell: ReviewCell = {
    ...existingCell,
    reviewConfirmed: true,
  };

  const newCells = {
    ...draft.cells,
    [cellId]: updatedCell,
  };

  const summary = calculateReviewSummary({
    cells: newCells,
    editedMetadataFields: draft.editedMetadataFields,
  });

  return {
    ...draft,
    cells: newCells,
    reviewMeta: {
      ...draft.reviewMeta,
      updatedAt: new Date().toISOString(),
      unresolvedCellCount: summary.unresolvedCount,
      status: summary.unresolvedCount === 0 ? 'ready_for_apply' : 'reviewing',
    },
  };
}

/**
 * Restores a single cell strictly to its original Gemini recognition values.
 */
export function restoreReviewCell(
  draft: TimetableReviewDraft,
  cellId: string
): TimetableReviewDraft {
  const existingCell = draft.cells[cellId];
  if (!existingCell) return draft;

  const origSubject =
    existingCell.original.subjectNormalized || existingCell.original.subjectRaw || null;

  const restoredCell: ReviewCell = {
    ...existingCell,
    current: {
      status: existingCell.original.status,
      subject: origSubject,
    },
    edited: false,
    reviewConfirmed: false,
  };

  const newCells = {
    ...draft.cells,
    [cellId]: restoredCell,
  };

  const summary = calculateReviewSummary({
    cells: newCells,
    editedMetadataFields: draft.editedMetadataFields,
  });

  return {
    ...draft,
    cells: newCells,
    reviewMeta: {
      ...draft.reviewMeta,
      updatedAt: new Date().toISOString(),
      editedCellCount: summary.editedCount,
      unresolvedCellCount: summary.unresolvedCount,
      status: summary.unresolvedCount === 0 ? 'ready_for_apply' : 'reviewing',
    },
  };
}

/**
 * Updates a metadata field in the review draft.
 */
export function updateReviewMetadata(
  draft: TimetableReviewDraft,
  field: keyof ReviewMetadata,
  value: string | null
): TimetableReviewDraft {
  const cleanVal = sanitizeString(value, MAX_METADATA_LENGTH);
  const origVal = draft.originalMetadata[field];
  const isChanged = (cleanVal || null) !== (origVal || null);

  const newMetadata = {
    ...draft.metadata,
    [field]: cleanVal,
  };

  const newEditedFields = {
    ...draft.editedMetadataFields,
    [field]: isChanged,
  };

  const summary = calculateReviewSummary({
    cells: draft.cells,
    editedMetadataFields: newEditedFields,
  });

  return {
    ...draft,
    metadata: newMetadata,
    editedMetadataFields: newEditedFields,
    reviewMeta: {
      ...draft.reviewMeta,
      updatedAt: new Date().toISOString(),
      editedMetadataCount: summary.editedMetadataCount,
    },
  };
}

/**
 * Restores all cells and metadata back to the original validated recognition result.
 */
export function restoreAllReview(
  recognitionResult: TimetableRecognitionResult
): TimetableReviewDraft {
  return createReviewDraft(recognitionResult);
}

/**
 * Returns true if the draft has 0 unresolved cells and is ready for apply.
 */
export function isReviewReady(draft: TimetableReviewDraft): boolean {
  return draft.reviewMeta.unresolvedCellCount === 0;
}
