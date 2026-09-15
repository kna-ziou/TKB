import { Subject } from '../types/subject';
import { TimetableCellData, TimetableConfig } from '../types/timetable';
import { PageOrientation, PrintDensity } from '../types/print';

export type A4Density = 'compact' | 'normal' | 'comfortable';

export interface A4AutoFitLayout {
  density: A4Density;
  rowHeightClass: string;
  rowHeightStyle: { height: string };
  headerPaddingClass: string;
  titleSizeClass: string;
  metaTextClass: string;
  dayHeaderHeightClass: string;
  dayHeaderFontClass: string;
  dividerHeightClass: string;
  dividerFontClass: string;
  periodColWidthClass: string;
}

/**
 * Calculates adaptive A4 auto-fit layout tokens based on orientation
 * and total period count.
 *
 * Employs a bounded clamp strategy:
 * - Group A (1–5 rows): Capped comfortable row height (46px landscape, 56px portrait)
 *   with intentional whitespace below rather than giant horizontal bands.
 * - Group B (6–8 rows): Medium comfortable height (48–50px landscape, 76–78px portrait).
 * - Group C (9–12 rows): Optimized density preserving landscape 5+5 (44px) and moderately
 *   calibrated portrait 5+5 (70px) to reduce blank lower space while strictly
 *   guaranteeing single-page safety.
 *
 * Session bars (Buổi sáng / Buổi chiều) and headers remain compact and consistent across all tiers.
 * Row-height classification depends strictly on period count, not on metadata visibility.
 */
export function getA4AutoFitLayout(
  config: TimetableConfig,
  orientation: PageOrientation = 'landscape',
  _activeMetadataCount: number = 0
): A4AutoFitLayout {
  const totalPeriods =
    config.morningPeriods + (config.afternoonEnabled ? config.afternoonPeriods : 0);

  if (orientation === 'landscape') {
    // Group C — HIGH CONTENT (9–12 total lesson rows)
    if (totalPeriods >= 9) {
      const isVeryHigh = totalPeriods >= 11;
      const rowHeight = isVeryHigh ? '38px' : '44px';
      return {
        density: isVeryHigh ? 'compact' : 'normal',
        rowHeightClass: isVeryHigh ? 'h-[38px]' : 'h-[44px]',
        rowHeightStyle: { height: rowHeight },
        headerPaddingClass: 'py-2 px-4',
        titleSizeClass: 'text-xl sm:text-2xl font-black',
        metaTextClass: 'text-xs',
        dayHeaderHeightClass: 'h-8 sm:h-9',
        dayHeaderFontClass: 'text-xs sm:text-sm font-bold',
        dividerHeightClass: 'h-6',
        dividerFontClass: 'text-[10px] sm:text-[11px]',
        periodColWidthClass: 'w-11 sm:w-12',
      };
    }

    // Group B — MEDIUM CONTENT (6–8 total lesson rows)
    if (totalPeriods >= 6) {
      const rowHeight = totalPeriods === 8 ? '48px' : '50px';
      return {
        density: 'comfortable',
        rowHeightClass: totalPeriods === 8 ? 'h-[48px]' : 'h-[50px]',
        rowHeightStyle: { height: rowHeight },
        headerPaddingClass: 'py-2.5 px-4',
        titleSizeClass: 'text-xl sm:text-2xl font-black',
        metaTextClass: 'text-xs',
        dayHeaderHeightClass: 'h-8 sm:h-9',
        dayHeaderFontClass: 'text-xs sm:text-sm font-bold',
        dividerHeightClass: 'h-6',
        dividerFontClass: 'text-[10px] sm:text-[11px]',
        periodColWidthClass: 'w-11 sm:w-12',
      };
    }

    // Group A — LOW CONTENT (1–5 total lesson rows)
    // Capped aggressively: 4 morning + afternoon OFF looks like a normal timetable,
    // NOT giant horizontal bands. Whitespace below is intentional and preferred.
    return {
      density: 'comfortable',
      rowHeightClass: 'h-[46px]',
      rowHeightStyle: { height: '46px' },
      headerPaddingClass: 'py-2.5 px-4',
      titleSizeClass: 'text-xl sm:text-2xl font-black',
      metaTextClass: 'text-xs',
      dayHeaderHeightClass: 'h-8 sm:h-9',
      dayHeaderFontClass: 'text-xs sm:text-sm font-bold',
      dividerHeightClass: 'h-6',
      dividerFontClass: 'text-[10px] sm:text-[11px]',
      periodColWidthClass: 'w-11 sm:w-12',
    };
  } else {
    // PORTRAIT
    // Group C — HIGH CONTENT (9–12 total lesson rows)
    // Moderately increased to 70px (or 58px for 11-12) to utilize vertical space better and reduce lower blank space
    if (totalPeriods >= 9) {
      const isVeryHigh = totalPeriods >= 11;
      const rowHeight = isVeryHigh ? '58px' : '70px';
      return {
        density: isVeryHigh ? 'compact' : 'normal',
        rowHeightClass: isVeryHigh ? 'h-[58px]' : 'h-[70px]',
        rowHeightStyle: { height: rowHeight },
        headerPaddingClass: 'py-2.5 px-4',
        titleSizeClass: 'text-xl sm:text-2xl font-black',
        metaTextClass: 'text-xs',
        dayHeaderHeightClass: 'h-8 sm:h-9',
        dayHeaderFontClass: 'text-xs sm:text-sm font-bold',
        dividerHeightClass: 'h-6',
        dividerFontClass: 'text-[10px] sm:text-[11px]',
        periodColWidthClass: 'w-10 sm:w-11',
      };
    }

    // Group B — MEDIUM CONTENT (6–8 total lesson rows)
    // Moderate expansion for balanced portrait composition
    if (totalPeriods >= 6) {
      const rowHeight = totalPeriods === 8 ? '76px' : '78px';
      return {
        density: 'comfortable',
        rowHeightClass: totalPeriods === 8 ? 'h-[76px]' : 'h-[78px]',
        rowHeightStyle: { height: rowHeight },
        headerPaddingClass: 'py-2.5 px-4',
        titleSizeClass: 'text-xl sm:text-2xl font-black',
        metaTextClass: 'text-xs',
        dayHeaderHeightClass: 'h-8 sm:h-9',
        dayHeaderFontClass: 'text-xs sm:text-sm font-bold',
        dividerHeightClass: 'h-6',
        dividerFontClass: 'text-[10px] sm:text-[11px]',
        periodColWidthClass: 'w-10 sm:w-11',
      };
    }

    // Group A — LOW CONTENT (1–5 total lesson rows)
    // Capped to normal comfortable height (56px) - avoids giant rows
    return {
      density: 'comfortable',
      rowHeightClass: 'h-[56px]',
      rowHeightStyle: { height: '56px' },
      headerPaddingClass: 'py-2.5 px-4',
      titleSizeClass: 'text-xl sm:text-2xl font-black',
      metaTextClass: 'text-xs',
      dayHeaderHeightClass: 'h-8 sm:h-9',
      dayHeaderFontClass: 'text-xs sm:text-sm font-bold',
      dividerHeightClass: 'h-6',
      dividerFontClass: 'text-[10px] sm:text-[11px]',
      periodColWidthClass: 'w-10 sm:w-11',
    };
  }
}

/**
 * Calculates the recommended legacy print density.
 */
export function getPrintDensity(
  config: TimetableConfig,
  orientation: PageOrientation = 'landscape'
): PrintDensity {
  const totalPeriods =
    config.morningPeriods + (config.afternoonEnabled ? config.afternoonPeriods : 0);

  if (orientation === 'landscape') {
    if (totalPeriods <= 8) return 'comfortable';
    if (totalPeriods <= 10) return 'compact';
    return 'dense';
  } else {
    if (totalPeriods <= 6) return 'comfortable';
    if (totalPeriods <= 8) return 'compact';
    return 'dense';
  }
}

export interface PrintSubjectRepresentation {
  text: string;
  fontSizeClass: string;
  isShortNameUsed: boolean;
  lineClampClass: string;
}

/**
 * Intelligently auto-fits subject name according to print readability guidelines:
 * - Supports full names like "Hoạt Động Trải Nghiệm", "Giáo Dục Thể Chất", "Lịch Sử & Địa Lý", "CLB Tiếng Anh"
 * - Maximum 2 lines inside a cell
 * - Centered
 * - Controlled line-height
 * - No horizontal overflow or cell expansion that breaks page geometry
 * - Avoids premature truncation of standard names
 */
export function getPrintSubjectRepresentation(
  subject?: Subject,
  cellData?: TimetableCellData,
  density: PrintDensity | A4Density = 'comfortable',
  dayCount: number = 5,
  orientation: PageOrientation = 'landscape'
): PrintSubjectRepresentation {
  if (cellData?.customLabel && cellData.customLabel.trim()) {
    const custom = cellData.customLabel.trim();
    return {
      text: custom,
      fontSizeClass:
        custom.length > 22
          ? 'text-[9px] leading-tight font-medium'
          : custom.length > 14
          ? 'text-[10.5px] leading-tight font-semibold'
          : 'text-xs leading-snug font-bold',
      isShortNameUsed: false,
      lineClampClass: 'line-clamp-2',
    };
  }

  if (!subject) {
    return {
      text: '',
      fontSizeClass: 'text-xs',
      isShortNameUsed: false,
      lineClampClass: '',
    };
  }

  const primaryName = (subject.displayName || subject.name || '').trim();
  const shortName = (subject.shortName || '').trim();

  // Columns are narrower in portrait (especially 6 days) than in landscape
  const isNarrowCell = orientation === 'portrait' || dayCount >= 6;

  if (orientation === 'landscape') {
    // Landscape has broad horizontal cell width (~36-50mm)
    if (primaryName.length <= 12) {
      // Short names: "Toán", "Văn", "Lịch Sử", "Tiếng Anh"
      const font =
        density === 'dense'
          ? 'text-xs font-bold leading-tight'
          : 'text-xs sm:text-[13px] font-bold leading-snug';
      return {
        text: primaryName,
        fontSizeClass: font,
        isShortNameUsed: false,
        lineClampClass: 'line-clamp-2',
      };
    }

    if (primaryName.length <= 20) {
      // Moderate names: "Giáo Dục Thể Chất", "Lịch Sử & Địa Lý", "CLB Tiếng Anh"
      const font =
        density === 'dense'
          ? 'text-[10px] font-semibold leading-tight'
          : 'text-[11px] sm:text-xs font-semibold leading-tight';
      return {
        text: primaryName,
        fontSizeClass: font,
        isShortNameUsed: false,
        lineClampClass: 'line-clamp-2',
      };
    }

    if (primaryName.length <= 26) {
      // Long names: "Hoạt Động Trải Nghiệm", "Ngoại Ngữ 1 (Tiếng Anh)"
      const font =
        density === 'dense'
          ? 'text-[9.5px] font-semibold leading-tight'
          : 'text-[10.5px] font-semibold leading-tight';
      return {
        text: primaryName,
        fontSizeClass: font,
        isShortNameUsed: false,
        lineClampClass: 'line-clamp-2',
      };
    }

    // Very long names (>26 characters): use shortName if available
    if (shortName && shortName.length < primaryName.length) {
      return {
        text: shortName,
        fontSizeClass: 'text-xs font-bold leading-tight',
        isShortNameUsed: true,
        lineClampClass: 'line-clamp-2',
      };
    }

    return {
      text: primaryName,
      fontSizeClass: 'text-[9px] font-medium leading-tight',
      isShortNameUsed: false,
      lineClampClass: 'line-clamp-2',
    };
  } else {
    // Portrait orientation: narrow cell width (~25-32mm), but taller rows
    if (primaryName.length <= 10) {
      return {
        text: primaryName,
        fontSizeClass: 'text-xs sm:text-[13px] font-bold leading-tight',
        isShortNameUsed: false,
        lineClampClass: 'line-clamp-2',
      };
    }

    if (primaryName.length <= 18) {
      // "Lịch Sử & Địa Lý", "CLB Tiếng Anh", "Giáo Dục Thể Chất"
      return {
        text: primaryName,
        fontSizeClass: isNarrowCell
          ? 'text-[10px] font-semibold leading-tight'
          : 'text-[11px] font-semibold leading-tight',
        isShortNameUsed: false,
        lineClampClass: 'line-clamp-2',
      };
    }

    if (primaryName.length <= 26) {
      // "Hoạt Động Trải Nghiệm"
      return {
        text: primaryName,
        fontSizeClass: isNarrowCell
          ? 'text-[9.5px] font-medium leading-tight'
          : 'text-[10px] font-medium leading-tight',
        isShortNameUsed: false,
        lineClampClass: 'line-clamp-2',
      };
    }

    // Extra long
    if (shortName && shortName.length < primaryName.length) {
      return {
        text: shortName,
        fontSizeClass: 'text-[11px] font-bold leading-tight',
        isShortNameUsed: true,
        lineClampClass: 'line-clamp-2',
      };
    }

    return {
      text: primaryName,
      fontSizeClass: 'text-[8.5px] font-medium leading-tight',
      isShortNameUsed: false,
      lineClampClass: 'line-clamp-2',
    };
  }
}

