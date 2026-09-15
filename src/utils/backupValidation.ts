import {
  BackupValidationResult,
  TimetableBackupFile,
} from '../types/backup';
import { PersistedLibrary, SavedTimetableDocument } from '../types/persistence';
import { Subject } from '../types/subject';
import { DayKey, TimetableCellData, TimetableConfig, TimetableMeta, TimetableState } from '../types/timetable';
import { ThemeId } from '../types/theme';
import { DEFAULT_5_DAYS } from './timetableFactory';
import { DEFAULT_SUBJECTS } from '../data/defaultSubjects';

export const CURRENT_BACKUP_VERSION = 1;
export const BACKUP_FORMAT_IDENTIFIER = 'tkb-online-backup';
export const ACCEPTED_FORMAT_IDENTIFIERS = new Set([
  'tkb-online-backup',
  'tkb-backup',
]);

const VALID_DAYS: Set<DayKey> = new Set([
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
]);

const VALID_THEME_IDS: Set<ThemeId> = new Set([
  'professional',
  'simple',
  'fun',
  'kawaii',
  'space',
  'dino',
  'robot',
]);

const THEME_ALIASES: Record<string, ThemeId> = {
  'space-adventure': 'space',
  'dino-world': 'dino',
  'robot-tech': 'robot',
};

/**
 * Validates a parsed backup file object strictly, providing friendly error messages
 * and defensive normalization for legacy or non-critical fields.
 */
export function validateBackupData(raw: unknown): BackupValidationResult {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      isValid: false,
      errorMessage: 'Tệp không phải dữ liệu sao lưu của TKB Online Designer.',
      detail: 'Root payload is not an object',
    };
  }

  const root = raw as Record<string, unknown>;

  // Check format identifier (supports both tkb-online-backup and tkb-backup)
  if (typeof root.format !== 'string' || !ACCEPTED_FORMAT_IDENTIFIERS.has(root.format)) {
    return {
      isValid: false,
      errorMessage: 'Tệp không phải dữ liệu sao lưu của TKB Online Designer.',
      detail: `Invalid format: ${String(root.format)}`,
    };
  }

  // Check backup version
  if (typeof root.version !== 'number' || root.version > CURRENT_BACKUP_VERSION || root.version < 1) {
    return {
      isValid: false,
      errorMessage: 'Phiên bản dữ liệu này chưa được hỗ trợ.',
      detail: `Unsupported backup version: ${String(root.version)}`,
    };
  }

  // Check data payload
  if (!root.data || typeof root.data !== 'object' || Array.isArray(root.data)) {
    return {
      isValid: false,
      errorMessage: 'Dữ liệu thời khóa biểu trong tệp không hợp lệ.',
      detail: 'Missing or malformed data object',
    };
  }

  const data = root.data as Record<string, unknown>;

  // Check documents array
  if (!Array.isArray(data.documents)) {
    return {
      isValid: false,
      errorMessage: 'Dữ liệu thời khóa biểu trong tệp không hợp lệ.',
      detail: 'Missing documents array',
    };
  }

  if (data.documents.length === 0) {
    return {
      isValid: false,
      errorMessage: 'Dữ liệu thời khóa biểu trong tệp không hợp lệ.',
      detail: 'Documents array is empty',
    };
  }

  // Validate and defensively normalize each document
  const normalizedDocuments: SavedTimetableDocument[] = [];
  const customSubjectIdSet = new Set<string>();

  for (let idx = 0; idx < data.documents.length; idx++) {
    const docRaw = data.documents[idx];
    if (!docRaw || typeof docRaw !== 'object') {
      return {
        isValid: false,
        errorMessage: 'Dữ liệu thời khóa biểu trong tệp không hợp lệ.',
        detail: `Document at index ${idx} is not an object`,
      };
    }

    const docObj = docRaw as Record<string, unknown>;

    if (typeof docObj.id !== 'string' || !docObj.id.trim()) {
      return {
        isValid: false,
        errorMessage: 'Dữ liệu thời khóa biểu trong tệp không hợp lệ.',
        detail: `Document at index ${idx} has invalid ID`,
      };
    }

    const docId = docObj.id.trim();
    const docName =
      typeof docObj.name === 'string' && docObj.name.trim()
        ? docObj.name.trim()
        : 'Thời Khóa Biểu';

    const createdAt =
      typeof docObj.createdAt === 'string' && docObj.createdAt
        ? docObj.createdAt
        : new Date().toISOString();

    const updatedAt =
      typeof docObj.updatedAt === 'string' && docObj.updatedAt
        ? docObj.updatedAt
        : createdAt;

    // Validate timetable state
    if (!docObj.timetable || typeof docObj.timetable !== 'object') {
      return {
        isValid: false,
        errorMessage: 'Dữ liệu thời khóa biểu trong tệp không hợp lệ.',
        detail: `Document ${docId} is missing timetable state`,
      };
    }

    const ttRaw = docObj.timetable as Record<string, unknown>;

    // 1. Meta
    const metaRaw = (ttRaw.meta as Record<string, unknown>) || {};
    const normalizedMeta: TimetableMeta = {
      title: typeof metaRaw.title === 'string' ? metaRaw.title : 'THỜI KHÓA BIỂU',
      schoolName: typeof metaRaw.schoolName === 'string' ? metaRaw.schoolName : '',
      studentName: typeof metaRaw.studentName === 'string' ? metaRaw.studentName : '',
      className: typeof metaRaw.className === 'string' ? metaRaw.className : '',
      // Legacy grade preserved safely
      grade: typeof metaRaw.grade === 'string' ? metaRaw.grade : '4',
      customGrade: typeof metaRaw.customGrade === 'string' ? metaRaw.customGrade : '',
      schoolYear: typeof metaRaw.schoolYear === 'string' ? metaRaw.schoolYear : '2026–2027',
    };

    // 2. Config
    const configRaw = (ttRaw.config as Record<string, unknown>) || {};
    let activeDays: DayKey[] = DEFAULT_5_DAYS;
    if (Array.isArray(configRaw.activeDays)) {
      const filteredDays = configRaw.activeDays.filter((d): d is DayKey =>
        VALID_DAYS.has(d as DayKey)
      );
      if (filteredDays.length > 0) {
        activeDays = filteredDays;
      }
    }

    const morningPeriods = Math.min(
      6,
      Math.max(1, typeof configRaw.morningPeriods === 'number' ? configRaw.morningPeriods : 4)
    );
    const afternoonPeriods = Math.min(
      6,
      Math.max(1, typeof configRaw.afternoonPeriods === 'number' ? configRaw.afternoonPeriods : 4)
    );
    const afternoonEnabled =
      typeof configRaw.afternoonEnabled === 'boolean'
        ? configRaw.afternoonEnabled
        : true;

    const normalizedConfig: TimetableConfig = {
      activeDays,
      morningPeriods,
      afternoonPeriods,
      afternoonEnabled,
    };

    // 3. Subjects
    let normalizedSubjects: Subject[] = DEFAULT_SUBJECTS;
    if (Array.isArray(ttRaw.subjects)) {
      const parsedSubjects: Subject[] = [];
      for (const s of ttRaw.subjects) {
        if (s && typeof s === 'object') {
          const sObj = s as Record<string, unknown>;
          if (typeof sObj.id === 'string' && typeof sObj.name === 'string') {
            const isCustom = Boolean(sObj.custom);
            if (isCustom) {
              customSubjectIdSet.add(sObj.id);
            }
            parsedSubjects.push({
              id: sObj.id,
              name: sObj.name,
              displayName: typeof sObj.displayName === 'string' ? sObj.displayName : undefined,
              shortName: typeof sObj.shortName === 'string' ? sObj.shortName : undefined,
              custom: isCustom,
              defaultColor:
                typeof sObj.defaultColor === 'string' ? sObj.defaultColor : '#38bdf8',
              color: typeof sObj.color === 'string' ? sObj.color : '#38bdf8',
              colorLocked: Boolean(sObj.colorLocked),
            });
          }
        }
      }
      if (parsedSubjects.length > 0) {
        normalizedSubjects = parsedSubjects;
      }
    }

    // 4. Theme
    let normalizedThemeId: ThemeId = 'professional';
    if (typeof ttRaw.themeId === 'string') {
      const tid = ttRaw.themeId.trim();
      if (VALID_THEME_IDS.has(tid as ThemeId)) {
        normalizedThemeId = tid as ThemeId;
      } else if (THEME_ALIASES[tid]) {
        normalizedThemeId = THEME_ALIASES[tid];
      }
    }

    // 5. Schedule
    const scheduleRaw = (ttRaw.schedule as Record<string, unknown>) || {};
    const normalizedSchedule: TimetableState['schedule'] = {} as TimetableState['schedule'];

    VALID_DAYS.forEach((dayKey) => {
      const dayScheduleRaw = scheduleRaw[dayKey] as Record<string, unknown> | undefined;
      const morningRaw = dayScheduleRaw?.morning as Record<string, unknown> | undefined;
      const afternoonRaw = dayScheduleRaw?.afternoon as Record<string, unknown> | undefined;

      const morningPeriodsRaw = Array.isArray(morningRaw?.periods)
        ? (morningRaw.periods as unknown[])
        : [];
      const afternoonPeriodsRaw = Array.isArray(afternoonRaw?.periods)
        ? (afternoonRaw.periods as unknown[])
        : [];

      const cleanPeriods = (arr: unknown[], maxPeriods: number): TimetableCellData[] => {
        const result: TimetableCellData[] = [];
        for (let p = 0; p < maxPeriods; p++) {
          const item = arr[p];
          if (item && typeof item === 'object') {
            const cell = item as Record<string, unknown>;
            result.push({
              subjectId: typeof cell.subjectId === 'string' ? cell.subjectId : undefined,
              customLabel: typeof cell.customLabel === 'string' ? cell.customLabel : undefined,
            });
          } else {
            result.push({});
          }
        }
        return result;
      };

      normalizedSchedule[dayKey] = {
        morning: {
          periods: cleanPeriods(morningPeriodsRaw, morningPeriods),
        },
        afternoon: {
          periods: cleanPeriods(afternoonPeriodsRaw, afternoonPeriods),
        },
      };
    });

    const normalizedTimetable: TimetableState = {
      meta: normalizedMeta,
      config: normalizedConfig,
      subjects: normalizedSubjects,
      schedule: normalizedSchedule,
      isGenerated: true,
      themeId: normalizedThemeId,
    };

    normalizedDocuments.push({
      id: docId,
      name: docName,
      createdAt,
      updatedAt,
      dataVersion: 1,
      timetable: normalizedTimetable,
      printSettings:
        docObj.printSettings && typeof docObj.printSettings === 'object'
          ? (docObj.printSettings as SavedTimetableDocument['printSettings'])
          : undefined,
    });
  }

  // Sort descending by updatedAt
  normalizedDocuments.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  let currentDocumentId =
    typeof data.currentDocumentId === 'string' &&
    normalizedDocuments.some((d) => d.id === data.currentDocumentId)
      ? data.currentDocumentId
      : normalizedDocuments[0].id;

  const library: PersistedLibrary = {
    schemaVersion: 1,
    currentDocumentId,
    documents: normalizedDocuments,
  };

  const backupFile: TimetableBackupFile = {
    format: BACKUP_FORMAT_IDENTIFIER,
    version: root.version as number,
    exportedAt:
      typeof root.exportedAt === 'string' ? root.exportedAt : new Date().toISOString(),
    app: {
      name:
        root.app && typeof root.app === 'object' && typeof (root.app as Record<string, unknown>).name === 'string'
          ? ((root.app as Record<string, unknown>).name as string)
          : 'TKB Online Designer',
      version:
        root.app && typeof root.app === 'object' && typeof (root.app as Record<string, unknown>).version === 'string'
          ? ((root.app as Record<string, unknown>).version as string)
          : '1.0.0',
    },
    data: {
      schemaVersion: 1,
      currentDocumentId,
      documents: normalizedDocuments,
    },
  };

  return {
    isValid: true,
    backup: backupFile,
    library,
    summary: {
      documentCount: normalizedDocuments.length,
      customSubjectCount: customSubjectIdSet.size,
      version: root.version as number,
      exportedAt: typeof root.exportedAt === 'string' ? root.exportedAt : undefined,
    },
  };
}
