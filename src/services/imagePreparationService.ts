/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TimetableImageInput, RotationAngle } from '../types/aiImageImport';

export interface PreparedImageData {
  /** Clean base64 string without data URL prefix (ready for Gemini inlineData) */
  base64: string;
  /** MIME type (image/jpeg, image/png, image/webp) */
  mimeType: string;
  /** Output width in pixels after rotation */
  width: number;
  /** Output height in pixels after rotation */
  height: number;
  /** Rotation that was applied */
  rotationApplied: RotationAngle;
}

/**
 * Converts a Blob or File to a raw base64 string (stripping the data:image/...;base64, prefix).
 */
function fileToBase64(fileOrBlob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        // Strip data:image/...;base64, prefix
        const commaIndex = reader.result.indexOf(',');
        if (commaIndex !== -1) {
          resolve(reader.result.slice(commaIndex + 1));
        } else {
          resolve(reader.result);
        }
      } else {
        reject(new Error('Failed to read image as base64 string'));
      }
    };
    reader.onerror = () => reject(reader.error || new Error('FileReader error'));
    reader.readAsDataURL(fileOrBlob);
  });
}

/**
 * Normalizes an image by applying the user's selected preview rotation (0, 90, 180, 270)
 * so that Gemini perceives the exact same visual orientation shown to the user.
 *
 * Rules:
 * - Rotation 0: Directly reads original file into base64 to avoid unnecessary re-compression loss.
 * - Rotation 90 / 270: Swaps canvas width and height, applies transform, draws at full resolution.
 * - Rotation 180: Maintains canvas width and height, applies 180 transform.
 * - Output format: Preserves PNG for PNG files or produces high-quality JPEG (quality 0.95).
 * - Cleans up all temporary canvas and object URLs.
 */
export async function prepareImageForGemini(
  imageInput: TimetableImageInput
): Promise<PreparedImageData> {
  const { file, rotation, width, height, mimeType } = imageInput;

  // Case 1: No rotation needed — preserve 100% original binary fidelity
  if (rotation === 0) {
    const base64 = await fileToBase64(file);
    return {
      base64,
      mimeType: file.type || mimeType || 'image/jpeg',
      width,
      height,
      rotationApplied: 0,
    };
  }

  // Case 2: Rotation required (90, 180, 270) — draw onto high-fidelity canvas
  return new Promise((resolve, reject) => {
    const tempUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(tempUrl);

      const isRotated90or270 = rotation === 90 || rotation === 270;
      const targetWidth = isRotated90or270 ? img.naturalHeight : img.naturalWidth;
      const targetHeight = isRotated90or270 ? img.naturalWidth : img.naturalHeight;

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) {
        reject(new Error('Could not acquire 2D canvas rendering context'));
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Perform rotation transformation
      ctx.save();
      switch (rotation) {
        case 90:
          ctx.translate(targetWidth, 0);
          ctx.rotate((90 * Math.PI) / 180);
          break;
        case 180:
          ctx.translate(targetWidth, targetHeight);
          ctx.rotate((180 * Math.PI) / 180);
          break;
        case 270:
          ctx.translate(0, targetHeight);
          ctx.rotate((270 * Math.PI) / 180);
          break;
      }

      ctx.drawImage(img, 0, 0);
      ctx.restore();

      // Determine output MIME type and high-quality encoding
      const isPng = file.type === 'image/png';
      const outputMime = isPng ? 'image/png' : 'image/jpeg';
      const quality = isPng ? undefined : 0.95;

      canvas.toBlob(
        async (blob) => {
          // Free canvas memory
          canvas.width = 0;
          canvas.height = 0;

          if (!blob) {
            reject(new Error('Failed to encode rotated image canvas to blob'));
            return;
          }

          try {
            const base64 = await fileToBase64(blob);
            resolve({
              base64,
              mimeType: outputMime,
              width: targetWidth,
              height: targetHeight,
              rotationApplied: rotation,
            });
          } catch (err) {
            reject(err);
          }
        },
        outputMime,
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(tempUrl);
      reject(new Error('Failed to load image for rotation processing'));
    };

    img.src = tempUrl;
  });
}
