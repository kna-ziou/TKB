import {
  DayKey,
  DaySchedule,
  SessionSchedule,
  TimetableCellData,
} from '../types/timetable';

export const ALL_DAYS: DayKey[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
];

export const DEFAULT_5_DAYS: DayKey[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
];

export const DAY_LABELS: Record<DayKey, string> = {
  monday: 'Thứ 2',
  tuesday: 'Thứ 3',
  wednesday: 'Thứ 4',
  thursday: 'Thứ 5',
  friday: 'Thứ 6',
  saturday: 'Thứ 7',
};

/**
 * Creates an empty session containing `count` periods
 */
export function createEmptySession(count: number): SessionSchedule {
  const periods: TimetableCellData[] = [];
  for (let i = 0; i < count; i++) {
    periods.push({});
  }
  return { periods };
}

/**
 * Creates an empty day schedule for morning and afternoon
 */
export function createEmptyDaySchedule(
  morningPeriods: number,
  afternoonPeriods: number
): DaySchedule {
  return {
    morning: createEmptySession(morningPeriods),
    afternoon: createEmptySession(afternoonPeriods),
  };
}

/**
 * Creates an empty schedule dictionary covering all 6 days so switching active days retains data
 */
export function createEmptySchedule(
  morningPeriods = 4,
  afternoonPeriods = 4
): Record<DayKey, DaySchedule> {
  const schedule: Partial<Record<DayKey, DaySchedule>> = {};
  for (const day of ALL_DAYS) {
    schedule[day] = createEmptyDaySchedule(morningPeriods, afternoonPeriods);
  }
  return schedule as Record<DayKey, DaySchedule>;
}

/**
 * Ensures a session has at least `targetCount` periods while preserving existing cell data.
 * If targetCount > current length: pad with empty cells.
 * If targetCount <= current length: keep existing periods (we don't delete data, grid renders up to targetCount).
 */
export function ensureSessionPeriodCount(
  session: SessionSchedule | undefined,
  targetCount: number
): SessionSchedule {
  const currentPeriods = session ? [...session.periods] : [];
  while (currentPeriods.length < targetCount) {
    currentPeriods.push({});
  }
  return { periods: currentPeriods };
}

/**
 * Ensures a day schedule has the required morning and afternoon periods
 */
export function ensureDaySchedule(
  daySchedule: DaySchedule | undefined,
  morningPeriods: number,
  afternoonPeriods: number
): DaySchedule {
  return {
    morning: ensureSessionPeriodCount(daySchedule?.morning, morningPeriods),
    afternoon: ensureSessionPeriodCount(daySchedule?.afternoon, afternoonPeriods),
  };
}

/**
 * Resizes a full schedule to guarantee all days have at least the required periods,
 * without mutating or dropping existing cell contents.
 */
export function resizeSchedule(
  prevSchedule: Record<DayKey, DaySchedule>,
  morningCount: number,
  afternoonCount: number
): Record<DayKey, DaySchedule> {
  const nextSchedule: Partial<Record<DayKey, DaySchedule>> = {};

  for (const day of ALL_DAYS) {
    const existingDay = prevSchedule[day];
    nextSchedule[day] = ensureDaySchedule(
      existingDay,
      morningCount,
      afternoonCount
    );
  }

  return nextSchedule as Record<DayKey, DaySchedule>;
}
