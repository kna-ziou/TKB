import { Subject } from './subject';
import { ThemeId } from './theme';

export type DayKey =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday';

export type SessionType = 'morning' | 'afternoon';

export interface TimetableCellData {
  subjectId?: string;
  customLabel?: string;
}

export interface SessionSchedule {
  periods: TimetableCellData[];
}

export interface DaySchedule {
  morning: SessionSchedule;
  afternoon: SessionSchedule;
}

export interface TimetableMeta {
  title: string;
  schoolName: string;
  studentName: string;
  className: string;
  grade: string;
  customGrade?: string;
  schoolYear: string;
}

export interface TimetableConfig {
  activeDays: DayKey[];
  morningPeriods: number;
  afternoonPeriods: number;
  afternoonEnabled: boolean;
}

export interface TimetableState {
  meta: TimetableMeta;
  config: TimetableConfig;
  subjects: Subject[];
  schedule: Record<DayKey, DaySchedule>;
  isGenerated: boolean;
  themeId: ThemeId;
}

export interface ActiveCellTarget {
  day: DayKey;
  session: SessionType;
  periodIndex: number;
}
