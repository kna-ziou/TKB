/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GEMINI_CONFIG } from '../config/geminiConfig';
import {
  TIMETABLE_RECOGNITION_SYSTEM_PROMPT,
  TIMETABLE_RECOGNITION_SCHEMA,
} from '../prompts/timetableRecognitionPrompt';
import {
  RecognitionState,
  TimetableRecognitionResult,
} from '../types/timetableRecognition';
import { PreparedImageData } from './imagePreparationService';
import { validateAndSanitizeRecognitionResponse } from './timetableRecognitionValidator';

export type CredentialState = 'missing' | 'ready_unverified' | 'verified' | 'auth_error' | 'candidate_ready';

export type GeminiValidationState =
  | 'missing'
  | 'ready_unverified'
  | 'candidate_ready'
  | 'verified'
  | 'auth_error'
  | 'idle'
  | 'validating'
  | 'valid'
  | 'invalid'
  | 'permission_denied'
  | 'model_unavailable'
  | 'rate_limited'
  | 'service_error'
  | 'network_error'
  | 'timeout';

export type GeminiProbeOutcome =
  | 'valid'
  | 'invalid'
  | 'quota'
  | 'service_error'
  | 'network_error'
  | 'timeout'
  | 'model_unavailable';

export interface GeminiValidationResult {
  state: GeminiValidationState;
  message: string;
  errorType?: 'timeout' | 'network' | 'quota' | 'service_error' | 'invalid' | 'permission_denied' | 'model_unavailable';
  probeStatus?: number | string;
  probeOutcome?: GeminiProbeOutcome;
  durationMs?: number;
  endpoint?: string;
}

export interface RecognitionExecutionResult {
  state: RecognitionState;
  classification?:
    | 'quota_or_rate_limit'
    | 'invalid_key'
    | 'permission_denied'
    | 'service_disabled'
    | 'service_blocked'
    | 'google_service_error'
    | 'timeout'
    | 'network_error'
    | 'model_unavailable'
    | 'success'
    | 'cancelled';
  data: TimetableRecognitionResult | null;
  errorMessage?: string;
  modelUsed?: string;
  isAuthError?: boolean;
}

export const VALIDATION_MESSAGES: Record<GeminiValidationState, string> = {
  missing: 'Chưa nhập API Key',
  ready_unverified: 'API Key đã nhập',
  candidate_ready: 'API Key đã nhập',
  verified: '✓ Đã xác thực',
  auth_error: 'API Key không hợp lệ hoặc không có quyền truy cập.',
  idle: '',
  validating: 'Đang kiểm tra...',
  valid: '✓ Đã xác thực',
  invalid: 'API Key không hợp lệ.',
  permission_denied: 'API Key không hợp lệ hoặc không có quyền truy cập.',
  model_unavailable: 'Model Gemini hiện không khả dụng với API Key này.',
  rate_limited: 'Gemini đang giới hạn yêu cầu. Vui lòng thử lại sau.',
  service_error: 'Dịch vụ Gemini đang tạm thời không phản hồi.',
  network_error: 'Không thể kết nối tới Gemini.',
  timeout: 'Kiểm tra API Key mất quá nhiều thời gian. Vui lòng thử lại.',
};

/**
 * Fast local precheck for candidate Gemini API keys.
 * Fast minimal local sanity check for API keys.
 * PATCH 08B-1F-10:
 * Treat API keys as opaque credentials.
 * Rejects ONLY:
 * - empty or whitespace-only
 * - contains whitespace (spaces, tabs)
 * - contains line breaks (\r, \n)
 * - contains control characters (ASCII 0-31, 127)
 * - obviously too short to be a credential, e.g. < 10 characters
 *
 * Does NOT reject based on:
 * - prefix (e.g. AIza, AI...)
 * - punctuation or special characters
 * - character distribution
 * - assumed Google key structure
 */
export function isMalformedApiKey(key: string): boolean {
  if (!key) return true;
  const trimmed = key.trim();
  // 1. Empty or whitespace-only
  if (trimmed.length === 0) return true;
  // 2. Obviously too short (< 10 characters)
  if (trimmed.length < 10) return true;
  // 3. Contains spaces, tabs, or line breaks
  if (/\s/.test(trimmed)) return true;
  // 4. Contains control characters (ASCII 0-31, 127)
  if (/[\x00-\x1F\x7F]/.test(trimmed)) return true;
  return false;
}

export interface BackendVerifyKeyResult {
  verified: boolean;
  status:
    | 'verified'
    | 'invalid_key'
    | 'permission_denied'
    | 'service_disabled'
    | 'service_blocked'
    | 'quota_or_rate_limit'
    | 'google_service_error'
    | 'timeout'
    | 'network_error'
    | 'local_invalid';
  message: string;
  durationMs?: number;
}

/**
 * PATCH 08B-1F-13: Server-side Gemini API key verification.
 * Browser talks only to Express server POST /api/gemini/verify-key.
 * The server talks to Google models endpoint with x-goog-api-key header.
 */
export async function verifyGeminiApiKeyWithBackend(
  candidateKey: string,
  externalSignal?: AbortSignal
): Promise<BackendVerifyKeyResult> {
  const startTime = Date.now();
  const trimmedKey = candidateKey ? candidateKey.trim() : '';

  // 1. Fast minimal local sanity check
  if (isMalformedApiKey(trimmedKey)) {
    return {
      verified: false,
      status: 'local_invalid',
      message: !trimmedKey ? 'Vui lòng nhập Gemini API Key của bạn.' : VALIDATION_MESSAGES.invalid,
      durationMs: Date.now() - startTime,
    };
  }

  // 2. Call server-side verification endpoint
  try {
    const response = await fetch('/api/gemini/verify-key', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ apiKey: trimmedKey }),
      signal: externalSignal,
    });

    let data: any = null;
    try {
      data = await response.json();
    } catch {
      // Non-JSON response
    }

    if (response.ok && data?.verified === true) {
      return {
        verified: true,
        status: 'verified',
        message: '✓ Đã xác thực',
        durationMs: Date.now() - startTime,
      };
    }

    return {
      verified: false,
      status: data?.status || 'invalid_key',
      message: data?.message || VALIDATION_MESSAGES.invalid,
      durationMs: Date.now() - startTime,
    };
  } catch (err: any) {
    if (externalSignal?.aborted || err?.name === 'AbortError') {
      return {
        verified: false,
        status: 'timeout',
        message: VALIDATION_MESSAGES.timeout,
        durationMs: Date.now() - startTime,
      };
    }

    return {
      verified: false,
      status: 'network_error',
      message: VALIDATION_MESSAGES.network_error,
      durationMs: Date.now() - startTime,
    };
  }
}

/**
 * Validates Gemini API Key via the server-side verification endpoint.
 */
export async function validateGeminiApiKey(
  apiKey: string,
  externalSignal?: AbortSignal
): Promise<GeminiValidationResult> {
  const result = await verifyGeminiApiKeyWithBackend(apiKey, externalSignal);

  if (result.verified) {
    return {
      state: 'verified',
      message: result.message,
      probeStatus: 'verified',
      probeOutcome: 'valid',
      durationMs: result.durationMs,
      endpoint: '/api/gemini/verify-key',
    };
  }

  let mappedState: GeminiValidationState = 'invalid';
  let mappedOutcome: GeminiProbeOutcome = 'invalid';

  switch (result.status) {
    case 'permission_denied':
    case 'service_disabled':
    case 'service_blocked':
      mappedState = 'permission_denied';
      mappedOutcome = 'invalid';
      break;
    case 'quota_or_rate_limit':
      mappedState = 'rate_limited';
      mappedOutcome = 'quota';
      break;
    case 'timeout':
      mappedState = 'timeout';
      mappedOutcome = 'timeout';
      break;
    case 'network_error':
      mappedState = 'network_error';
      mappedOutcome = 'network_error';
      break;
    case 'google_service_error':
      mappedState = 'service_error';
      mappedOutcome = 'service_error';
      break;
    default:
      mappedState = 'invalid';
      mappedOutcome = 'invalid';
      break;
  }

  return {
    state: mappedState,
    message: result.message,
    errorType:
      result.status === 'timeout'
        ? 'timeout'
        : result.status === 'network_error'
        ? 'network'
        : result.status === 'quota_or_rate_limit'
        ? 'quota'
        : 'invalid',
    probeStatus: result.status,
    probeOutcome: mappedOutcome,
    durationMs: result.durationMs,
    endpoint: '/api/gemini/verify-key',
  };
}

/**
 * Safely extracts a sanitized reason string from Google API error response.
 * Strictly NEVER extracts or returns raw user inputs, keys, or sensitive payload data.
 */
async function extractSanitizedReason(response: Response): Promise<string> {
  try {
    const data = await response.json();
    if (data?.error) {
      if (Array.isArray(data.error.details)) {
        for (const detail of data.error.details) {
          if (typeof detail?.reason === 'string') {
            return detail.reason;
          }
        }
      }
      if (typeof data.error.status === 'string') {
        return data.error.status;
      }
      if (typeof data.error.message === 'string') {
        const msg = data.error.message.toLowerCase();
        if (msg.includes('api key not valid') || msg.includes('api_key_invalid')) {
          return 'API_KEY_INVALID';
        }
        if (msg.includes('permission denied') || msg.includes('permission_denied')) {
          return 'PERMISSION_DENIED';
        }
        if (msg.includes('service disabled') || msg.includes('has not been used')) {
          return 'SERVICE_DISABLED';
        }
        if (msg.includes('not found')) {
          return 'MODEL_NOT_FOUND';
        }
      }
    }
  } catch {
    // Non-JSON or empty response body
  }
  return `HTTP_${response.status}`;
}

/**
 * Executes a single multimodal generateContent call to Gemini API for timetable extraction.
 */
async function callGenerateContent(
  apiKey: string,
  modelName: string,
  image: PreparedImageData,
  signal: AbortSignal
): Promise<{ ok: boolean; status: number; text?: string; sanitizedReason?: string }> {
  const endpoint = `${GEMINI_CONFIG.apiBaseUrl}/models/${encodeURIComponent(modelName)}:generateContent`;

  const payload = {
    contents: [
      {
        role: 'user',
        parts: [
          { text: TIMETABLE_RECOGNITION_SYSTEM_PROMPT },
          {
            inlineData: {
              mimeType: image.mimeType,
              data: image.base64,
            },
          },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: TIMETABLE_RECOGNITION_SCHEMA,
      temperature: 0.1,
    },
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'x-goog-api-key': apiKey.trim(),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
    signal,
  });

  if (!response.ok) {
    const sanitizedReason = await extractSanitizedReason(response);
    return {
      ok: false,
      status: response.status,
      sanitizedReason,
    };
  }

  const json = await response.json();
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  return {
    ok: true,
    status: response.status,
    text,
  };
}

/**
 * Executes structured Vietnamese school timetable recognition on an uploaded and normalized image.
 *
 * Architecture:
 * - Sends image in the exact visual orientation shown to the user in preview.
 * - Authenticates strictly with x-goog-api-key header in volatile memory.
 * - Enforces anti-hallucination structured extraction.
 * - Primary attempt on DEFAULT_MODEL (gemini-3.8-flash).
 * - Fallback to FALLBACK_MODEL (gemini-2.5-flash) ONLY when primary model is unavailable.
 * - Local validation and sanitization of the JSON output.
 * - Handles timeouts (60s) and cancellation via AbortSignal.
 */
export async function executeTimetableRecognition(
  apiKey: string,
  image: PreparedImageData,
  externalSignal?: AbortSignal
): Promise<RecognitionExecutionResult> {
  const startTime = Date.now();
  const trimmedKey = apiKey.trim();

  if (!trimmedKey) {
    return {
      state: 'permission_denied',
      data: null,
      errorMessage: 'Chưa nhập API Key.',
    };
  }

  // Setup abort controller combining 60s recognition timeout and external cancellation signal
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort('timeout');
  }, GEMINI_CONFIG.recognitionTimeoutMs);

  // Link external signal if supplied
  const onExternalAbort = () => {
    controller.abort(externalSignal?.reason || 'cancelled');
  };

  if (externalSignal) {
    if (externalSignal.aborted) {
      clearTimeout(timeoutId);
      const reason = externalSignal.reason;
      if (reason === 'timeout') {
        return {
          state: 'timeout',
          classification: 'timeout',
          data: null,
          errorMessage: 'Gemini phản hồi quá lâu. Vui lòng thử lại.',
        };
      }
      return { state: 'cancelled', classification: 'cancelled', data: null };
    }
    externalSignal.addEventListener('abort', onExternalAbort, { once: true });
  }

  try {
    let modelToUse: string = GEMINI_CONFIG.defaultModel;
    let callResult = await callGenerateContent(
      trimmedKey,
      modelToUse,
      image,
      controller.signal
    );

    // Fallback logic: ONLY if primary model fails with 404 / model unavailable
    const shouldFallback =
      !callResult.ok &&
      (callResult.status === 404 ||
        callResult.sanitizedReason === 'MODEL_NOT_FOUND' ||
        callResult.sanitizedReason === 'MODEL_UNAVAILABLE');

    if (shouldFallback && GEMINI_CONFIG.fallbackModel !== modelToUse) {
      modelToUse = GEMINI_CONFIG.fallbackModel;
      callResult = await callGenerateContent(
        trimmedKey,
        modelToUse,
        image,
        controller.signal
      );
    }

    clearTimeout(timeoutId);
    if (externalSignal) {
      externalSignal.removeEventListener('abort', onExternalAbort);
    }

    // Handle HTTP error responses
    if (!callResult.ok) {
      console.warn('Gemini recognition diagnostic:', {
        phase: 'recognition',
        model: modelToUse,
        httpStatus: callResult.status,
        responseValid: false,
        durationMs: Date.now() - startTime,
      });

      // 1. Quota / Rate Limit (429 / RESOURCE_EXHAUSTED) -> do NOT claim invalid key!
      const isQuotaOrRateLimit =
        callResult.status === 429 ||
        callResult.sanitizedReason === 'RESOURCE_EXHAUSTED' ||
        callResult.sanitizedReason === 'RATE_LIMIT_EXCEEDED';

      if (isQuotaOrRateLimit) {
        return {
          state: 'rate_limited',
          classification: 'quota_or_rate_limit',
          data: null,
          errorMessage:
            'Gemini đã đạt giới hạn sử dụng hoặc đang bị giới hạn tần suất. Vui lòng thử lại sau.',
          modelUsed: modelToUse,
          isAuthError: false,
        };
      }

      // 2. Auth Errors (401, 403, or 400 auth-related)
      const isAuthProblem =
        callResult.status === 401 ||
        callResult.status === 403 ||
        (callResult.status === 400 &&
          (callResult.sanitizedReason === 'API_KEY_INVALID' ||
            callResult.sanitizedReason?.includes('KEY') ||
            callResult.sanitizedReason === 'HTTP_400' ||
            callResult.sanitizedReason === 'INVALID_ARGUMENT'));

      if (isAuthProblem) {
        return {
          state: 'permission_denied',
          classification:
            callResult.sanitizedReason === 'API_KEY_INVALID' ? 'invalid_key' : 'permission_denied',
          data: null,
          errorMessage: 'API Key không hợp lệ hoặc không có quyền truy cập Gemini.',
          modelUsed: modelToUse,
          isAuthError: true,
        };
      }

      // 3. Model Unavailable (404)
      if (callResult.status === 404) {
        return {
          state: 'model_unavailable',
          classification: 'model_unavailable',
          data: null,
          errorMessage: 'Model Gemini hiện không khả dụng với API Key này.',
          modelUsed: modelToUse,
          isAuthError: false,
        };
      }

      // 4. Service Error (5xx)
      if (callResult.status >= 500 && callResult.status < 600) {
        return {
          state: 'network_error',
          classification: 'google_service_error',
          data: null,
          errorMessage: 'Dịch vụ Gemini đang tạm thời không phản hồi. Vui lòng thử lại sau.',
          modelUsed: modelToUse,
          isAuthError: false,
        };
      }

      return {
        state: 'network_error',
        classification: 'network_error',
        data: null,
        errorMessage: 'Không thể kết nối Gemini. Vui lòng kiểm tra kết nối mạng.',
        modelUsed: modelToUse,
        isAuthError: false,
      };
    }

    // Check content text presence
    if (!callResult.text) {
      console.warn('Gemini recognition diagnostic:', {
        phase: 'recognition',
        model: modelToUse,
        httpStatus: callResult.status,
        responseValid: false,
        durationMs: Date.now() - startTime,
      });

      return {
        state: 'invalid_response',
        data: null,
        errorMessage: 'Gemini đã trả kết quả nhưng không có nội dung văn bản hợp lệ.',
        modelUsed: modelToUse,
      };
    }

    // Local response validation & sanitization
    const meta = {
      model: modelToUse,
      analyzedAt: new Date().toISOString(),
      imageWidth: image.width,
      imageHeight: image.height,
      rotationApplied: image.rotationApplied,
      durationMs: Date.now() - startTime,
    };

    const validation = validateAndSanitizeRecognitionResponse(callResult.text, meta);

    console.warn('Gemini recognition diagnostic:', {
      phase: 'recognition',
      model: modelToUse,
      httpStatus: callResult.status,
      responseValid: validation.valid,
      durationMs: Date.now() - startTime,
    });

    if (!validation.valid || !validation.data) {
      return {
        state: 'invalid_response',
        data: null,
        errorMessage: validation.error || 'Gemini đã trả kết quả nhưng dữ liệu chưa đúng định dạng.',
        modelUsed: modelToUse,
      };
    }

    return {
      state: 'success',
      data: validation.data,
      modelUsed: modelToUse,
    };
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    if (externalSignal) {
      externalSignal.removeEventListener('abort', onExternalAbort);
    }

    if (controller.signal.aborted) {
      const reason = controller.signal.reason || externalSignal?.reason;
      if (reason === 'timeout') {
        return {
          state: 'timeout',
          classification: 'timeout',
          data: null,
          errorMessage: 'Gemini phản hồi quá lâu. Vui lòng thử lại.',
        };
      }
      return { state: 'cancelled', classification: 'cancelled', data: null };
    }

    console.warn('Gemini recognition diagnostic:', {
      phase: 'recognition',
      model: 'unknown',
      httpStatus: 0,
      responseValid: false,
      durationMs: Date.now() - startTime,
    });

    return {
      state: 'network_error',
      data: null,
      errorMessage: 'Không thể kết nối Gemini. Vui lòng kiểm tra kết nối mạng.',
    };
  }
}

