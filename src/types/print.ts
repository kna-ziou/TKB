export type PageOrientation = 'landscape' | 'portrait';

export type PrintDensity = 'comfortable' | 'compact' | 'dense';

export interface PrintSettings {
  paperSize: 'A4';
  orientation: PageOrientation;
  showSchoolName: boolean;
  showStudentName: boolean;
  showClassName: boolean;
  showSchoolYear: boolean;
  showDecorations: boolean;
  compactMode: 'auto' | 'comfortable' | 'compact' | 'dense';
}

export const DEFAULT_PRINT_SETTINGS: PrintSettings = {
  paperSize: 'A4',
  orientation: 'landscape',
  showSchoolName: true,
  showStudentName: true,
  showClassName: true,
  showSchoolYear: true,
  showDecorations: true,
  compactMode: 'auto',
};
