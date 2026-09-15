/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * System and task prompt instructing Gemini on structured timetable extraction.
 * Strictly enforces Vietnamese school timetable transcription rules and anti-hallucination discipline.
 */
export const TIMETABLE_RECOGNITION_SYSTEM_PROMPT = `You are an expert OCR and structured data extraction system specializing in Vietnamese school timetables (thời khóa biểu).
Your sole task is to transcribe and structure the timetable visible in the provided image into strict JSON.

CRITICAL ANTI-HALLUCINATION & FIDELITY RULES:
1. READ TABLE STRUCTURE BEFORE SUBJECTS:
   - Identify header row/columns representing days of the week:
     Thứ 2 / Thứ Hai -> "monday"
     Thứ 3 / Thứ Ba -> "tuesday"
     Thứ 4 / Thứ Tư -> "wednesday"
     Thứ 5 / Thứ Năm -> "thursday"
     Thứ 6 / Thứ Sáu -> "friday"
     Thứ 7 / Thứ Bảy -> "saturday"
     Chủ Nhật / CN -> "sunday"
     Unclear -> "unknown"
   - Identify visible sessions (Buổi sáng -> "morning", Buổi chiều -> "afternoon", other -> "other").
   - Identify period numbers (Tiết 1, 2, 3, 4, 5...).
   - Only return days and sessions that actually appear in the image. If an image only has Monday to Friday, DO NOT invent Saturday or Sunday.

2. TRANSCRIBE VISIBLE CONTENT ONLY:
   - Transcribe only information that is visibly present in the image.
   - NEVER infer or guess missing subjects based on Vietnamese school curriculum.
   - NEVER assume subjects repeat across empty cells or neighboring days.
   - NEVER invent cells that lie outside the visible table.

3. CELL STATUS DEFINITIONS (STRICT):
   - "recognized": Text is sufficiently legible and can reasonably be transcribed. Set subjectRaw to the exact visible text, and subjectNormalized to a cleaned Vietnamese name if standard.
   - "empty": The cell visibly exists in the grid but contains no text, lines, or subjects (blank slot). Set subjectRaw: null, subjectNormalized: null.
   - "uncertain": Text appears to be present, but cannot be read or identified with high confidence (e.g. "T... Việt", "T..."). Set subjectRaw to whatever partial characters are visible, subjectNormalized: null.
   - "unreadable": The cell is obscured by glare, blur, heavy shadow, physical damage, severe cropping, or illegible handwriting. Set subjectRaw: null, subjectNormalized: null.
   - CRITICAL RULE: EMPTY IS NOT THE SAME AS UNCERTAIN OR UNREADABLE. Never mark an unreadable or obscured cell as "empty".

4. CONSERVATIVE SUBJECT NORMALIZATION:
   - Standard capitalization and diacritics may be normalized (e.g., "TOÁN" -> "Toán", "Tiếng việt" -> "Tiếng Việt", "Lịch sử" -> "Lịch sử").
   - For ambiguous abbreviations, DO NOT force an assumption:
     e.g., "TV" must NOT automatically become "Tiếng Việt" unless context provides complete certainty; keep subjectRaw: "TV" and subjectNormalized: null.
     e.g., "LS&ĐL" -> subjectRaw: "LS&ĐL", subjectNormalized: null.
     e.g., "HĐTN" -> subjectRaw: "HĐTN", subjectNormalized: null.

5. SOURCE METADATA:
   - Extract title, schoolName, className, studentName, schoolYear ONLY if clearly written in the document header.
   - If not clearly visible, set each field to null. DO NOT guess.

6. CONFIDENCE SCORES:
   - Provide realistic floating-point numbers between 0.0 and 1.0 for overallConfidence, days, sessions, and individual cells.

7. WARNINGS:
   - If the image is tilted, cropped, blurry, has glare, or contains ambiguous sections, add concise descriptive Vietnamese warnings in the "warnings" string array (e.g. "Một số chữ ở Thứ 5 hơi mờ.", "Ảnh bị cắt mép phải.").`;

/**
 * OpenAPI-compatible JSON schema for Gemini structured output.
 */
export const TIMETABLE_RECOGNITION_SCHEMA = {
  type: 'OBJECT',
  properties: {
    schemaVersion: {
      type: 'STRING',
      description: 'Must be exactly "1.0"',
    },
    documentType: {
      type: 'STRING',
      description: 'Must be exactly "school_timetable"',
    },
    language: {
      type: 'STRING',
      description: 'Must be "vi"',
    },
    overallConfidence: {
      type: 'NUMBER',
      description: 'Overall recognition confidence between 0.0 and 1.0',
    },
    sourceSummary: {
      type: 'OBJECT',
      description: 'Header metadata visible in image or null if absent',
      properties: {
        title: { type: 'STRING', nullable: true },
        schoolName: { type: 'STRING', nullable: true },
        className: { type: 'STRING', nullable: true },
        studentName: { type: 'STRING', nullable: true },
        schoolYear: { type: 'STRING', nullable: true },
      },
      required: ['title', 'schoolName', 'className', 'studentName', 'schoolYear'],
    },
    days: {
      type: 'ARRAY',
      description: 'Visible days of the week in the timetable',
      items: {
        type: 'OBJECT',
        properties: {
          dayKey: {
            type: 'STRING',
            enum: [
              'monday',
              'tuesday',
              'wednesday',
              'thursday',
              'friday',
              'saturday',
              'sunday',
              'unknown',
            ],
          },
          label: {
            type: 'STRING',
            description: 'Vietnamese label e.g. Thứ 2, Thứ 3...',
          },
          confidence: {
            type: 'NUMBER',
          },
        },
        required: ['dayKey', 'label', 'confidence'],
      },
    },
    sessions: {
      type: 'ARRAY',
      description: 'Sessions (Morning, Afternoon, etc.) present in the timetable',
      items: {
        type: 'OBJECT',
        properties: {
          sessionKey: {
            type: 'STRING',
            enum: ['morning', 'afternoon', 'other', 'unknown'],
          },
          label: {
            type: 'STRING',
            description: 'Session display label e.g. Buổi sáng, Buổi chiều',
          },
          confidence: {
            type: 'NUMBER',
          },
          periods: {
            type: 'ARRAY',
            description: 'List of period rows in this session',
            items: {
              type: 'OBJECT',
              properties: {
                periodNumber: {
                  type: 'INTEGER',
                  description: 'Period number (1, 2, 3...)',
                },
                cells: {
                  type: 'ARRAY',
                  description: 'Cells corresponding to visible days in this period',
                  items: {
                    type: 'OBJECT',
                    properties: {
                      dayKey: {
                        type: 'STRING',
                        enum: [
                          'monday',
                          'tuesday',
                          'wednesday',
                          'thursday',
                          'friday',
                          'saturday',
                          'sunday',
                          'unknown',
                        ],
                      },
                      status: {
                        type: 'STRING',
                        enum: ['recognized', 'empty', 'uncertain', 'unreadable'],
                      },
                      subjectRaw: {
                        type: 'STRING',
                        nullable: true,
                        description: 'Exact visible text or null',
                      },
                      subjectNormalized: {
                        type: 'STRING',
                        nullable: true,
                        description: 'Standardized subject name or null if uncertain',
                      },
                      confidence: {
                        type: 'NUMBER',
                        description: 'Confidence between 0.0 and 1.0',
                      },
                    },
                    required: ['dayKey', 'status', 'subjectRaw', 'subjectNormalized', 'confidence'],
                  },
                },
              },
              required: ['periodNumber', 'cells'],
            },
          },
        },
        required: ['sessionKey', 'label', 'confidence', 'periods'],
      },
    },
    warnings: {
      type: 'ARRAY',
      description: 'Plain-text Vietnamese warnings or notes regarding quality or ambiguity',
      items: {
        type: 'STRING',
      },
    },
  },
  required: [
    'schemaVersion',
    'documentType',
    'language',
    'overallConfidence',
    'sourceSummary',
    'days',
    'sessions',
    'warnings',
  ],
};
