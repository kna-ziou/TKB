/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  IMAGE_IMPORT_CONFIG,
  IMAGE_VALIDATION_MESSAGES,
} from '../config/imageImportConfig';
import { RotationAngle } from '../types/aiImageImport';

export interface ImageValidationResult {
  valid: boolean;
  error?: string;
  warnings?: string[];
  width?: number;
  height?: number;
}

/**
 * Format raw byte size into human-readable MB / KB format.
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    const kb = Math.round(bytes / 1024);
    return `${kb} KB`;
  }
  const mb = (bytes / (1024 * 1024)).toFixed(1);
  return `${mb} MB`;
}

/**
 * Calculate counter-clockwise rotation angle: 0 → 270 → 180 → 90 → 0
 */
export function rotateLeft(current: RotationAngle): RotationAngle {
  switch (current) {
    case 0:
      return 270;
    case 270:
      return 180;
    case 180:
      return 90;
    case 90:
      return 0;
    default:
      return 0;
  }
}

/**
 * Calculate clockwise rotation angle: 0 → 90 → 180 → 270 → 0
 */
export function rotateRight(current: RotationAngle): RotationAngle {
  switch (current) {
    case 0:
      return 90;
    case 90:
      return 180;
    case 180:
      return 270;
    case 270:
      return 0;
    default:
      return 0;
  }
}

/**
 * Check if the file's MIME type or extension matches supported image types.
 */
export function isSupportedImageType(file: File): boolean {
  const mimeType = (file.type || '').toLowerCase();
  const fileName = (file.name || '').toLowerCase();

  const isMimeSupported = IMAGE_IMPORT_CONFIG.supportedMimeTypes.some(
    (supportedMime) => mimeType === supportedMime
  );

  const isExtSupported = IMAGE_IMPORT_CONFIG.supportedExtensions.some(
    (ext) => fileName.endsWith(ext)
  );

  return isMimeSupported || isExtSupported;
}

/**
 * Comprehensive client-side image validation:
 * 1. File type / extension check
 * 2. File size limit check (<= 10MB)
 * 3. Browser image decodability check
 * 4. Orientation-aware resolution check (min long edge: 600px, min short edge: 400px)
 * 5. Quality advisory check (< 1280px recommendation warning)
 */
export async function validateTimetableImage(file: File): Promise<ImageValidationResult> {
  // 1. File Type Check
  if (!isSupportedImageType(file)) {
    return {
      valid: false,
      error: IMAGE_VALIDATION_MESSAGES.unsupportedFormat,
    };
  }

  // 2. File Size Check
  if (file.size > IMAGE_IMPORT_CONFIG.maxSizeBytes) {
    return {
      valid: false,
      error: IMAGE_VALIDATION_MESSAGES.oversized,
    };
  }

  // 3. Browser Image Decodability & Dimensions Check
  return new Promise<ImageValidationResult>((resolve) => {
    let objectUrl: string | null = null;
    try {
      objectUrl = URL.createObjectURL(file);
    } catch {
      resolve({
        valid: false,
        error: IMAGE_VALIDATION_MESSAGES.corrupted,
      });
      return;
    }

    const img = new Image();

    img.onload = () => {
      const width = img.naturalWidth;
      const height = img.naturalHeight;

      // Revoke temporary decode URL if image is invalid
      // (Caller will create its own objectUrl for the persistent input state)
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }

      if (!width || !height || width <= 0 || height <= 0) {
        resolve({
          valid: false,
          error: IMAGE_VALIDATION_MESSAGES.corrupted,
        });
        return;
      }

      // Orientation-aware dimension check
      const longEdge = Math.max(width, height);
      const shortEdge = Math.min(width, height);

      if (
        longEdge < IMAGE_IMPORT_CONFIG.minLongEdge ||
        shortEdge < IMAGE_IMPORT_CONFIG.minShortEdge
      ) {
        resolve({
          valid: false,
          error: IMAGE_VALIDATION_MESSAGES.tooSmall,
          width,
          height,
        });
        return;
      }

      // Borderline resolution warning (advisory only, does NOT block workflow)
      const warnings: string[] = [];
      if (longEdge < IMAGE_IMPORT_CONFIG.recommendedLongEdge) {
        warnings.push(IMAGE_VALIDATION_MESSAGES.borderlineResolution);
      }

      resolve({
        valid: true,
        warnings,
        width,
        height,
      });
    };

    img.onerror = () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
      resolve({
        valid: false,
        error: IMAGE_VALIDATION_MESSAGES.corrupted,
      });
    };

    img.src = objectUrl;
  });
}
