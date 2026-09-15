import { Subject } from '../types/subject';
import { TimetableState } from '../types/timetable';

export interface SubjectUsageStat {
  subject: Subject;
  total: number;
  morning: number;
  afternoon: number;
}

export interface TimetableStatistics {
  totalPeriods: number;
  filledPeriods: number;
  emptyPeriods: number;
  isComplete: boolean;
  subjectStats: SubjectUsageStat[];
  unassignedSubjects: Subject[];
}

/**
 * Calculates accurate period usage statistics for the current active timetable grid.
 * Only periods within activeDays, morningPeriods, and afternoonPeriods (if enabled) are counted.
 */
export function calculateTimetableStatistics(
  state: TimetableState
): TimetableStatistics {
  const { config, schedule, subjects } = state;
  const { activeDays, morningPeriods, afternoonPeriods, afternoonEnabled } = config;

  const totalPeriodsPerDay = morningPeriods + (afternoonEnabled ? afternoonPeriods : 0);
  const totalPeriods = activeDays.length * totalPeriodsPerDay;

  const subjectMap = new Map<string, Subject>();
  subjects.forEach((s) => subjectMap.set(s.id, s));

  // Count usage per subject
  const usageMap = new Map<
    string,
    { total: number; morning: number; afternoon: number }
  >();

  let filledPeriods = 0;

  activeDays.forEach((day) => {
    const daySchedule = schedule[day];
    if (!daySchedule) return;

    // Count morning periods
    for (let p = 0; p < morningPeriods; p++) {
      const cell = daySchedule.morning?.periods?.[p];
      if (cell?.subjectId) {
        filledPeriods++;
        const current = usageMap.get(cell.subjectId) || {
          total: 0,
          morning: 0,
          afternoon: 0,
        };
        current.total += 1;
        current.morning += 1;
        usageMap.set(cell.subjectId, current);
      }
    }

    // Count afternoon periods if enabled
    if (afternoonEnabled) {
      for (let p = 0; p < afternoonPeriods; p++) {
        const cell = daySchedule.afternoon?.periods?.[p];
        if (cell?.subjectId) {
          filledPeriods++;
          const current = usageMap.get(cell.subjectId) || {
            total: 0,
            morning: 0,
            afternoon: 0,
          };
          current.total += 1;
          current.afternoon += 1;
          usageMap.set(cell.subjectId, current);
        }
      }
    }
  });

  const emptyPeriods = Math.max(0, totalPeriods - filledPeriods);
  const isComplete = totalPeriods > 0 && emptyPeriods === 0;

  // Build sorted subject statistics
  const subjectStats: SubjectUsageStat[] = [];
  const unassignedSubjects: Subject[] = [];

  subjects.forEach((subj) => {
    const usage = usageMap.get(subj.id);
    if (usage && usage.total > 0) {
      subjectStats.push({
        subject: subj,
        total: usage.total,
        morning: usage.morning,
        afternoon: usage.afternoon,
      });
    } else {
      unassignedSubjects.push(subj);
    }
  });

  // Sort by total usage descending, then alphabetically by name
  subjectStats.sort((a, b) => {
    if (b.total !== a.total) {
      return b.total - a.total;
    }
    return (a.subject.displayName || a.subject.name).localeCompare(
      b.subject.displayName || b.subject.name
    );
  });

  return {
    totalPeriods,
    filledPeriods,
    emptyPeriods,
    isComplete,
    subjectStats,
    unassignedSubjects,
  };
}
