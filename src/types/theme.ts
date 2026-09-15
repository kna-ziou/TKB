export type ThemeId =
  | 'professional'
  | 'simple'
  | 'fun'
  | 'kawaii'
  | 'space'
  | 'dino'
  | 'robot';

export interface ThemeTokens {
  // Canvas & Shell
  pageBackground: string;
  panelBackground: string;
  panelBorder: string;

  // Timetable Card
  timetableBackground: string;
  timetableBorder: string;
  timetableShadow: string;
  timetableRadius: string;

  // Header
  headerBackground: string;
  headerBorder: string;
  headerTitleColor: string;
  headerSubtextColor: string;
  headerBadgeBg: string;
  headerBadgeText: string;

  // Table Structure
  tableHeaderBg: string;
  tableHeaderText: string;
  tableHeaderBorder: string;

  periodColBg: string;
  periodColText: string;
  gridBorder: string;

  // Session Dividers
  morningBackground: string;
  morningText: string;
  morningIconColor: string;
  morningBorder: string;

  afternoonBackground: string;
  afternoonText: string;
  afternoonIconColor: string;
  afternoonBorder: string;

  // Footer / Accents
  footerBackground: string;
  footerText: string;
  footerBorder: string;
  accent: string;

  // Typography & Cell Nuances
  fontFamilyClass?: string;
  cellBorder: string;
  cellHoverBg: string;
}

export interface TimetableTheme {
  id: ThemeId;
  name: string;
  description: string;
  category?: string;
  tokens: ThemeTokens;
  decoration?: {
    type: 'none' | 'dots' | 'clouds' | 'stars' | 'leaves' | 'circuits';
    density?: 'none' | 'low' | 'medium';
  };
  subjectPalette: string[];
}
