import { DEFAULT_SUBJECTS } from '../data/defaultSubjects';
import { getAutoCustomColor } from '../data/subjectColors';
import { harmonizeSubjectsForTheme } from '../data/themes';
import { Subject } from '../types/subject';
import { ThemeId } from '../types/theme';
import {
  DayKey,
  SessionType,
  TimetableCellData,
  TimetableConfig,
  TimetableMeta,
  TimetableState,
} from '../types/timetable';
import { findSubjectByName, normalizeSubjectName } from '../utils/subjectUtils';
import {
  createEmptySchedule,
  DEFAULT_5_DAYS,
  resizeSchedule,
} from '../utils/timetableFactory';

export type TimetableAction =
  | { type: 'UPDATE_META'; payload: Partial<TimetableMeta> }
  | { type: 'UPDATE_CONFIG'; payload: Partial<TimetableConfig> }
  | {
      type: 'RESIZE_SCHEDULE';
      payload: { morningPeriods: number; afternoonPeriods: number };
    }
  | {
      type: 'SET_CELL_SUBJECT';
      payload: {
        day: DayKey;
        session: SessionType;
        periodIndex: number;
        subjectId?: string;
        customLabel?: string;
      };
    }
  | {
      type: 'CLEAR_CELL';
      payload: {
        day: DayKey;
        session: SessionType;
        periodIndex: number;
      };
    }
  | {
      type: 'ADD_CUSTOM_SUBJECT';
      payload: {
        name: string;
        displayName?: string;
        shortName?: string;
        assignToCell?: {
          day: DayKey;
          session: SessionType;
          periodIndex: number;
        };
      };
    }
  | {
      type: 'UPDATE_SUBJECT';
      payload: {
        id: string;
        name?: string;
        displayName?: string;
        shortName?: string;
        color?: string;
        colorLocked?: boolean;
      };
    }
  | {
      type: 'SET_SUBJECT_COLOR';
      payload: { id: string; color: string };
    }
  | {
      type: 'RESET_SUBJECT_COLOR';
      payload: { id: string };
    }
  | {
      type: 'SET_SUBJECT_COLOR_LOCK';
      payload: { id: string; locked: boolean };
    }
  | { type: 'LOCK_ALL_SUBJECT_COLORS' }
  | { type: 'UNLOCK_ALL_SUBJECT_COLORS' }
  | { type: 'RESET_ALL_SUBJECT_COLORS' }
  | {
      type: 'DELETE_CUSTOM_SUBJECT';
      payload: { id: string };
    }
  | { type: 'GENERATE_TIMETABLE' }
  | { type: 'RESET_TIMETABLE' }
  | { type: 'SET_THEME'; payload: { themeId: ThemeId } }
  | { type: 'LOAD_STATE'; payload: TimetableState }
  | { type: 'APPLY_TIMETABLE_IMPORT'; payload: { nextState: TimetableState } }
  | { type: 'CLEAR_DAY'; payload: { day: DayKey } }
  | { type: 'CLEAR_SESSION'; payload: { session: SessionType } }
  | {
      type: 'PASTE_DAY';
      payload: {
        targetDay: DayKey;
        sourcePeriods: {
          morning: TimetableCellData[];
          afternoon: TimetableCellData[];
        };
      };
    };

export const initialTimetableState: TimetableState = {
  meta: {
    title: 'THỜI KHÓA BIỂU',
    schoolName: '',
    studentName: '',
    className: '',
    grade: '4',
    customGrade: '',
    schoolYear: '2026–2027',
  },
  config: {
    activeDays: DEFAULT_5_DAYS,
    morningPeriods: 4,
    afternoonPeriods: 4,
    afternoonEnabled: true,
  },
  subjects: DEFAULT_SUBJECTS,
  schedule: createEmptySchedule(4, 4),
  isGenerated: false,
  themeId: 'professional',
};

export function timetableReducer(
  state: TimetableState,
  action: TimetableAction
): TimetableState {
  switch (action.type) {
    case 'UPDATE_META': {
      return {
        ...state,
        meta: {
          ...state.meta,
          ...action.payload,
        },
      };
    }

    case 'UPDATE_CONFIG': {
      const nextConfig = {
        ...state.config,
        ...action.payload,
      };

      // If period counts changed, ensure schedule is properly padded while preserving data
      const nextSchedule = resizeSchedule(
        state.schedule,
        nextConfig.morningPeriods,
        nextConfig.afternoonPeriods
      );

      return {
        ...state,
        config: nextConfig,
        schedule: nextSchedule,
      };
    }

    case 'RESIZE_SCHEDULE': {
      const { morningPeriods, afternoonPeriods } = action.payload;
      const nextSchedule = resizeSchedule(
        state.schedule,
        morningPeriods,
        afternoonPeriods
      );

      return {
        ...state,
        config: {
          ...state.config,
          morningPeriods,
          afternoonPeriods,
        },
        schedule: nextSchedule,
      };
    }

    case 'SET_CELL_SUBJECT': {
      const { day, session, periodIndex, subjectId, customLabel } =
        action.payload;
      const dayData = state.schedule[day];
      if (!dayData) return state;

      const sessionData = dayData[session];
      const periods = [...sessionData.periods];

      // Ensure array has enough elements if index is beyond current size
      while (periods.length <= periodIndex) {
        periods.push({});
      }

      periods[periodIndex] = {
        ...periods[periodIndex],
        subjectId,
        customLabel,
      };

      return {
        ...state,
        schedule: {
          ...state.schedule,
          [day]: {
            ...dayData,
            [session]: {
              ...sessionData,
              periods,
            },
          },
        },
      };
    }

    case 'CLEAR_CELL': {
      const { day, session, periodIndex } = action.payload;
      const dayData = state.schedule[day];
      if (!dayData) return state;

      const sessionData = dayData[session];
      if (periodIndex >= sessionData.periods.length) return state;

      const periods = [...sessionData.periods];
      periods[periodIndex] = {};

      return {
        ...state,
        schedule: {
          ...state.schedule,
          [day]: {
            ...dayData,
            [session]: {
              ...sessionData,
              periods,
            },
          },
        },
      };
    }

    case 'CLEAR_DAY': {
      const { day } = action.payload;
      const dayData = state.schedule[day];
      if (!dayData) return state;

      return {
        ...state,
        schedule: {
          ...state.schedule,
          [day]: {
            morning: {
              periods: dayData.morning.periods.map(() => ({})),
            },
            afternoon: {
              periods: dayData.afternoon.periods.map(() => ({})),
            },
          },
        },
      };
    }

    case 'CLEAR_SESSION': {
      const { session } = action.payload;
      const nextSchedule = { ...state.schedule };

      for (const dayKey of Object.keys(nextSchedule) as DayKey[]) {
        const dayData = nextSchedule[dayKey];
        if (dayData && dayData[session]) {
          nextSchedule[dayKey] = {
            ...dayData,
            [session]: {
              periods: dayData[session].periods.map(() => ({})),
            },
          };
        }
      }

      return {
        ...state,
        schedule: nextSchedule,
      };
    }

    case 'PASTE_DAY': {
      const { targetDay, sourcePeriods } = action.payload;
      const dayData = state.schedule[targetDay];
      if (!dayData) return state;

      const morningCount = state.config.morningPeriods;
      const afternoonCount = state.config.afternoonPeriods;

      const newMorning = Array.from({ length: morningCount }, (_, i) => {
        const src = sourcePeriods.morning?.[i];
        return src ? { subjectId: src.subjectId, customLabel: src.customLabel } : {};
      });

      const newAfternoon = Array.from({ length: afternoonCount }, (_, i) => {
        const src = sourcePeriods.afternoon?.[i];
        return src ? { subjectId: src.subjectId, customLabel: src.customLabel } : {};
      });

      return {
        ...state,
        schedule: {
          ...state.schedule,
          [targetDay]: {
            morning: { periods: newMorning },
            afternoon: { periods: newAfternoon },
          },
        },
      };
    }

    case 'ADD_CUSTOM_SUBJECT': {
      const { name, displayName, shortName, assignToCell } = action.payload;
      const cleanName = normalizeSubjectName(name);
      if (!cleanName) return state;

      const existingSubject = findSubjectByName(state.subjects, cleanName);
      let targetSubjectId: string;
      let nextSubjects = state.subjects;

      if (existingSubject) {
        targetSubjectId = existingSubject.id;
      } else {
        const customCount = state.subjects.filter((s) => s.custom).length;
        const autoColor = getAutoCustomColor(customCount);
        const newSubject: Subject = {
          id: `custom-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          name: cleanName,
          displayName: displayName ? normalizeSubjectName(displayName) : cleanName,
          shortName: shortName ? normalizeSubjectName(shortName) : '',
          custom: true,
          defaultColor: autoColor,
          color: autoColor,
          colorLocked: false,
        };
        targetSubjectId = newSubject.id;
        nextSubjects = [...state.subjects, newSubject];
      }

      // If requested, assign this subject to the targeted cell in the same action
      if (assignToCell) {
        const { day, session, periodIndex } = assignToCell;
        const dayData = state.schedule[day];
        if (dayData) {
          const sessionData = dayData[session];
          const periods = [...sessionData.periods];
          while (periods.length <= periodIndex) {
            periods.push({});
          }
          periods[periodIndex] = {
            subjectId: targetSubjectId,
            customLabel: undefined,
          };

          return {
            ...state,
            subjects: nextSubjects,
            schedule: {
              ...state.schedule,
              [day]: {
                ...dayData,
                [session]: {
                  ...sessionData,
                  periods,
                },
              },
            },
          };
        }
      }

      return {
        ...state,
        subjects: nextSubjects,
      };
    }

    case 'UPDATE_SUBJECT': {
      const { id, name, displayName, shortName, color, colorLocked } =
        action.payload;
      return {
        ...state,
        subjects: state.subjects.map((s) => {
          if (s.id !== id) return s;
          const updated: Subject = { ...s };
          // Custom subjects can change canonical name; default subjects keep canonical name
          if (s.custom && name !== undefined) {
            const cleanName = normalizeSubjectName(name);
            if (cleanName) {
              updated.name = cleanName;
            }
          }
          if (displayName !== undefined) {
            updated.displayName = normalizeSubjectName(displayName) || updated.name;
          }
          if (shortName !== undefined) {
            updated.shortName = normalizeSubjectName(shortName);
          }
          if (color !== undefined && color) {
            updated.color = color;
          }
          if (colorLocked !== undefined) {
            updated.colorLocked = colorLocked;
          }
          return updated;
        }),
      };
    }

    case 'SET_SUBJECT_COLOR': {
      const { id, color } = action.payload;
      return {
        ...state,
        subjects: state.subjects.map((s) =>
          s.id === id ? { ...s, color } : s
        ),
      };
    }

    case 'RESET_SUBJECT_COLOR': {
      const { id } = action.payload;
      return {
        ...state,
        subjects: state.subjects.map((s) =>
          s.id === id ? { ...s, color: s.defaultColor } : s
        ),
      };
    }

    case 'SET_SUBJECT_COLOR_LOCK': {
      const { id, locked } = action.payload;
      return {
        ...state,
        subjects: state.subjects.map((s) =>
          s.id === id ? { ...s, colorLocked: locked } : s
        ),
      };
    }

    case 'LOCK_ALL_SUBJECT_COLORS': {
      return {
        ...state,
        subjects: state.subjects.map((s) => ({ ...s, colorLocked: true })),
      };
    }

    case 'UNLOCK_ALL_SUBJECT_COLORS': {
      return {
        ...state,
        subjects: state.subjects.map((s) => ({ ...s, colorLocked: false })),
      };
    }

    case 'RESET_ALL_SUBJECT_COLORS': {
      return {
        ...state,
        subjects: state.subjects.map((s) => ({
          ...s,
          color: s.defaultColor,
        })),
      };
    }

    case 'DELETE_CUSTOM_SUBJECT': {
      const { id } = action.payload;
      const target = state.subjects.find((s) => s.id === id);
      if (!target || !target.custom) {
        return state;
      }

      const nextSubjects = state.subjects.filter((s) => s.id !== id);

      // Clear any cell references to this subjectId across all days and sessions
      const nextSchedule = { ...state.schedule };
      let anyCellModified = false;

      for (const dayKey of Object.keys(nextSchedule) as DayKey[]) {
        const dayData = nextSchedule[dayKey];
        if (!dayData) continue;

        let dayModified = false;
        const nextMorningPeriods = dayData.morning?.periods?.map((p) => {
          if (p.subjectId === id) {
            dayModified = true;
            return { ...p, subjectId: undefined, customLabel: undefined };
          }
          return p;
        });

        const nextAfternoonPeriods = dayData.afternoon?.periods?.map((p) => {
          if (p.subjectId === id) {
            dayModified = true;
            return { ...p, subjectId: undefined, customLabel: undefined };
          }
          return p;
        });

        if (dayModified) {
          anyCellModified = true;
          nextSchedule[dayKey] = {
            morning: { periods: nextMorningPeriods || [] },
            afternoon: { periods: nextAfternoonPeriods || [] },
          };
        }
      }

      return {
        ...state,
        subjects: nextSubjects,
        schedule: anyCellModified ? nextSchedule : state.schedule,
      };
    }

    case 'GENERATE_TIMETABLE': {
      const resized = resizeSchedule(
        state.schedule,
        state.config.morningPeriods,
        state.config.afternoonPeriods
      );
      return {
        ...state,
        isGenerated: true,
        schedule: resized,
      };
    }

    case 'RESET_TIMETABLE': {
      return {
        ...initialTimetableState,
      };
    }

    case 'SET_THEME': {
      const { themeId } = action.payload;
      if (themeId === state.themeId) return state;

      const nextSubjects = harmonizeSubjectsForTheme(state.subjects, themeId);

      return {
        ...state,
        themeId,
        subjects: nextSubjects,
      };
    }

    case 'LOAD_STATE': {
      return {
        ...action.payload,
      };
    }

    case 'APPLY_TIMETABLE_IMPORT': {
      return {
        ...action.payload.nextState,
      };
    }

    default:
      return state;
  }
}
