/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RotationAngle } from './aiImageImport';

/**
 * Standard timetable day keys.
 * Restricted strictly to the 7 calendar days or 'unknown'.
 */
export type DayKey =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday'
  | 'unknown';

/**
 * Standard timetable session keys.
 */
export type SessionKey = 'morning' | 'afternoon' | 'other' | 'unknown';

/**
 * Cell recognition status values.
 * EMPTY IS NOT THE SAME AS UNCERTAIN OR UNREADABLE.
 */
export type CellStatus = 'recognized' | 'empty' | 'uncertain' | 'unreadable';

/**
 * Recognized day column information.
 */
export interface RecognizedDay {
  dayKey: DayKey;
  label: string;
  confidence: number;
}

/**
 * Single cell in a timetable period.
 */
export interface RecognizedCell {
  dayKey: DayKey;
  status: CellStatus;
  subjectRaw: string | null;
  subjectNormalized: string | null;
  confidence: number;
}

/**
 * Single row/period number across visible days.
 */
export interface RecognizedPeriod {
  periodNumber: number;
  cells: RecognizedCell[];
}

/**
 * Session grouping (e.g. morning, afternoon) with its periods.
 */
export interface RecognizedSession {
  sessionKey: SessionKey;
  label: string;
  confidence: number;
  periods: RecognizedPeriod[];
}

/**
 * Header and metadata extracted from the image.
 */
export interface RecognizedSourceSummary {
  title: string | null;
  schoolName: string | null;
  className: string | null;
  studentName: string | null;
  schoolYear: string | null;
}

/**
 * Application-added metadata about the recognition run.
 * NOT trusted from Gemini output.
 */
export interface RecognitionMeta {
  model: string;
  analyzedAt: string;
  imageWidth: number;
  imageHeight: number;
  rotationApplied: RotationAngle;
  durationMs: number;
}

/**
 * Complete structured timetable recognition result.
 */
export interface TimetableRecognitionResult {
  schemaVersion: '1.0';
  documentType: 'school_timetable';
  language: 'vi';
  overallConfidence: number;
  sourceSummary: RecognizedSourceSummary;
  days: RecognizedDay[];
  sessions: RecognizedSession[];
  warnings: string[];
  recognitionMeta: RecognitionMeta;
}

/**
 * Explicit recognition lifecycle states.
 */
export type RecognitionState =
  | 'idle'
  | 'preparing_image'
  | 'analyzing'
  | 'validating_response'
  | 'success'
  | 'invalid_response'
  | 'rate_limited'
  | 'model_unavailable'
  | 'permission_denied'
  | 'network_error'
  | 'timeout'
  | 'cancelled';

/**
 * Locally calculated summary counts from validated recognition data.
 */
export interface RecognitionSummaryCounts {
  totalDays: number;
  totalSessions: number;
  totalPeriods: number;
  recognizedCells: number;
  emptyCells: number;
  uncertainCells: number;
  unreadableCells: number;
  needsReviewCells: number;
}
