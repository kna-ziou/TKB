/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  TimetableRecognitionResult,
  RecognizedDay,
  RecognizedSession,
  RecognizedPeriod,
  RecognizedCell,
  RecognizedSourceSummary,
  DayKey,
  SessionKey,
  CellStatus,
  RecognitionSummaryCounts,
  RecognitionMeta,
} from '../types/timetableRecognition';

const MAX_DAYS = 7;
const MAX_SESSIONS = 4;
const MAX_PERIODS_PER_SESSION = 12;
const MAX_CELLS_PER_PERIOD = 7;
const MAX_WARNING_COUNT = 20;

const MAX_STRING_LENGTH = {
  subjectRaw: 100,
  subjectNormalized: 100,
  metadata: 200,
  warning: 500,
  label: 50,
};

const ALLOWED_DAY_KEYS = new Set<DayKey>([
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
  'unknown',
]);

const ALLOWED_SESSION_KEYS = new Set<SessionKey>([
  'morning',
  'afternoon',
  'other',
  'unknown',
]);

const ALLOWED_CELL_STATUSES = new Set<CellStatus>([
  'recognized',
  'empty',
  'uncertain',
  'unreadable',
]);

/**
 * Sanitizes arbitrary text by stripping HTML tags, removing non-printable control characters,
 * and trimming bounding whitespace.
 */
export function sanitizeString(val: unknown, maxLength: number): string | null {
  if (val === null || val === undefined) return null;
  if (typeof val !== 'string') return null;

  // Strip script/style blocks along with contents, then strip remaining HTML tags and control chars
  const clean = val
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim();

  if (!clean) return null;
  return clean.slice(0, maxLength);
}

/**
 * Validates and clamps confidence scores to [0.0, 1.0].
 */
export function validateConfidence(val: unknown): number {
  if (typeof val !== 'number' || Number.isNaN(val)) return 0.5;
  if (val < 0) return 0;
  if (val > 1) return 1;
  return Math.round(val * 100) / 100;
}

export interface ValidationResult {
  valid: boolean;
  data: TimetableRecognitionResult | null;
  error?: string;
}

/**
 * Robustly extracts the JSON string candidate from raw model output,
 * handling markdown code fences, surrounding prose, or raw JSON.
 */
export function extractJsonCandidate(str: string): string {
  const text = str.trim();
  if (!text) return '';

  // 1. Check for markdown code fences: ```json ... ``` or ``` ... ```
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch && fenceMatch[1]) {
    const inside = fenceMatch[1].trim();
    if (inside.startsWith('{') && inside.endsWith('}')) {
      return inside;
    }
  }

  // 2. If the trimmed text itself starts with { and ends with }
  if (text.startsWith('{') && text.endsWith('}')) {
    return text;
  }

  // 3. Scan for outer-most curly braces to ignore conversational prose
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return text.substring(firstBrace, lastBrace + 1).trim();
  }

  return text;
}

/**
 * Parses and validates Gemini JSON response payload against strict schema and business rules.
 */
export function validateAndSanitizeRecognitionResponse(
  rawJson: unknown,
  meta: RecognitionMeta
): ValidationResult {
  try {
    let parsed: Record<string, unknown>;

    if (typeof rawJson === 'string') {
      const cleanStr = extractJsonCandidate(rawJson);
      if (!cleanStr) {
        return { valid: false, data: null, error: 'Phản hồi từ Gemini rỗng.' };
      }

      // Check for apparent truncated JSON
      if (cleanStr.startsWith('{') && !cleanStr.endsWith('}')) {
        return {
          valid: false,
          data: null,
          error: 'Dữ liệu JSON từ Gemini bị cắt ngắn hoặc không hoàn chỉnh. Vui lòng thử lại.',
        };
      }

      try {
        parsed = JSON.parse(cleanStr);
      } catch (parseErr: unknown) {
        const parseMsg = parseErr instanceof Error ? parseErr.message : String(parseErr);
        if (
          parseMsg.includes('Unexpected end of JSON input') ||
          parseMsg.includes('Unexpected end of data')
        ) {
          return {
            valid: false,
            data: null,
            error: 'Dữ liệu JSON từ Gemini bị cắt ngắn hoặc không hoàn chỉnh. Vui lòng thử lại.',
          };
        }
        return {
          valid: false,
          data: null,
          error: `Phản hồi từ Gemini không phải là JSON hợp lệ (${parseMsg}).`,
        };
      }
    } else if (typeof rawJson === 'object' && rawJson !== null) {
      parsed = rawJson as Record<string, unknown>;
    } else {
      return { valid: false, data: null, error: 'Phản hồi không phải là JSON hợp lệ.' };
    }

    if (!parsed || typeof parsed !== 'object') {
      return { valid: false, data: null, error: 'Dữ liệu trả về không phải là object.' };
    }

    // 1. Schema version & document type check
    const schemaVersion = sanitizeString(parsed.schemaVersion, 10) || '1.0';
    const documentType = sanitizeString(parsed.documentType, 50) || 'school_timetable';
    const language = sanitizeString(parsed.language, 10) || 'vi';
    const overallConfidence = validateConfidence(parsed.overallConfidence);

    // 2. Source Summary
    const rawSummary = (parsed.sourceSummary as Record<string, unknown>) || {};
    const sourceSummary: RecognizedSourceSummary = {
      title: sanitizeString(rawSummary.title, MAX_STRING_LENGTH.metadata),
      schoolName: sanitizeString(rawSummary.schoolName, MAX_STRING_LENGTH.metadata),
      className: sanitizeString(rawSummary.className, MAX_STRING_LENGTH.metadata),
      studentName: sanitizeString(rawSummary.studentName, MAX_STRING_LENGTH.metadata),
      schoolYear: sanitizeString(rawSummary.schoolYear, MAX_STRING_LENGTH.metadata),
    };

    // 3. Days Array
    if (!Array.isArray(parsed.days)) {
      return { valid: false, data: null, error: 'Thiếu danh sách các ngày trong tuần.' };
    }

    if (parsed.days.length > MAX_DAYS) {
      return {
        valid: false,
        data: null,
        error: `Số lượng ngày vượt quá giới hạn an toàn (${MAX_DAYS}).`,
      };
    }

    const validatedDays: RecognizedDay[] = [];
    const seenDayKeys = new Set<string>();

    for (const rawDay of parsed.days) {
      if (!rawDay || typeof rawDay !== 'object') continue;
      const dayObj = rawDay as Record<string, unknown>;

      let dayKey = sanitizeString(dayObj.dayKey, 20)?.toLowerCase() as DayKey;
      if (!dayKey || !ALLOWED_DAY_KEYS.has(dayKey)) {
        dayKey = 'unknown';
      }

      if (dayKey !== 'unknown') {
        if (seenDayKeys.has(dayKey)) {
          // Reject duplicate day definitions in top-level days array
          continue;
        }
        seenDayKeys.add(dayKey);
      }

      const label =
        sanitizeString(dayObj.label, MAX_STRING_LENGTH.label) ||
        (dayKey === 'monday'
          ? 'Thứ 2'
          : dayKey === 'tuesday'
          ? 'Thứ 3'
          : dayKey === 'wednesday'
          ? 'Thứ 4'
          : dayKey === 'thursday'
          ? 'Thứ 5'
          : dayKey === 'friday'
          ? 'Thứ 6'
          : dayKey === 'saturday'
          ? 'Thứ 7'
          : dayKey === 'sunday'
          ? 'Chủ nhật'
          : 'Khác');

      const confidence = validateConfidence(dayObj.confidence);

      validatedDays.push({
        dayKey,
        label,
        confidence,
      });
    }

    if (validatedDays.length === 0) {
      return { valid: false, data: null, error: 'Không tìm thấy ngày nào trong thời khóa biểu.' };
    }

    // 4. Sessions Array
    if (!Array.isArray(parsed.sessions)) {
      return { valid: false, data: null, error: 'Thiếu danh sách các buổi học.' };
    }

    if (parsed.sessions.length > MAX_SESSIONS) {
      return {
        valid: false,
        data: null,
        error: `Số buổi học vượt quá giới hạn an toàn (${MAX_SESSIONS}).`,
      };
    }

    const validatedSessions: RecognizedSession[] = [];

    for (const rawSession of parsed.sessions) {
      if (!rawSession || typeof rawSession !== 'object') continue;
      const sessionObj = rawSession as Record<string, unknown>;

      let sessionKey = sanitizeString(sessionObj.sessionKey, 20)?.toLowerCase() as SessionKey;
      if (!sessionKey || !ALLOWED_SESSION_KEYS.has(sessionKey)) {
        sessionKey = 'unknown';
      }

      const label =
        sanitizeString(sessionObj.label, MAX_STRING_LENGTH.label) ||
        (sessionKey === 'morning'
          ? 'Buổi sáng'
          : sessionKey === 'afternoon'
          ? 'Buổi chiều'
          : 'Buổi học');

      const confidence = validateConfidence(sessionObj.confidence);

      // Periods inside session
      const validatedPeriods: RecognizedPeriod[] = [];
      if (Array.isArray(sessionObj.periods)) {
        if (sessionObj.periods.length > MAX_PERIODS_PER_SESSION) {
          return {
            valid: false,
            data: null,
            error: `Số tiết học mỗi buổi vượt quá giới hạn an toàn (${MAX_PERIODS_PER_SESSION}).`,
          };
        }

        for (let pIdx = 0; pIdx < sessionObj.periods.length; pIdx++) {
          const rawPeriod = sessionObj.periods[pIdx];
          if (!rawPeriod || typeof rawPeriod !== 'object') continue;
          const periodObj = rawPeriod as Record<string, unknown>;

          const rawPeriodNum = Number(periodObj.periodNumber);
          const periodNumber =
            Number.isInteger(rawPeriodNum) && rawPeriodNum > 0
              ? rawPeriodNum
              : pIdx + 1;

          // Cells inside period
          const validatedCells: RecognizedCell[] = [];
          if (Array.isArray(periodObj.cells)) {
            if (periodObj.cells.length > MAX_CELLS_PER_PERIOD) {
              return {
                valid: false,
                data: null,
                error: `Số ô trong một tiết vượt quá giới hạn an toàn (${MAX_CELLS_PER_PERIOD}).`,
              };
            }

            const seenCellDays = new Set<string>();

            for (const rawCell of periodObj.cells) {
              if (!rawCell || typeof rawCell !== 'object') continue;
              const cellObj = rawCell as Record<string, unknown>;

              let cellDayKey = sanitizeString(cellObj.dayKey, 20)?.toLowerCase() as DayKey;
              if (!cellDayKey || !ALLOWED_DAY_KEYS.has(cellDayKey)) {
                cellDayKey = 'unknown';
              }

              // Disallow duplicate day cell per period row
              if (cellDayKey !== 'unknown') {
                if (seenCellDays.has(cellDayKey)) continue;
                seenCellDays.add(cellDayKey);
              }

              let status = sanitizeString(cellObj.status, 20)?.toLowerCase() as CellStatus;
              if (!status || !ALLOWED_CELL_STATUSES.has(status)) {
                status = 'uncertain';
              }

              let subjectRaw = sanitizeString(cellObj.subjectRaw, MAX_STRING_LENGTH.subjectRaw);
              let subjectNormalized = sanitizeString(
                cellObj.subjectNormalized,
                MAX_STRING_LENGTH.subjectNormalized
              );

              // Status consistency enforcement
              if (status === 'empty') {
                subjectRaw = null;
                subjectNormalized = null;
              } else if (status === 'unreadable') {
                subjectRaw = null;
                subjectNormalized = null;
              } else if (status === 'recognized') {
                if (!subjectRaw) {
                  status = 'uncertain';
                }
              }

              const cellConfidence = validateConfidence(cellObj.confidence);

              validatedCells.push({
                dayKey: cellDayKey,
                status,
                subjectRaw,
                subjectNormalized,
                confidence: cellConfidence,
              });
            }
          }

          validatedPeriods.push({
            periodNumber,
            cells: validatedCells,
          });
        }
      }

      validatedSessions.push({
        sessionKey,
        label,
        confidence,
        periods: validatedPeriods,
      });
    }

    if (validatedSessions.length === 0) {
      return { valid: false, data: null, error: 'Không tìm thấy buổi học nào trong dữ liệu.' };
    }

    // 5. Warnings Array
    const validatedWarnings: string[] = [];
    if (Array.isArray(parsed.warnings)) {
      for (const w of parsed.warnings) {
        if (validatedWarnings.length >= MAX_WARNING_COUNT) break;
        const cleanWarning = sanitizeString(w, MAX_STRING_LENGTH.warning);
        if (cleanWarning) {
          validatedWarnings.push(cleanWarning);
        }
      }
    }

    const finalResult: TimetableRecognitionResult = {
      schemaVersion: '1.0',
      documentType: 'school_timetable',
      language: 'vi',
      overallConfidence,
      sourceSummary,
      days: validatedDays,
      sessions: validatedSessions,
      warnings: validatedWarnings,
      recognitionMeta: meta,
    };

    return {
      valid: true,
      data: finalResult,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Lỗi phân tích cú pháp JSON';
    return {
      valid: false,
      data: null,
      error: `Dữ liệu nhận dạng không đúng định dạng: ${msg}`,
    };
  }
}

/**
 * Accurately aggregates recognition counts strictly from validated data.
 * Does not trust any external counters.
 */
export function calculateRecognitionSummary(
  result: TimetableRecognitionResult
): RecognitionSummaryCounts {
  let recognizedCells = 0;
  let emptyCells = 0;
  let uncertainCells = 0;
  let unreadableCells = 0;
  let lowConfidenceRecognized = 0;
  let totalPeriods = 0;

  for (const session of result.sessions) {
    totalPeriods += session.periods.length;
    for (const period of session.periods) {
      for (const cell of period.cells) {
        if (cell.status === 'recognized') {
          recognizedCells++;
          if (cell.confidence < 0.85) {
            lowConfidenceRecognized++;
          }
        } else if (cell.status === 'empty') {
          emptyCells++;
        } else if (cell.status === 'uncertain') {
          uncertainCells++;
        } else if (cell.status === 'unreadable') {
          unreadableCells++;
        }
      }
    }
  }

  const needsReviewCells = uncertainCells + unreadableCells + lowConfidenceRecognized;

  return {
    totalDays: result.days.length,
    totalSessions: result.sessions.length,
    totalPeriods,
    recognizedCells,
    emptyCells,
    uncertainCells,
    unreadableCells,
    needsReviewCells,
  };
}
