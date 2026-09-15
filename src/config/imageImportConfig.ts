/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Centralized configuration for AI Timetable Image Import
 */
export const IMAGE_IMPORT_CONFIG = {
  /** Maximum allowed file size in Megabytes */
  maxSizeMB: 10,
  /** Maximum allowed file size in Bytes (10 MB) */
  maxSizeBytes: 10 * 1024 * 1024,
  /** Supported MIME types */
  supportedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'] as const,
  /** Supported file extensions */
  supportedExtensions: ['.jpg', '.jpeg', '.png', '.webp'] as const,
  /** HTML input accept string */
  acceptAttribute: 'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp',
  /** Orientation-aware minimum dimensions */
  minLongEdge: 600,
  minShortEdge: 400,
  /** Recommended minimum resolution for best OCR & analysis accuracy */
  recommendedLongEdge: 1280,
} as const;

export const IMAGE_VALIDATION_MESSAGES = {
  unsupportedFormat: 'Định dạng ảnh chưa được hỗ trợ. Vui lòng sử dụng JPG, PNG hoặc WEBP.',
  oversized: 'Ảnh vượt quá dung lượng cho phép (10 MB). Vui lòng chọn ảnh nhỏ hơn.',
  tooSmall: 'Ảnh có độ phân giải quá thấp để nhận dạng chính xác. Vui lòng sử dụng ảnh rõ hơn.',
  borderlineResolution: 'Khuyến nghị ảnh từ 1280 px trở lên ở cạnh dài.',
  corrupted: 'Không thể đọc ảnh này. Tệp có thể bị lỗi hoặc không phải ảnh hợp lệ.',
} as const;
