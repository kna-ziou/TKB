/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface GoogleVerifyResult {
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
    | 'network_error';
  message: string;
  durationMs: number;
}

/**
 * Normalizes user-entered candidate API key.
 * Trims outer whitespace, strips accidental enclosing quotes,
 * and strips common accidental prefixes (e.g. GEMINI_API_KEY=, Bearer).
 * Never logs or exposes the key.
 */
export function normalizeCandidateKey(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  let key = raw.trim();

  // Strip enclosing double or single quotes
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1).trim();
  }

  // Strip common accidental copy-paste prefixes
  const prefixes = [
    /^bearer\s+/i,
    /^gemini_api_key\s*=\s*/i,
    /^google_api_key\s*=\s*/i,
    /^api_key\s*=\s*/i,
  ];
  for (const prefix of prefixes) {
    if (prefix.test(key)) {
      key = key.replace(prefix, '').trim();
    }
  }

  // Strip quotes again in case they were inside the prefix (e.g. GEMINI_API_KEY="...")
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1).trim();
  }

  return key;
}

/**
 * Verifies a candidate Gemini API key directly against Google Generative Language API.
 * Endpoint: GET https://generativelanguage.googleapis.com/v1beta/models?pageSize=1
 * Header: x-goog-api-key
 * Maximum timeout: 8000ms using AbortController.
 *
 * Strictly adheres to privacy: never logs or persists the key or full responses.
 */
export async function verifyCandidateKeyWithGoogle(
  rawCandidateKey: unknown,
  fetchFn: typeof fetch = fetch
): Promise<GoogleVerifyResult> {
  const startTime = Date.now();
  const normalizedKey = normalizeCandidateKey(rawCandidateKey);

  // Quick sanity rejection on server: empty or obviously invalid
  if (!normalizedKey || normalizedKey.length < 10 || /\s/.test(normalizedKey)) {
    return {
      verified: false,
      status: 'invalid_key',
      message: 'API Key không hợp lệ hoặc không tồn tại.',
      durationMs: Date.now() - startTime,
    };
  }

  const controller = new AbortController();
  const timeoutMs = 8000;
  const timeoutId = setTimeout(() => {
    controller.abort('timeout');
  }, timeoutMs);

  try {
    const googleEndpoint = 'https://generativelanguage.googleapis.com/v1beta/models?pageSize=1';
    const response = await fetchFn(googleEndpoint, {
      method: 'GET',
      headers: {
        'x-goog-api-key': normalizedKey,
        Accept: 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const durationMs = Date.now() - startTime;

    if (response.ok && response.status >= 200 && response.status < 300) {
      let data: any = null;
      try {
        data = await response.json();
      } catch {
        return {
          verified: false,
          status: 'google_service_error',
          message: 'Phản hồi từ Google không đúng định dạng JSON.',
          durationMs,
        };
      }

      if (data && Array.isArray(data.models)) {
        return {
          verified: true,
          status: 'verified',
          message: '✓ Đã xác thực thành công.',
          durationMs,
        };
      }

      return {
        verified: false,
        status: 'google_service_error',
        message: 'Phản hồi từ Google không chứa danh sách model hợp lệ.',
        durationMs,
      };
    }

    // Parse Google's error payload
    let errorData: any = null;
    try {
      errorData = await response.json();
    } catch {
      // Non-JSON or empty response body
    }

    const errObj = errorData?.error;
    const statusStr = (typeof errObj?.status === 'string' ? errObj.status : '').toUpperCase();
    const messageStr = (typeof errObj?.message === 'string' ? errObj.message : '').toLowerCase();

    let reason = '';
    if (Array.isArray(errObj?.details)) {
      for (const d of errObj.details) {
        if (typeof d?.reason === 'string') {
          reason = d.reason.toUpperCase();
          break;
        }
      }
    }

    // Map errors as required by spec:
    // API_KEY_INVALID -> invalid_key
    // 401 / auth error -> invalid_key
    // 403 / PERMISSION_DENIED -> permission_denied
    // SERVICE_DISABLED -> service_disabled
    // API_KEY_SERVICE_BLOCKED -> service_blocked
    // 429 / RESOURCE_EXHAUSTED -> quota_or_rate_limit
    // 5xx -> google_service_error
    let mappedStatus: GoogleVerifyResult['status'] = 'invalid_key';
    let mappedMessage = 'API Key không hợp lệ hoặc không tồn tại.';

    if (
      response.status === 401 ||
      reason === 'API_KEY_INVALID' ||
      statusStr === 'UNAUTHENTICATED' ||
      messageStr.includes('api key not valid') ||
      messageStr.includes('api_key_invalid')
    ) {
      mappedStatus = 'invalid_key';
      mappedMessage = 'API Key không hợp lệ hoặc không tồn tại.';
    } else if (
      reason === 'SERVICE_DISABLED' ||
      statusStr === 'SERVICE_DISABLED' ||
      messageStr.includes('service disabled') ||
      messageStr.includes('has not been used')
    ) {
      mappedStatus = 'service_disabled';
      mappedMessage = 'Gemini API chưa được kích hoạt trên Google Cloud Project của bạn.';
    } else if (
      reason === 'API_KEY_SERVICE_BLOCKED' ||
      statusStr === 'API_KEY_SERVICE_BLOCKED' ||
      messageStr.includes('service blocked')
    ) {
      mappedStatus = 'service_blocked';
      mappedMessage = 'API Key hoặc dịch vụ Gemini đã bị chặn.';
    } else if (
      response.status === 403 ||
      reason === 'PERMISSION_DENIED' ||
      statusStr === 'PERMISSION_DENIED' ||
      messageStr.includes('permission denied')
    ) {
      mappedStatus = 'permission_denied';
      mappedMessage = 'API Key không có quyền truy cập Gemini API.';
    } else if (
      response.status === 429 ||
      reason === 'RATE_LIMIT_EXCEEDED' ||
      reason === 'RESOURCE_EXHAUSTED' ||
      statusStr === 'RESOURCE_EXHAUSTED' ||
      messageStr.includes('quota') ||
      messageStr.includes('rate limit')
    ) {
      mappedStatus = 'quota_or_rate_limit';
      mappedMessage = 'Gemini đang giới hạn yêu cầu (hết quota hoặc vượt tần suất). Vui lòng thử lại sau.';
    } else if (response.status >= 500) {
      mappedStatus = 'google_service_error';
      mappedMessage = 'Dịch vụ Google Gemini đang gặp sự cố tạm thời. Vui lòng thử lại sau.';
    }

    return {
      verified: false,
      status: mappedStatus,
      message: mappedMessage,
      durationMs,
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    const durationMs = Date.now() - startTime;

    if (
      controller.signal.aborted ||
      err?.name === 'AbortError' ||
      controller.signal.reason === 'timeout'
    ) {
      return {
        verified: false,
        status: 'timeout',
        message: 'Kiểm tra API Key mất quá nhiều thời gian (quá 8 giây). Vui lòng thử lại.',
        durationMs,
      };
    }

    return {
      verified: false,
      status: 'network_error',
      message: 'Không thể kết nối tới máy chủ Google Gemini. Vui lòng kiểm tra mạng.',
      durationMs,
    };
  }
}
