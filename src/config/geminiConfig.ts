/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const DEFAULT_MODEL = 'gemini-3.8-flash';
export const FALLBACK_MODEL = 'gemini-2.5-flash';

export const PROBE_PRIMARY_MODEL = 'gemini-2.5-flash';
export const PROBE_FALLBACK_MODEL = 'gemini-3.8-flash';

export const GEMINI_VALIDATION_TIMEOUT_MS = 4000;
export const GEMINI_RECOGNITION_TIMEOUT_MS = 60000;

/**
 * Centralized Gemini API Configuration
 * Defines default multimodal model, endpoints, timeouts, and validation rules.
 */
export const GEMINI_CONFIG = {
  /** Default multimodal model capable of image understanding and structured output */
  defaultModel: DEFAULT_MODEL,
  /** Fallback model */
  fallbackModel: FALLBACK_MODEL,
  /** Primary probe model for lightweight access checks */
  probePrimaryModel: PROBE_PRIMARY_MODEL,
  /** Fallback probe model if primary probe returns 404 */
  probeFallbackModel: PROBE_FALLBACK_MODEL,
  /** Base API endpoint for Google Generative Language API */
  apiBaseUrl: 'https://generativelanguage.googleapis.com/v1beta',
  /** General timeout in milliseconds */
  timeoutMs: 15000,
  /** Quick validation timeout in milliseconds (4000ms) */
  validationTimeoutMs: GEMINI_VALIDATION_TIMEOUT_MS,
  /** Multimodal recognition timeout in milliseconds (60s) */
  recognitionTimeoutMs: GEMINI_RECOGNITION_TIMEOUT_MS,
} as const;

/**
 * Standard user-facing messages for recognition states.
 */
export const RECOGNITION_STATE_MESSAGES: Record<string, string> = {
  idle: '',
  preparing_image: 'Đang chuẩn bị ảnh...',
  analyzing: 'Gemini đang nhận dạng thời khóa biểu...',
  validating_response: 'Đang kiểm tra kết quả nhận dạng...',
  success: '✓ Đã nhận dạng thời khóa biểu',
  invalid_response: 'Gemini đã trả kết quả nhưng dữ liệu chưa đúng định dạng.',
  rate_limited: 'Gemini API hiện đã đạt giới hạn sử dụng của API Key này.',
  model_unavailable: 'Model Gemini hiện không khả dụng với API Key này.',
  permission_denied: 'Project/API Key chưa có quyền sử dụng model Gemini được yêu cầu.',
  network_error: 'Không thể kết nối Gemini. Vui lòng kiểm tra kết nối mạng.',
  timeout: 'Gemini phản hồi quá lâu. Vui lòng thử lại.',
  cancelled: 'Đã hủy quá trình nhận dạng.',
};

/**
 * Computes a safe, in-memory synchronous hash fingerprint for an API key.
 * Never persists or exposes the key or fingerprint outside memory.
 * Returns null if key is empty or whitespace.
 */
export function computeKeyFingerprint(key: string | null | undefined): string | null {
  if (!key) return null;
  const trimmed = key.trim();
  if (!trimmed) return null;

  // 64-bit FNV-1a hash algorithm producing a deterministic 16-hex-digit fingerprint
  let h1 = 0x811c9dc5;
  let h2 = 0xcbf29ce4;
  for (let i = 0; i < trimmed.length; i++) {
    const code = trimmed.charCodeAt(i);
    h1 ^= code;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= code;
    h2 = Math.imul(h2, 0x100000001b3);
  }

  const p1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const p2 = (h2 >>> 0).toString(16).padStart(8, '0');
  return `${p1}${p2}`;
}

/**
 * Masks an API key for safe display in the UI.
 * Never displays the full key. Shows only the last 4 characters.
 * Example: ••••••••••••••••ABCD
 */
export function maskApiKey(key: string): string {
  if (!key) return '';
  const trimmed = key.trim();
  if (trimmed.length <= 4) {
    return '••••';
  }
  const last4 = trimmed.slice(-4);
  return `••••••••••••••••${last4}`;
}
