import { Subject } from '../types/subject';
import { DayKey, DaySchedule, TimetableCellData } from '../types/timetable';

/**
 * Remove Vietnamese accents/diacritics for flexible fuzzy search
 */
export function removeVietnameseTones(str: string = ''): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

/**
 * Clean and normalize a subject name
 */
export function normalizeSubjectName(name: string = ''): string {
  if (!name) return '';
  return name.trim().replace(/\s+/g, ' ');
}

/**
 * Find a subject by case-insensitive name match
 */
export function findSubjectByName(
  subjects: Subject[] = [],
  name: string = ''
): Subject | undefined {
  if (!Array.isArray(subjects) || !name) return undefined;
  const normalized = normalizeSubjectName(name).toLowerCase();
  return subjects.find(
    (s) =>
      s &&
      (s.name?.toLowerCase() === normalized ||
        (s.displayName && s.displayName.toLowerCase() === normalized))
  );
}

/**
 * Search subjects by query (supports both accented and unaccented Vietnamese)
 */
export function searchSubjects(subjects: Subject[] = [], query: string = ''): Subject[] {
  if (!Array.isArray(subjects)) return [];
  const cleanQuery = (query || '').trim();
  if (!cleanQuery) return subjects;

  const rawLower = cleanQuery.toLowerCase();
  const toneLessQuery = removeVietnameseTones(cleanQuery);

  return subjects.filter((subj) => {
    if (!subj) return false;
    const rawName = (subj.name || '').toLowerCase();
    const rawDisplay = (subj.displayName || '').toLowerCase();
    const rawShort = (subj.shortName || '').toLowerCase();

    if (
      rawName.includes(rawLower) ||
      rawDisplay.includes(rawLower) ||
      rawShort.includes(rawLower)
    ) {
      return true;
    }

    const toneLessName = removeVietnameseTones(subj.name || '');
    const toneLessDisplay = removeVietnameseTones(subj.displayName || '');
    const toneLessShort = removeVietnameseTones(subj.shortName || '');

    return (
      toneLessName.includes(toneLessQuery) ||
      toneLessDisplay.includes(toneLessQuery) ||
      toneLessShort.includes(toneLessQuery)
    );
  });
}

/**
 * Retrieve primary display text for a cell
 */
export function getSubjectDisplay(
  subject?: Subject,
  cellData?: TimetableCellData
): string {
  if (cellData?.customLabel && cellData.customLabel.trim()) {
    return cellData.customLabel;
  }
  if (!subject) {
    return '';
  }
  return subject.displayName || subject.name || '';
}

/**
 * Calculate the number of periods currently using a given subjectId across the timetable
 */
export function getSubjectUsageCount(
  schedule?: Record<DayKey, DaySchedule>,
  subjectId?: string
): number {
  if (!schedule || !subjectId) return 0;
  let count = 0;
  for (const daySchedule of Object.values(schedule)) {
    if (!daySchedule) continue;
    for (const session of [daySchedule.morning, daySchedule.afternoon]) {
      if (session?.periods && Array.isArray(session.periods)) {
        for (const period of session.periods) {
          if (period?.subjectId === subjectId) {
            count++;
          }
        }
      }
    }
  }
  return count;
}
