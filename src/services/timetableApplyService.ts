/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  DayKey,
  SessionType,
  TimetableConfig,
  TimetableMeta,
  TimetableState,
} from '../types/timetable';
import {
  TimetableReviewDraft,
  ReviewCell,
} from '../types/timetableReview';
import {
  ApplyCellStrategy,
  ApplyOptions,
  CellApplyChange,
  CellChangeType,
  CellResolutionAction,
  MetadataApplyChange,
  StructureApplyChange,
  TimetableApplyPlan,
  ApplyPlanSummary,
} from '../types/timetableApply';
import { getSubjectDisplay, findSubjectByName } from '../utils/subjectUtils';
import { ALL_DAYS, DEFAULT_5_DAYS, DAY_LABELS, resizeSchedule } from '../utils/timetableFactory';
import { isReviewReady } from './timetableReviewService';

const MAX_PERIODS_LIMIT = 6;

const SUPPORTED_APP_DAYS: DayKey[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
];

const METADATA_FIELD_LABELS: Record<keyof TimetableMeta, string> = {
  title: 'Tiêu đề',
  schoolName: 'Trường học',
  className: 'Lớp học',
  studentName: 'Học sinh',
  schoolYear: 'Năm học',
  grade: 'Khối lớp',
  customGrade: 'Khối lớp tùy chỉnh',
};

/**
 * Creates safe default apply options for a given review draft.
 */
export function createDefaultApplyOptions(draft: TimetableReviewDraft): ApplyOptions {
  return {
    metadata: {
      title: Boolean(draft.metadata.title && draft.metadata.title.trim() !== ''),
      schoolName: Boolean(draft.metadata.schoolName && draft.metadata.schoolName.trim() !== ''),
      className: Boolean(draft.metadata.className && draft.metadata.className.trim() !== ''),
      studentName: false, // Default false per specification
      schoolYear: Boolean(draft.metadata.schoolYear && draft.metadata.schoolYear.trim() !== ''),
    },
    structure: {
      adjustDays: true,
      adjustPeriods: true,
    },
    cellStrategy: 'fill_empty_only',
    allowDestructiveClear: false,
  };
}

/**
 * Derives the active days recognized in the review draft.
 */
export function getReviewedDays(draft: TimetableReviewDraft): {
  validDays: DayKey[];
  unsupportedDays: string[];
} {
  const validDays: DayKey[] = [];
  const unsupportedDays: string[] = [];

  for (const d of draft.days) {
    if (SUPPORTED_APP_DAYS.includes(d.dayKey as DayKey)) {
      if (!validDays.includes(d.dayKey as DayKey)) {
        validDays.push(d.dayKey as DayKey);
      }
    } else {
      if (!unsupportedDays.includes(d.dayKey)) {
        unsupportedDays.push(d.dayKey);
      }
    }
  }

  // Sort according to standard calendar order
  validDays.sort(
    (a, b) => SUPPORTED_APP_DAYS.indexOf(a) - SUPPORTED_APP_DAYS.indexOf(b)
  );

  return { validDays, unsupportedDays };
}

/**
 * Derives max morning and afternoon period numbers from review draft cells.
 */
export function getReviewedPeriodCounts(draft: TimetableReviewDraft): {
  morningPeriods: number;
  afternoonPeriods: number;
  unsupportedSessions: string[];
} {
  let maxMorning = 0;
  let maxAfternoon = 0;
  const unsupportedSessions: string[] = [];

  for (const session of draft.sessions) {
    if (session.sessionKey === 'morning') {
      const highest = Math.max(0, ...session.periodNumbers);
      if (highest > maxMorning) maxMorning = highest;
    } else if (session.sessionKey === 'afternoon') {
      const highest = Math.max(0, ...session.periodNumbers);
      if (highest > maxAfternoon) maxAfternoon = highest;
    } else {
      if (!unsupportedSessions.includes(session.sessionKey)) {
        unsupportedSessions.push(session.sessionKey);
      }
    }
  }

  // Also check individual cells for safety
  for (const cell of Object.values(draft.cells)) {
    if (cell.sessionKey === 'morning') {
      if (cell.periodNumber > maxMorning) maxMorning = cell.periodNumber;
    } else if (cell.sessionKey === 'afternoon') {
      if (cell.periodNumber > maxAfternoon) maxAfternoon = cell.periodNumber;
    } else {
      if (!unsupportedSessions.includes(cell.sessionKey)) {
        unsupportedSessions.push(cell.sessionKey);
      }
    }
  }

  return {
    morningPeriods: maxMorning,
    afternoonPeriods: maxAfternoon,
    unsupportedSessions,
  };
}

/**
 * Builds the complete TimetableApplyPlan by comparing the current timetable document
 * with the review draft under the chosen options and per-cell overrides.
 */
export function buildTimetableApplyPlan(
  currentTimetable: TimetableState,
  reviewDraft: TimetableReviewDraft,
  options: ApplyOptions,
  overrides: Record<string, CellResolutionAction> = {}
): TimetableApplyPlan {
  const warnings: string[] = [];
  const blockingIssues: string[] = [];

  // Check 1: Review readiness constraint
  if (!isReviewReady(reviewDraft)) {
    blockingIssues.push(
      `Dữ liệu kiểm tra chưa hoàn tất (${reviewDraft.reviewMeta.unresolvedCellCount} ô cần kiểm tra). Hãy hoàn thành bước kiểm tra trước.`
    );
  }

  // Check 2: Day support check
  const { validDays, unsupportedDays } = getReviewedDays(reviewDraft);
  if (unsupportedDays.length > 0) {
    const dayNames = unsupportedDays.map((d) => (d === 'sunday' ? 'Chủ nhật' : d)).join(', ');
    blockingIssues.push(
      `Ảnh có dữ liệu ngày không được hỗ trợ (${dayNames}). Ứng dụng hiện chỉ hỗ trợ từ Thứ 2 đến Thứ 7.`
    );
  }

  // Check 3: Session support check
  const { morningPeriods: reviewedMorning, afternoonPeriods: reviewedAfternoon, unsupportedSessions } =
    getReviewedPeriodCounts(reviewDraft);
  if (unsupportedSessions.length > 0) {
    blockingIssues.push(
      `Ảnh chứa buổi học không xác định (${unsupportedSessions.join(', ')}). Ứng dụng chỉ hỗ trợ buổi Sáng và Chiều.`
    );
  }

  // Check 4: App limits check (max 6 periods per session)
  if (reviewedMorning > MAX_PERIODS_LIMIT) {
    blockingIssues.push(
      `Ảnh có ${reviewedMorning} tiết buổi sáng, vượt quá giới hạn tối đa ${MAX_PERIODS_LIMIT} tiết của ứng dụng.`
    );
  }
  if (reviewedAfternoon > MAX_PERIODS_LIMIT) {
    blockingIssues.push(
      `Ảnh có ${reviewedAfternoon} tiết buổi chiều, vượt quá giới hạn tối đa ${MAX_PERIODS_LIMIT} tiết của ứng dụng.`
    );
  }

  // Determine effective target structure
  const targetDays: DayKey[] = options.structure.adjustDays
    ? validDays.length > 0
      ? validDays
      : currentTimetable.config.activeDays
    : currentTimetable.config.activeDays;

  const targetMorningPeriods: number = options.structure.adjustPeriods
    ? Math.max(1, Math.min(MAX_PERIODS_LIMIT, reviewedMorning || currentTimetable.config.morningPeriods))
    : currentTimetable.config.morningPeriods;

  const targetAfternoonPeriods: number = options.structure.adjustPeriods
    ? Math.min(MAX_PERIODS_LIMIT, reviewedAfternoon)
    : currentTimetable.config.afternoonPeriods;

  // Metadata Changes
  const metadataChanges: MetadataApplyChange[] = [];
  const metaFields: (keyof TimetableMeta)[] = [
    'title',
    'schoolName',
    'className',
    'studentName',
    'schoolYear',
  ];

  for (const field of metaFields) {
    const currentVal = currentTimetable.meta[field] || '';
    const rawAiVal = reviewDraft.metadata[field as keyof TimetableReviewDraft['metadata']];
    const aiVal = rawAiVal && rawAiVal.trim() !== '' ? rawAiVal.trim() : null;
    const isEnabled = Boolean(options.metadata[field as keyof typeof options.metadata]);

    const hasAiValue = Boolean(aiVal);
    let finalValue = currentVal;
    let isChanged = false;

    if (isEnabled && hasAiValue && aiVal !== null) {
      finalValue = aiVal;
      isChanged = finalValue.trim() !== currentVal.trim();
    }

    metadataChanges.push({
      field: field as MetadataApplyChange['field'],
      label: METADATA_FIELD_LABELS[field] || field,
      currentValue: currentVal,
      aiValue: aiVal,
      finalValue,
      enabled: isEnabled,
      isChanged,
      hasAiValue,
    });
  }

  // Structure Changes
  const structureChanges: StructureApplyChange[] = [];

  // Days structure change
  const currentDaysDesc =
    currentTimetable.config.activeDays.length === 5
      ? 'Thứ 2 – Thứ 6'
      : currentTimetable.config.activeDays.length === 6
      ? 'Thứ 2 – Thứ 7'
      : `${currentTimetable.config.activeDays.length} ngày`;

  const proposedDaysDesc =
    validDays.length === 5
      ? 'Thứ 2 – Thứ 6'
      : validDays.length === 6
      ? 'Thứ 2 – Thứ 7'
      : `${validDays.length} ngày`;

  const isDaysChanged =
    options.structure.adjustDays &&
    JSON.stringify(currentTimetable.config.activeDays) !== JSON.stringify(targetDays);

  structureChanges.push({
    type: 'days',
    label: 'Số ngày trong tuần',
    currentDescription: currentDaysDesc,
    proposedDescription: options.structure.adjustDays ? proposedDaysDesc : 'Giữ nguyên cấu trúc hiện tại',
    isChanged: isDaysChanged,
    enabled: options.structure.adjustDays,
    targetDays: options.structure.adjustDays ? targetDays : undefined,
  });

  // Morning periods structure change
  const isMorningChanged =
    options.structure.adjustPeriods &&
    currentTimetable.config.morningPeriods !== targetMorningPeriods;

  structureChanges.push({
    type: 'morningPeriods',
    label: 'Số tiết buổi sáng',
    currentDescription: `${currentTimetable.config.morningPeriods} tiết`,
    proposedDescription: options.structure.adjustPeriods
      ? `${targetMorningPeriods} tiết`
      : 'Giữ nguyên cấu trúc hiện tại',
    isChanged: isMorningChanged,
    enabled: options.structure.adjustPeriods,
  });

  // Afternoon periods structure change
  const isAfternoonChanged =
    options.structure.adjustPeriods &&
    currentTimetable.config.afternoonPeriods !== targetAfternoonPeriods;

  structureChanges.push({
    type: 'afternoonPeriods',
    label: 'Số tiết buổi chiều',
    currentDescription: `${currentTimetable.config.afternoonPeriods} tiết`,
    proposedDescription: options.structure.adjustPeriods
      ? `${targetAfternoonPeriods} tiết`
      : 'Giữ nguyên cấu trúc hiện tại',
    isChanged: isAfternoonChanged,
    enabled: options.structure.adjustPeriods,
  });

  // Cell Changes Mapping
  const cellChanges: CellApplyChange[] = [];
  let unmappableCount = 0;

  // Track all coordinates present in reviewDraft cells
  for (const cell of Object.values(reviewDraft.cells)) {
    const dayKey = cell.dayKey as DayKey;
    const session = cell.sessionKey as SessionType;
    const periodNumber = cell.periodNumber;
    const periodIndex = periodNumber - 1;

    // Check if session or day is unsupported
    if (!SUPPORTED_APP_DAYS.includes(dayKey) || (session !== 'morning' && session !== 'afternoon')) {
      continue;
    }

    // Check boundary with target structure
    const isDayIncluded = targetDays.includes(dayKey);
    const maxPeriodForSession =
      session === 'morning' ? targetMorningPeriods : targetAfternoonPeriods;
    const isPeriodIncluded = periodNumber <= maxPeriodForSession;

    const currentCellData =
      currentTimetable.schedule[dayKey]?.[session]?.periods?.[periodIndex];
    const currentSubjectRaw = currentCellData
      ? getSubjectDisplay(
          currentTimetable.subjects.find((s) => s.id === currentCellData.subjectId),
          currentCellData
        )
      : '';
    const currentSubject = currentSubjectRaw && currentSubjectRaw.trim() !== ''
      ? currentSubjectRaw.trim()
      : null;

    const aiSubject =
      cell.current.status === 'recognized' && cell.current.subject && cell.current.subject.trim() !== ''
        ? cell.current.subject.trim()
        : null;

    // If out of bounds because structure adjustment is disabled
    if (!isDayIncluded || !isPeriodIncluded) {
      if (aiSubject) {
        unmappableCount++;
        cellChanges.push({
          cellId: cell.id,
          dayKey,
          session,
          periodNumber,
          periodIndex,
          currentSubject,
          aiSubject,
          finalSubject: currentSubject,
          currentValue: currentSubject,
          reviewValue: aiSubject,
          resultValue: currentSubject,
          classification: 'unmappable',
          resolution: 'auto',
          isConflict: true,
          warning: 'Ô nằm ngoài cấu trúc ngày/tiết hiện tại khi chưa bật điều chỉnh cấu trúc.',
        });
      }
      continue;
    }

    // Coordinate is within target structure: classify change
    const override = overrides[cell.id] || 'auto';
    const change = classifyCellChange(
      cell.id,
      dayKey,
      session,
      periodNumber,
      periodIndex,
      currentSubject,
      aiSubject,
      options.cellStrategy,
      options.allowDestructiveClear,
      override
    );

    cellChanges.push(change);
  }

  if (unmappableCount > 0) {
    blockingIssues.push(
      `Có ${unmappableCount} ô từ ảnh nằm ngoài cấu trúc ngày/tiết của thời khóa biểu. Hãy bật "Điều chỉnh số ngày" hoặc "Điều chỉnh số tiết".`
    );
  }

  // Calculate Summary
  const summary = calculateApplySummary(metadataChanges, structureChanges, cellChanges);

  return {
    id: `apply-plan-${Date.now()}`,
    draftVersion: reviewDraft.reviewMeta.updatedAt || reviewDraft.reviewMeta.createdAt,
    createdAt: new Date().toISOString(),
    source: {
      recognitionModel: 'gemini-3.8-flash',
    },
    options,
    overrides,
    metadataChanges,
    structureChanges,
    cellChanges,
    summary,
    warnings,
    blockingIssues,
    isValid: blockingIssues.length === 0,
  };
}

/**
 * Classifies a single cell change according to strategy, current state, AI state, and overrides.
 */
export function classifyCellChange(
  cellId: string,
  dayKey: DayKey,
  session: SessionType,
  periodNumber: number,
  periodIndex: number,
  currentSubject: string | null,
  aiSubject: string | null,
  strategy: ApplyCellStrategy,
  allowDestructiveClear: boolean,
  override: CellResolutionAction
): CellApplyChange {
  const hasCurrent = Boolean(currentSubject && currentSubject.trim() !== '');
  const hasAi = Boolean(aiSubject && aiSubject.trim() !== '');

  // Case 1: Both empty
  if (!hasCurrent && !hasAi) {
    return {
      cellId,
      dayKey,
      session,
      periodNumber,
      periodIndex,
      currentSubject: null,
      aiSubject: null,
      finalSubject: null,
      currentValue: null,
      reviewValue: null,
      resultValue: null,
      classification: 'empty_unchanged',
      resolution: override,
      isConflict: false,
    };
  }

  // Case 2: Current empty, AI occupied -> ADD
  if (!hasCurrent && hasAi) {
    if (override === 'keep_current') {
      return {
        cellId,
        dayKey,
        session,
        periodNumber,
        periodIndex,
        currentSubject: null,
        aiSubject,
        finalSubject: null,
        currentValue: null,
        reviewValue: aiSubject,
        resultValue: null,
        classification: 'skip',
        resolution: override,
        isConflict: false,
      };
    }

    return {
      cellId,
      dayKey,
      session,
      periodNumber,
      periodIndex,
      currentSubject: null,
      aiSubject,
      finalSubject: aiSubject,
      currentValue: null,
      reviewValue: aiSubject,
      resultValue: aiSubject,
      classification: 'add',
      resolution: override,
      isConflict: false,
    };
  }

  // Case 3: Both occupied
  if (hasCurrent && hasAi && currentSubject && aiSubject) {
    // Check if subject text is identical (case-insensitive trimmed comparison)
    if (currentSubject.trim().toLowerCase() === aiSubject.trim().toLowerCase()) {
      return {
        cellId,
        dayKey,
        session,
        periodNumber,
        periodIndex,
        currentSubject,
        aiSubject,
        finalSubject: currentSubject,
        currentValue: currentSubject,
        reviewValue: aiSubject,
        resultValue: currentSubject,
        classification: 'unchanged',
        resolution: override,
        isConflict: false,
      };
    }

    // Differing subjects -> Replacement conflict!
    let classification: CellChangeType;
    let finalSubject: string | null;

    if (override === 'keep_current') {
      classification = 'skip';
      finalSubject = currentSubject;
    } else if (override === 'use_image') {
      classification = 'replace';
      finalSubject = aiSubject;
    } else {
      // Follow global strategy
      if (strategy === 'fill_empty_only') {
        classification = 'skip';
        finalSubject = currentSubject;
      } else {
        // 'prefer_image' or 'replace_all'
        classification = 'replace';
        finalSubject = aiSubject;
      }
    }

    return {
      cellId,
      dayKey,
      session,
      periodNumber,
      periodIndex,
      currentSubject,
      aiSubject,
      finalSubject,
      currentValue: currentSubject,
      reviewValue: aiSubject,
      resultValue: finalSubject,
      classification,
      resolution: override,
      isConflict: true,
    };
  }

  // Case 4: Current occupied, AI empty -> Conflict / Potential Clear
  // (hasCurrent && !hasAi)
  if (hasCurrent && !hasAi && currentSubject) {
    let classification: CellChangeType = 'skip';
    let finalSubject: string | null = currentSubject;

    if (override === 'clear_cell' || override === 'use_image') {
      // Per Section 3:
      // "Use image / Clear -> may clear ONLY when allowClearExisting === true.
      // When destructive clearing is OFF: do not allow an override to bypass the safety guard."
      if (allowDestructiveClear) {
        classification = 'clear_conflict';
        finalSubject = null;
      } else {
        classification = 'skip';
        finalSubject = currentSubject;
      }
    } else if (override === 'keep_current') {
      classification = 'skip';
      finalSubject = currentSubject;
    } else {
      // Follow global strategy:
      // A. fill_empty_only: regardless of allowClearExisting -> KEEP CURRENT
      // B. prefer_image:
      //    allowClearExisting = false -> KEEP CURRENT
      //    allowClearExisting = true -> CLEAR
      // C. replace_all:
      //    allowClearExisting = false -> KEEP CURRENT
      //    allowClearExisting = true -> CLEAR
      if ((strategy === 'prefer_image' || strategy === 'replace_all') && allowDestructiveClear) {
        classification = 'clear_conflict';
        finalSubject = null;
      } else {
        classification = 'skip';
        finalSubject = currentSubject;
      }
    }

    return {
      cellId,
      dayKey,
      session,
      periodNumber,
      periodIndex,
      currentSubject,
      aiSubject: null,
      finalSubject,
      currentValue: currentSubject,
      reviewValue: null,
      resultValue: finalSubject,
      classification,
      resolution: override,
      isConflict: true,
    };
  }

  // Fallback safe default
  return {
    cellId,
    dayKey,
    session,
    periodNumber,
    periodIndex,
    currentSubject,
    aiSubject,
    finalSubject: currentSubject,
    currentValue: currentSubject,
    reviewValue: aiSubject,
    resultValue: currentSubject,
    classification: 'skip',
    resolution: override,
    isConflict: false,
  };
}

/**
 * Calculates high-level summary counts from computed changes.
 */
export function calculateApplySummary(
  metadataChanges: MetadataApplyChange[],
  structureChanges: StructureApplyChange[],
  cellChanges: CellApplyChange[]
): ApplyPlanSummary {
  const metadataChanged = metadataChanges.filter((m) => m.isChanged && m.enabled).length;
  const structureChanged = structureChanges.filter((s) => s.isChanged && s.enabled).length;

  let cellsAdded = 0;
  let cellsReplaced = 0;
  let cellsSkipped = 0;
  let cellsUnchanged = 0;
  let cellsCleared = 0;
  let conflicts = 0;

  for (const c of cellChanges) {
    if (c.isConflict) conflicts++;

    switch (c.classification) {
      case 'add':
        cellsAdded++;
        break;
      case 'replace':
        cellsReplaced++;
        break;
      case 'skip':
      case 'unmappable':
        cellsSkipped++;
        break;
      case 'unchanged':
      case 'empty_unchanged':
        cellsUnchanged++;
        break;
      case 'clear_conflict':
        if (c.finalSubject === null) {
          cellsCleared++;
        } else {
          cellsSkipped++;
        }
        break;
    }
  }

  return {
    metadataChanged,
    structureChanged,
    cellsAdded,
    cellsReplaced,
    cellsSkipped,
    cellsUnchanged,
    cellsCleared,
    conflicts,
  };
}

/**
 * Pure function: applies the validated TimetableApplyPlan to produce a new TimetableState.
 * Does not mutate currentState or any global state.
 */
export function applyPlanToDocumentState(
  currentState: TimetableState,
  plan: TimetableApplyPlan
): TimetableState {
  if (!plan.isValid) {
    throw new Error('Cannot apply an invalid Apply Plan with unresolved blocking issues.');
  }

  // 1. New Metadata
  const nextMeta: TimetableMeta = { ...currentState.meta };
  for (const metaChange of plan.metadataChanges) {
    if (metaChange.enabled && metaChange.isChanged && metaChange.finalValue) {
      nextMeta[metaChange.field] = metaChange.finalValue;
    }
  }

  // 2. New Config
  const nextConfig: TimetableConfig = { ...currentState.config };

  for (const structChange of plan.structureChanges) {
    if (structChange.enabled && structChange.isChanged) {
      if (structChange.type === 'days') {
        if (structChange.targetDays && structChange.targetDays.length > 0) {
          nextConfig.activeDays = structChange.targetDays;
        } else {
          const { validDays } = getReviewedDays({
            days: plan.cellChanges.map((c) => ({
              dayKey: c.dayKey,
              label: DAY_LABELS[c.dayKey] || c.dayKey,
              confidence: 1,
            })),
          } as unknown as TimetableReviewDraft);

          if (validDays.length > 0) {
            nextConfig.activeDays = validDays;
          }
        }
      } else if (structChange.type === 'morningPeriods') {
        const morningChange = plan.structureChanges.find((s) => s.type === 'morningPeriods');
        if (morningChange && morningChange.proposedDescription) {
          const match = morningChange.proposedDescription.match(/(\d+)/);
          if (match) {
            nextConfig.morningPeriods = Math.max(1, Math.min(MAX_PERIODS_LIMIT, parseInt(match[1], 10)));
          }
        }
      } else if (structChange.type === 'afternoonPeriods') {
        const afternoonChange = plan.structureChanges.find((s) => s.type === 'afternoonPeriods');
        if (afternoonChange && afternoonChange.proposedDescription) {
          const match = afternoonChange.proposedDescription.match(/(\d+)/);
          if (match) {
            const periods = Math.min(MAX_PERIODS_LIMIT, parseInt(match[1], 10));
            nextConfig.afternoonPeriods = periods;
            if (periods > 0) {
              nextConfig.afternoonEnabled = true;
            }
          }
        }
      }
    }
  }

  // 3. New Schedule
  let nextSchedule = resizeSchedule(
    currentState.schedule,
    nextConfig.morningPeriods,
    nextConfig.afternoonPeriods
  );

  // Apply cell updates
  for (const cellChange of plan.cellChanges) {
    const { dayKey, session, periodIndex, classification, finalSubject } = cellChange;

    const daySchedule = nextSchedule[dayKey];
    if (!daySchedule) continue;

    const sessionSchedule = daySchedule[session];
    if (!sessionSchedule || periodIndex >= sessionSchedule.periods.length) continue;

    const updatedPeriods = [...sessionSchedule.periods];

    if (classification === 'add' || classification === 'replace') {
      if (finalSubject) {
        // Match against existing subject library in currentState
        const matched = findSubjectByName(currentState.subjects, finalSubject);
        if (matched) {
          const isExactName =
            matched.name.toLowerCase() === finalSubject.toLowerCase() ||
            (matched.displayName && matched.displayName.toLowerCase() === finalSubject.toLowerCase());

          updatedPeriods[periodIndex] = {
            subjectId: matched.id,
            customLabel: isExactName ? undefined : finalSubject,
          };
        } else {
          // Keep subject text directly in customLabel without polluting subject library
          updatedPeriods[periodIndex] = {
            subjectId: undefined,
            customLabel: finalSubject,
          };
        }
      }
    } else if (classification === 'clear_conflict' && finalSubject === null) {
      updatedPeriods[periodIndex] = {};
    }

    nextSchedule = {
      ...nextSchedule,
      [dayKey]: {
        ...daySchedule,
        [session]: {
          periods: updatedPeriods,
        },
      },
    };
  }

  return {
    ...currentState,
    meta: nextMeta,
    config: nextConfig,
    schedule: nextSchedule,
    isGenerated: true,
  };
}
