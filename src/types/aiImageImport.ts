/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type RotationAngle = 0 | 90 | 180 | 270;

export type ImageWorkflowState = 'empty' | 'validating' | 'ready' | 'error';

/**
 * In-memory representation of a validated timetable image.
 * This state exists purely in volatile RAM during the current session.
 * It is NEVER stored in localStorage, sessionStorage, IndexedDB, or backups.
 */
export interface TimetableImageInput {
  /** Raw File reference */
  file: File;
  /** Transient Blob Object URL (revoked on replacement/removal/unmount) */
  objectUrl: string;
  /** Sanitized display file name */
  fileName: string;
  /** MIME type (image/jpeg, image/png, image/webp) */
  mimeType: string;
  /** File size in bytes */
  sizeBytes: number;
  /** Native image width in pixels */
  width: number;
  /** Native image height in pixels */
  height: number;
  /** Current display rotation angle */
  rotation: RotationAngle;
  /** Non-blocking advisory warnings (e.g. resolution below recommendation) */
  validationWarnings?: string[];
}
