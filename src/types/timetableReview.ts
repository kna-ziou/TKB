/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DayKey, SessionKey, CellStatus } from './timetableRecognition';

export const REVIEW_CONFIDENCE_THRESHOLD = 0.8;

export type ReviewFilterType = 'all' | 'needs_review' | 'edited';

export interface ReviewMetadata {
  title: string | null;
  schoolName: string | null;
  className: string | null;
  studentName: string | null;
  schoolYear: string | null;
}

export interface ReviewCellOriginal {
  status: CellStatus;
  subjectRaw: string | null;
  subjectNormalized: string | null;
  confidence: number;
}

export interface ReviewCellCurrent {
  status: CellStatus;
  subject: string | null;
}

export interface ReviewCell {
  id: string; // `${sessionKey}_${periodNumber}_${dayKey}`
  dayKey: DayKey;
  sessionKey: SessionKey;
  periodNumber: number;
  original: ReviewCellOriginal;
  current: ReviewCellCurrent;
  edited: boolean;
  reviewConfirmed: boolean;
}

export interface ReviewDay {
  dayKey: DayKey;
  label: string;
  confidence: number;
}

export interface ReviewSession {
  sessionKey: SessionKey;
  label: string;
  confidence: number;
  periodNumbers: number[];
}

export interface ReviewSummaryCounts {
  totalCells: number;
  recognizedCount: number;
  emptyCount: number;
  unresolvedCount: number;
  editedCount: number;
  editedMetadataCount: number;
}

export interface TimetableReviewDraft {
  schemaVersion: '1.0';
  sourceRecognitionId?: string;

  metadata: ReviewMetadata;
  originalMetadata: ReviewMetadata;
  editedMetadataFields: {
    title: boolean;
    schoolName: boolean;
    className: boolean;
    studentName: boolean;
    schoolYear: boolean;
  };

  days: ReviewDay[];
  sessions: ReviewSession[];
  cells: Record<string, ReviewCell>;
  warnings: string[];

  reviewMeta: {
    createdAt: string;
    updatedAt: string;
    editedCellCount: number;
    editedMetadataCount: number;
    unresolvedCellCount: number;
    status: 'reviewing' | 'ready_for_apply';
  };
}
