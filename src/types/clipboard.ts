import { DayKey, TimetableCellData } from './timetable';

export type TimetableClipboard =
  | {
      type: 'cell';
      data: TimetableCellData;
    }
  | {
      type: 'day';
      day: DayKey;
      periods: {
        morning: TimetableCellData[];
        afternoon: TimetableCellData[];
      };
    }
  | null;
